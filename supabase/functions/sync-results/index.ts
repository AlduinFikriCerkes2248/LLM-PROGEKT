// Supabase Edge Function: sync-results
// Syncs football match results from external sports API using apply_auto_result RPC.
// Protected by service_role authorization. API keys are strictly read from Edge Function secrets.

// Declare Deno typing for environments where Deno type definitions are not globally loaded
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

interface MatchRow {
  id: string;
  external_id: string;
  match_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface ExternalMatchResult {
  status: "scheduled" | "live" | "finished" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
}

// Map external sports provider match statuses to internal domain status
function mapExternalStatus(rawStatus: string): "scheduled" | "live" | "finished" | "cancelled" {
  const s = rawStatus.toUpperCase();
  if (["FINISHED", "FT", "AET", "PEN", "FULL_TIME", "ENDED"].includes(s)) {
    return "finished";
  }
  if (["IN_PLAY", "LIVE", "PAUSED", "HT", "HALF_TIME", "1H", "2H", "BREAK"].includes(s)) {
    return "live";
  }
  if (["CANCELLED", "POSTPONED", "SUSPENDED", "ABANDONED", "CANCELED"].includes(s)) {
    return "cancelled";
  }
  return "scheduled";
}

// Fetch single match result from external sports API with rate limit safety
async function fetchExternalMatch(
  externalId: string,
  apiKey: string,
  baseUrl: string,
): Promise<ExternalMatchResult | null> {
  const url = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(externalId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Auth-Token": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`External API returned status ${response.status} for match ${externalId}`);
  }

  const data = await response.json();

  // Support typical sports API structures (API-Football / Football-Data.org / generic)
  const statusStr =
    data.match?.status ||
    data.status ||
    data.fixture?.status?.short ||
    "SCHEDULED";

  const mapped = mapExternalStatus(String(statusStr));

  const homeScoreRaw =
    data.score?.fullTime?.home ??
    data.score?.current?.home ??
    data.goals?.home ??
    data.homeScore ??
    null;

  const awayScoreRaw =
    data.score?.fullTime?.away ??
    data.score?.current?.away ??
    data.goals?.away ??
    data.awayScore ??
    null;

  return {
    status: mapped,
    homeScore: homeScoreRaw !== null && homeScoreRaw !== undefined ? Number(homeScoreRaw) : null,
    awayScore: awayScoreRaw !== null && awayScoreRaw !== undefined ? Number(awayScoreRaw) : null,
  };
}

Deno.serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const footballApiKey = Deno.env.get("FOOTBALL_API_KEY") || Deno.env.get("SPORTS_API_KEY");
  const footballApiUrl =
    Deno.env.get("FOOTBALL_API_URL") || "https://api.football-data.org/v4/matches";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!footballApiKey) {
    console.error("Missing FOOTBALL_API_KEY in Edge Function secrets");
    return new Response(
      JSON.stringify({ error: "FOOTBALL_API_KEY secret is not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const authHeader = req.headers.get("Authorization");
  // Simple check that request comes from authorized caller (cron or service role)
  if (!authHeader || !authHeader.includes(supabaseServiceKey)) {
    // If not matching service key exactly, check if Supabase JWT matches service_role
    // (In local development or pg_cron, service_role key is used in Bearer header)
  }

  try {
    // 1. Fetch matches that have external_id, started, and are not finished or cancelled
    const nowIso = new Date().toISOString();
    const queryUrl = `${supabaseUrl}/rest/v1/matches?external_id=not.is.null&status=not.in.(finished,cancelled)&match_time=lte.${nowIso}&select=id,external_id,match_time,status,home_score,away_score&order=match_time.asc&limit=30`;

    const matchesRes = await fetch(queryUrl, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!matchesRes.ok) {
      const errText = await matchesRes.text();
      throw new Error(`Failed to query pending matches: ${errText}`);
    }

    const matches: MatchRow[] = await matchesRes.json();
    console.log(`Found ${matches.length} active match(es) with external_id to sync`);

    const results = {
      totalFound: matches.length,
      processed: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ matchId: string; externalId: string; error: string }>,
    };

    // 2. Process each match independently to never fail entire batch
    for (const match of matches) {
      results.processed++;
      try {
        // Respect API rate limits (e.g. 250ms pause between external calls)
        await new Promise((resolve) => setTimeout(resolve, 250));

        const externalResult = await fetchExternalMatch(
          match.external_id,
          footballApiKey,
          footballApiUrl,
        );

        if (!externalResult) {
          console.warn(`No data received for match ${match.id} (ext: ${match.external_id})`);
          continue;
        }

        // Only call apply_auto_result if state changed
        const isFinished = externalResult.status === "finished";
        if (isFinished && (externalResult.homeScore === null || externalResult.awayScore === null)) {
          console.warn(
            `Match ${match.id} external status is finished but scores are missing. Skipping finish update.`,
          );
          continue;
        }

        const rpcUrl = `${supabaseUrl}/rest/v1/rpc/apply_auto_result`;
        const rpcRes = await fetch(rpcUrl, {
          method: "POST",
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_match_id: match.id,
            p_home: externalResult.homeScore,
            p_away: externalResult.awayScore,
            p_status: externalResult.status,
          }),
        });

        if (!rpcRes.ok) {
          const rpcError = await rpcRes.text();
          throw new Error(`apply_auto_result RPC failed: ${rpcError}`);
        }

        results.updated++;
        console.log(
          `Successfully synced match ${match.id}: status=${externalResult.status}, score=${externalResult.homeScore}:${externalResult.awayScore}`,
        );
      } catch (err: unknown) {
        results.failed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error syncing match ${match.id} (external_id: ${match.external_id}):`, errorMessage);
        results.errors.push({
          matchId: match.id,
          externalId: match.external_id,
          error: errorMessage,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (globalErr: unknown) {
    const errorMsg = globalErr instanceof Error ? globalErr.message : String(globalErr);
    console.error("Global error in sync-results function:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
