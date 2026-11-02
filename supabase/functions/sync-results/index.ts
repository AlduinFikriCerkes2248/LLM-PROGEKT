// Supabase Edge Function: sync-results
// Syncs football match results from external sports API using apply_auto_result RPC.
// Protected by x-cron-secret header against CRON_SECRET. API keys are strictly read from secrets.

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
  status: "planned" | "live" | "finished" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
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
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`External API returned status ${response.status} for match ${externalId}`);
  }

  const data = await response.json();

  const statusRaw = String(
    data.match?.status ||
    data.status ||
    data.fixture?.status?.short ||
    "",
  ).toUpperCase();

  // 1. Статуси CANCELLED / CANCELED -> cancelled
  if (statusRaw === "CANCELLED" || statusRaw === "CANCELED") {
    return {
      status: "cancelled",
      homeScore: null,
      awayScore: null,
    };
  }

  // 2. POSTPONED / SUSPENDED / ABANDONED -> пропускаємо з логом
  if (["POSTPONED", "SUSPENDED", "ABANDONED"].includes(statusRaw)) {
    console.log(`[sync-results] Skipping match external_id ${externalId}: status is ${statusRaw}`);
    return null;
  }

  // 3. Статуси наживо (live)
  if (["IN_PLAY", "LIVE", "PAUSED", "HT", "HALF_TIME", "1H", "2H", "BREAK"].includes(statusRaw)) {
    const liveHome =
      data.score?.fullTime?.home ??
      data.score?.current?.home ??
      data.goals?.home ??
      data.homeScore ??
      null;

    const liveAway =
      data.score?.fullTime?.away ??
      data.score?.current?.away ??
      data.goals?.away ??
      data.awayScore ??
      null;

    return {
      status: "live",
      homeScore: liveHome !== null && liveHome !== undefined ? Number(liveHome) : null,
      awayScore: liveAway !== null && liveAway !== undefined ? Number(liveAway) : null,
    };
  }

  // 4. Статуси завершених матчів (finished)
  if (["FINISHED", "FT", "AET", "PEN", "FULL_TIME", "ENDED"].includes(statusRaw)) {
    const duration = String(data.score?.duration || "REGULAR").toUpperCase();

    // Якщо duration не REGULAR, беремо score.regularTime, а без нього пропускаємо з логом
    if (duration !== "REGULAR") {
      const regHome = data.score?.regularTime?.home;
      const regAway = data.score?.regularTime?.away;

      if (regHome === null || regHome === undefined || regAway === null || regAway === undefined) {
        console.warn(
          `[sync-results] Skipping finished match external_id ${externalId}: duration is ${duration} but score.regularTime is missing`,
        );
        return null;
      }

      return {
        status: "finished",
        homeScore: Number(regHome),
        awayScore: Number(regAway),
      };
    }

    // Для регулярного часу
    const homeScoreRaw =
      data.score?.regularTime?.home ??
      data.score?.fullTime?.home ??
      data.score?.current?.home ??
      data.goals?.home ??
      data.homeScore ??
      null;

    const awayScoreRaw =
      data.score?.regularTime?.away ??
      data.score?.fullTime?.away ??
      data.score?.current?.away ??
      data.goals?.away ??
      data.awayScore ??
      null;

    if (homeScoreRaw === null || awayScoreRaw === null || homeScoreRaw === undefined || awayScoreRaw === undefined) {
      console.warn(
        `[sync-results] Skipping finished match external_id ${externalId}: missing scores in API response`,
      );
      return null;
    }

    return {
      status: "finished",
      homeScore: Number(homeScoreRaw),
      awayScore: Number(awayScoreRaw),
    };
  }

  // 5. Заплановані статуси
  if (["TIMED", "SCHEDULED", "PLANNED", "NOT_STARTED", "NS"].includes(statusRaw)) {
    return {
      status: "planned",
      homeScore: null,
      awayScore: null,
    };
  }

  // 6. Невідомі статуси -> пропускаємо з логом
  console.log(`[sync-results] Skipping match external_id ${externalId}: unknown status '${statusRaw}'`);
  return null;
}

Deno.serve(async (req: Request) => {
  // Дозволено лише POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Перевірка заголовка x-cron-secret проти CRON_SECRET (401 при невідповідності)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const reqCronSecret = req.headers.get("x-cron-secret");

  if (!cronSecret || reqCronSecret !== cronSecret) {
    console.warn("[sync-results] Unauthorized: missing or invalid x-cron-secret header");
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid or missing x-cron-secret" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const footballApiKey = Deno.env.get("FOOTBALL_API_KEY") || Deno.env.get("SPORTS_API_KEY");
  const footballApiUrl =
    Deno.env.get("FOOTBALL_API_URL") || "https://api.football-data.org/v4/matches";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[sync-results] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!footballApiKey) {
    console.error("[sync-results] Missing FOOTBALL_API_KEY in Edge Function secrets");
    return new Response(
      JSON.stringify({ error: "FOOTBALL_API_KEY secret is not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Отримуємо матчі з external_id, які вже розпочалися або заплановані, і ще не finished / cancelled
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
    console.log(`[sync-results] Found ${matches.length} active match(es) with external_id to sync`);

    const results = {
      totalFound: matches.length,
      processed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ matchId: string; externalId: string; error: string }>,
    };

    for (const match of matches) {
      results.processed++;
      try {
        // Затримка для дотримання лімітів зовнішнього API (250ms)
        await new Promise((resolve) => setTimeout(resolve, 250));

        const externalResult = await fetchExternalMatch(
          match.external_id,
          footballApiKey,
          footballApiUrl,
        );

        if (!externalResult) {
          results.skipped++;
          continue;
        }

        // Заборона переводити у finished без обох рахунків
        if (externalResult.status === "finished" && (externalResult.homeScore === null || externalResult.awayScore === null)) {
          console.warn(
            `[sync-results] Match ${match.id} has status finished but missing score (${externalResult.homeScore}:${externalResult.awayScore}). Skipping.`,
          );
          results.skipped++;
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
          `[sync-results] Successfully synced match ${match.id}: status=${externalResult.status}, score=${externalResult.homeScore}:${externalResult.awayScore}`,
        );
      } catch (err: unknown) {
        results.failed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[sync-results] Error syncing match ${match.id} (external_id: ${match.external_id}):`, errorMessage);
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
    console.error("[sync-results] Global error:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
