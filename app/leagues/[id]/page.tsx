"use client";

import { DemoNoticeBadge } from "../../demo-banner";
import { ActionForm } from "@/components/action-form";
import { generateMatchPreviewAction } from "./actions";

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
  venue?: string | null;
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
  if (code === "42501") return "Дію заборонено політикою доступу.";
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

function getTeamInitials(name: string) {
  if (!name) return "MD";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

function TeamBadge({ name, side }: { name: string; side: "home" | "away" }) {
  const initials = getTeamInitials(name);
  const isHome = side === "home";

  return (
    <div
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border font-black tracking-wider text-xs shadow-md transition-transform group-hover:scale-105 ${
        isHome
          ? "border-cyan-500/40 bg-gradient-to-br from-cyan-950/80 to-[#0d1522] text-cyan-300 shadow-[0_0_12px_rgba(8,191,234,0.15)]"
          : "border-orange-500/40 bg-gradient-to-br from-orange-950/80 to-[#0d1522] text-orange-300 shadow-[0_0_12px_rgba(255,122,36,0.15)]"
      }`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-2xl bg-radial from-white/10 to-transparent opacity-40" />
      <span className="relative z-10">{initials}</span>
    </div>
  );
}

function renderMatchStatusBadge(match: Match, now: number) {
  const isFinished = match.status === "finished";
  const isCancelled = match.status === "cancelled";
  const isStarted = now >= new Date(match.match_time).getTime();
  const isLive =
    match.status === "live" ||
    (match.status === "planned" && isStarted && !isFinished && !isCancelled);

  if (isCancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Скасовано
      </span>
    );
  }

  if (isFinished) {
    if (match.result_source === "auto") {
      return (
        <span className="badge-finished">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Завершено (AI)
        </span>
      );
    }
    return (
      <span className="badge-finished">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Завершено
      </span>
    );
  }

  if (isLive) {
    return (
      <span className="badge-live animate-pulse motion-reduce:animate-none">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        LIVE
      </span>
    );
  }

  return (
    <span className="badge-scheduled">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
      Заплановано
    </span>
  );
}

export default function LeagueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [details, setDetails] = useState<LeagueDetails | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(!isSupabaseConfigured);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [betError, setBetError] = useState<{
    matchId: string;
    message: string;
  } | null>(null);

  // Стан інтерфейсу редизайну v2
  const [matchFilter, setMatchFilter] = useState<"all" | "planned" | "finished">("all");
  const [activeTabs, setActiveTabs] = useState<
    Record<string, "prediction" | "bet" | "ai" | "details" | "admin" | null>
  >({});
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [betStakeInputs, setBetStakeInputs] = useState<Record<string, number>>({});

  const [now] = useState(() => Date.now());

  const toggleTab = (
    matchId: string,
    tab: "prediction" | "bet" | "ai" | "details" | "admin",
  ) => {
    setActiveTabs((prev) => ({
      ...prev,
      [matchId]: prev[matchId] === tab ? null : tab,
    }));
  };

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
          if (error)
            return { matchId: match.id, pools: { home: 0, draw: 0, away: 0 } };
          const p = (
            (data ?? []) as Array<{ pick: string; total: number }>
          ).reduce(
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
            const predDiff =
              pred.predicted_home_score - pred.predicted_away_score;

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

    client.auth.getSession().then(({ data }) => {
      setSessionToken(data.session?.access_token ?? "");
      setCurrentUserId(data.session?.user?.id ?? null);
      setIsAuthResolved(true);
    });
  }, []);

  useEffect(() => {
    if (isAuthResolved) {
      void reload();
    }
  }, [isAuthResolved, reload]);

  async function handleCopyInviteCode() {
    if (!details) return;
    setCopyMessage(null);
    try {
      await navigator.clipboard.writeText(details.league.invite_code);
      setCopyMessage("Код скопійовано в буфер!");
      setTimeout(() => setCopyMessage(null), 3000);
    } catch {
      setCopyMessage("Помилка копіювання.");
    }
  }

  async function handleSavePrediction(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
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
      setActionMessage("Ваш прогноз збережено успішно!");
      setActiveTabs((prev) => ({ ...prev, [match.id]: null }));
      reload();
    } catch (err: unknown) {
      setActionError(getActionError(err, "Не вдалося зберегти прогноз."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePlaceBet(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
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
      setActionMessage("Ставку на матч успішно прийнято!");
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setActiveTabs((prev) => ({ ...prev, [match.id]: null }));
      reload();
    } catch (err: unknown) {
      setBetError({ matchId: match.id, message: getBetErrorMessage(err) });
    } finally {
      setBusyAction(null);
    }
  }

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
      setActionMessage("Матч успішно додано у розклад ліги!");
      (event.target as HTMLFormElement).reset();
      setIsAddMatchModalOpen(false);
      reload();
    } catch (err) {
      setActionError(getActionError(err, "Не вдалося додати матч."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateExternalId(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
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

  async function handleSaveResult(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
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
        setActionError("Дію заборонено політикою доступу.");
        return;
      }

      setActionMessage("Результат зафіксовано, бали оновлено!");
      reload();
    } catch (err) {
      setActionError(getActionError(err, "Не вдалося зберегти результат матчу."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteMatch(match: Match) {
    if (
      !window.confirm(`Видалити матч «${match.team_home} — ${match.team_away}»?`)
    )
      return;
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
    if (
      !window.confirm(
        `ВИДАЛИТИ ЛІГУ «${details.league.title}» НАЗАВЖДИ? Усі матчі та результати будуть втрачені.`,
      )
    )
      return;
    const client = getSupabaseClient();
    if (!client) return;

    setBusyAction("delete-league");
    try {
      const { error } = await client
        .from("leagues")
        .delete()
        .eq("id", details.league.id);
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
        (member) =>
          member.user_id === currentUserId && member.role === "member",
      ),
  );

  const currentUserMember = details?.members.find(
    (m) => m.user_id === currentUserId,
  );
  const currentUserRank = details?.members.findIndex(
    (m) => m.user_id === currentUserId,
  );

  // Фільтрація матчів
  const filteredMatches = (details?.matches ?? []).filter((match) => {
    if (matchFilter === "planned") return match.status === "planned";
    if (matchFilter === "finished") return match.status === "finished";
    return true;
  });

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--text-main)] font-sans antialiased overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* М'яке фонове стадіонне сяйво (Cyan ліворуч, Orange праворуч) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-600/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[550px] w-[550px] rounded-full bg-orange-600/15 blur-[150px]" />
        <div className="absolute -bottom-40 left-1/4 h-[450px] w-[450px] rounded-full bg-cyan-900/20 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <DemoNoticeBadge />

        {/* НАВІГАЦІЙНА ШАПКА MATCHDAY */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-2.5 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 font-black text-black shadow-md shadow-cyan-500/30">
                🏆
              </div>
              <span className="font-black text-base tracking-[0.16em] uppercase text-white group-hover:text-cyan-400 transition">
                MATCHDAY
              </span>
            </Link>
            <span className="text-[var(--text-secondary)]/50">/</span>
            <Link
              href="/leagues"
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-cyan-400 transition flex items-center gap-1"
            >
              <span>←</span> До списку ліг
            </Link>
          </div>

          {/* Швидкі посилання на ігрові модулі */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/online"
              className="btn-ghost text-xs py-1.5 px-3 rounded-lg"
            >
              🌐 Онлайн PvP
            </Link>
            <Link
              href="/wheel"
              className="btn-ghost text-xs py-1.5 px-3 rounded-lg"
            >
              🎡 Колесо
            </Link>
            <Link
              href="/cases"
              className="btn-ghost text-xs py-1.5 px-3 rounded-lg"
            >
              🎁 Кейси
            </Link>
            <Link
              href="/blackjack"
              className="btn-ghost text-xs py-1.5 px-3 rounded-lg"
            >
              🃏 Блекджек
            </Link>
            <Link
              href="/dice"
              className="btn-ghost text-xs py-1.5 px-3 rounded-lg"
            >
              🎲 Кості
            </Link>

            {/* Баланс монет у шапці */}
            {details?.currentBalance !== null &&
              details?.currentBalance !== undefined && (
                <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  <span>🪙</span>
                  <span>{details.currentBalance.toLocaleString()}</span>
                </div>
              )}
          </div>
        </header>

        {/* СТАНИ ЗАВАНТАЖЕННЯ ТА ПОМИЛОК */}
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-cyan-400 animate-pulse">
              Завантаження арени MATCHDAY...
            </p>
          </div>
        ) : notFound ? (
          <div className="matchday-card mx-auto mt-12 max-w-lg p-10 text-center">
            <span className="text-5xl">🔍</span>
            <h1 className="mt-4 text-2xl font-black text-white">
              ЛІГУ НЕ ЗНАЙДЕНО
            </h1>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Можливо, лігу було видалено або вказано невірний ідентифікатор.
            </p>
            <Link
              href="/leagues"
              className="btn-cyan mt-6 inline-flex text-xs uppercase"
            >
              До списку ліг
            </Link>
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="my-8 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-center text-sm font-bold text-rose-300"
          >
            {loadError}
          </div>
        ) : details ? (
          <>
            {/* ГЛОБАЛЬНІ ПОВІДОМЛЕННЯ ДІЙ */}
            {actionError && (
              <div
                role="alert"
                className="mb-4 flex items-center justify-between rounded-xl border border-rose-600/70 bg-rose-950/60 p-4 text-xs font-bold text-rose-200 shadow-lg animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
            {actionMessage && (
              <div
                role="status"
                className="mb-4 flex items-center justify-between rounded-xl border border-emerald-600/70 bg-emerald-950/60 p-4 text-xs font-bold text-emerald-200 shadow-lg animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>{actionMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionMessage(null)}
                  className="text-emerald-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ВЕРХНЯ ЗОНА: БЛОК ЛІГИ ТА ІНВАЙТ-КОД */}
            <section className="matchday-card mb-8 p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <span className="badge-scheduled">⚽ Ліга прогнозів</span>
                    <span className="rounded-md border border-[var(--border)] bg-[#0d1522] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                      👥 {details.members.length} учасників
                    </span>
                    <span className="rounded-md border border-[var(--border)] bg-[#0d1522] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                      📅 {details.matches.length} матчів
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {details.league.title}
                  </h1>

                  <p className="mt-2 text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                    <span>👑 Організатор:</span>
                    <span className="font-bold text-white">
                      {details.owner?.username ?? "Організатор"}
                    </span>
                    {isOwner && (
                      <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300 uppercase">
                        Ви
                      </span>
                    )}
                  </p>
                </div>

                {/* Права частина шапки: Інвайт-код + Кнопка створення матчу */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Інвайт-код */}
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[#070b14]/90 p-1.5 pl-3">
                    <div className="text-left pr-2">
                      <span className="block text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                        Код ліги
                      </span>
                      <code className="font-mono text-sm font-black text-cyan-300 tracking-wider">
                        {details.league.invite_code}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      className="btn-cyan text-xs py-1.5 px-3 rounded-lg"
                      title="Скопіювати код запрошення"
                    >
                      📋 Копіювати
                    </button>
                  </div>

                  {/* Кнопка відкриття модального вікна для додавання матчу */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsAddMatchModalOpen(true)}
                      className="btn-orange text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-lg"
                    >
                      <span>➕</span> Додати матч
                    </button>
                  )}
                </div>
              </div>

              {copyMessage && (
                <p className="mt-2 text-right text-xs font-bold text-emerald-400 animate-fade-in">
                  ✓ {copyMessage}
                </p>
              )}
            </section>

            {/* ОСНОВНА СІТКА ДИЗАЙНУ: 8 колонок зліва (Матчі), 4 колонки справа (Таблиця лідерів) */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* ЛІВА КОЛОНКА: РОЗКЛАД ТА КАРТКИ МАТЧІВ (8 з 12) */}
              <div className="space-y-6 lg:col-span-8">
                {/* Панель керування фільтром розкладу */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black uppercase tracking-wider text-white">
                      Розклад поєдинків
                    </span>
                    <span className="rounded-full bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 text-xs font-bold text-cyan-300">
                      {filteredMatches.length}
                    </span>
                  </div>

                  {/* Фільтри статусів */}
                  <div className="flex items-center rounded-xl border border-[var(--border)] bg-[#070b14] p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setMatchFilter("all")}
                      className={`rounded-lg px-3 py-1 font-bold transition ${
                        matchFilter === "all"
                          ? "bg-cyan-500 text-black shadow"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      Всі
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchFilter("planned")}
                      className={`rounded-lg px-3 py-1 font-bold transition ${
                        matchFilter === "planned"
                          ? "bg-cyan-500 text-black shadow"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      Заплановані
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchFilter("finished")}
                      className={`rounded-lg px-3 py-1 font-bold transition ${
                        matchFilter === "finished"
                          ? "bg-cyan-500 text-black shadow"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      Завершені
                    </button>
                  </div>
                </div>

                {/* Порожній стан */}
                {filteredMatches.length === 0 ? (
                  <div className="matchday-card p-12 text-center">
                    <span className="text-4xl">⚽</span>
                    <h3 className="mt-3 text-base font-bold text-white">
                      {matchFilter === "all"
                        ? "У цій лізі поки немає матчів"
                        : matchFilter === "planned"
                          ? "Немає запланованих матчів"
                          : "Немає завершених матчів"}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {isOwner
                        ? "Натисніть «+ Додати матч», щоб створити першу подію!"
                        : "Організатор незабаром опублікує розклад нових турів."}
                    </p>
                    {isOwner && matchFilter === "all" && (
                      <button
                        type="button"
                        onClick={() => setIsAddMatchModalOpen(true)}
                        className="btn-cyan mt-4 text-xs"
                      >
                        ➕ Додати перший матч
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredMatches.map((match) => {
                      const isFinished = match.status === "finished";
                      const isCancelled = match.status === "cancelled";
                      const started =
                        isFinished ||
                        match.status === "live" ||
                        now >= new Date(match.match_time).getTime();

                      const ownPrediction = details.predictions.find(
                        (p) =>
                          p.match_id === match.id &&
                          p.user_id === currentUserId,
                      );
                      const ownBet = details.bets.find(
                        (b) =>
                          b.match_id === match.id &&
                          b.user_id === currentUserId,
                      );
                      const matchPools = details.pools[match.id] ?? {
                        home: 0,
                        draw: 0,
                        away: 0,
                      };
                      const totalPool =
                        matchPools.home + matchPools.draw + matchPools.away;

                      const visiblePredictions = details.predictions.filter(
                        (p) =>
                          p.match_id === match.id &&
                          (started || p.user_id === currentUserId),
                      );
                      const visibleBets = details.bets.filter(
                        (b) => b.match_id === match.id,
                      );

                      const activeTab = activeTabs[match.id] ?? null;

                      return (
                        <div
                          key={match.id}
                          className="matchday-card group relative overflow-hidden transition-all duration-300 hover:border-cyan-500/40"
                        >
                          {/* Верхній статус-бар картки */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[#070b14]/50 px-5 py-3 text-xs">
                            <div className="flex items-center gap-2">
                              {renderMatchStatusBadge(match, now)}
                              {match.external_id && (
                                <span className="rounded-md border border-cyan-800/60 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                                  API ID: {match.external_id}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
                              <span>🕒</span>
                              <span>{formatMatchTime(match.match_time)}</span>
                            </div>
                          </div>

                          {/* Основна секція поєдинку (Команди та Рахунок) */}
                          <div className="p-5 sm:p-6">
                            <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
                              {/* Господарі (Команда 1) */}
                              <div className="col-span-5 flex items-center justify-end gap-3 text-right">
                                <span className="text-sm sm:text-base font-black text-white truncate">
                                  {match.team_home}
                                </span>
                                <TeamBadge name={match.team_home} side="home" />
                              </div>

                              {/* Рахунок або VS */}
                              <div className="col-span-2 flex flex-col items-center justify-center">
                                {isFinished ||
                                (match.status === "live" &&
                                  match.home_score !== null) ? (
                                  <div className="flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-1 font-mono text-xl sm:text-2xl font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                                    <span>{match.home_score ?? 0}</span>
                                    <span className="text-amber-500/70">:</span>
                                    <span>{match.away_score ?? 0}</span>
                                  </div>
                                ) : (
                                  <span className="rounded-lg border border-[var(--border)] bg-[#070b14] px-2.5 py-1 text-xs font-black tracking-widest text-cyan-400">
                                    VS
                                  </span>
                                )}
                              </div>

                              {/* Гості (Команда 2) */}
                              <div className="col-span-5 flex items-center justify-start gap-3 text-left">
                                <TeamBadge name={match.team_away} side="away" />
                                <span className="text-sm sm:text-base font-black text-white truncate">
                                  {match.team_away}
                                </span>
                              </div>
                            </div>

                            {/* Інформаційний рядок під командами */}
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)]/60 pt-3 text-xs text-[var(--text-secondary)]">
                              <div className="flex flex-wrap items-center gap-3">
                                <span>
                                  📊 Прогнозів:{" "}
                                  <strong className="text-white">
                                    {
                                      details.predictions.filter(
                                        (p) => p.match_id === match.id,
                                      ).length
                                    }
                                  </strong>
                                </span>
                                {totalPool > 0 && (
                                  <span>
                                    🪙 Пул:{" "}
                                    <strong className="text-amber-300">
                                      {totalPool} монет
                                    </strong>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {ownPrediction && (
                                  <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                                    🎯 Ваш прогноз:{" "}
                                    {ownPrediction.predicted_home_score} :{" "}
                                    {ownPrediction.predicted_away_score}
                                  </span>
                                )}
                                {ownBet && (
                                  <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                                    💰 Ставка:{" "}
                                    {getBetPickLabel(ownBet.pick, match)} (
                                    {ownBet.stake} 🪙)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* ШІ-прев'ю від Gemini, якщо вже збережено */}
                            {match.venue && match.venue !== "Головна арена" && (
                              <div className="mt-3.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/30 via-[#0d1522] to-cyan-950/30 p-3.5 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-indigo-300 mb-1">
                                  <span>🤖</span> ШІ-аналітика матчу (Gemini):
                                </div>
                                <p className="text-slate-200 leading-relaxed font-sans">
                                  {match.venue}
                                </p>
                              </div>
                            )}

                            {/* Панель кнопок дій (Акордеони для чистого UX) */}
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
                              {/* Кнопка Прогнозу */}
                              {!isFinished && !started && !isCancelled && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleTab(match.id, "prediction")
                                  }
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                                    activeTab === "prediction"
                                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                                      : "border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50"
                                  }`}
                                >
                                  <span>🎯</span>
                                  {ownPrediction
                                    ? "Змінити прогноз"
                                    : "Зробити прогноз"}
                                </button>
                              )}

                              {/* Кнопка Ставки монет */}
                              {!isFinished && !started && !isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => toggleTab(match.id, "bet")}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                                    activeTab === "bet"
                                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                                      : "border border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50"
                                  }`}
                                >
                                  <span>💰</span>
                                  {ownBet ? "Ваша ставка" : "Ставка монет"}
                                </button>
                              )}

                              {/* Кнопка ШІ-аналітики */}
                              {!isFinished && !isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => toggleTab(match.id, "ai")}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                                    activeTab === "ai"
                                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                      : "border border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/50"
                                  }`}
                                >
                                  <span>✨</span> ШІ-аналітика
                                </button>
                              )}

                              {/* Кнопка деталей / інших прогнозів */}
                              {started && (
                                <button
                                  type="button"
                                  onClick={() => toggleTab(match.id, "details")}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                                    activeTab === "details"
                                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                                      : "btn-ghost"
                                  }`}
                                >
                                  <span>👥</span> Прогнози (
                                  {visiblePredictions.length})
                                </button>
                              )}

                              {/* Кнопка керування організатора */}
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => toggleTab(match.id, "admin")}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                                    activeTab === "admin"
                                      ? "bg-slate-200 text-slate-900 shadow-md"
                                      : "border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white"
                                  }`}
                                >
                                  <span>⚙️</span> Керування
                                </button>
                              )}
                            </div>

                            {/* РОЗКРИВНИЙ БЛОК: ВНЕСЕННЯ ПРОГНОЗУ */}
                            {activeTab === "prediction" && (
                              <form
                                className="mt-4 rounded-xl border border-emerald-500/40 bg-[#070b14]/90 p-4 animate-fade-in"
                                onSubmit={(e) =>
                                  void handleSavePrediction(e, match)
                                }
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-black uppercase text-emerald-400">
                                    Ваш прогноз рахунку:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveTabs((p) => ({
                                        ...p,
                                        [match.id]: null,
                                      }))
                                    }
                                    className="text-slate-400 hover:text-white text-xs"
                                  >
                                    ✕ Закрити
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-end gap-3">
                                  <div className="w-28">
                                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1 truncate">
                                      {match.team_home}
                                    </label>
                                    <input
                                      name="home-score"
                                      type="number"
                                      min="0"
                                      required
                                      defaultValue={
                                        ownPrediction?.predicted_home_score ?? 0
                                      }
                                      className="matchday-input text-center text-base font-black"
                                    />
                                  </div>
                                  <span className="pb-3 text-xl font-bold text-slate-400">
                                    :
                                  </span>
                                  <div className="w-28">
                                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1 truncate">
                                      {match.team_away}
                                    </label>
                                    <input
                                      name="away-score"
                                      type="number"
                                      min="0"
                                      required
                                      defaultValue={
                                        ownPrediction?.predicted_away_score ?? 0
                                      }
                                      className="matchday-input text-center text-base font-black"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={
                                      busyAction === `prediction-${match.id}` ||
                                      !currentUserId
                                    }
                                    className="btn-cyan text-xs py-2.5 px-5"
                                  >
                                    {busyAction === `prediction-${match.id}`
                                      ? "Збереження..."
                                      : "✓ Підтвердити прогноз"}
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* РОЗКРИВНИЙ БЛОК: СТАВКА МОНЕТ НА ПЕРЕМОЖЦЯ */}
                            {activeTab === "bet" && (
                              <div className="mt-4 rounded-xl border border-amber-500/40 bg-[#070b14]/90 p-4 animate-fade-in">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-black uppercase text-amber-400">
                                    Ставка на результат (Пул монет):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveTabs((p) => ({
                                        ...p,
                                        [match.id]: null,
                                      }))
                                    }
                                    className="text-slate-400 hover:text-white text-xs"
                                  >
                                    ✕ Закрити
                                  </button>
                                </div>

                                {ownBet ? (
                                  <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-300">
                                    Ви вже зробили ставку:{" "}
                                    <strong>
                                      {getBetPickLabel(ownBet.pick, match)}
                                    </strong>{" "}
                                    на суму <strong>{ownBet.stake}</strong>{" "}
                                    монет.
                                  </div>
                                ) : (
                                  <form
                                    onSubmit={(e) =>
                                      void handlePlaceBet(e, match)
                                    }
                                  >
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
                                            className="cursor-pointer rounded-xl border border-[var(--border)] bg-[#0d1522] p-3 hover:border-amber-500/60 transition block text-xs"
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
                                              <span className="truncate">
                                                {label}
                                              </span>
                                            </div>
                                            <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                                              Пул:{" "}
                                              <strong className="text-amber-300">
                                                {pickPool}
                                              </strong>{" "}
                                              🪙
                                            </div>
                                            <div className="text-[10px] text-cyan-400 font-bold">
                                              Множник: {multiplier}
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-end gap-3">
                                      <div className="w-36">
                                        <label className="text-[10px] text-[var(--text-secondary)] block mb-1">
                                          Сума (монет):
                                        </label>
                                        <input
                                          name="bet-stake"
                                          type="number"
                                          min="1"
                                          max={
                                            details.currentBalance ?? undefined
                                          }
                                          required
                                          value={
                                            betStakeInputs[match.id] ?? 50
                                          }
                                          onChange={(e) =>
                                            setBetStakeInputs((prev) => ({
                                              ...prev,
                                              [match.id]: Number(
                                                e.target.value,
                                              ),
                                            }))
                                          }
                                          className="matchday-input"
                                        />
                                      </div>

                                      {/* Швидкі чіпси сум */}
                                      <div className="flex items-center gap-1.5 pb-1">
                                        {[25, 50, 100].map((amt) => (
                                          <button
                                            key={amt}
                                            type="button"
                                            onClick={() =>
                                              setBetStakeInputs((prev) => ({
                                                ...prev,
                                                [match.id]: amt,
                                              }))
                                            }
                                            className="rounded border border-[var(--border)] bg-[#0d1522] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-white"
                                          >
                                            +{amt}
                                          </button>
                                        ))}
                                      </div>

                                      <button
                                        type="submit"
                                        disabled={
                                          busyAction === `bet-${match.id}` ||
                                          !currentUserId
                                        }
                                        className="btn-orange text-xs py-2.5 px-5 ml-auto"
                                      >
                                        {busyAction === `bet-${match.id}`
                                          ? "Ставимо..."
                                          : "Поставити монети"}
                                      </button>
                                    </div>

                                    {betError?.matchId === match.id && (
                                      <p className="mt-2 text-xs font-bold text-rose-400">
                                        ⚠️ {betError.message}
                                      </p>
                                    )}
                                  </form>
                                )}
                              </div>
                            )}

                            {/* РОЗКРИВНИЙ БЛОК: ГЕНЕРАЦІЯ ШІ-ПРЕВ'Ю (Gemini) */}
                            {activeTab === "ai" && (
                              <div className="mt-4 rounded-xl border border-indigo-500/40 bg-[#070b14]/90 p-4 animate-fade-in">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                    <span>✨</span> ШІ-аналітика Gemini
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveTabs((p) => ({
                                        ...p,
                                        [match.id]: null,
                                      }))
                                    }
                                    className="text-slate-400 hover:text-white text-xs"
                                  >
                                    ✕ Закрити
                                  </button>
                                </div>
                                <ActionForm action={generateMatchPreviewAction}>
                                  <input
                                    type="hidden"
                                    name="match_id"
                                    value={match.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="access_token"
                                    value={sessionToken}
                                  />
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      name="tactical_focus"
                                      maxLength={300}
                                      placeholder="Тактичний фокус (напр.: акцент на пресинг, погодні умови, контратаки)..."
                                      className="matchday-input flex-1 text-xs"
                                    />
                                    <button
                                      type="submit"
                                      className="btn-cyan text-xs shrink-0 flex items-center gap-1.5"
                                    >
                                      <span>✨</span> Згенерувати ШІ-прев&apos;ю
                                    </button>
                                  </div>
                                </ActionForm>
                              </div>
                            )}

                            {/* РОЗКРИВНИЙ БЛОК: ПРОГНОЗИ ТА СТАВКИ УЧАСНИКІВ */}
                            {activeTab === "details" && started && (
                              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[#070b14]/90 p-4 animate-fade-in">
                                <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-2">
                                  <span className="text-xs font-black uppercase text-cyan-400">
                                    Прогнози та ставки ліги:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveTabs((p) => ({
                                        ...p,
                                        [match.id]: null,
                                      }))
                                    }
                                    className="text-slate-400 hover:text-white text-xs"
                                  >
                                    ✕ Закрити
                                  </button>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                                  <div>
                                    <span className="font-bold text-[var(--text-secondary)] block mb-2">
                                      Прогнози на рахунок:
                                    </span>
                                    {visiblePredictions.length === 0 ? (
                                      <p className="text-[var(--text-secondary)]">
                                        Прогнозів немає
                                      </p>
                                    ) : (
                                      <ul className="space-y-1.5">
                                        {visiblePredictions.map((pred) => (
                                          <li
                                            key={pred.id}
                                            className="flex justify-between border-b border-[var(--border)]/40 pb-1"
                                          >
                                            <span className="text-slate-300">
                                              {pred.profile?.username ??
                                                "Гравець"}
                                            </span>
                                            <span className="font-bold text-white">
                                              {pred.predicted_home_score} :{" "}
                                              {pred.predicted_away_score}
                                              {isFinished && (
                                                <span className="ml-2 text-emerald-400">
                                                  +{pred.points_earned ?? 0} оч.
                                                </span>
                                              )}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-bold text-[var(--text-secondary)] block mb-2">
                                      Ставки монет:
                                    </span>
                                    {visibleBets.length === 0 ? (
                                      <p className="text-[var(--text-secondary)]">
                                        Ставок немає
                                      </p>
                                    ) : (
                                      <ul className="space-y-1.5">
                                        {visibleBets.map((bet) => (
                                          <li
                                            key={`${bet.user_id}-${bet.match_id}`}
                                            className="flex justify-between border-b border-[var(--border)]/40 pb-1"
                                          >
                                            <span className="text-slate-300">
                                              {bet.profile?.username ??
                                                "Гравець"}
                                            </span>
                                            <span className="font-bold text-amber-400">
                                              {bet.stake} 🪙 (
                                              {getBetPickLabel(
                                                bet.pick,
                                                match,
                                              )}
                                              )
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* РОЗКРИВНИЙ БЛОК: КЕРУВАННЯ МАТЧЕМ (ОРГАНІЗАТОР) */}
                            {activeTab === "admin" && isOwner && (
                              <div className="mt-4 rounded-xl border border-slate-700 bg-[#070b14]/95 p-4 animate-fade-in space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                  <span className="text-xs font-black uppercase text-amber-400">
                                    Панель модерації матчу
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveTabs((p) => ({
                                        ...p,
                                        [match.id]: null,
                                      }))
                                    }
                                    className="text-slate-400 hover:text-white text-xs"
                                  >
                                    ✕ Закрити
                                  </button>
                                </div>

                                {/* Внесення фінального результату */}
                                {started && !isCancelled && (
                                  <form
                                    className="rounded-lg border border-amber-600/40 bg-amber-950/20 p-3"
                                    onSubmit={(e) =>
                                      void handleSaveResult(e, match)
                                    }
                                  >
                                    <span className="text-xs font-bold text-amber-300 block mb-2">
                                      {isFinished
                                        ? "Корегувати фінальний рахунок:"
                                        : "Внести підсумковий рахунок:"}
                                    </span>
                                    <div className="flex flex-wrap items-end gap-3">
                                      <div className="w-24">
                                        <label className="text-[10px] text-slate-400 block mb-1 truncate">
                                          {match.team_home}
                                        </label>
                                        <input
                                          name="home-score"
                                          type="number"
                                          min="0"
                                          required
                                          defaultValue={match.home_score ?? 0}
                                          className="matchday-input"
                                        />
                                      </div>
                                      <span className="pb-3 text-lg font-bold text-amber-400">
                                        :
                                      </span>
                                      <div className="w-24">
                                        <label className="text-[10px] text-slate-400 block mb-1 truncate">
                                          {match.team_away}
                                        </label>
                                        <input
                                          name="away-score"
                                          type="number"
                                          min="0"
                                          required
                                          defaultValue={match.away_score ?? 0}
                                          className="matchday-input"
                                        />
                                      </div>
                                      <button
                                        type="submit"
                                        disabled={
                                          busyAction === `result-${match.id}`
                                        }
                                        className="btn-cyan text-xs py-2 px-4"
                                      >
                                        {busyAction === `result-${match.id}`
                                          ? "Збереження..."
                                          : "🏁 Зафіксувати"}
                                      </button>
                                    </div>
                                  </form>
                                )}

                                {/* Оновлення API ID та Видалення */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                  <form
                                    className="flex items-center gap-2"
                                    onSubmit={(e) =>
                                      void handleUpdateExternalId(e, match)
                                    }
                                  >
                                    <label className="text-[11px] text-[var(--text-secondary)]">
                                      API ID:
                                    </label>
                                    <input
                                      name="external-id"
                                      type="text"
                                      placeholder="ID провайдера"
                                      defaultValue={match.external_id ?? ""}
                                      className="matchday-input h-8 w-28 text-xs py-1 px-2"
                                    />
                                    <button
                                      type="submit"
                                      disabled={
                                        busyAction === `ext-${match.id}`
                                      }
                                      className="btn-ghost text-xs py-1 px-2.5"
                                    >
                                      Зберегти ID
                                    </button>
                                  </form>

                                  <button
                                    type="button"
                                    disabled={busyAction !== null}
                                    onClick={() =>
                                      void handleDeleteMatch(match)
                                    }
                                    className="rounded-lg border border-rose-800/80 bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
                                  >
                                    ✕ Видалити матч
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ПРАВА КОЛОНКА: ПРОФІЛЬ, ТАБЛИЦЯ ЛІДЕРІВ ТА ПРАВИЛА (4 з 12) */}
              <div className="space-y-6 lg:col-span-4">
                {/* Картка особистого профілю в лізі */}
                {currentUserMember && (
                  <div className="matchday-card p-5 relative overflow-hidden border-cyan-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-sm">
                          {getTeamInitials(
                            currentUserMember.profile?.username ?? "User",
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">
                              {currentUserMember.profile?.username ?? "Гравець"}
                            </span>
                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-black text-cyan-300">
                              ВИ
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            {currentUserMember.role === "owner"
                              ? "👑 Організатор"
                              : "⚽ Учасник ліги"}
                          </span>
                        </div>
                      </div>

                      {/* Місце в лізі */}
                      <div className="text-right">
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase block font-bold">
                          Місце
                        </span>
                        <span className="text-xl font-black text-cyan-400">
                          #{currentUserRank !== undefined && currentUserRank >= 0 ? currentUserRank + 1 : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-center">
                      <div className="rounded-lg bg-[#070b14] p-2">
                        <span className="text-[10px] text-[var(--text-secondary)] block">
                          Бали ліги
                        </span>
                        <span className="text-base font-black text-emerald-400">
                          +{currentUserMember.points} оч.
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#070b14] p-2">
                        <span className="text-[10px] text-[var(--text-secondary)] block">
                          Точних рахунків
                        </span>
                        <span className="text-base font-black text-amber-300">
                          {currentUserMember.exactScores}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Таблиця лідерів (Leaderboard) */}
                <div className="matchday-card p-5">
                  <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏆</span> Таблиця лідерів
                    </h2>
                    <span className="text-xs text-[var(--text-secondary)] font-bold">
                      {details.members.length} гравців
                    </span>
                  </div>

                  {details.members.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
                      Поки що немає зареєстрованих учасників.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {details.members.map((member, idx) => {
                        const isMe = member.user_id === currentUserId;
                        const medal =
                          idx === 0
                            ? "🥇"
                            : idx === 1
                              ? "🥈"
                              : idx === 2
                                ? "🥉"
                                : null;

                        return (
                          <div
                            key={member.user_id}
                            className={`flex items-center justify-between rounded-xl p-2.5 transition ${
                              isMe
                                ? "border border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_10px_rgba(8,191,234,0.1)]"
                                : "bg-[#070b14]/70 hover:bg-[#0d1522]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 text-center font-mono text-xs font-bold text-[var(--text-secondary)]">
                                {medal ?? `#${idx + 1}`}
                              </span>
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300">
                                {getTeamInitials(
                                  member.profile?.username ?? "P",
                                )}
                              </div>
                              <div className="truncate">
                                <span
                                  className={`text-xs font-bold block truncate ${
                                    isMe ? "text-cyan-300" : "text-white"
                                  }`}
                                >
                                  {member.profile?.username ?? "Гравець"}
                                </span>
                                <span className="text-[9px] text-[var(--text-secondary)] block">
                                  {member.role === "owner"
                                    ? "Організатор"
                                    : "Гравець"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                ({member.exactScores} точн.)
                              </span>
                              <span className="rounded-md bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 font-mono text-xs font-black text-emerald-300">
                                +{member.points}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Блок правил нарахування очок */}
                <div className="matchday-panel p-5 text-xs space-y-2.5">
                  <span className="text-[11px] font-black uppercase text-white tracking-wider block">
                    📜 Правила турніру ліги
                  </span>
                  <div className="space-y-1.5 text-[var(--text-secondary)]">
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">+3 бали</span>
                      <span>— за абсолютно точний рахунок матчу.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">+1 бал</span>
                      <span>— за вгаданий підсумок (переможець або нічия).</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">🪙 Ставки</span>
                      <span>
                        — виграш пропорційно до вашої частки у переможному пулі.
                      </span>
                    </p>
                  </div>
                </div>

                {/* Зона керування членством (Покинути або Видалити) */}
                {(isOwner || isMember) && (
                  <div className="rounded-2xl border border-rose-900/30 bg-rose-950/10 p-4">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-2">
                      Керування участю в лізі:
                    </span>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                      {isOwner
                        ? "Видалення ліги очистить усі поєдинки та бали назавжди."
                        : "Ви можете вийти з ліги в будь-який момент."}
                    </p>
                    {isOwner ? (
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => void handleDeleteLeague()}
                        className="w-full rounded-xl border border-rose-700 bg-rose-950/50 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
                      >
                        {busyAction === "delete-league"
                          ? "Видалення ліги..."
                          : "🗑️ Видалити лігу назавжди"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => void handleLeaveLeague()}
                        className="w-full rounded-xl border border-rose-700 bg-rose-950/50 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
                      >
                        {busyAction === "leave-league"
                          ? "Вихід..."
                          : "🚪 Покинути лігу"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* МОДАЛЬНЕ ВІКНО: СТВОРЕННЯ МАТЧУ (ОРГАНІЗАТОР) */}
            {isAddMatchModalOpen && isOwner && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
              >
                <div className="matchday-card w-full max-w-lg p-6 sm:p-8 border-cyan-500/40 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚽</span>
                      <h2 className="text-lg font-black text-white uppercase tracking-wider">
                        Додати матч у лігу
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddMatchModalOpen(false)}
                      className="rounded-lg p-1 text-slate-400 hover:text-white transition"
                    >
                      ✕
                    </button>
                  </div>

                  <form className="space-y-4" onSubmit={handleAddMatch}>
                    <div>
                      <label
                        htmlFor="modal-team-home"
                        className="mb-1 block text-xs font-bold text-[var(--text-secondary)]"
                      >
                        Господарі (Команда 1)
                      </label>
                      <input
                        id="modal-team-home"
                        name="team-home"
                        type="text"
                        placeholder="Напр.: Реал Мадрид"
                        required
                        maxLength={100}
                        className="matchday-input w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="modal-team-away"
                        className="mb-1 block text-xs font-bold text-[var(--text-secondary)]"
                      >
                        Гості (Команда 2)
                      </label>
                      <input
                        id="modal-team-away"
                        name="team-away"
                        type="text"
                        placeholder="Напр.: Барселона"
                        required
                        maxLength={100}
                        className="matchday-input w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="modal-match-time"
                        className="mb-1 block text-xs font-bold text-[var(--text-secondary)]"
                      >
                        Дата й час матчу
                      </label>
                      <input
                        id="modal-match-time"
                        name="match-time"
                        type="datetime-local"
                        required
                        className="matchday-input w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="modal-external-id"
                        className="mb-1 block text-xs font-bold text-[var(--text-secondary)]"
                      >
                        API ID матчу (external_id, опціонально)
                      </label>
                      <input
                        id="modal-external-id"
                        name="external-id"
                        type="text"
                        placeholder="Напр.: 493321"
                        maxLength={50}
                        className="matchday-input w-full"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => setIsAddMatchModalOpen(false)}
                        className="btn-ghost text-xs"
                      >
                        Скасувати
                      </button>
                      <button
                        type="submit"
                        disabled={busyAction === "add-match"}
                        className="btn-cyan text-xs py-2.5 px-5"
                      >
                        {busyAction === "add-match"
                          ? "Додаємо..."
                          : "⚽ Створити матч"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
