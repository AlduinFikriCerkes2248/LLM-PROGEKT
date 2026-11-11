"use client";
import { DemoNoticeBadge } from "../demo-banner";
import { HeraldicCelebrationModal } from "../heraldic-coat-of-arms";

import Link from "next/link";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../../lib/supabase/client";
import { useEffect, useState, type FormEvent } from "react";
import { formatErrorMessage } from "../../lib/error-utils";

type League = {
  id: string;
  title: string;
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
  const [newlyCreatedLeague, setNewlyCreatedLeague] = useState<{ title: string; inviteCode: string } | null>(null);
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
        console.error("Не вдалося завантажити ліги:", formatErrorMessage(error));
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

      const inviteCode = crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 12)
        .toUpperCase();

      const { data: leagueData, error: leagueError } = await client
        .from("leagues")
        .insert({
          title,
          invite_code: inviteCode,
          owner_id: authData.user.id,
        })
        .select("id, title, invite_code")
        .single();

      if (leagueError) throw leagueError;

      const newLeague = leagueData as League & { invite_code: string };
      setCreatedInviteCode(newLeague.invite_code);
      setNewlyCreatedLeague({ title: newLeague.title, inviteCode: newLeague.invite_code });
      setLeagues((prev) => [...prev, { id: newLeague.id, title: newLeague.title }]);
      setLeagueTitle("");

      const { error: memberError } = await client.from("league_members").insert({
        league_id: newLeague.id,
        user_id: authData.user.id,
        role: "owner",
      });

      if (memberError) {
        console.error("Помилка додавання творця до учасників:", memberError);
        setFormError(getMemberInsertError(memberError, "create"));
      }
    } catch (error) {
      console.error("Не вдалося створити лігу:", formatErrorMessage(error));
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
        setFormError("Недостатньо прав для створення ліги. Перевірте RLS політики.");
      } else {
        setFormError(formatErrorMessage(error, "Не вдалося створити лігу. Спробуйте ще раз."));
      }
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
      console.error("Не вдалося приєднатися до ліги:", formatErrorMessage(error));
      setJoinError("Не вдалося приєднатися до ліги. Спробуйте ще раз.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-transparent px-4 py-6 font-sans text-slate-100 sm:px-8 sm:py-10 relative overflow-hidden select-none">
      {/* М'яке фонове дифузне світіння */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#FC7340]/15 via-[#0297DE]/10 to-transparent blur-[130px] rounded-full" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[380px] h-[380px] bg-[#0297DE]/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Navigation Bar / Quick Links */}
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
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#0297DE] shadow-[0_0_8px_#0297DE]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#0297DE]">ЛІГИ ПРОГНОЗІВ</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/online"
              className="rounded-xl border border-[#0297DE]/40 bg-[#0A1430] hover:bg-[#121e3d] hover:border-[#0297DE] px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition shadow-[0_0_12px_rgba(2,151,222,0.15)]"
            >
              🌐 Онлайн PvP
            </Link>
            <Link
              href="/wheel"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#FC7340]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🎡 Колесо фортуни
            </Link>
            <Link
              href="/cases"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🎁 Кейси та квести
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

        <HeraldicCelebrationModal
          show={newlyCreatedLeague !== null}
          onClose={() => setNewlyCreatedLeague(null)}
          leagueTitle={newlyCreatedLeague?.title}
          inviteCode={newlyCreatedLeague?.inviteCode}
        />
        <DemoNoticeBadge />

        {/* Header Section */}
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#0297DE]/30 bg-[#0A1430]/90 px-3.5 py-1 text-xs text-[#0297DE] shadow-[0_0_12px_rgba(2,151,222,0.15)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0297DE] animate-pulse" />
            <span className="font-mono tracking-wider uppercase text-[11px]">Футбольна ліга прогнозів</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-tight leading-tight">
            Турніри та ліги прогнозів
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-slate-300/90 max-w-lg mx-auto">
            Створюйте власні ліги або приєднуйтесь за інвайт-кодом друзів
          </p>
        </header>

        {/* Action Forms Grid */}
        <div className="mb-10 grid gap-6 sm:grid-cols-2">
          {/* Create League */}
          <section className="bg-[#0A1430]/95 border border-[#162544] hover:border-[#0297DE]/50 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl transition-all">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-white">
              <span className="text-[#FC7340]">➕</span> СТВОРИТИ ЛІГУ
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Створи свою лігу для друзів та отримуй код запрошення.
            </p>
            <form onSubmit={handleCreateLeague} className="space-y-3.5">
              <input
                type="text"
                placeholder="Назва турніру або ліги..."
                value={leagueTitle}
                onChange={(e) => setLeagueTitle(e.target.value)}
                required
                disabled={isCreating}
                className="h-11 min-h-[44px] w-full rounded-xl border border-[#162544] bg-[#060A17] px-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#0297DE] focus:ring-1 focus:ring-[#0297DE] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isCreating || !leagueTitle.trim()}
                className="btn-interactive h-11 min-h-[44px] w-full rounded-xl bg-gradient-to-r from-[#FC7340] to-[#FF5E3A] hover:from-[#ff8153] hover:to-[#ff6f4c] px-4 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(252,115,64,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Створення..." : "Створити лігу"}
              </button>
            </form>
            {createdInviteCode && (
              <div className="mt-3 rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-2.5 text-center text-xs text-emerald-300">
                Код запрошення: <span className="font-bold text-amber-300 select-all">{createdInviteCode}</span>
              </div>
            )}
            {formError && (
              <p className="mt-2 text-xs text-rose-400">{formError}</p>
            )}
          </section>

          {/* Join League */}
          <section className="bg-[#0A1430]/95 border border-[#162544] hover:border-[#0297DE]/50 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl transition-all">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-white">
              <span className="text-[#0297DE]">🔑</span> ПРИЄДНАТИСЯ ЗА КОДОМ
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Введи код ліги, яким з тобою поділився організатор.
            </p>
            <form onSubmit={handleJoinLeague} className="space-y-3.5">
              <input
                type="text"
                placeholder="Введи код ліги (напр. 007480...)"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                required
                disabled={isJoining}
                className="h-11 min-h-[44px] w-full rounded-xl border border-[#162544] bg-[#060A17] px-3.5 text-sm uppercase text-white placeholder-slate-500 outline-none transition focus:border-[#0297DE] focus:ring-1 focus:ring-[#0297DE] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isJoining || !inviteCodeInput.trim()}
                className="btn-interactive h-11 min-h-[44px] w-full rounded-xl bg-[#0297DE] hover:bg-[#15a2e8] px-4 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(2,151,222,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoining ? "Приєднання..." : "Приєднатися"}
              </button>
            </form>
            {joinStatus && (
              <p className="mt-3 text-center text-xs text-emerald-400">{joinStatus}</p>
            )}
            {joinError && (
              <p className="mt-2 text-xs text-rose-400">{joinError}</p>
            )}
          </section>
        </div>

        {/* Leagues List */}
        <section className="bg-[#0A1430]/95 border border-[#162544] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#162544] pb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-[#0297DE]">🏆</span> ДОСТУПНІ ЛІГИ ({leagues.length})
            </h2>
            <span className="text-xs text-slate-400">[ Оберіть лігу для прогнозів ]</span>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-slate-400 animate-pulse">
              ⚡ Завантаження ліг...
            </p>
          ) : loadError ? (
            <p className="text-center text-sm text-rose-400">{loadError}</p>
          ) : leagues.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">Поки немає жодної ліги.</p>
              <p className="mt-1 text-xs text-slate-500">Створіть першу лігу вище!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="animate-card-in group relative flex items-center justify-between overflow-hidden rounded-2xl border border-[#162544] bg-[#060A17]/90 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0297DE] hover:shadow-[0_8px_25px_rgba(2,151,222,0.2)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#0297DE]/30 bg-[#0A1430] text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      ⚽
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#0297DE] transition-colors">
                        {league.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="rounded-lg bg-[#0A1430] border border-[#162544] px-2 py-0.5 text-slate-300">
                          Матчі
                        </span>
                        <span className="rounded-lg bg-[#0A1430] border border-[#162544] px-2 py-0.5 text-slate-300">
                          Ставки
                        </span>
                        <span className="rounded-lg bg-emerald-950/60 border border-emerald-600/40 px-2 py-0.5 text-emerald-300">
                          Таблиця
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#0297DE] group-hover:translate-x-1 transition-all">
                    <span className="hidden sm:inline">Вхід</span>
                    <span className="text-base">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Matchday · Football Prediction League System · 2026
        </p>
      </div>
    </main>
  );
}
