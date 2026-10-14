"use client";

import Link from "next/link";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../../lib/supabase/client";
import { useEffect, useState, type FormEvent } from "react";

type League = {
  id: string;
  title: string;
};

const leagueAccents = [
  "border-l-emerald-600",
  "border-l-orange-500",
  "border-l-sky-600",
  "border-l-rose-500",
];

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

function getMemberInsertError(error: unknown, context: "create" | "join") {
  const code = getErrorCode(error);

  if (code === "23503") {
    const prefix = context === "create" ? "Лігу створено, але " : "";
    return `${prefix}ваш профіль не знайдено. Переконайтеся, що в profiles заповнено обов’язкове поле username.`;
  }

  if (code === "23505") {
    return context === "join"
      ? "Ви вже в цій лізі."
      : "Лігу створено, але запис про творця вже є серед учасників.";
  }

  if (code === "42501") {
    const prefix = context === "create" ? "Лігу створено, але " : "";
    return `${prefix}Supabase заборонив додати учасника. Перевірте INSERT-політику RLS для league_members.`;
  }

  return context === "create"
    ? "Лігу створено, але не вдалося додати творця до учасників."
    : "Не вдалося приєднатися до ліги. Перевірте права доступу до league_members.";
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : "Додайте URL проєкту Supabase та анонімний ключ у змінні середовища.",
  );
  const [leagueTitle, setLeagueTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    const supabase = client;

    let cancelled = false;

    async function loadLeagues() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (authError) throw authError;

        setCurrentUserId(authData.user?.id ?? null);

        const { data, error } = await supabase
          .from("leagues")
          .select("id, title")
          .order("title", { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        setLeagues(data as League[]);
      } catch {
        if (!cancelled) {
          setLoadError(
            "Не вдалося завантажити ліги. Перевірте таблицю та політики доступу Supabase.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadLeagues();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleCreateLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setCreatedInviteCode(null);

    const title = leagueTitle.trim();
    if (!title) {
      setFormError("Вкажіть назву ліги.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setFormError("Спочатку налаштуйте підключення до Supabase.");
      return;
    }

    setIsCreating(true);

    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setCurrentUserId(null);
        setFormError("Увійдіть у свій акаунт, щоб створити лігу.");
        return;
      }

      const inviteCode = crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 12)
        .toUpperCase();

      const { data, error } = await client
        .from("leagues")
        .insert({
          title,
          invite_code: inviteCode,
          owner_id: authData.user.id,
        })
        .select("id, title")
        .single();

      if (error) throw error;

      const createdLeague = data as League;
      setLeagues((currentLeagues) =>
        [...currentLeagues, createdLeague].sort((first, second) =>
          first.title.localeCompare(second.title, "uk"),
        ),
      );
      setLeagueTitle("");

      const { error: memberError } = await client.from("league_members").insert({
        user_id: authData.user.id,
        league_id: createdLeague.id,
        role: "owner",
      });

      if (memberError) {
        setFormError(getMemberInsertError(memberError, "create"));
        return;
      }

      setCreatedInviteCode(inviteCode);
    } catch (error) {
      const code = getErrorCode(error);
      if (code === "23503") {
        setFormError(
          "Ваш профіль не знайдено. Переконайтеся, що в profiles заповнено обов’язкове поле username.",
        );
      } else if (code === "23505") {
        setFormError(
          "Не вдалося створити лігу через дубльований запис. Спробуйте ще раз.",
        );
      } else if (code === "42501") {
        setFormError(
          "Supabase заборонив створити лігу або додати творця. Перевірте політики RLS.",
        );
      } else {
        setFormError(
          "Не вдалося створити лігу. Перевірте права доступу та унікальність інвайт-коду в Supabase.",
        );
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError(null);
    setJoinStatus(null);

    const inviteCode = inviteCodeInput.replace(/\s+/g, "").toUpperCase();
    if (!inviteCode) {
      setJoinError("Введіть інвайт-код.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setJoinError("Спочатку налаштуйте підключення до Supabase.");
      return;
    }

    setIsJoining(true);

    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setCurrentUserId(null);
        setJoinError("Увійдіть у свій акаунт, щоб приєднатися до ліги.");
        return;
      }

      const { data: league, error: leagueError } = await client
        .from("leagues")
        .select("id, title")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (leagueError) throw leagueError;
      if (!league) {
        setJoinError("Лігу з таким кодом не знайдено");
        return;
      }

      const { data: existingMember, error: memberLookupError } = await client
        .from("league_members")
        .select("league_id")
        .eq("league_id", league.id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (memberLookupError) throw memberLookupError;
      if (existingMember) {
        setJoinError("Ви вже в цій лізі");
        return;
      }

      const { error: insertError } = await client.from("league_members").insert({
        user_id: authData.user.id,
        league_id: league.id,
        role: "member",
      });

      if (insertError) {
        setJoinError(getMemberInsertError(insertError, "join"));
        return;
      }

      const joinedLeague: League = { id: league.id, title: league.title };
      setLeagues((currentLeagues) =>
        [
          ...currentLeagues.filter((item) => item.id !== joinedLeague.id),
          joinedLeague,
        ].sort((first, second) =>
          first.title.localeCompare(second.title, "uk"),
        ),
      );
      setInviteCodeInput("");
      setJoinStatus(`Ви приєдналися до ліги «${league.title}».`);
    } catch (error) {
      const code = getErrorCode(error);
      if (code === "23503") {
        setJoinError(
          "Ваш профіль не знайдено. Переконайтеся, що в profiles заповнено обов’язкове поле username.",
        );
      } else if (code === "23505") {
        setJoinError("Ви вже в цій лізі.");
      } else {
        setJoinError(
          "Не вдалося приєднатися до ліги. Перевірте доступ до таблиць Supabase та політики RLS.",
        );
      }
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-[#f4f5f1] px-5 py-10 text-[#202722] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 border-b border-[#d9ddd6] pb-8 sm:mb-12 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Matchday · Ліги
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Твої ліги
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#626b64]">
              Обирай лігу, стеж за матчами та змагайся у точності прогнозів.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3 sm:mt-0 sm:pb-1">
            <span className="flex h-10 min-w-10 items-center justify-center rounded-sm bg-[#202722] px-3 text-sm font-semibold text-white">
              {leagues.length.toString().padStart(2, "0")}
            </span>
            <span className="text-sm text-[#626b64]">ліг у списку</span>
          </div>
        </header>

        <section
          aria-labelledby="create-league-heading"
          className="mb-10 border border-[#e0e3dd] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5">
            <h2 id="create-league-heading" className="text-lg font-semibold">
              Створити лігу
            </h2>
            <p className="mt-1 text-sm text-[#626b64]">
              Інвайт-код буде згенеровано автоматично.
            </p>
          </div>

          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={handleCreateLeague}
          >
            <div className="flex-1">
              <label
                htmlFor="league-title"
                className="mb-1.5 block text-sm font-medium"
              >
                Назва ліги
              </label>
              <input
                id="league-title"
                name="title"
                type="text"
                required
                maxLength={80}
                value={leagueTitle}
                onChange={(event) => setLeagueTitle(event.target.value)}
                placeholder="Наприклад, Друзі на трибунах"
                className="h-11 w-full border border-[#c8cec7] bg-[#fbfcfa] px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              />
            </div>
            <button
              type="submit"
              disabled={!currentUserId || isCreating || !isSupabaseConfigured}
              className="h-11 shrink-0 bg-[#202722] px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-[#a5ada6]"
            >
              {isCreating ? "Створення…" : "Створити лігу"}
            </button>
          </form>

          {!currentUserId && isSupabaseConfigured && !isLoading && (
            <p className="mt-3 text-sm text-[#626b64]">
              Увійдіть у свій акаунт, щоб створити лігу.
            </p>
          )}
          {formError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {formError}
            </p>
          )}
          {createdInviteCode && (
            <p
              role="status"
              className="mt-4 border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
            >
              Лігу створено. Інвайт-код: <strong>{createdInviteCode}</strong>
            </p>
          )}
        </section>

        <section
          aria-labelledby="join-league-heading"
          className="mb-10 border border-[#e0e3dd] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5">
            <h2 id="join-league-heading" className="text-lg font-semibold">
              Приєднатися до ліги
            </h2>
            <p className="mt-1 text-sm text-[#626b64]">
              Введіть інвайт-код, щоб долучитися до друзів.
            </p>
          </div>

          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={handleJoinLeague}
          >
            <div className="flex-1">
              <label
                htmlFor="league-invite-code"
                className="mb-1.5 block text-sm font-medium"
              >
                Інвайт-код
              </label>
              <input
                id="league-invite-code"
                name="invite-code"
                type="text"
                required
                value={inviteCodeInput}
                onChange={(event) => setInviteCodeInput(event.target.value)}
                placeholder="Наприклад, A1B2C3D4E5F6"
                autoCapitalize="characters"
                className="h-11 w-full border border-[#c8cec7] bg-[#fbfcfa] px-3 text-sm uppercase outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              />
            </div>
            <button
              type="submit"
              disabled={!currentUserId || isJoining || !isSupabaseConfigured}
              className="h-11 shrink-0 bg-[#202722] px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-[#a5ada6]"
            >
              {isJoining ? "Приєднання…" : "Приєднатися"}
            </button>
          </form>

          {!currentUserId && isSupabaseConfigured && !isLoading && (
            <p className="mt-3 text-sm text-[#626b64]">
              Увійдіть у свій акаунт, щоб приєднатися до ліги.
            </p>
          )}
          {joinError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {joinError}
            </p>
          )}
          {joinStatus && (
            <p role="status" className="mt-3 text-sm text-emerald-800">
              {joinStatus}
            </p>
          )}
        </section>

        <section aria-labelledby="league-list-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="league-list-heading" className="text-lg font-semibold">
              Доступні ліги
            </h2>
            <span className="text-xs font-medium uppercase tracking-wide text-[#7a827b]">
              Supabase
            </span>
          </div>

          {loadError ? (
            <div
              role="alert"
              className="border-l-4 border-orange-500 bg-white px-5 py-5 text-sm leading-6 text-[#626b64] shadow-sm"
            >
              <p className="font-semibold text-[#202722]">
                Список поки недоступний
              </p>
              <p className="mt-1">{loadError}</p>
            </div>
          ) : isLoading ? (
            <p className="py-8 text-sm text-[#626b64]" role="status">
              Завантаження ліг…
            </p>
          ) : leagues.length === 0 ? (
            <div className="border border-dashed border-[#c8cec7] bg-white/60 px-6 py-12 text-center">
              <p className="text-lg font-semibold">Ліг поки немає</p>
              <p className="mt-2 text-sm text-[#626b64]">
                Коли ліги з’являться у базі, вони відобразяться тут.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {leagues.map((league, index) => (
                <li
                  key={league.id}
                  className={`border border-[#e0e3dd] border-l-4 ${leagueAccents[index % leagueAccents.length]} bg-white shadow-sm transition hover:border-emerald-700 hover:shadow-md`}
                >
                  <Link
                    href={`/leagues/${league.id}`}
                    className="flex min-h-24 items-center justify-between px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">
                        {league.title}
                      </p>
                      <p className="mt-1 text-xs text-[#7a827b]">
                        Турнірна ліга
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="ml-4 text-xl text-[#9aa29b]"
                    >
                      ↗
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}