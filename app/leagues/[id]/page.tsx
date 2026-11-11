"use client";
import { DemoNoticeBadge } from "../../demo-banner";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  PROFILE_UPDATED_EVENT,
} from "../../../lib/supabase/client";

type League = {
  id: string;
  title: string;
  invite_code: string;
  owner_id: string;
};

type Match = {
  id: string;
  league_id: string;
  team_home: string;
  team_away: string;
  match_time: string;
  status: "planned" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  external_id?: string | null;
  result_source?: "manual" | "auto" | null;
  last_synced_at?: string | null;
};

type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number | null;
  profile: Profile | null;
};

type Member = {
  user_id: string;
  role: "owner" | "member";
  profile: Profile | null;
  points: number;
  exactScores: number;
};

type Profile = {
  id: string;
  username: string;
  coins: number | null;
};

type BetPick = "home" | "draw" | "away";

type Bet = {
  user_id: string;
  match_id: string;
  pick: BetPick;
  stake: number;
  payout: number | null;
  settled: boolean;
  profile: Profile | null;
};

type LeagueDetails = {
  league: League;
  owner: Profile | null;
  members: Member[];
  matches: Match[];
  predictions: Prediction[];
  bets: Bet[];
  pools: Record<string, Record<BetPick, number>>;
  currentBalance: number | null;
};

const fieldClassName =
  "h-12 w-full rounded-xl border-2 border-slate-700 bg-slate-900/90 px-3.5 font-mono text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50";

function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

function getActionError(error: unknown, fallback: string) {
  const code = getErrorCode(error);
  if (code === "42501") return "Дію заборонено";
  if (code === "23505") return "Такий запис уже існує (дубль).";
  return fallback;
}

function getBetErrorMessage(error: unknown) {
  const code = getErrorCode(error);
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  if (code === "23505" || message.includes("23505")) {
    return "Ви вже зробили ставку на цей матч";
  }
  if (message.includes("match_already_started")) {
    return "Матч уже розпочався або завершений";
  }
  if (message.includes("insufficient_funds")) {
    return "Недостатньо монет для цієї ставки";
  }
  if (message.includes("invalid_bet_amount")) {
    return "Некоректна сума ставки";
  }

  return "Не вдалося зробити ставку. Спробуйте пізніше.";
}

function formatMatchTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getBetPickLabel(pick: BetPick, match: Match) {
  if (pick === "home") return `Перемога: ${match.team_home}`;
  if (pick === "draw") return "Нічия";
  return `Перемога: ${match.team_away}`;
}

// Рендеринг ярликів за статусами: planned, live, finished, cancelled (без scheduled).
// CSS-анімація лише для "Наживо" з підтримкою prefers-reduced-motion.
function renderMatchStatusBadge(match: Match, now: number) {
  const isFinished = match.status === "finished";
  const isCancelled = match.status === "cancelled";
  const isStarted = now >= new Date(match.match_time).getTime();
  const isLive = match.status === "live" || (match.status === "planned" && isStarted && !isFinished && !isCancelled);

  if (isCancelled) {
    return (
      <span className="inline-block rounded-full border border-rose-500/50 bg-rose-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-300">
        🚫 Скасовано
      </span>
    );
  }

  if (isFinished) {
    if (match.result_source === "auto") {
      return (
        <span className="inline-block rounded-full border border-emerald-500/60 bg-emerald-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
          🤖 Завершено авто
        </span>
      );
    }
    return (
      <span className="inline-block rounded-full border border-teal-500/60 bg-teal-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-300">
        🏁 Завершено вручну
      </span>
    );
  }

  if (isLive) {
    return (
      <span className="inline-block rounded-full border border-amber-500/60 bg-amber-950/50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 animate-pulse motion-reduce:animate-none">
        ⚡ Наживо
      </span>
    );
  }

  return (
    <span className="inline-block rounded-full border border-cyan-500/50 bg-cyan-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300">
      🟢 Заплановано
    </span>
  );
}

