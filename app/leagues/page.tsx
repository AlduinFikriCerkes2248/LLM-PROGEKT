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

const ASCII_MATCHDAY = `
███╗   ███╗ █████╗ ████████╗ ██████╗██╗  ██╗██████╗  █████╗ ██╗   ██╗
████╗ ████║██╔══██╗╚══██╔══╝██╔════╝██║  ██║██╔══██╗██╔══██╗╚██╗ ██╔╝
██╔████╔██║███████║   ██║   ██║     ███████║██║  ██║███████║ ╚████╔╝ 
██║╚██╔╝██║██╔══██║   ██║   ██║     ██╔══██║██║  ██║██╔══██║  ╚██╔╝  
██║ ╚═╝ ██║██║  ██║   ██║   ╚██████╗██║  ██║██████╔╝██║  ██║   ██║   
╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   
`.trim();

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
        const { error: authError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (authError) throw authError;

        const { data, error } = await supabase
          .from("leagues")
          .select("id, title")
          .order("title", { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        setLeagues(data as League[]);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        console.error("Не вдалося завантажити ліги:", error);
        setLoadError("Не вдалося завантажити список ліг. Спробуйте оновити сторінку.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadLeagues();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = leagueTitle.trim();
    if (!title) return;

    const client = getSupabaseClient();
    if (!client || isCreating) return;

    setIsCreating(true);
    setFormError(null);
    setCreatedInviteCode(null);

    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setFormError("Увійдіть, щоб створити лігу.");
        setIsCreating(false);
        return;
      }

      const { data: leagueData, error: leagueError } = await client
        .from("leagues")
        .insert({ title, created_by: authData.user.id })
        .select("id, title, invite_code")
        .single();

      if (leagueError) throw leagueError;

      const newLeague = leagueData as League & { invite_code: string };
      setCreatedInviteCode(newLeague.invite_code);
      setLeagues((prev) => [...prev, { id: newLeague.id, title: newLeague.title }]);
      setLeagueTitle("");

      const { error: memberError } = await client.from("league_members").insert({
        league_id: newLeague.id,
        user_id: authData.user.id,
      });

      if (memberError) {
        console.error("Помилка додавання творця до учасників:", memberError);
        setFormError(getMemberInsertError(memberError, "create"));
      }
    } catch (error) {
      console.error("Не вдалося створити лігу:", error);
      setFormError("Не вдалося створити лігу. Спробуйте ще раз.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) return;

    const client = getSupabaseClient();
    if (!client || isJoining) return;

    setIsJoining(true);
    setJoinError(null);
    setJoinStatus(null);

    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setJoinError("Увійдіть, щоб приєднатися до ліги.");
        setIsJoining(false);
        return;
      }

      const { data: leagueData, error: leagueError } = await client
        .from("leagues")
        .select("id, title")
        .eq("invite_code", code)
        .maybeSingle();

      if (leagueError) throw leagueError;
      if (!leagueData) {
        setJoinError("Лігу з таким кодом не знайдено.");
        setIsJoining(false);
        return;
      }

      const { error: memberError } = await client.from("league_members").insert({
        league_id: leagueData.id,
        user_id: authData.user.id,
      });

      if (memberError) {
        setJoinError(getMemberInsertError(memberError, "join"));
        setIsJoining(false);
        return;
      }

      setJoinStatus(`Успішно приєднано до ліги "${leagueData.title}"!`);
      setInviteCodeInput("");

      if (!leagues.some((l) => l.id === leagueData.id)) {
        setLeagues((prev) => [...prev, leagueData as League]);
      }
    } catch (error) {
      console.error("Не вдалося приєднатися до ліги:", error);
      setJoinError("Не вдалося приєднатися до ліги. Спробуйте ще раз.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-[#0a0a0a] px-4 py-8 font-mono text-gray-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Bar / Quick Links */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <span className="text-xs uppercase tracking-widest text-cyan-400">СИСТЕМА ЛІГ ПРОГНОЗІВ v2.0</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/online"
              className="rounded-lg border border-indigo-500/80 bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-300 transition hover:bg-indigo-900/60 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse"
            >
              🌐 ОНЛАЙН ДУЕЛІ (PVP)
            </Link>
            <Link
              href="/dice"
              className="rounded-lg border border-red-600/60 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-900/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              🎲 КОСТІ (DICE)
            </Link>
            <Link
              href="/cases"
              className="rounded-lg border border-purple-600/60 bg-purple-950/20 px-3 py-1.5 text-xs font-bold text-purple-300 transition hover:bg-purple-900/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
            >
              🎁 КЕЙСИ ТА КВЕСТИ
            </Link>
            <Link
              href="/wheel"
              className="rounded-lg border border-yellow-600/60 bg-yellow-950/20 px-3 py-1.5 text-xs font-bold text-yellow-400 transition hover:bg-yellow-900/40 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]"
            >
              🎡 КОЛЕСО ФОРТУНИ
            </Link>
            <Link
              href="/blackjack"
              className="rounded-lg border border-cyan-600/60 bg-cyan-950/20 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            >
              🃏 БЛЕКДЖЕК
            </Link>
          </div>
        </div>

        {/* ASCII Header */}
        <header className="mb-10 text-center">
          <pre className="mx-auto hidden overflow-x-auto text-[0.45rem] font-bold leading-tight text-cyan-400 sm:block sm:text-[0.55rem] md:text-xs" aria-hidden="true">
            {ASCII_MATCHDAY}
          </pre>
          <h1 className="text-3xl font-bold text-cyan-400 sm:hidden">
            MATCHDAY · ЛІГИ
          </h1>
          <p className="mt-3 text-sm text-yellow-400">
            ⚡ Змагайся у прогнозах, крути колесо та став монети ⚡
          </p>
        </header>

        {/* Action Forms Grid */}
        <div className="mb-10 grid gap-6 sm:grid-cols-2">
          {/* Create League */}
          <section className="rounded-xl border border-cyan-900/50 bg-gradient-to-b from-[#0f1a15] to-[#0a120e] p-5 shadow-[0_0_20px_rgba(0,255,200,0.03)] sm:p-6">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-cyan-300">
              <span>➕</span> СТВОРИТИ ЛІГУ
            </h2>
            <p className="mb-4 text-xs text-gray-400">
              Створи свою лігу для друзів та отримуй код запрошення.
            </p>
            <form onSubmit={handleCreateLeague} className="space-y-3">
              <input
                type="text"
                placeholder="Назва турніру або ліги..."
                value={leagueTitle}
                onChange={(e) => setLeagueTitle(e.target.value)}
                required
                disabled={isCreating}
                className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-cyan-200 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isCreating || !leagueTitle.trim()}
                className="h-10 w-full rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-600/20 transition hover:from-cyan-500 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Створення..." : "Створити лігу"}
              </button>
            </form>
            {createdInviteCode && (
              <div className="mt-3 rounded border border-emerald-800 bg-emerald-950/40 p-2 text-center text-xs text-emerald-300">
                Код запрошення: <span className="font-bold text-yellow-400 select-all">{createdInviteCode}</span>
              </div>
            )}
            {formError && (
              <p className="mt-2 text-xs text-red-400">{formError}</p>
            )}
          </section>

          {/* Join League */}
          <section className="rounded-xl border border-cyan-900/50 bg-gradient-to-b from-[#0f1a15] to-[#0a120e] p-5 shadow-[0_0_20px_rgba(0,255,200,0.03)] sm:p-6">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-cyan-300">
              <span>🔑</span> ПРИЄДНАТИСЯ ЗА КОДОМ
            </h2>
            <p className="mb-4 text-xs text-gray-400">
              Введи код ліги, яким з тобою поділився організатор.
            </p>
            <form onSubmit={handleJoinLeague} className="space-y-3">
              <input
                type="text"
                placeholder="Введи код ліги (напр. 007480...)"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                required
                disabled={isJoining}
                className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm uppercase text-cyan-200 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isJoining || !inviteCodeInput.trim()}
                className="h-10 w-full rounded-lg border border-cyan-700 bg-cyan-950/40 px-4 text-xs font-bold uppercase tracking-wider text-cyan-300 shadow-lg transition hover:bg-cyan-900/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoining ? "Приєднання..." : "Приєднатися"}
              </button>
            </form>
            {joinStatus && (
              <p className="mt-3 text-center text-xs text-emerald-400">{joinStatus}</p>
            )}
            {joinError && (
              <p className="mt-2 text-xs text-red-400">{joinError}</p>
            )}
          </section>
        </div>

        {/* Leagues List */}
        <section className="rounded-xl border border-cyan-900/40 bg-gradient-to-b from-[#0f1a15] to-[#0a120e] p-5 shadow-[0_0_25px_rgba(0,255,200,0.04)] sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-cyan-300">
              <span>🏆</span> ДОСТУПНІ ЛІГИ ({leagues.length})
            </h2>
            <span className="text-xs text-gray-500">[ Оберіть лігу для прогнозів ]</span>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-gray-500 animate-pulse">
              ⚡ Завантаження ліг...
            </p>
          ) : loadError ? (
            <p className="text-center text-sm text-red-400">{loadError}</p>
          ) : leagues.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400">Поки немає жодної ліги.</p>
              <p className="mt-1 text-xs text-gray-600">Створіть першу лігу вище!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="group relative flex items-center justify-between overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-r from-[#111722] via-[#0d121c] to-[#0a0d14] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400 hover:shadow-[0_10px_25px_rgba(6,182,212,0.25)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-800/80 bg-cyan-950/40 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      ⚽
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                        {league.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-slate-300">
                          Матчі
                        </span>
                        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-slate-300">
                          Ставки
                        </span>
                        <span className="rounded bg-emerald-950/60 border border-emerald-600/40 px-2 py-0.5 text-emerald-300">
                          Таблиця
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-cyan-400 group-hover:text-cyan-300 transition">
                    <span className="hidden sm:inline">Вхід</span>
                    <span className="text-base transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-600">
          Matchday · Football Prediction League System · 2026
        </p>
      </div>
    </main>
  );
}
