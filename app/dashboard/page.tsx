"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "../../components/theme-toggle";
import MatrixAvatar from "../../components/matrix-avatar";
import AiChipIcon from "../../components/ai-chip-icon";
import { getSupabaseClient, PROFILE_UPDATED_EVENT } from "../../lib/supabase/client";

type Leader = {
  rank: number;
  name: string;
  points: number;
  highlight?: boolean;
};

const DEFAULT_LEADERS: Leader[] = [
  { rank: 1, name: "ShadowKick", points: 452, highlight: true },
  { rank: 2, name: "Futbolist", points: 431 },
  { rank: 3, name: "GoalMaster", points: 398 },
  { rank: 4, name: "DimaPredict", points: 375 },
  { rank: 5, name: "FootballFan", points: 362 },
];

export default function DashboardPage() {
  const [username, setUsername] = useState<string>("Максим");
  const [balance, setBalance] = useState<number>(1080000);
  const [accuratePredictions, setAccuratePredictions] = useState<number>(12);
  const [rank, setRank] = useState<number>(1);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(50);
  const [joinDate, setJoinDate] = useState<string>("20.10.2026");
  const [leaderTab, setLeaderTab] = useState<"all" | "month" | "week">("all");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("matchday_theme") : null;
    const isLight =
      (typeof document !== "undefined" && document.documentElement.classList.contains("light")) ||
      saved === "light";
    setTheme(isLight ? "light" : "dark");

    const savedAv = typeof window !== "undefined" ? localStorage.getItem("matchday_avatar_url") : null;
    if (savedAv) setAvatarUrl(savedAv);

    // Завантажуємо локальний кеш монет
    try {
      const c = localStorage.getItem("matchday:coins") || localStorage.getItem("matchday_coins");
      if (c) setBalance(parseInt(c, 10));
    } catch {}

    function handleThemeChange(e: Event) {
      const customEvent = e as CustomEvent<{ theme: "dark" | "light" }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      } else {
        const isNowLight = document.documentElement.classList.contains("light");
        setTheme(isNowLight ? "light" : "dark");
      }
    }

    function handleProfileUpdate(e: Event) {
      const custom = e as CustomEvent<{ avatar_url?: string; username?: string; coins?: number }>;
      if (custom.detail?.avatar_url !== undefined) {
        setAvatarUrl(custom.detail.avatar_url);
      } else {
        const up = localStorage.getItem("matchday_avatar_url");
        setAvatarUrl(up);
      }
      if (custom.detail?.username) {
        setUsername(custom.detail.username);
      }
      if (custom.detail?.coins !== undefined) {
        setBalance(custom.detail.coins);
      } else {
        const c = localStorage.getItem("matchday:coins") || localStorage.getItem("matchday_coins");
        if (c) setBalance(parseInt(c, 10));
      }
    }

    function handleStorage(e: StorageEvent) {
      if (!e.key || e.key === "matchday:coins" || e.key === "matchday_coins") {
        const c = localStorage.getItem("matchday:coins") || localStorage.getItem("matchday_coins");
        if (c) setBalance(parseInt(c, 10));
      }
    }

    window.addEventListener("matchday:theme_change", handleThemeChange);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("matchday:theme_change", handleThemeChange);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
  const [featuredMatch, setFeaturedMatch] = useState<{
    home: string;
    away: string;
    homeCode: string;
    awayCode: string;
    time: string;
    predictionsCount: number;
  }>({
    home: "Реал Мадрид",
    away: "Барселона",
    homeCode: "RM",
    awayCode: "FCB",
    time: "15 листопада · 18:00",
    predictionsCount: 24,
  });

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          const { data: profile } = await client
            .from("profiles")
            .select("username, coins, created_at")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (active && profile) {
            if (profile.username) setUsername(profile.username);
            if (typeof profile.coins === "number") setBalance(profile.coins);
            if (profile.created_at) {
              const d = new Date(profile.created_at);
              setJoinDate(
                `${String(d.getDate()).padStart(2, "0")}.${String(
                  d.getMonth() + 1,
                ).padStart(2, "0")}.${d.getFullYear()}`,
              );
            }
          }

          const { count } = await client
            .from("predictions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authData.user.id);

          if (active && typeof count === "number" && count > 0) {
            setAccuratePredictions(count);
          }

          const { data: matches } = await client
            .from("matches")
            .select("home_team, away_team, match_time")
            .eq("status", "scheduled")
            .order("match_time", { ascending: true })
            .limit(1);

          if (active && matches && matches.length > 0) {
            const m = matches[0];
            const d = new Date(m.match_time);
            setFeaturedMatch({
              home: m.home_team,
              away: m.away_team,
              homeCode: m.home_team.slice(0, 3).toUpperCase(),
              awayCode: m.away_team.slice(0, 3).toUpperCase(),
              time: `${d.getDate()} листопада · ${String(d.getHours()).padStart(
                2,
                "0",
              )}:${String(d.getMinutes()).padStart(2, "0")}`,
              predictionsCount: 24,
            });
          }
        }
      } catch (err) {
        console.warn("Помилка завантаження даних дашборду:", err);
      }
    }

    void loadDashboardData();
    return () => {
      active = false;
    };
  }, []);

  const formattedBalance =
    balance >= 1000000
      ? `${(balance / 1000000).toFixed(2)}M`
      : balance.toLocaleString();

  const userInitial = username.charAt(0).toUpperCase() || "M";

  return (
    <div className="relative min-h-screen bg-transparent text-[#f1f5fa] font-sans antialiased overflow-x-hidden selection:bg-[#08bfea]/30 selection:text-[#2cd5fb] flex">
      {/* 1. ЛІВИЙ НАВІГАЦІЙНИЙ САЙДБАР З ОДНОТИПНИМИ ВЕКТОРНИМИ ІКОНКАМИ (ТОЧ В ТОЧ ЯК НА РЕФЕРЕНСІ) */}
      <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[#090e18]/95 backdrop-blur-md border-r border-[rgba(65,140,190,0.22)] py-6 px-4 hidden md:flex flex-col justify-between z-30 select-none">
        <div>
          {/* Бренд: Трофей + MATCH (білий) + DAY (блакитний) */}
          <Link href="/dashboard" className="flex items-center gap-3 pl-3 mb-8 group">
            <div className="text-[#08bfea] drop-shadow-[0_0_10px_rgba(8,191,234,0.5)]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c2.42-.36 4.3-2.31 4.61-4.96C20.08 10.63 22 8.55 22 6V5h-3zm-14 3V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </div>
            <div className="text-base font-black tracking-[0.14em] uppercase">
              <span className="text-white">MATCH</span>
              <span className="text-[#08bfea]">DAY</span>
            </div>
          </Link>

          {/* Список навігації з однотипними SVG іконками */}
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            {/* 1. Головна (Active з лівим індикатором) */}
            <li className="relative">
              <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#08bfea] rounded-r shadow-[0_0_10px_#08bfea]" />
              <Link
                href="/dashboard"
                className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[rgba(8,191,234,0.12)] border border-[rgba(8,191,234,0.35)] shadow-[0_0_15px_rgba(8,191,234,0.12)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#08bfea] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span>Головна</span>
              </Link>
            </li>

            {/* 2. Матчі ліги (Календар) */}
            <li>
              <Link
                href="/leagues"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                </svg>
                <span>Матчі</span>
              </Link>
            </li>

            {/* 3. Мої прогнози (Мішень / Ціль) */}
            <li>
              <Link
                href="/leagues"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span>Мої прогнози</span>
              </Link>
            </li>

            {/* 4. Рейтинг / Ліги (Кубок) */}
            <li>
              <Link
                href="/leagues"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M6 4h12v6a6 6 0 0 1-12 0V4z" />
                </svg>
                <span>Рейтинг</span>
              </Link>
            </li>

            {/* 5. Онлайн PvP (Арена / Схрещені шпаги) */}
            <li>
              <Link
                href="/online"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                  <line x1="13" y1="19" x2="19" y2="13" />
                  <line x1="16" y1="16" x2="20" y2="20" />
                  <line x1="19" y1="21" x2="21" y2="19" />
                  <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
                  <line x1="5" y1="14" x2="9" y2="18" />
                  <line x1="7" y1="17" x2="4" y2="20" />
                  <line x1="3" y1="19" x2="5" y2="21" />
                </svg>
                <span>Онлайн PvP</span>
              </Link>
            </li>

            {/* 6. Кейси (Скриня / Подарунок) */}
            <li>
              <Link
                href="/cases"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="14" rx="2" />
                  <path d="M12 8v14" />
                  <path d="M3 12h18" />
                  <path d="M12 8a3 3 0 0 0-3-3c-1.5 0-2 .8-2 1.5S7.5 8 12 8z" />
                  <path d="M12 8a3 3 0 0 1 3-3c1.5 0 2 .8 2 1.5S16.5 8 12 8z" />
                </svg>
                <span>Кейси та квести</span>
              </Link>
            </li>

            {/* 7. Колесо фортуни (Колесо) */}
            <li>
              <Link
                href="/wheel"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="2" />
                  <line x1="12" y1="2" x2="12" y2="10" />
                  <line x1="12" y1="14" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="10" y2="12" />
                  <line x1="14" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="4.93" x2="10.59" y2="10.59" />
                  <line x1="13.41" y1="13.41" x2="19.07" y2="19.07" />
                  <line x1="4.93" y1="19.07" x2="10.59" y2="13.41" />
                  <line x1="13.41" y1="10.59" x2="19.07" y2="4.93" />
                </svg>
                <span>Колесо фортуни</span>
              </Link>
            </li>

            {/* 8. Блекджек (Карти) */}
            <li>
              <Link
                href="/blackjack"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="13" height="16" rx="2" />
                  <path d="M7 5V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2" />
                  <path d="M9.5 13l2.5-3 2.5 3-2.5 3z" />
                </svg>
                <span>Блекджек</span>
              </Link>
            </li>

            {/* 9. Кості (Кубик 3D) */}
            <li>
              <Link
                href="/dice"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="16" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                  <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                  <circle cx="16" cy="16" r="1.2" fill="currentColor" />
                </svg>
                <span>Кості</span>
              </Link>
            </li>

            {/* 10. Досягнення (Зала Слави) */}
            <li>
              <Link
                href="/achievements"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#f59e0b] group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c2.42-.36 4.3-2.31 4.61-4.96C20.08 10.63 22 8.55 22 6V5h-3zm-14 3V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                </svg>
                <span className="group-hover:text-amber-300 transition-colors">Досягнення</span>
              </Link>
            </li>

            {/* 11. Профіль (Конфігурація користувача та аватарки) */}
            <li>
              <Link
                href="/profile"
                className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Профіль</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Налаштування акаунта внизу (Щит / Шестерня) */}
        <div>
          <Link
            href="/login"
            className="group flex items-center gap-3 px-3 py-2 text-xs font-semibold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.6)] rounded-xl transition-all"
          >
            <svg className="w-[16px] h-[16px] text-[#9aa9be] group-hover:text-[#08bfea] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span>Адміністрування</span>
          </Link>
        </div>
      </aside>

      {/* 2. ГОЛОВНИЙ ВМІСТ (MAIN WRAPPER, ЗМІЩЕНИЙ НА 240px ВПРАВО) */}
      <main className="md:ml-[240px] flex-1 px-6 py-6 pb-16 relative z-10 max-w-[1350px] w-full">
        {/* ВЕРХНЯ ШВИДКА НАВІГАЦІЯ */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(65,140,190,0.22)] pb-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/leagues"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              Ліги
            </Link>
            <Link
              href="/leagues"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              Матч: Ранат vs Марченко
            </Link>
            <Link
              href="/online"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              Онлайн PvP
            </Link>
            <Link
              href="/wheel"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              Колесо
            </Link>
            <Link
              href="/cases"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              Кейси
            </Link>
            <Link
              href="/blackjack"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              Блекджек
            </Link>
            <Link
              href="/dice"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              Кості
            </Link>
            <Link
              href="/achievements"
              className="bg-[rgba(13,21,34,0.85)] border border-amber-500/40 hover:border-amber-400 hover:bg-[rgba(20,34,54,0.9)] text-amber-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>🏆</span>
              <span>Досягнення</span>
            </Link>
          </div>

          <div className="flex items-center gap-3.5">
            <ThemeToggle />
            <span className="text-lg cursor-pointer hover:scale-110 transition-transform">
              🔔
            </span>
            {/* Віджет профілю з 3D-золотим вигином (референс Image 1) та Matrix-аватаркою */}
            <Link
              href="/profile"
              title="Перейти до налаштувань профілю"
              className="relative flex items-center gap-2 rounded-2xl p-1 cursor-pointer transition-all shadow-md group hover:scale-105 active:scale-95"
              style={{
                background:
                  theme === "dark"
                    ? "linear-gradient(135deg, #1c2230 0%, #11151e 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f4f6fa 100%)",
                border:
                  theme === "dark"
                    ? "1px solid rgba(255, 255, 255, 0.12)"
                    : "1px solid rgba(0, 0, 0, 0.1)",
                boxShadow:
                  theme === "dark"
                    ? "0 4px 14px rgba(0,0,0,0.5), 0 0 1px 1px rgba(245, 158, 11, 0.25)"
                    : "0 4px 14px rgba(0,0,0,0.08), 0 0 1px 1px rgba(245, 158, 11, 0.3)",
              }}
            >
              {/* Золотий вигин під аватаром */}
              <div className="relative flex items-center justify-center pl-0.5 pr-1.5">
                <div
                  className="absolute -left-1 top-0 bottom-0 w-[38px] rounded-l-xl pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, #facc15 0%, #eab308 50%, #b45309 100%)",
                    clipPath: "polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%)",
                  }}
                />
                <div className="relative z-10">
                  <MatrixAvatar
                    theme={theme}
                    size={30}
                    src={avatarUrl}
                    initial={userInitial}
                  />
                </div>
              </div>

              <span
                className="font-extrabold text-xs pr-2 transition-colors group-hover:text-[#08bfea]"
                style={{ color: theme === "dark" ? "#f1f5fa" : "#0f172a" }}
              >
                {username} ▾
              </span>
            </Link>
          </div>
        </header>

        {/* СІТКА КОНТЕНТУ: 8 колонок зліва + 4 колонки справа */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ========================================================= */}
          {/* ЛІВА ЧАСТИНА (8 з 12)                                     */}
          {/* ========================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. ПРИВІТАЛЬНИЙ БАНЕР */}
            <section className="bg-gradient-to-r from-[#0e1726]/90 to-[#0a101a]/90 backdrop-blur-md border border-[rgba(65,140,190,0.22)] rounded-2xl p-7 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="absolute right-4 top-0 bottom-0 w-64 bg-[radial-gradient(circle_at_center,rgba(8,191,234,0.18)_0%,transparent_70%)] pointer-events-none" />
              <div className="relative z-10">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1.5">
                  Привіт, {username}!
                </h1>
                <p className="text-xs sm:text-sm text-[#9aa9be] max-w-lg leading-relaxed flex items-center gap-1.5 flex-wrap">
                  Ласкаво просимо до MATCHDAY — твого простору прогнозів,
                  <span className="inline-flex items-center gap-1 text-[#08bfea] font-bold">
                    <AiChipIcon size={16} glowColor="#08bfea" active />
                    AI-аналітики
                  </span>
                  та турнірів із друзями.
                </p>
              </div>
            </section>

            {/* 2. ТРИ КАРТКИ МЕТРИК (МОНЕТ 1.08M, 12, MD #1) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Картка 1: Баланс */}
              <Link
                href="/cases"
                className="bg-[#101a29]/90 backdrop-blur-md border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#9aa9be] border border-[rgba(65,140,190,0.3)] bg-[rgba(7,11,20,0.6)] px-2 py-1 rounded">
                    МОНЕТ
                  </span>
                  <div>
                    <div className="text-xl font-black text-white group-hover:text-[#08bfea] transition-colors font-mono">
                      {formattedBalance}
                    </div>
                    <div className="text-[11px] font-semibold text-[#9aa9be]">
                      Баланс монет
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:translate-x-1 group-hover:text-[#08bfea] transition-all">
                  ›
                </span>
              </Link>

              {/* Картка 2: Влучні прогнози */}
              <Link
                href="/leagues"
                className="bg-[#101a29]/90 backdrop-blur-md border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-xl font-black text-white group-hover:text-[#08bfea] transition-colors font-mono">
                      {accuratePredictions}
                    </div>
                    <div className="text-[11px] font-semibold text-[#9aa9be]">
                      Влучні прогнози
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:translate-x-1 group-hover:text-[#08bfea] transition-all">
                  ›
                </span>
              </Link>

              {/* Картка 3: Місце в рейтингу */}
              <Link
                href="/leagues"
                className="bg-[#101a29]/90 backdrop-blur-md border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#08bfea] border border-[rgba(8,191,234,0.4)] bg-[rgba(8,191,234,0.15)] px-2 py-1 rounded">
                    MD
                  </span>
                  <div>
                    <div className="text-xl font-black text-white group-hover:text-[#08bfea] transition-colors font-mono">
                      #{rank}
                    </div>
                    <div className="text-[11px] font-semibold text-[#9aa9be]">
                      Місце в рейтингу
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:translate-x-1 group-hover:text-[#08bfea] transition-all">
                  ›
                </span>
              </Link>
            </div>

            {/* 3. НАЙБЛИЖЧІ МАТЧІ (РЕАЛ МАДРИД VS БАРСЕЛОНА) */}
            <section className="bg-gradient-to-b from-[#101a29]/95 to-[#0d1522]/95 backdrop-blur-md border border-[rgba(65,140,190,0.22)] rounded-2xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(65,140,190,0.22)] pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  НАЙБЛИЖЧІ МАТЧІ
                </h2>
                <Link
                  href="/leagues"
                  className="text-xs font-bold text-[#08bfea] hover:underline"
                >
                  Усі матчі →
                </Link>
              </div>

              <div className="border border-[rgba(65,140,190,0.22)] bg-[rgba(7,11,20,0.85)] rounded-xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 bg-[rgba(8,191,234,0.12)] border border-[rgba(8,191,234,0.35)] text-[#38bdf8] px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    🟢 Заплановано
                  </span>
                  <span className="text-[#9aa9be] font-medium">
                    🕒 {featuredMatch.time}
                  </span>
                </div>

                {/* Протистояння команд із фірмовими бейджами RM та FCB */}
                <div className="flex items-center justify-center gap-8 sm:gap-12 my-4">
                  {/* Господарі (RM) */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-14 w-14 rounded-xl flex items-center justify-center font-black text-base bg-gradient-to-br from-[rgba(8,191,234,0.25)] to-[#0d1522] border border-[#08bfea] text-[#08bfea] shadow-[0_0_16px_rgba(8,191,234,0.25)]">
                      {featuredMatch.homeCode}
                    </div>
                    <span className="text-sm sm:text-base font-black text-white">
                      {featuredMatch.home}
                    </span>
                  </div>

                  {/* VS */}
                  <span className="text-base sm:text-lg font-black text-[#9aa9be] tracking-widest px-2">
                    VS
                  </span>

                  {/* Гості (FCB) */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-14 w-14 rounded-xl flex items-center justify-center font-black text-base bg-gradient-to-br from-[rgba(255,122,36,0.25)] to-[#0d1522] border border-[#ff7a24] text-[#ff7a24] shadow-[0_0_16px_rgba(255,122,36,0.25)]">
                      {featuredMatch.awayCode}
                    </div>
                    <span className="text-sm sm:text-base font-black text-white">
                      {featuredMatch.away}
                    </span>
                  </div>
                </div>

                {/* Футер матчу */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(65,140,190,0.22)] pt-3.5 mt-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#9aa9be]">
                      📊 Прогнозів:{" "}
                      <strong className="text-white">
                        {featuredMatch.predictionsCount}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-0.5 rounded-md shadow-inner">
                      <AiChipIcon size={14} glowColor="#818cf8" active />
                      ШІ-аналітика Gemini
                    </span>
                  </div>
                  <Link
                    href="/leagues"
                    className="bg-[#08bfea] hover:bg-[#2cd5fb] text-[#070b14] font-extrabold text-xs px-4 py-2 rounded-lg shadow-[0_4px_14px_rgba(8,191,234,0.4)] transition-all hover:scale-[1.02]"
                  >
                    Зробити прогноз →
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* ========================================================= */}
          {/* ПРАВА ЧАСТИНА (4 з 12): ТАБЛИЦЯ ЛІДЕРІВ ТА ПРОФІЛЬ        */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* Віджет: ТАБЛИЦЯ ЛІДЕРІВ */}
            <div className="bg-[#101a29]/90 backdrop-blur-md border border-[rgba(65,140,190,0.22)] rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(65,140,190,0.22)] pb-3">
                <h3 className="text-xs font-black uppercase text-[#fde68a] flex items-center gap-1.5">
                  <span>MD</span> ТАБЛИЦЯ ЛІДЕРІВ
                </h3>
                <div className="flex gap-1 bg-[#070b14] p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => setLeaderTab("all")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                      leaderTab === "all"
                        ? "bg-[#08bfea] text-[#070b14]"
                        : "text-[#9aa9be] hover:text-white"
                    }`}
                  >
                    Загальний
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderTab("month")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                      leaderTab === "month"
                        ? "bg-[#08bfea] text-[#070b14]"
                        : "text-[#9aa9be] hover:text-white"
                    }`}
                  >
                    Місяць
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderTab("week")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                      leaderTab === "week"
                        ? "bg-[#08bfea] text-[#070b14]"
                        : "text-[#9aa9be] hover:text-white"
                    }`}
                  >
                    Тиждень
                  </button>
                </div>
              </div>

              {/* Список лідерів */}
              <div className="space-y-1.5">
                {DEFAULT_LEADERS.map((u) => (
                  <div
                    key={u.name}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition ${
                      u.highlight
                        ? "border border-[rgba(8,191,234,0.4)] bg-[rgba(8,191,234,0.1)]"
                        : "bg-[rgba(7,11,20,0.7)] hover:bg-[rgba(7,11,20,0.9)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold ${
                          u.highlight ? "text-[#08bfea]" : "text-white"
                        }`}
                      >
                        {u.rank > 3 ? `#${u.rank} ` : ""}
                        {u.name}
                      </span>
                    </div>
                    <span className="text-xs font-black text-[#10b981] font-mono">
                      {u.points} очки
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(65,140,190,0.22)] text-center">
                <Link
                  href="/leagues"
                  className="text-xs font-bold text-[#08bfea] hover:underline"
                >
                  Переглянути повний рейтинг →
                </Link>
              </div>
            </div>

            {/* Віджет: ВАШ ПРОФІЛЬ */}
            <div className="bg-[#101a29]/90 backdrop-blur-md border border-[rgba(65,140,190,0.22)] rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(65,140,190,0.22)] pb-3">
                <h3 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <span className="text-purple-400">👤</span> ВАШ ПРОФІЛЬ
                </h3>
                <Link
                  href="/profile"
                  className="text-[11px] text-[#08bfea] font-semibold hover:underline"
                >
                  Редагувати
                </Link>
              </div>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="relative p-1 rounded-2xl bg-gradient-to-br from-[#facc15]/20 to-transparent border border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <MatrixAvatar
                    theme={theme}
                    size={42}
                    src={avatarUrl}
                    initial={userInitial}
                  />
                </div>
                <div>
                  <div className="font-black text-white text-sm flex items-center gap-2">
                    {username}
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div className="text-[11px] text-[#9aa9be]">
                    Гравець з {joinDate}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold mb-1.5">
                  <span className="text-white">Рівень {level}</span>
                  <span className="text-[#08bfea] font-mono">
                    {xp} / 100 XP
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#070b14] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#08bfea] to-[#38bdf8]"
                    style={{ width: `${(xp / 100) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