export default function LeagueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [details, setDetails] = useState<LeagueDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(
    !isSupabaseConfigured,
  );
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [betError, setBetError] = useState<{
    matchId: string;
    message: string;
  } | null>(null);

  const reload = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !id) return;

    try {
      const { data: league, error: leagueError } = await client
        .from("leagues")
        .select("id, title, invite_code, owner_id")
        .eq("id", id)
        .maybeSingle();

      if (leagueError) throw leagueError;
      if (!league) {
        setNotFound(true);
        return;
      }

      const [
        membersResponse,
        matchesResponse,
        predictionsResponse,
        betsResponse,
      ] = await Promise.all([
        client
          .from("league_members")
          .select("user_id, role")
          .eq("league_id", id),
        client
          .from("matches")
          .select("*")
          .eq("league_id", id)
          .order("match_time", { ascending: true }),
        isAuthResolved
          ? await client
              .from("predictions")
              .select(
                "id, user_id, match_id, predicted_home_score, predicted_away_score, points_earned",
              )
          : Promise.resolve({ data: [] }),
        isAuthResolved
          ? await client
              .from("bets")
              .select("user_id, match_id, pick, stake, payout, settled")
          : Promise.resolve({ data: [] }),
      ]);

      const memberRows = membersResponse.data ?? [];
      const matchRows = (matchesResponse.data as Match[]) ?? [];
      const predictionRows = predictionsResponse.data ?? [];
      const betRows = (betsResponse.data as Bet[]) ?? [];

      const plannedMatches = matchRows.filter(
        (match) => match.status === "planned",
      );

      const poolResults = await Promise.all(
        plannedMatches.map(async (match) => {
          const { data, error } = await client.rpc("match_bet_pools", {
            p_match: match.id,
          });
          if (error) return { matchId: match.id, pools: { home: 0, draw: 0, away: 0 } };
          const p = ((data ?? []) as Array<{ pick: string; total: number }>).reduce(
            (acc, row) => {
              if (row.pick in acc) acc[row.pick as BetPick] = row.total;
              return acc;
            },
            { home: 0, draw: 0, away: 0 } as Record<BetPick, number>,
          );
          return { matchId: match.id, pools: p };
        }),
      );

      const poolsByMatch: Record<string, Record<BetPick, number>> = {};
      for (const item of poolResults) {
        poolsByMatch[item.matchId] = item.pools;
      }

      const userIds = Array.from(
        new Set([
          league.owner_id,
          ...memberRows.map((m) => m.user_id),
          ...predictionRows.map((p) => p.user_id),
          ...betRows.map((b) => b.user_id),
        ]),
      );

      let profilesById = new Map<string, Profile>();
      if (userIds.length > 0) {
        const { data: profileRows, error: profilesError } = await client
          .from("profiles")
          .select("id, username, coins")
          .in("id", userIds);

        if (!profilesError && profileRows) {
          profilesById = new Map(profileRows.map((p) => [p.id, p]));
        }
      }

      const matchMap = new Map(matchRows.map((m) => [m.id, m]));
      const memberStats = new Map<string, { points: number; exact: number }>();
      for (const m of memberRows) {
        memberStats.set(m.user_id, { points: 0, exact: 0 });
      }

      for (const pred of predictionRows) {
        const match = matchMap.get(pred.match_id);
        if (
          match &&
          match.status === "finished" &&
          match.home_score !== null &&
          match.away_score !== null
        ) {
          const stats = memberStats.get(pred.user_id);
          if (stats) {
            let pts = 0;
            const actualDiff = match.home_score - match.away_score;
            const predDiff = pred.predicted_home_score - pred.predicted_away_score;

            if (
              match.home_score === pred.predicted_home_score &&
              match.away_score === pred.predicted_away_score
            ) {
              pts = 3;
              stats.exact += 1;
            } else if (
              (actualDiff > 0 && predDiff > 0) ||
              (actualDiff < 0 && predDiff < 0) ||
              (actualDiff === 0 && predDiff === 0)
            ) {
              pts = 1;
            }
            stats.points += pts;
          }
        }
      }

      const members: Member[] = memberRows
        .map((m) => ({
          user_id: m.user_id,
          role: m.role as "owner" | "member",
          profile: profilesById.get(m.user_id) ?? null,
          points: memberStats.get(m.user_id)?.points ?? 0,
          exactScores: memberStats.get(m.user_id)?.exact ?? 0,
        }))
        .sort((a, b) => b.points - a.points || b.exactScores - a.exactScores);

      const predictions: Prediction[] = predictionRows.map((p) => ({
        ...p,
        profile: profilesById.get(p.user_id) ?? null,
      }));

      const bets: Bet[] = betRows.map((b) => ({
        ...b,
        profile: profilesById.get(b.user_id) ?? null,
      }));

      const myProf = currentUserId ? profilesById.get(currentUserId) : null;

      setDetails({
        league: league as League,
        owner: profilesById.get(league.owner_id) ?? null,
        members,
        matches: matchRows,
        predictions,
        bets,
        pools: poolsByMatch,
        currentBalance: myProf?.coins ?? null,
      });
    } catch (err: unknown) {
      console.error(err);
      setLoadError("Не вдалося завантажити лігу.");
    } finally {
      setIsLoading(false);
    }
  }, [id, currentUserId, isAuthResolved]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    client.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      setIsAuthResolved(true);
    });
  }, []);

  useEffect(() => {
    if (isAuthResolved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    }
  }, [isAuthResolved, reload]);

  async function handleCopyInviteCode() {
    if (!details) return;
    setCopyMessage(null);
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(details.league.invite_code);
      setCopyMessage("Код успішно скопійовано!");
    } catch {
      setCopyError("Не вдалося скопіювати код.");
    }
  }

  async function handleSavePrediction(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !currentUserId) return;

    const form = new FormData(event.currentTarget);
    const homeScore = Number(form.get("home-score"));
    const awayScore = Number(form.get("away-score"));

    setBusyAction(`prediction-${match.id}`);
    setActionError(null);
    setActionMessage(null);

    try {
      const { error } = await client.from("predictions").upsert(
        {
          user_id: currentUserId,
          match_id: match.id,
          predicted_home_score: homeScore,
          predicted_away_score: awayScore,
        },
        { onConflict: "user_id,match_id" },
      );

      if (error) throw error;
      setActionMessage("Ваш прогноз збережено!");
      reload();
    } catch (err: unknown) {
      setActionError(getActionError(err, "Не вдалося зберегти прогноз."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePlaceBet(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !currentUserId) return;

    const form = new FormData(event.currentTarget);
    const pick = form.get("bet-pick") as BetPick;
    const stakeValue = Number(form.get("bet-stake"));

    if (!stakeValue || stakeValue <= 0) {
      setBetError({ matchId: match.id, message: "Введіть коректну ставку" });
      return;
    }

    if (
      details?.currentBalance === null ||
      details?.currentBalance === undefined ||
      stakeValue > details.currentBalance
    ) {
      setBetError({ matchId: match.id, message: "Недостатньо монет" });
      return;
    }

    setBusyAction(`bet-${match.id}`);
    setBetError(null);
    setActionError(null);
    setActionMessage(null);

    try {
      const { error } = await client.rpc("place_bet", {
        p_match: match.id,
        p_pick: pick,
        p_stake: stakeValue,
      });

      if (error) throw error;
      setActionMessage("Ставку на матч прийнято!");
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      reload();
    } catch (err: unknown) {
      setBetError({ matchId: match.id, message: getBetErrorMessage(err) });
    } finally {
      setBusyAction(null);
    }
  }

  // Додавання матчу власником (включаючи external_id)
  async function handleAddMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !details) return;

    const form = new FormData(event.currentTarget);
    const teamHome = String(form.get("team-home")).trim();
    const teamAway = String(form.get("team-away")).trim();
    const matchTime = String(form.get("match-time"));
    const externalId = String(form.get("external-id") || "").trim() || null;

    setBusyAction("add-match");
    setActionError(null);
    setActionMessage(null);

    try {
      const insertPayload: Record<string, unknown> = {
        league_id: details.league.id,
        team_home: teamHome,
        team_away: teamAway,
        match_time: new Date(matchTime).toISOString(),
        status: "planned",
      };
      if (externalId) {
        insertPayload.external_id = externalId;
      }

      const { error } = await client.from("matches").insert(insertPayload);

      if (error) throw error;
      setActionMessage("Матч успішно додано у розклад!");
      (event.target as HTMLFormElement).reset();
      reload();
    } catch (err) {
      setActionError(getActionError(err, "Не вдалося додати матч."));
    } finally {
      setBusyAction(null);
    }
  }

  // Швидке редагування для існуючого матчу (update лише колонки external_id)
  async function handleUpdateExternalId(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !details) return;

    const form = new FormData(event.currentTarget);
    const externalId = String(form.get("external-id") || "").trim() || null;

    setBusyAction(`ext-${match.id}`);
    setActionError(null);
    setActionMessage(null);

    try {
      const { error } = await client
        .from("matches")
        .update({ external_id: externalId })
        .eq("id", match.id);

      if (error) throw error;
      setActionMessage("API ID матчу оновлено!");
      reload();
    } catch (err) {
      setActionError(getActionError(err, "Не вдалося оновити API ID матчу."));
    } finally {
      setBusyAction(null);
    }
  }

  // Ручне внесення результату (result_source = 'manual')
  async function handleSaveResult(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !details) return;

    const form = new FormData(event.currentTarget);
    const homeScore = Number(form.get("home-score"));
    const awayScore = Number(form.get("away-score"));

    setBusyAction(`result-${match.id}`);
    setActionError(null);
    setActionMessage(null);

    try {
      const { data, error } = await client
        .from("matches")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "finished",
          result_source: "manual",
        })
        .eq("id", match.id)
        .eq("league_id", details.league.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setActionError("Дію заборонено");
        return;
      }

      setActionMessage("Результат матчу зафіксовано, очки нараховано!");
      reload();
    } catch (err) {
      setActionError(getActionError(err, "Не вдалося зберегти результат матчу."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteMatch(match: Match) {
    if (!window.confirm(`Видалити матч ${match.team_home} — ${match.team_away}?`)) return;
    const client = getSupabaseClient();
    if (!client || !details) return;

    setBusyAction(`delete-match-${match.id}`);
    try {
      const { error } = await client.from("matches").delete().eq("id", match.id);
      if (error) throw error;
      setActionMessage("Матч видалено.");
      reload();
    } catch (err) {
      setActionError(getActionError(err, "Не вдалося видалити матч."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLeaveLeague() {
    if (!details || !currentUserId) return;
    if (!window.confirm("Дійсно покинути цю лігу?")) return;
    const client = getSupabaseClient();
    if (!client) return;

    setBusyAction("leave-league");
    try {
      const { error } = await client
        .from("league_members")
        .delete()
        .eq("league_id", details.league.id)
        .eq("user_id", currentUserId);

      if (error) throw error;
      router.replace("/leagues");
    } catch {
      setActionError("Не вдалося покинути лігу.");
      setBusyAction(null);
    }
  }

  async function handleDeleteLeague() {
    if (!details || !currentUserId) return;
    if (!window.confirm(`ВИДАЛИТИ ЛІГУ «${details.league.title}» НАЗАВЖДИ?`)) return;
    const client = getSupabaseClient();
    if (!client) return;

    setBusyAction("delete-league");
    try {
      const { error } = await client.from("leagues").delete().eq("id", details.league.id);
      if (error) throw error;
      router.replace("/leagues");
    } catch {
      setActionError("Не вдалося видалити лігу.");
      setBusyAction(null);
    }
  }

  const isOwner = Boolean(
    isAuthResolved &&
      details &&
      currentUserId &&
      details.league.owner_id === currentUserId,
  );
  const isMember = Boolean(
    !isOwner &&
      currentUserId &&
      details?.members.some(
        (member) => member.user_id === currentUserId && member.role === "member",
      ),
  );

  const [now] = useState(() => Date.now());

  return (
    <main className="min-h-screen flex-1 bg-[#050813] px-4 py-6 font-sans text-slate-100 sm:px-8 sm:py-10 relative overflow-hidden select-none">
      {/* М'яке фонове дифузне світіння */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#FC7340]/15 via-[#0297DE]/10 to-transparent blur-[130px] rounded-full" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] bg-[#0297DE]/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <DemoNoticeBadge />
        {/* Navigation Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#162544]/80 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3.5 bg-[#0297DE] rounded-full group-hover:h-4 transition-all" />
                <span className="w-1 h-4.5 bg-[#0297DE] rounded-full group-hover:h-5 transition-all" />
                <span className="w-1 h-3.5 bg-[#0297DE] rounded-full group-hover:h-4 transition-all" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-[0.16em] text-white uppercase ml-1">
                MATCHDAY
              </span>
            </Link>
            <span className="text-slate-600">|</span>
            <Link href="/leagues" className="text-xs font-mono font-medium text-[#0297DE] hover:underline flex items-center gap-1">
              ← До списку ліг
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/online"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🌐 Онлайн PvP
            </Link>
            <Link
              href="/wheel"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🎡 Колесо
            </Link>
            <Link
              href="/cases"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🎁 Кейси
            </Link>
            <Link
              href="/blackjack"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🃏 Блекджек
            </Link>
            <Link
              href="/dice"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🎲 Кості
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <span className="text-sm font-bold text-cyan-400 animate-pulse">
              ⚡ Завантаження ліги та розкладу матчів...
            </span>
          </div>
        ) : notFound ? (
          <section className="mt-8 rounded-3xl border-2 border-slate-800 bg-[#0e121a] p-10 text-center shadow-xl">
            <span className="text-4xl">🔍</span>
            <h1 className="mt-3 text-2xl font-black text-white">ЛІГУ НЕ ЗНАЙДЕНО</h1>
            <p className="mt-1 text-xs text-slate-400">Можливо її було видалено або код невірний.</p>
            <Link
              href="/leagues"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-600 px-6 py-2.5 text-xs font-bold uppercase text-black hover:bg-cyan-500 transition"
            >
              До списку ліг
            </Link>
          </section>
        ) : loadError ? (
          <p role="alert" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-center text-sm font-bold text-rose-300">
            {loadError}
          </p>
        ) : details ? (
          <>
            {/* Header картка ліги */}
            <header className="mb-8 rounded-3xl border-2 border-cyan-900/60 bg-gradient-to-r from-[#0d131f] via-[#090d14] to-[#07090d] p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-block rounded-full border border-cyan-500/40 bg-cyan-950/40 px-3 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-2">
                    ⚽ ЛІГА ПРОГНОЗІВ НА МАТЧІ
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                    {details.league.title}
                  </h1>
                  <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <span>👑 Організатор:</span>
                    <span className="font-bold text-emerald-400">
                      {details.owner?.username ?? "Організатор"}
                    </span>
                  </p>
                </div>

                {/* Баланс монет */}
                {details.currentBalance !== null && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 px-5 py-3 text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                      Ваш ігровий банк
                    </span>
                    <span className="text-xl font-black text-amber-300">
                      🪙 {details.currentBalance.toLocaleString()} монет
                    </span>
                  </div>
                )}
              </div>
            </header>

            {/* Інвайт-код блок */}
            <section className="mb-8 rounded-2xl border border-slate-800 bg-[#0d1117] p-5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                    🔑 КОД ДЛЯ ЗАПРОШЕННЯ ДРУЗІВ:
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Поділіться цим кодом, щоб друзі могли вступити у вашу лігу
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="rounded-xl border-2 border-cyan-500/60 bg-black/80 px-4 py-2 font-mono text-lg font-black tracking-widest text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    {details.league.invite_code}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyInviteCode}
                    className="min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 px-5 py-2.5 text-xs font-black uppercase text-black hover:from-cyan-400 hover:to-teal-300 transition shadow-md"
                  >
                    📋 Копіювати
                  </button>
                </div>
              </div>
              {copyMessage && (
                <p className="mt-2 text-xs font-bold text-emerald-400 text-right">{copyMessage}</p>
              )}
              {copyError && (
                <p className="mt-2 text-xs font-bold text-rose-400 text-right">{copyError}</p>
              )}
            </section>

            {/* Повідомлення дій */}
            {actionError && (
              <div role="alert" className="mb-6 rounded-xl border border-rose-600 bg-rose-950/40 p-4 text-center text-sm font-bold text-rose-300">
                ⚠️ {actionError}
              </div>
            )}
            {actionMessage && (
              <div role="status" className="mb-6 rounded-xl border border-emerald-600 bg-emerald-950/40 p-4 text-center text-sm font-bold text-emerald-300">
                ✓ {actionMessage}
              </div>
            )}

            {/* ТАБЛИЦЯ ЛІДЕРІВ / УЧАСНИКИ ЛІГИ */}
            <section className="mb-10 rounded-3xl border-2 border-slate-800 bg-[#0c1017] p-6 shadow-xl">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <span>🏆</span> ТАБЛИЦЯ ЛІДЕРІВ ЛІГИ ({details.members.length})
                </h2>
                <span className="text-xs text-slate-400 font-bold">
                  Правила: +3 за точний рахунок, +1 за вгаданий результат
                </span>
              </div>

              {details.members.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <span className="text-3xl">👥</span>
                  <p className="mt-2 text-sm font-bold text-white">У цій лізі поки немає учасників</p>
                  <p className="mt-1 text-slate-400">Поділіться інвайт-кодом ліги з друзями, щоб розпочати турнір!</p>
                </div>
              ) : (
                <>
                  {/* Мобільний вигляд (картки): sm:hidden */}
                  <div className="sm:hidden space-y-3">
                    {details.members.map((member, idx) => (
                      <div
                        key={member.user_id}
                        className="animate-card-in rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] p-3.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-slate-400">#{idx + 1}</span>
                            <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👤"}</span>
                            <span className="font-bold text-white truncate max-w-[140px]">{member.profile?.username ?? "Гравець"}</span>
                          </div>
                          <span className="rounded-[var(--radius-sm)] bg-emerald-950/60 border border-emerald-500/50 px-2.5 py-1 font-black text-emerald-300 text-xs">
                            +{member.points} оч.
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-xs border-t border-slate-800/60 pt-2 text-slate-400 font-mono">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                              member.role === "owner"
                                ? "border border-amber-600/50 bg-amber-950/30 text-amber-300"
                                : "border border-slate-700 bg-slate-800 text-slate-300"
                            }`}
                          >
                            {member.role === "owner" ? "👑 Організатор" : "⚽ Гравець"}
                          </span>
                          <span>Точних: <strong className="text-white">{member.exactScores}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Десктопний вигляд (таблиця): hidden sm:block */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="pb-2.5">#</th>
                          <th className="pb-2.5">Учасник</th>
                          <th className="pb-2.5">Роль</th>
                          <th className="pb-2.5 text-center">Точні рахунки</th>
                          <th className="pb-2.5 text-right">Бали ліги</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {details.members.map((member, idx) => (
                          <tr key={member.user_id} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 font-bold text-white flex items-center gap-1.5">
                              <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👤"}</span>
                              <span>{member.profile?.username ?? "Гравець"}</span>
                            </td>
                            <td className="py-3">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                                  member.role === "owner"
                                    ? "border border-amber-600/50 bg-amber-950/30 text-amber-300"
                                    : "border border-slate-700 bg-slate-800 text-slate-300"
                                }`}
                              >
                                {member.role === "owner" ? "👑 Організатор" : "⚽ Гравець"}
                              </span>
                            </td>
                            <td className="py-3 text-center text-slate-300 font-bold">
                              {member.exactScores}
                            </td>
                            <td className="py-3 text-right">
                              <span className="rounded-lg bg-emerald-950/60 border border-emerald-500/50 px-3 py-1 font-black text-emerald-300 text-sm">
                                +{member.points} оч.
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* ПАНЕЛЬ ОРГАНІЗАТОРА (ДОДАТИ МАТЧ) */}
            {isOwner && (
              <section className="mb-10 rounded-3xl border-2 border-cyan-800/60 bg-gradient-to-r from-cyan-950/30 via-[#0d121c] to-[#0a0d14] p-6 shadow-2xl">
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 block">
                    ⚙️ ПАНЕЛЬ ОРГАНІЗАТОРА
                  </span>
                  <h2 className="text-xl font-black text-white">Додати матч у розклад</h2>
                </div>

                <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={handleAddMatch}>
                  <div>
                    <label htmlFor="team-home" className="mb-1.5 block text-xs font-bold text-slate-300">
                      Господарі (Команда 1)
                    </label>
                    <input
                      id="team-home"
                      name="team-home"
                      type="text"
                      placeholder="Напр. Динамо Київ"
                      required
                      maxLength={100}
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="team-away" className="mb-1.5 block text-xs font-bold text-slate-300">
                      Гості (Команда 2)
                    </label>
                    <input
                      id="team-away"
                      name="team-away"
                      type="text"
                      placeholder="Напр. Шахтар Донецьк"
                      required
                      maxLength={100}
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="match-time" className="mb-1.5 block text-xs font-bold text-slate-300">
                      Дата й час матчу
                    </label>
                    <input
                      id="match-time"
                      name="match-time"
                      type="datetime-local"
                      required
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="external-id" className="mb-1.5 block text-xs font-bold text-slate-300">
                      API ID (external_id, опц.)
                    </label>
                    <input
                      id="external-id"
                      name="external-id"
                      type="text"
                      placeholder="Напр. 493321"
                      maxLength={50}
                      className={fieldClassName}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={busyAction === "add-match"}
                      className="min-h-[44px] h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 font-sans text-xs font-black uppercase text-black hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                    >
                      {busyAction === "add-match" ? "Додаємо..." : "⚽ Додати матч"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* СПИСОК МАТЧІВ */}
            <section>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>⚽</span> РОЗКЛАД МАТЧІВ ({details.matches.length})
                </h2>
                <span className="text-xs text-slate-400">Роби прогнози та ставки до початку гри</span>
              </div>

              {details.matches.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-800 bg-[#0d1017] p-12 text-center text-slate-400">
                  <span className="text-4xl">⚽</span>
                  <h3 className="mt-3 text-base font-bold text-white">У цій лізі поки немає матчів</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {isOwner ? "Створіть перший матч у панелі організатора вище!" : "Організатор ліги незабаром додасть матчі."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-6">
                  {details.matches.map((match) => {
                    const isFinished = match.status === "finished";
                    const isCancelled = match.status === "cancelled";
                    const started =
                      isFinished ||
                      match.status === "live" ||
                      now >= new Date(match.match_time).getTime();

                    const ownPrediction = details.predictions.find(
                      (p) => p.match_id === match.id && p.user_id === currentUserId,
                    );
                    const ownBet = details.bets.find(
                      (b) => b.match_id === match.id && b.user_id === currentUserId,
                    );
                    const visibleBets = details.bets.filter((b) => b.match_id === match.id);
                    const matchPools = details.pools[match.id] ?? { home: 0, draw: 0, away: 0 };
                    const totalPool = matchPools.home + matchPools.draw + matchPools.away;
                    const visiblePredictions = details.predictions.filter(
                      (p) => p.match_id === match.id && (started || p.user_id === currentUserId),
                    );

                    return (
                      <li
                        key={match.id}
                        className="rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-[#111724] via-[#0d111a] to-[#080a0f] p-6 shadow-2xl hover:border-slate-700 transition"
                      >
                        {/* Команди та рахунок */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-xl sm:text-2xl font-black text-white">
                                {match.team_home}
                              </span>
                              <span className="rounded-md border border-cyan-800/80 bg-cyan-950/60 px-2 py-0.5 text-xs font-black text-cyan-300">
                                VS
                              </span>
                              <span className="text-xl sm:text-2xl font-black text-white">
                                {match.team_away}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-sans">
                              <span>🕒 {formatMatchTime(match.match_time)}</span>
                              {match.external_id && (
                                <span className="rounded-md border border-cyan-800/60 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                  🌐 API ID: {match.external_id}
                                </span>
                              )}
                              {match.last_synced_at && (
                                <span className="text-[10px] text-slate-400">
                                  (синхр: {formatMatchTime(match.last_synced_at)})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {renderMatchStatusBadge(match, now)}
                            {isFinished && match.home_score !== null && match.away_score !== null && (
                              <div className="mt-2 text-3xl font-black text-amber-400">
                                {match.home_score} : {match.away_score}
                              </div>
                            )}
                            {match.status === "live" && match.home_score !== null && match.away_score !== null && (
                              <div className="mt-2 text-2xl font-black text-amber-300">
                                {match.home_score} : {match.away_score}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Повідомлення при скасуванні */}
                        {isCancelled && (
                          <div className="mt-4 rounded-xl border border-rose-800/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                            ⚠️ Матч скасовано. Усі зроблені ставки автоматично повернено на баланс монет.
                          </div>
                        )}

                        {/* Кнопки модерації організатора */}
                        {isOwner && (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                            <div className="flex flex-wrap items-center gap-3">
                              {started && !isFinished && !isCancelled && (
                                <span className="text-xs font-bold text-amber-400">
                                  Матч розпочався! Внесіть результат після фінального свистка:
                                </span>
                              )}
                              {/* Швидке редагування external_id (update лише колонки external_id) */}
                              <form
                                className="flex flex-wrap items-center gap-2"
                                onSubmit={(e) => void handleUpdateExternalId(e, match)}
                              >
                                <label className="text-[10px] text-slate-400 font-bold uppercase">
                                  API ID:
                                </label>
                                <input
                                  name="external-id"
                                  type="text"
                                  placeholder="ID у провайдера"
                                  defaultValue={match.external_id ?? ""}
                                  className="h-9 w-32 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-white"
                                />
                                <button
                                  type="submit"
                                  disabled={busyAction === `ext-${match.id}`}
                                  className="min-h-[44px] rounded-lg border border-cyan-700 bg-cyan-950/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 transition"
                                >
                                  {busyAction === `ext-${match.id}` ? "..." : "Зберегти ID"}
                                </button>
                              </form>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busyAction !== null}
                                onClick={() => void handleDeleteMatch(match)}
                                className="btn-interactive min-h-[44px] rounded-lg border border-rose-800/80 bg-rose-950/30 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/50 transition"
                              >
                                ✕ Видалити матч
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Внесення результату (Організатор вручну, result_source = 'manual') */}
                        {isOwner && started && !isCancelled && (
                          <form
                            className="mt-5 rounded-2xl border border-amber-600/50 bg-amber-950/20 p-4"
                            onSubmit={(e) => void handleSaveResult(e, match)}
                          >
                            <span className="text-xs font-black uppercase text-amber-300 block mb-2">
                              {isFinished ? "Виправити підсумковий рахунок:" : "Внести фінальний результат:"}
                            </span>
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="w-24">
                                <label className="text-[10px] text-slate-400 block mb-1">
                                  {match.team_home}
                                </label>
                                <input
                                  name="home-score"
                                  type="number"
                                  min="0"
                                  required
                                  defaultValue={match.home_score ?? 0}
                                  className={fieldClassName}
                                />
                              </div>
                              <span className="pb-3 text-xl font-bold text-amber-400">:</span>
                              <div className="w-24">
                                <label className="text-[10px] text-slate-400 block mb-1">
                                  {match.team_away}
                                </label>
                                <input
                                  name="away-score"
                                  type="number"
                                  min="0"
                                  required
                                  defaultValue={match.away_score ?? 0}
                                  className={fieldClassName}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={busyAction === `result-${match.id}`}
                                className="min-h-[44px] h-12 rounded-xl bg-amber-500 px-6 font-sans text-xs font-black uppercase text-black hover:bg-amber-400 transition"
                              >
                                {busyAction === `result-${match.id}` ? "Збереження..." : "🏁 Завершити матч"}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* ФОРМА ПРОГНОЗУ НА МАТЧ */}
                        {!isFinished && !started && !isCancelled && (
                          <form
                            className="mt-6 rounded-2xl border border-slate-800 bg-[#0c1017] p-4 sm:p-5"
                            onSubmit={(e) => void handleSavePrediction(e, match)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <span>🎯</span> ВАШ ПРОГНОЗ НА РАХУНОК
                              </span>
                              {ownPrediction && (
                                <span className="rounded bg-emerald-950/60 border border-emerald-600/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                  Поточний: {ownPrediction.predicted_home_score} : {ownPrediction.predicted_away_score}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-end gap-3">
                              <div className="w-24">
                                <label className="mb-1 block text-[10px] text-slate-400 truncate">
                                  {match.team_home}
                                </label>
                                <input
                                  name="home-score"
                                  type="number"
                                  min="0"
                                  required
                                  defaultValue={ownPrediction?.predicted_home_score ?? 0}
                                  className={fieldClassName}
                                />
                              </div>
                              <span className="pb-3 text-xl font-bold text-slate-400">:</span>
                              <div className="w-24">
                                <label className="mb-1 block text-[10px] text-slate-400 truncate">
                                  {match.team_away}
                                </label>
                                <input
                                  name="away-score"
                                  type="number"
                                  min="0"
                                  required
                                  defaultValue={ownPrediction?.predicted_away_score ?? 0}
                                  className={fieldClassName}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={busyAction === `prediction-${match.id}` || !currentUserId}
                                className="min-h-[44px] h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 font-sans text-xs font-black uppercase tracking-wider text-white shadow-lg hover:from-emerald-500 hover:to-teal-400 transition"
                              >
                                {busyAction === `prediction-${match.id}` ? "Збереження..." : "✓ Зберегти прогноз"}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* СТАВКА НА РЕЗУЛЬТАТ (КОЇНИ) */}
                        {!isFinished && !started && !isCancelled && (
                          <section className="mt-5 rounded-2xl border border-slate-800 bg-[#0c1017] p-4 sm:p-5">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-400 block mb-3">
                              💰 СТАВКА НА ПЕРЕМОЖЦЯ (ПУЛ МОНЕТ)
                            </span>

                            {ownBet ? (
                              <div className="rounded-xl border border-amber-600/50 bg-amber-950/30 p-3 text-xs font-bold text-amber-300">
                                Ваша ставка: {getBetPickLabel(ownBet.pick, match)} — {ownBet.stake} монет.
                              </div>
                            ) : (
                              <form onSubmit={(e) => void handlePlaceBet(e, match)}>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  {(
                                    [
                                      ["home", match.team_home],
                                      ["draw", "Нічия"],
                                      ["away", match.team_away],
                                    ] as const
                                  ).map(([pick, label], idx) => {
                                    const pickPool = matchPools[pick];
                                    const multiplier =
                                      pickPool > 0 && totalPool > 0
                                        ? `${(totalPool / pickPool).toFixed(2)}x`
                                        : "—";

                                    return (
                                      <label
                                        key={pick}
                                        className="cursor-pointer rounded-xl border border-slate-700/80 bg-slate-900/60 p-3.5 hover:border-amber-500 transition block text-xs"
                                      >
                                        <div className="flex items-center gap-2 font-bold text-white">
                                          <input
                                            type="radio"
                                            name="bet-pick"
                                            value={pick}
                                            required
                                            defaultChecked={idx === 0}
                                            className="accent-amber-400"
                                          />
                                          <span>{label}</span>
                                        </div>
                                        <div className="mt-2 text-[11px] text-slate-400">
                                          Пул: <span className="text-amber-400 font-bold">{pickPool}</span> 🪙
                                        </div>
                                        <div className="text-[10px] text-cyan-400 font-bold">
                                          Множник: {multiplier}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>

                                <div className="mt-4 flex flex-wrap items-end gap-3">
                                  <div className="w-40">
                                    <label className="text-[10px] text-slate-400 block mb-1">
                                      Сума ставки (монет):
                                    </label>
                                    <input
                                      name="bet-stake"
                                      type="number"
                                      min="1"
                                      max={details.currentBalance ?? undefined}
                                      required
                                      defaultValue="50"
                                      className={fieldClassName}
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={busyAction === `bet-${match.id}` || !currentUserId}
                                    className="btn-interactive min-h-[44px] h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 font-sans text-xs font-black uppercase text-black hover:from-amber-400 hover:to-amber-500 transition shadow-lg"
                                  >
                                    {busyAction === `bet-${match.id}` ? "Ставимо..." : "Поставити монети"}
                                  </button>
                                </div>
                                {betError?.matchId === match.id && (
                                  <p className="mt-2 text-xs font-bold text-rose-400">{betError.message}</p>
                                )}
                              </form>
                            )}
                          </section>
                        )}

                        {/* Прогнози та ставки інших учасників */}
                        {started && (
                          <div className="mt-5 border-t border-slate-800 pt-4 grid gap-4 sm:grid-cols-2 text-xs">
                            {/* Прогнози */}
                            <div>
                              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Прогнози на гру:
                              </span>
                              {visiblePredictions.length === 0 ? (
                                <p className="text-slate-400">Прогнозів немає</p>
                              ) : (
                                <ul className="space-y-1">
                                  {visiblePredictions.map((pred) => (
                                    <li key={pred.id} className="flex justify-between py-1 border-b border-slate-800/40">
                                      <span className="text-slate-300 font-medium">{pred.profile?.username ?? "Гравець"}</span>
                                      <span className="font-bold text-white">
                                        {pred.predicted_home_score} : {pred.predicted_away_score}
                                        {isFinished && (
                                          <span className="ml-2 text-emerald-400 font-black">
                                            +{pred.points_earned ?? 0} оч.
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Ставки */}
                            <div>
                              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Ставки монет:
                              </span>
                              {visibleBets.length === 0 ? (
                                <p className="text-slate-400">Ставок немає</p>
                              ) : (
                                <ul className="space-y-1">
                                  {visibleBets.map((bet) => (
                                    <li key={`${bet.user_id}-${bet.match_id}`} className="flex justify-between py-1 border-b border-slate-800/40">
                                      <span className="text-slate-300 font-medium">{bet.profile?.username ?? "Гравець"}</span>
                                      <span className="font-bold text-amber-400">
                                        {bet.stake} 🪙 ({getBetPickLabel(bet.pick, match)})
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Небезпечна зона */}
            {(isOwner || isMember) && (
              <section className="mt-12 rounded-3xl border border-rose-900/40 bg-rose-950/10 p-6">
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
                  Зона керування членством:
                </h3>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {isOwner ? "Видалення ліги очистить усі матчі та таблицю результатів." : "Вийти з ліги прогнозистів."}
                  </p>
                  {isOwner ? (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void handleDeleteLeague()}
                      className="min-h-[44px] rounded-xl border border-rose-700 bg-rose-950/40 px-5 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
                    >
                      {busyAction === "delete-league" ? "Видалення..." : "Видалити лігу"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void handleLeaveLeague()}
                      className="min-h-[44px] rounded-xl border border-rose-700 bg-rose-950/40 px-5 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
                    >
                      {busyAction === "leave-league" ? "Вихід..." : "Вийти з ліги"}
                    </button>
                  )}
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
