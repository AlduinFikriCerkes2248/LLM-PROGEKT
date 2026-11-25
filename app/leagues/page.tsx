"use client";

import Link from "next/link";
import { DemoNoticeBadge } from "../demo-banner";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../../lib/supabase/client";
import { useEffect, useState, type FormEvent } from "react";
import { formatErrorMessage } from "../../lib/error-utils";
import { AppTheme, getStoredTheme, THEME_CHANGE_EVENT } from "@/lib/theme";
import { SkeletonLeagueGrid } from "@/components/skeleton";

type League = {
  id: string;
  title: string;
  invite_code?: string;
  owner_id?: string;
  owner_username?: string;
  member_count?: number;
  match_count?: number;
  is_owner?: boolean;
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
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [newlyCreatedLeague, setNewlyCreatedLeague] = useState<{
    id: string;
    title: string;
    inviteCode: string;
  } | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [theme, setTheme] = useState<AppTheme>("dark");

  useEffect(() => {
    setTheme(getStoredTheme());
    const onTheme = (e: Event) => {
      const custom = e as CustomEvent<{ theme?: AppTheme }>;
      setTheme(custom.detail?.theme || getStoredTheme());
    };
    window.addEventListener(THEME_CHANGE_EVENT, onTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onTheme);
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    const supabase = client;

    let cancelled = false;

    async function loadLeagues() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData?.user?.id;
        if (cancelled) return;

        const { data, error } = await supabase
          .from("leagues")
          .select("id, title, invite_code, owner_id")
          .order("title", { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        const rawLeagues = (data || []) as League[];

        // Збір кількості учасників та матчів
        const membersByLeague: Record<string, number> = {};
        const matchesByLeague: Record<string, number> = {};
        const ownerNames: Record<string, string> = {};

        try {
          const { data: mems } = await supabase
            .from("league_members")
            .select("league_id");
          if (mems) {
            for (const m of mems) {
              membersByLeague[m.league_id] = (membersByLeague[m.league_id] || 0) + 1;
            }
          }
        } catch {
          // тихо ігноруємо, якщо RLS або таблиця відсутня
        }

        try {
          const { data: matches } = await supabase
            .from("matches")
            .select("league_id");
          if (matches) {
            for (const m of matches) {
              if (m.league_id) {
                matchesByLeague[m.league_id] = (matchesByLeague[m.league_id] || 0) + 1;
              }
            }
          }
        } catch {
          // тихо ігноруємо
        }

        try {
          const ownerIds = Array.from(
            new Set(rawLeagues.map((l) => l.owner_id).filter(Boolean)),
          );
          if (ownerIds.length > 0) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, username")
              .in("id", ownerIds);
            if (profs) {
              for (const p of profs) {
                if (p.username) ownerNames[p.id] = p.username;
              }
            }
          }
        } catch {
          // тихо ігноруємо
        }

        const enrichedLeagues: League[] = rawLeagues.map((l) => {
          const isOwner = Boolean(currentUserId && l.owner_id === currentUserId);
          const ownerName = isOwner
            ? "Максим (Ви)"
            : (l.owner_id && ownerNames[l.owner_id]) || "Організатор";

          return {
            ...l,
            is_owner: isOwner,
            owner_username: ownerName,
            member_count: membersByLeague[l.id] || 1,
            match_count: matchesByLeague[l.id] || 0,
          };
        });

        setLeagues(enrichedLeagues);
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
      setNewlyCreatedLeague({
        id: newLeague.id,
        title: newLeague.title,
        inviteCode: newLeague.invite_code,
      });

      setLeagues((prev) => [
        {
          id: newLeague.id,
          title: newLeague.title,
          invite_code: newLeague.invite_code,
          owner_id: authData.user.id,
          is_owner: true,
          owner_username: "Максим (Ви)",
          member_count: 1,
          match_count: 0,
        },
        ...prev,
      ]);
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
        .select("id, title, owner_id")
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
        setLeagues((prev) => [
          ...prev,
          {
            id: leagueData.id,
            title: leagueData.title,
            owner_id: leagueData.owner_id,
            is_owner: leagueData.owner_id === authData.user.id,
            owner_username:
              leagueData.owner_id === authData.user.id ? "Максим (Ви)" : "Організатор",
            member_count: 2,
            match_count: 0,
          },
        ]);
      }
    } catch (error) {
      console.error("Не вдалося приєднатися до ліги:", formatErrorMessage(error));
      setJoinError("Не вдалося приєднатися до ліги. Спробуйте ще раз.");
    } finally {
      setIsJoining(false);
    }
  }

  function handleCopyInviteCode() {
    if (!newlyCreatedLeague) return;
    navigator.clipboard.writeText(newlyCreatedLeague.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const isWinter = theme === "winter";

  return (
    <main className="min-h-screen flex-1 bg-transparent px-4 py-6 font-sans text-slate-100 sm:px-8 sm:py-8 relative overflow-x-hidden select-none">
      {isWinter && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/images/winter/stadium-bg.jpg)" }}
          />
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(180deg, rgba(4, 12, 26, 0.72) 0%, rgba(5, 16, 36, 0.6) 45%, rgba(3, 9, 22, 0.9) 100%)",
            }}
          />
        </>
      )}
      <DemoNoticeBadge />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Верхня навігація (Matchday Header) */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(65,140,190,0.22)] pb-4">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="flex items-center gap-1">
              <span className="w-1 h-3.5 bg-[#08bfea] rounded-full group-hover:h-4 transition-all" />
              <span className="w-1 h-4.5 bg-[#08bfea] rounded-full group-hover:h-5 transition-all" />
              <span className="w-1 h-3.5 bg-[#08bfea] rounded-full group-hover:h-4 transition-all" />
            </div>
            <div className="ml-1 flex flex-col">
              <span className="font-black text-sm sm:text-base tracking-[0.14em] text-white uppercase leading-none">
                MATCHDAY
              </span>
              {isWinter && (
                <span className="text-[9px] font-black tracking-[0.2em] text-sky-300 uppercase mt-0.5">
                  WINTER EDITION ❄️
                </span>
              )}
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              Головна
            </Link>
            <Link
              href="/leagues"
              className="rounded-lg border border-[#08bfea] bg-[rgba(8,191,234,0.15)] px-3.5 py-1.5 text-xs font-bold text-[#08bfea] transition shadow-[0_0_12px_rgba(8,191,234,0.2)]"
            >
              Ліги
            </Link>
            <Link
              href="/online"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              Онлайн PvP
            </Link>
            <Link
              href="/cases"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              Кейси
            </Link>
            <Link
              href="/wheel"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              Колесо
            </Link>
            <Link
              href="/blackjack"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              Блекджек
            </Link>
            <Link
              href="/dice"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              Кості
            </Link>
          </nav>
        </header>

        {/* Заголовок сторінки (Hero Section) */}
        <section className="mb-9 text-center">
          <span className="inline-block border border-[rgba(8,191,234,0.4)] bg-[rgba(8,191,234,0.1)] text-[#08bfea] px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-3 backdrop-blur-md">
            {isWinter ? "❄️ Зимовий Кубок та Ліги MATCHDAY" : "Футбольні ліги та турніри"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow">
            Турніри та <span className={isWinter ? "text-sky-300" : ""}>ліги</span> прогнозів
          </h1>
          <p className="text-xs sm:text-sm text-[#9aa9be] max-w-lg mx-auto">
            Створюйте власні ліги для друзів та колег або приєднуйтесь за інвайт-кодом організатора.
          </p>
        </section>

        {/* Дві форми: Створити лігу & Приєднатися */}
        <div className="grid gap-5 sm:grid-cols-2 mb-9">
          {/* Створити лігу */}
          <div
            className={`rounded-2xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl transition ${
              isWinter
                ? "bg-[#09182f]/75 border border-sky-300/30 hover:border-sky-300/60"
                : "bg-[#101a29]/90 border border-[rgba(65,140,190,0.22)]"
            }`}
          >
            <div className="text-sm font-black uppercase text-white flex items-center gap-2 mb-1.5">
              <span className="text-[#ff7a24] font-black text-base">+</span> Створити лігу
            </div>
            <div className="text-xs text-[#9aa9be] mb-4">
              Створи свою лігу для друзів та отримай код запрошення.
            </div>
            <form onSubmit={handleCreateLeague}>
              <input
                type="text"
                value={leagueTitle}
                onChange={(e) => setLeagueTitle(e.target.value)}
                placeholder="Назва турніру або ліги..."
                required
                disabled={isCreating}
                className="w-full bg-[#070b14] border border-[rgba(65,140,190,0.22)] rounded-lg text-sm text-white px-3.5 py-2.5 outline-none focus:border-[#08bfea] transition placeholder-[#64748b] mb-3.5 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isCreating || !leagueTitle.trim()}
                className="w-full bg-[#ff7a24] hover:bg-[#ff9147] text-white font-extrabold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(255,122,36,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Створення..." : "Створити лігу"}
              </button>
            </form>
            {formError && (
              <p className="mt-3 text-xs text-rose-400">{formError}</p>
            )}
          </div>

          {/* Приєднатися за кодом */}
          <div
            className={`rounded-2xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl transition ${
              isWinter
                ? "bg-[#09182f]/75 border border-sky-300/30 hover:border-sky-300/60"
                : "bg-[#101a29]/90 border border-[rgba(65,140,190,0.22)]"
            }`}
          >
            <div className="text-sm font-black uppercase text-white flex items-center gap-2 mb-1.5">
              <span className="text-[#08bfea] text-sm">🔑</span> Приєднатися за кодом
            </div>
            <div className="text-xs text-[#9aa9be] mb-4">
              Введи код ліги, яким з тобою поділився організатор.
            </div>
            <form onSubmit={handleJoinLeague}>
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="ВВЕДИ КОД ЛІГИ (НАПР.: MD-7842)..."
                required
                disabled={isJoining}
                className="w-full bg-[#070b14] border border-[rgba(65,140,190,0.22)] rounded-lg text-sm uppercase text-white px-3.5 py-2.5 outline-none focus:border-[#08bfea] transition placeholder-[#64748b] mb-3.5 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isJoining || !inviteCodeInput.trim()}
                className="w-full bg-[#08bfea] hover:bg-[#2cd5fb] text-[#070b14] font-extrabold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(8,191,234,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoining ? "Приєднання..." : "Приєднатися"}
              </button>
            </form>
            {joinStatus && (
              <p className="mt-3 text-center text-xs text-emerald-400 font-semibold">{joinStatus}</p>
            )}
            {joinError && (
              <p className="mt-3 text-xs text-rose-400">{joinError}</p>
            )}
          </div>
        </div>

        {/* Розділ доступних ліг (3-колонковий Card Grid точ в точ як у GOYDAFF) */}
        <div className="mb-5 flex items-center justify-between border-b border-[rgba(65,140,190,0.22)] pb-3">
          <div className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-[rgba(8,191,234,0.15)] text-[#08bfea] text-[10px] font-black border border-[rgba(8,191,234,0.3)]">
              MD
            </span>
            <span>Доступні ліги ( {leagues.length} )</span>
          </div>
          <span className="text-xs text-[#9aa9be] hidden sm:inline">
            Оберіть лігу для перегляду та прогнозів
          </span>
        </div>

        {isLoading ? (
          <SkeletonLeagueGrid />
        ) : loadError ? (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-6 text-center text-sm text-rose-400 mb-6">
            {loadError}
          </div>
        ) : leagues.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(65,140,190,0.22)] bg-[#101a29] p-12 text-center">
            <p className="text-[#9aa9be] font-medium text-sm">Поки немає жодної створеної ліги.</p>
            <p className="mt-1 text-xs text-slate-500">Створіть свою першу футбольну лігу у формі вище!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[rgba(8,191,234,0.45)] rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {league.is_owner ? (
                    <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[rgba(8,191,234,0.15)] text-[#08bfea] border border-[rgba(8,191,234,0.4)] mb-2.5">
                      ОРГАНІЗАТОР
                    </span>
                  ) : (
                    <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.4)] mb-2.5">
                      УЧАСНИК
                    </span>
                  )}
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#08bfea] transition-colors leading-snug line-clamp-1 mb-1">
                    {league.title}
                  </h3>
                  <div className="text-xs text-[#9aa9be]">
                    Організатор:{" "}
                    <strong className="text-slate-300 font-semibold">
                      {league.owner_username || "Організатор"}
                    </strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[rgba(65,140,190,0.22)] flex items-center justify-between">
                  <span className="text-xs text-[#9aa9be] font-medium">
                    {league.member_count ?? 1} учасників · {league.match_count ?? 0} матчів
                  </span>
                  <Link
                    href={`/leagues/${league.id}`}
                    className="bg-[#08bfea] hover:bg-[#2cd5fb] text-[#070b14] font-black text-xs px-3.5 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(8,191,234,0.3)] transition-all"
                  >
                    Увійти →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Футер */}
        <p className="mt-12 text-center text-xs text-[#64748b]">
          Matchday · Football Prediction League System · 2026
        </p>
      </div>

      {/* Модальне вікно успішного створення ліги точ в точ як у GOYDAFF */}
      {newlyCreatedLeague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0d1522] border-2 border-[#08bfea] rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_35px_rgba(8,191,234,0.35)]">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-black text-white mb-2">
              ЛІГУ УСПІШНО СТВОРЕНО!
            </h2>
            <p className="text-xs text-[#9aa9be] mb-4">
              Ваш турнір{" "}
              <strong className="text-[#08bfea]">
                «{newlyCreatedLeague.title}»
              </strong>{" "}
              готовий. Поділіться кодом із друзями:
            </p>

            <div
              onClick={handleCopyInviteCode}
              title="Натисніть щоб скопіювати"
              className="bg-[#070b14] border border-[#08bfea] rounded-lg p-3 font-mono text-xl font-black text-[#08bfea] tracking-widest mb-2 cursor-pointer hover:bg-[#0c182c] transition-colors select-all"
            >
              {newlyCreatedLeague.inviteCode}
            </div>
            <div className="text-[11px] text-[#64748b] mb-6">
              {copiedCode ? "✓ Код скопійовано в буфер обміну!" : "Натисніть на код для швидкого копіювання"}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setNewlyCreatedLeague(null)}
                className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] px-4 py-2.5 text-xs font-bold text-white transition"
              >
                Закрити
              </button>
              <Link
                href={`/leagues/${newlyCreatedLeague.id}`}
                className="bg-[#08bfea] hover:bg-[#2cd5fb] text-[#070b14] font-black text-xs px-5 py-2.5 rounded-lg shadow-[0_4px_14px_rgba(8,191,234,0.4)] transition-all"
              >
                Перейти до ліги →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
