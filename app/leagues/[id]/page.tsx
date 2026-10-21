"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
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
  status: "planned" | "finished";
  home_score: number | null;
  away_score: number | null;
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
};

type LeagueDetails = {
  league: League;
  owner: Profile | null;
  members: Member[];
  matches: Match[];
  predictions: Prediction[];
};

const backLinkClassName =
  "text-sm font-medium text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 transition hover:text-emerald-950";
const fieldClassName =
  "h-11 w-full border border-[#c8cec7] bg-[#fbfcfa] px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-[#f0f1ed]";
const buttonClassName =
  "h-11 shrink-0 bg-[#202722] px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-[#a5ada6]";

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

function parseScore(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 ? score : null;
}

function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function sortMatches(matches: Match[]) {
  return [...matches].sort((first, second) => {
    if (first.status !== second.status) {
      return first.status === "planned" ? -1 : 1;
    }

    const timeDifference =
      new Date(first.match_time).getTime() -
      new Date(second.match_time).getTime();
    return first.status === "planned" ? timeDifference : -timeDifference;
  });
}

export default function LeagueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [details, setDetails] = useState<LeagueDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(
    !isSupabaseConfigured,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let active = true;
    let authEventVersion = 0;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      authEventVersion += 1;
      setCurrentUserId(session?.user.id ?? null);
      setIsAuthResolved(true);
    });

    const initialAuthEventVersion = authEventVersion;
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (authEventVersion !== initialAuthEventVersion) return;
        if (error) {
          setLoadError(
            "Не вдалося перевірити сесію. Оновіть сторінку або увійдіть знову.",
          );
          setCurrentUserId(null);
        } else {
          setCurrentUserId(data.session?.user.id ?? null);
        }
        setIsAuthResolved(true);
      })
      .catch(() => {
        if (!active) return;
        if (authEventVersion !== initialAuthEventVersion) return;
        setLoadError(
          "Не вдалося перевірити сесію. Оновіть сторінку або увійдіть знову.",
        );
        setCurrentUserId(null);
        setIsAuthResolved(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLeague() {
      setIsLoading(true);
      const client = getSupabaseClient();
      if (!client) {
        setLoadError(
          "Додайте URL проєкту Supabase та анонімний ключ у змінні середовища.",
        );
        setIsLoading(false);
        return;
      }

      try {
        const { data: league, error: leagueError } = await client
          .from("leagues")
          .select("id, title, invite_code, owner_id")
          .eq("id", id)
          .maybeSingle();

        if (leagueError) throw leagueError;
        if (!league) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const [
          { data: memberRows, error: membersError },
          { data: matchRows, error: matchesError },
        ] = await Promise.all([
          client
            .from("league_members")
            .select("user_id, role")
            .eq("league_id", league.id),
          client
            .from("matches")
            .select(
              "id, league_id, team_home, team_away, match_time, status, home_score, away_score",
            )
            .eq("league_id", league.id)
            .order("match_time", { ascending: true }),
        ]);

        if (membersError) throw membersError;
        if (matchesError) throw matchesError;

        const members = (memberRows ?? []) as Array<
          Pick<Member, "user_id" | "role">
        >;
        const matches = (matchRows ?? []) as Match[];
        const matchIds = matches.map((match) => match.id);

        const { data: predictionRows, error: predictionsError } = matchIds.length
          ? await client
              .from("predictions")
              .select(
                "id, user_id, match_id, predicted_home_score, predicted_away_score, points_earned",
              )
              .in("match_id", matchIds)
          : { data: [], error: null };

        if (predictionsError) throw predictionsError;

        const predictions = (predictionRows ?? []) as Omit<
          Prediction,
          "profile"
        >[];
        const profileIds = [
          ...new Set([
            league.owner_id,
            ...members.map((member) => member.user_id),
            ...predictions.map((prediction) => prediction.user_id),
          ]),
        ];

        const { data: profileRows, error: profilesError } = await client
          .from("profiles")
          .select("id, username")
          .in("id", profileIds);

        if (profilesError) throw profilesError;

        const profiles = (profileRows ?? []) as Profile[];
        const profilesById = new Map(
          profiles.map((profile) => [profile.id, profile]),
        );
        const pointsByUser = new Map<
          string,
          { points: number; exactScores: number }
        >();

        for (const prediction of predictions) {
          const total = pointsByUser.get(prediction.user_id) ?? {
            points: 0,
            exactScores: 0,
          };
          total.points += prediction.points_earned ?? 0;
          if (prediction.points_earned === 3) total.exactScores += 1;
          pointsByUser.set(prediction.user_id, total);
        }

        if (!cancelled) {
          setDetails({
            league: league as League,
            owner: profilesById.get(league.owner_id) ?? null,
            members: members
              .map((member) => {
                const total = pointsByUser.get(member.user_id);
                return {
                  ...member,
                  profile: profilesById.get(member.user_id) ?? null,
                  points: total?.points ?? 0,
                  exactScores: total?.exactScores ?? 0,
                };
              })
              .sort(
                (first, second) =>
                  second.points - first.points ||
                  second.exactScores - first.exactScores ||
                  (first.profile?.username ?? "").localeCompare(
                    second.profile?.username ?? "",
                    "uk",
                  ),
              ),
            matches: sortMatches(matches),
            predictions: predictions.map((prediction) => ({
              ...prediction,
              profile: profilesById.get(prediction.user_id) ?? null,
            })),
          });
          setNow(Date.now());
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            getActionError(
              error,
              "Не вдалося завантажити дані ліги. Перевірте доступ до таблиць і політики читання в Supabase.",
            ),
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadLeague();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleCopyInviteCode() {
    if (!details) return;

    setCopyMessage(null);
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(details.league.invite_code);
      setCopyMessage("Скопійовано");
    } catch {
      setCopyError("Не вдалося скопіювати код. Спробуйте скопіювати його вручну.");
    }
  }

  async function handleSavePrediction(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    const formData = new FormData(event.currentTarget);
    const homeScore = parseScore(formData.get("home-score"));
    const awayScore = parseScore(formData.get("away-score"));
    if (homeScore === null || awayScore === null) {
      setActionError("Введіть цілі числа, більші або рівні нулю.");
      return;
    }

    if (!currentUserId) {
      setActionError("Увійдіть у свій акаунт, щоб зберегти прогноз.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setActionError("Не вдалося підключитися до Supabase.");
      return;
    }

    const actionId = `prediction-${match.id}`;
    setBusyAction(actionId);
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

      setActionMessage("Прогноз збережено.");
      reload();
    } catch (error) {
      setActionError(
        getActionError(error, "Не вдалося зберегти прогноз. Спробуйте ще раз."),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAddMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const teamHome = String(formData.get("team-home") ?? "").trim();
    const teamAway = String(formData.get("team-away") ?? "").trim();
    const localMatchTime = String(formData.get("match-time") ?? "");
    const matchDate = new Date(localMatchTime);

    if (!teamHome || !teamAway || !localMatchTime || Number.isNaN(matchDate.getTime())) {
      setActionError("Вкажіть обидві команди та коректні дату й час матчу.");
      return;
    }

    const client = getSupabaseClient();
    if (!client || !details) {
      setActionError("Не вдалося підключитися до Supabase.");
      return;
    }

    setBusyAction("add-match");
    try {
      const { error } = await client.from("matches").insert({
        league_id: details.league.id,
        team_home: teamHome,
        team_away: teamAway,
        match_time: matchDate.toISOString(),
        status: "planned",
      });
      if (error) throw error;

      form.reset();
      setActionMessage("Матч додано.");
      reload();
    } catch (error) {
      setActionError(
        getActionError(error, "Не вдалося додати матч. Перевірте введені дані."),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateMatch(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    const formData = new FormData(event.currentTarget);
    const teamHome = String(formData.get("team-home") ?? "").trim();
    const teamAway = String(formData.get("team-away") ?? "").trim();
    const localMatchTime = String(formData.get("match-time") ?? "");
    const matchDate = new Date(localMatchTime);

    if (!teamHome || !teamAway || !localMatchTime || Number.isNaN(matchDate.getTime())) {
      setActionError("Вкажіть обидві команди та коректні дату й час матчу.");
      return;
    }

    const client = getSupabaseClient();
    if (!client || !details) {
      setActionError("Не вдалося підключитися до Supabase.");
      return;
    }

    setBusyAction(`update-match-${match.id}`);
    try {
      const { data, error } = await client
        .from("matches")
        .update({
          team_home: teamHome,
          team_away: teamAway,
          match_time: new Date(localMatchTime).toISOString(),
        })
        .eq("id", match.id)
        .eq("league_id", details.league.id)
        .eq("status", "planned")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setActionError("Дію заборонено");
        return;
      }

      setEditingMatchId(null);
      setActionMessage("Матч оновлено.");
      reload();
    } catch (error) {
      setActionError(
        getActionError(error, "Не вдалося оновити матч. Спробуйте ще раз."),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteMatch(match: Match) {
    if (!window.confirm("Видалити матч? Прогнози на нього теж зникнуть.")) return;

    setActionError(null);
    setActionMessage(null);
    const client = getSupabaseClient();
    if (!client || !details) {
      setActionError("Не вдалося підключитися до Supabase.");
      return;
    }

    setBusyAction(`delete-match-${match.id}`);
    try {
      const { data, error } = await client
        .from("matches")
        .delete()
        .eq("id", match.id)
        .eq("league_id", details.league.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setActionError("Дію заборонено");
        return;
      }

      setEditingMatchId(null);
      setActionMessage("Матч видалено.");
      reload();
    } catch (error) {
      setActionError(
        getActionError(error, "Не вдалося видалити матч. Спробуйте ще раз."),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLeaveLeague() {
    if (!details || !currentUserId) return;
    if (!window.confirm("Вийти з ліги?")) return;

    setActionError(null);
    setActionMessage(null);
    const client = getSupabaseClient();
    if (!client) {
      setActionError("Не вдалося підключитися до Supabase.");
      return;
    }

    setBusyAction("leave-league");
    try {
      const { data, error } = await client
        .from("league_members")
        .delete()
        .eq("user_id", currentUserId)
        .eq("league_id", details.league.id)
        .select("user_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setActionError("Дію заборонено");
        return;
      }

      router.push("/leagues");
    } catch (error) {
      setActionError(
        getActionError(error, "Не вдалося вийти з ліги. Спробуйте ще раз."),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteLeague() {
    if (!details || !currentUserId) return;
    const title = details.league.title;
    if (
      !window.confirm(
        `Видалити лігу «${title}»? Усі матчі та прогнози буде видалено.`,
      )
    ) {
      return;
    }
    if (window.prompt(`Для підтвердження введіть назву ліги: ${title}`) !== title) {
      return;
    }

    setActionError(null);
    setActionMessage(null);
    const client = getSupabaseClient();
    if (!client) {
      setActionError("Не вдалося підключитися до Supabase.");
      return;
    }

    setBusyAction("delete-league");
    try {
      const { data, error } = await client
        .from("leagues")
        .delete()
        .eq("id", details.league.id)
        .eq("owner_id", currentUserId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setActionError("Дію заборонено");
        return;
      }

      router.push("/leagues");
    } catch (error) {
      setActionError(
        getActionError(error, "Не вдалося видалити лігу. Спробуйте ще раз."),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveResult(
    event: FormEvent<HTMLFormElement>,
    match: Match,
  ) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    const formData = new FormData(event.currentTarget);
    const homeScore = parseScore(formData.get("home-score"));
    const awayScore = parseScore(formData.get("away-score"));
    if (homeScore === null || awayScore === null) {
      setActionError("Введіть цілі числа, більші або рівні нулю.");
      return;
    }

    const client = getSupabaseClient();
    if (!client || !details) {
      setActionError("Не вдалося підключитися до Supabase.");
      return;
    }

    setBusyAction(`result-${match.id}`);
    try {
      const { data, error } = await client
        .from("matches")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "finished",
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

      setActionMessage("Результат матчу збережено.");
      reload();
    } catch (error) {
      setActionError(
        getActionError(error, "Не вдалося зберегти результат матчу."),
      );
    } finally {
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

  return (
    <main className="min-h-screen flex-1 bg-[#f4f5f1] px-5 py-10 text-[#202722] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/leagues" className={backLinkClassName}>
          ← Назад до ліг
        </Link>

        {isLoading ? (
          <p className="py-12 text-sm text-[#626b64]" role="status">
            Завантаження ліги…
          </p>
        ) : notFound ? (
          <section className="mt-8 border border-[#e0e3dd] bg-white px-6 py-10 text-center shadow-sm">
            <h1 className="text-2xl font-semibold">Лігу не знайдено</h1>
            <Link
              href="/leagues"
              className={`${backLinkClassName} mt-4 inline-block`}
            >
              Повернутися до списку ліг
            </Link>
          </section>
        ) : loadError ? (
          <p
            role="alert"
            className="mt-8 border-l-4 border-rose-600 bg-white px-5 py-4 text-sm leading-6 text-rose-800 shadow-sm"
          >
            {loadError}
          </p>
        ) : details ? (
          <>
            <header className="mb-8 mt-8 border-b border-[#d9ddd6] pb-7">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                Matchday · Ліга
              </p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                {details.league.title}
              </h1>
              <p className="mt-3 text-sm text-[#626b64]">
                Творець:{" "}
                <span className="font-medium text-[#202722]">
                  {details.owner?.username ?? "Ім’я творця недоступне"}
                </span>
              </p>
            </header>

            <section
              aria-labelledby="invite-code-heading"
              className="mb-8 border border-[#e0e3dd] bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 id="invite-code-heading" className="text-lg font-semibold">
                Інвайт-код
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="break-all border border-[#d9ddd6] bg-[#f4f5f1] px-4 py-2 font-mono text-lg font-semibold tracking-[0.12em]">
                  {details.league.invite_code}
                </code>
                <button
                  type="button"
                  onClick={handleCopyInviteCode}
                  className={buttonClassName}
                >
                  Копіювати
                </button>
                {copyMessage && (
                  <p role="status" className="text-sm text-emerald-800">
                    {copyMessage}
                  </p>
                )}
                {copyError && (
                  <p role="alert" className="text-sm text-rose-700">
                    {copyError}
                  </p>
                )}
              </div>
            </section>

            <section aria-labelledby="members-heading" className="mb-10">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 id="members-heading" className="text-lg font-semibold">
                  Учасники
                </h2>
                <span className="text-sm text-[#626b64]">
                  {details.members.length}
                </span>
              </div>

              {details.members.length === 0 ? (
                <p className="border border-dashed border-[#c8cec7] bg-white px-5 py-8 text-sm text-[#626b64]">
                  У цій лізі поки немає учасників.
                </p>
              ) : (
                <div className="overflow-x-auto border border-[#e0e3dd] bg-white shadow-sm">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="border-b border-[#e0e3dd] bg-[#f8f9f6] text-xs uppercase tracking-wide text-[#626b64]">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Учасник
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Роль
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          Очки
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e3dd]">
                      {details.members.map((member) => (
                        <tr key={member.user_id}>
                          <td className="px-5 py-4 font-medium">
                            {member.profile?.username ?? "Ім’я недоступне"}
                          </td>
                          <td
                            className={`px-5 py-4 text-xs font-semibold uppercase tracking-wide ${
                              member.role === "owner"
                                ? "text-emerald-800"
                                : "text-[#7a827b]"
                            }`}
                          >
                            {member.role === "owner" ? "Творець" : "Учасник"}
                          </td>
                          <td className="px-5 py-4 text-right tabular-nums">
                            {member.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {actionError && (
              <p
                role="alert"
                className="mb-4 border-l-4 border-rose-600 bg-white px-4 py-3 text-sm text-rose-800"
              >
                {actionError}
              </p>
            )}
            {actionMessage && (
              <p
                role="status"
                className="mb-4 border-l-4 border-emerald-600 bg-white px-4 py-3 text-sm text-emerald-800"
              >
                {actionMessage}
              </p>
            )}

            {!isAuthResolved ? (
              <p role="status" className="mb-8 text-sm text-[#626b64]">
                Перевіряємо сесію…
              </p>
            ) : isOwner ? (
              <section
                aria-labelledby="add-match-heading"
                className="mb-8 border border-[#e0e3dd] bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 id="add-match-heading" className="mb-5 text-lg font-semibold">
                  Додати матч
                </h2>
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={handleAddMatch}
                >
                  <div>
                    <label
                      htmlFor="team-home"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Господарі
                    </label>
                    <input
                      id="team-home"
                      name="team-home"
                      type="text"
                      required
                      maxLength={100}
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="team-away"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Гості
                    </label>
                    <input
                      id="team-away"
                      name="team-away"
                      type="text"
                      required
                      maxLength={100}
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="match-time"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Дата й час
                    </label>
                    <input
                      id="match-time"
                      name="match-time"
                      type="datetime-local"
                      required
                      className={fieldClassName}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={busyAction === "add-match"}
                      className={buttonClassName}
                    >
                      {busyAction === "add-match" ? "Додавання…" : "Додати матч"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            <section aria-labelledby="matches-heading">
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <h2 id="matches-heading" className="text-2xl font-semibold">
                  Матчі
                </h2>
                <span className="text-sm text-[#626b64]">
                  {details.matches.length}
                </span>
              </div>

              {details.matches.length === 0 ? (
                <p className="border border-dashed border-[#c8cec7] bg-white px-5 py-8 text-sm text-[#626b64]">
                  У цій лізі поки немає матчів.
                </p>
              ) : (
                <ul className="space-y-4">
                  {details.matches.map((match) => {
                    const isFinished = match.status === "finished";
                    const started =
                      isFinished || now >= new Date(match.match_time).getTime();
                    const ownPrediction = details.predictions.find(
                      (prediction) =>
                        prediction.match_id === match.id &&
                        prediction.user_id === currentUserId,
                    );
                    const visiblePredictions = details.predictions
                      .filter(
                        (prediction) =>
                          prediction.match_id === match.id &&
                          (started || prediction.user_id === currentUserId),
                      )
                      .sort((first, second) =>
                        (first.profile?.username ?? "").localeCompare(
                          second.profile?.username ?? "",
                          "uk",
                        ),
                      );

                    return (
                      <li
                        key={match.id}
                        className="border border-[#e0e3dd] bg-white p-5 shadow-sm sm:p-6"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {match.team_home} <span className="text-[#7a827b]">—</span>{" "}
                              {match.team_away}
                            </h3>
                            <p className="mt-1 text-sm text-[#626b64]">
                              {formatMatchTime(match.match_time)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-2.5 py-1 text-xs font-semibold ${
                                isFinished
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-orange-50 text-orange-800"
                              }`}
                            >
                              {isFinished ? "Завершено" : "Заплановано"}
                            </span>
                            {isFinished && (
                              <p className="mt-2 text-xl font-semibold tabular-nums">
                                {match.home_score} : {match.away_score}
                              </p>
                            )}
                          </div>
                        </div>

                        {isOwner && match.status === "planned" && (
                          <div className="mt-4 flex flex-wrap gap-3 border-t border-[#e0e3dd] pt-4">
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => {
                                setEditingMatchId(
                                  editingMatchId === match.id ? null : match.id,
                                );
                                setActionError(null);
                              }}
                              className={buttonClassName}
                            >
                              {editingMatchId === match.id
                                ? "Скасувати редагування"
                                : "Редагувати"}
                            </button>
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => void handleDeleteMatch(match)}
                              className="h-11 shrink-0 border border-rose-700 px-5 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyAction === `delete-match-${match.id}`
                                ? "Видалення…"
                                : "Видалити"}
                            </button>
                          </div>
                        )}

                        {isOwner && isFinished && (
                          <div className="mt-4 flex justify-end border-t border-[#e0e3dd] pt-4">
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => void handleDeleteMatch(match)}
                              className="h-11 shrink-0 border border-rose-700 px-5 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyAction === `delete-match-${match.id}`
                                ? "Видалення…"
                                : "Видалити"}
                            </button>
                          </div>
                        )}

                        {isOwner && editingMatchId === match.id && (
                          <form
                            className="mt-4 grid gap-4 border-t border-[#e0e3dd] pt-4 sm:grid-cols-2"
                            onSubmit={(event) =>
                              void handleUpdateMatch(event, match)
                            }
                          >
                            <div>
                              <label
                                htmlFor={`edit-team-home-${match.id}`}
                                className="mb-1.5 block text-sm font-medium"
                              >
                                Господарі
                              </label>
                              <input
                                id={`edit-team-home-${match.id}`}
                                name="team-home"
                                type="text"
                                required
                                maxLength={100}
                                defaultValue={match.team_home}
                                disabled={busyAction === `update-match-${match.id}`}
                                className={fieldClassName}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`edit-team-away-${match.id}`}
                                className="mb-1.5 block text-sm font-medium"
                              >
                                Гості
                              </label>
                              <input
                                id={`edit-team-away-${match.id}`}
                                name="team-away"
                                type="text"
                                required
                                maxLength={100}
                                defaultValue={match.team_away}
                                disabled={busyAction === `update-match-${match.id}`}
                                className={fieldClassName}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`edit-match-time-${match.id}`}
                                className="mb-1.5 block text-sm font-medium"
                              >
                                Дата й час
                              </label>
                              <input
                                id={`edit-match-time-${match.id}`}
                                name="match-time"
                                type="datetime-local"
                                required
                                defaultValue={toDateTimeLocalValue(match.match_time)}
                                disabled={busyAction === `update-match-${match.id}`}
                                className={fieldClassName}
                              />
                            </div>
                            <div className="flex items-end gap-3">
                              <button
                                type="submit"
                                disabled={busyAction !== null}
                                className={buttonClassName}
                              >
                                {busyAction === `update-match-${match.id}`
                                  ? "Збереження…"
                                  : "Зберегти зміни"}
                              </button>
                            </div>
                          </form>
                        )}

                        {!isAuthResolved && (
                          <p
                            role="status"
                            className="mt-4 text-sm text-[#626b64]"
                          >
                            Перевіряємо сесію…
                          </p>
                        )}

                        {!isFinished && !started && (
                          <form
                            className="mt-5 border-t border-[#e0e3dd] pt-4"
                            onSubmit={(event) =>
                              void handleSavePrediction(event, match)
                            }
                          >
                            <p className="mb-3 text-sm font-semibold">
                              Ваш прогноз
                            </p>
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="w-24">
                                <label
                                  htmlFor={`prediction-home-${match.id}`}
                                  className="mb-1 block text-xs text-[#626b64]"
                                >
                                  {match.team_home}
                                </label>
                                <input
                                  id={`prediction-home-${match.id}`}
                                  name="home-score"
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  defaultValue={
                                    ownPrediction?.predicted_home_score
                                  }
                                  disabled={
                                    busyAction === `prediction-${match.id}` ||
                                    !currentUserId
                                  }
                                  className={fieldClassName}
                                />
                              </div>
                              <span className="pb-3 text-[#7a827b]">:</span>
                              <div className="w-24">
                                <label
                                  htmlFor={`prediction-away-${match.id}`}
                                  className="mb-1 block text-xs text-[#626b64]"
                                >
                                  {match.team_away}
                                </label>
                                <input
                                  id={`prediction-away-${match.id}`}
                                  name="away-score"
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  defaultValue={
                                    ownPrediction?.predicted_away_score
                                  }
                                  disabled={
                                    busyAction === `prediction-${match.id}` ||
                                    !currentUserId
                                  }
                                  className={fieldClassName}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={
                                  busyAction === `prediction-${match.id}` ||
                                  !currentUserId
                                }
                                className={buttonClassName}
                              >
                                {busyAction === `prediction-${match.id}`
                                  ? "Збереження…"
                                  : "Зберегти"}
                              </button>
                            </div>
                            {!currentUserId && (
                              <p className="mt-3 text-sm text-[#626b64]">
                                Увійдіть у свій акаунт, щоб подати прогноз.
                              </p>
                            )}
                          </form>
                        )}

                        {isOwner && started && !isFinished && (
                          <form
                            className="mt-5 border-t border-[#e0e3dd] pt-4"
                            onSubmit={(event) =>
                              void handleSaveResult(event, match)
                            }
                          >
                            <p className="mb-3 text-sm font-semibold">
                              Внести результат
                            </p>
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="w-24">
                                <label
                                  htmlFor={`result-home-${match.id}`}
                                  className="mb-1 block text-xs text-[#626b64]"
                                >
                                  {match.team_home}
                                </label>
                                <input
                                  id={`result-home-${match.id}`}
                                  name="home-score"
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  className={fieldClassName}
                                  disabled={busyAction === `result-${match.id}`}
                                />
                              </div>
                              <span className="pb-3 text-[#7a827b]">:</span>
                              <div className="w-24">
                                <label
                                  htmlFor={`result-away-${match.id}`}
                                  className="mb-1 block text-xs text-[#626b64]"
                                >
                                  {match.team_away}
                                </label>
                                <input
                                  id={`result-away-${match.id}`}
                                  name="away-score"
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  className={fieldClassName}
                                  disabled={busyAction === `result-${match.id}`}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={busyAction === `result-${match.id}`}
                                className={buttonClassName}
                              >
                                {busyAction === `result-${match.id}`
                                  ? "Збереження…"
                                  : "Завершити матч"}
                              </button>
                            </div>
                          </form>
                        )}

                        {isOwner && isFinished && (
                          <form
                            className="mt-5 border-t border-[#e0e3dd] pt-4"
                            onSubmit={(event) =>
                              void handleSaveResult(event, match)
                            }
                          >
                            <p className="mb-3 text-sm font-semibold">
                              Виправити результат
                            </p>
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="w-24">
                                <label
                                  htmlFor={`result-home-${match.id}`}
                                  className="mb-1 block text-xs text-[#626b64]"
                                >
                                  {match.team_home}
                                </label>
                                <input
                                  id={`result-home-${match.id}`}
                                  name="home-score"
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  defaultValue={match.home_score ?? ""}
                                  className={fieldClassName}
                                  disabled={busyAction === `result-${match.id}`}
                                />
                              </div>
                              <span className="pb-3 text-[#7a827b]">:</span>
                              <div className="w-24">
                                <label
                                  htmlFor={`result-away-${match.id}`}
                                  className="mb-1 block text-xs text-[#626b64]"
                                >
                                  {match.team_away}
                                </label>
                                <input
                                  id={`result-away-${match.id}`}
                                  name="away-score"
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  defaultValue={match.away_score ?? ""}
                                  className={fieldClassName}
                                  disabled={busyAction === `result-${match.id}`}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={busyAction === `result-${match.id}`}
                                className={buttonClassName}
                              >
                                {busyAction === `result-${match.id}`
                                  ? "Збереження…"
                                  : "Виправити результат"}
                              </button>
                            </div>
                          </form>
                        )}

                        {(isFinished || started) && (
                          <div className="mt-5 border-t border-[#e0e3dd] pt-4">
                            <h4 className="mb-3 text-sm font-semibold">
                              Прогнози учасників
                            </h4>
                            {visiblePredictions.length === 0 ? (
                              <p className="text-sm text-[#626b64]">
                                Прогнозів поки немає.
                              </p>
                            ) : (
                              <ul className="divide-y divide-[#eef0ec]">
                                {visiblePredictions.map((prediction) => (
                                  <li
                                    key={prediction.id}
                                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
                                  >
                                    <span className="text-[#626b64]">
                                      {prediction.profile?.username ??
                                        "Учасник"}
                                    </span>
                                    <span className="font-medium tabular-nums">
                                      {prediction.predicted_home_score} :{" "}
                                      {prediction.predicted_away_score}
                                      <span className="ml-3 text-[#626b64]">
                                        {prediction.points_earned ?? 0} оч.
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {(isOwner || isMember) && (
              <section className="mt-12 border-t border-[#d9ddd6] pt-8">
                {isOwner ? (
                  <div className="border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-semibold text-rose-900">
                      Небезпечна дія
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#626b64]">
                      Видалення ліги також видалить усі її матчі та прогнози.
                    </p>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void handleDeleteLeague()}
                      className="mt-4 h-11 border border-rose-700 px-5 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction === "delete-league"
                        ? "Видалення ліги…"
                        : "Видалити лігу"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void handleLeaveLeague()}
                    className="h-11 border border-rose-700 px-5 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === "leave-league"
                      ? "Вихід із ліги…"
                      : "Вийти з ліги"}
                  </button>
                )}
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
