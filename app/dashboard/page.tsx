"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

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
    <div className="relative min-h-screen bg-[#070b14] text-[#f1f5fa] font-sans antialiased overflow-x-hidden selection:bg-[#08bfea]/30 selection:text-[#2cd5fb] flex">
      {/* 1. ФОНОВЕ СТАДІОННЕ СЯЙВО */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-36 left-[10%] h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle,rgba(8,191,234,0.3)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute -bottom-36 right-[5%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,122,36,0.2)_0%,transparent_70%)] blur-[110px]" />
      </div>

      {/* 2. ЛІВИЙ НАВІГАЦІЙНИЙ САЙДБАР (ТОЧ В ТОЧ ЯК НА СКРІНШОТІ) */}
      <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[#090e18] border-r border-[rgba(65,140,190,0.22)] p-6 hidden md:flex flex-col justify-between z-30">
        <div>
          {/* Бренд */}
          <Link href="/dashboard" className="flex items-center gap-3 pl-2 mb-8 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#08bfea] to-[#0284c7] flex items-center justify-center font-black text-white text-base shadow-[0_4px_12px_rgba(8,191,234,0.4)]">
              MD
            </div>
            <span className="text-base font-black tracking-[0.16em] text-white uppercase group-hover:text-[#08bfea] transition-colors">
              MATCHDAY
            </span>
          </Link>

          {/* Список навігації */}
          <ul className="flex flex-col gap-1.5 list-none">
            {/* Головна (Active) */}
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#08bfea] bg-[rgba(8,191,234,0.15)] border border-[rgba(8,191,234,0.4)] shadow-[0_0_12px_rgba(8,191,234,0.2)] transition-all"
              >
                <span>🏠</span>
                <span>Головна</span>
              </Link>
            </li>

            {/* Матчі ліги */}
            <li>
              <Link
                href="/leagues"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>⚽</span>
                <span>Матчі ліги</span>
              </Link>
            </li>

            {/* Ліги прогнозів */}
            <li>
              <Link
                href="/leagues"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>🏆</span>
                <span>Ліги прогнозів</span>
              </Link>
            </li>

            {/* Онлайн PvP */}
            <li>
              <Link
                href="/online"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>🌐</span>
                <span>Онлайн PvP</span>
              </Link>
            </li>

            {/* Кейси та квести */}
            <li>
              <Link
                href="/cases"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>🎁</span>
                <span>Кейси та квести</span>
              </Link>
            </li>

            {/* Колесо фортуни */}
            <li>
              <Link
                href="/wheel"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>🎡</span>
                <span>Колесо фортуни</span>
              </Link>
            </li>

            {/* Блекджек */}
            <li>
              <Link
                href="/blackjack"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>🃏</span>
                <span>Блекджек</span>
              </Link>
            </li>

            {/* Кості */}
            <li>
              <Link
                href="/dice"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>🎲</span>
                <span>Кості</span>
              </Link>
            </li>

            {/* Авторизація */}
            <li>
              <Link
                href="/login"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-bold text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all"
              >
                <span>🔐</span>
                <span>Авторизація</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Налаштування акаунта внизу сайдбару */}
        <div>
          <Link
            href="/login"
            className="flex items-center gap-2 pl-2 text-xs font-bold text-[#9aa9be] hover:text-white transition-colors"
          >
            <span>⚙️</span>
            <span>Налаштування акаунта</span>
          </Link>
        </div>
      </aside>

      {/* 3. ГОЛОВНИЙ ВМІСТ (MAIN WRAPPER, ЗМІЩЕНИЙ НА 240px ВПРАВО) */}
      <main className="md:ml-[240px] flex-1 px-6 py-6 pb-16 relative z-10 max-w-[1350px] w-full">
        {/* ВЕРХНЯ ШВИДКА НАВІГАЦІЯ (ТОЧ В ТОЧ ЗІ СКРІНШОТА) */}
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
          </div>

          <div className="flex items-center gap-3.5">
            <span className="text-lg cursor-pointer hover:scale-110 transition-transform">
              🔔
            </span>
            <div
              title="Обліковий запис"
              className="flex items-center gap-2 rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] px-3 py-1.5 cursor-pointer hover:border-[#08bfea] transition-all"
            >
              <div className="h-7 w-7 rounded-md bg-[rgba(8,191,234,0.25)] border border-[#08bfea] text-[#08bfea] flex items-center justify-center font-black text-xs">
                {userInitial}
              </div>
              <span className="font-extrabold text-xs text-white">
                {username} ▾
              </span>
            </div>
          </div>
        </header>

        {/* СІТКА КОНТЕНТУ: 8 колонок зліва + 4 колонки справа */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ========================================================= */}
          {/* ЛІВА ЧАСТИНА (8 з 12)                                     */}
          {/* ========================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. ПРИВІТАЛЬНИЙ БАНЕР */}
            <section className="bg-gradient-to-r from-[#0e1726] to-[#0a101a] border border-[rgba(65,140,190,0.22)] rounded-2xl p-7 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="absolute right-4 top-0 bottom-0 w-64 bg-[radial-gradient(circle_at_center,rgba(8,191,234,0.18)_0%,transparent_70%)] pointer-events-none" />
              <div className="relative z-10">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1.5">
                  Привіт, {username}!
                </h1>
                <p className="text-xs sm:text-sm text-[#9aa9be] max-w-lg leading-relaxed">
                  Ласкаво просимо до MATCHDAY — твого футбольного простору прогнозів, AI-аналітики та турнірів із друзями.
                </p>
              </div>
            </section>

            {/* 2. ТРИ КАРТКИ МЕТРИК (МОНЕТ 1.08M, 12, MD #1) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Картка 1: Баланс */}
              <Link
                href="/cases"
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
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
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
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
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
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
            <section className="bg-gradient-to-b from-[#101a29] to-[#0d1522] border border-[rgba(65,140,190,0.22)] rounded-2xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
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
                <div className="flex items-center justify-between border-t border-[rgba(65,140,190,0.22)] pt-3.5 mt-4">
                  <span className="text-xs text-[#9aa9be]">
                    📊 Прогнозів:{" "}
                    <strong className="text-white">
                      {featuredMatch.predictionsCount}
                    </strong>
                  </span>
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
            <div className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
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
            <div className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(65,140,190,0.22)] pb-3">
                <h3 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <span className="text-purple-400">👤</span> ВАШ ПРОФІЛЬ
                </h3>
                <Link
                  href="/login"
                  className="text-[11px] text-[#08bfea] font-semibold hover:underline"
                >
                  Редагувати
                </Link>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-xl bg-[rgba(8,191,234,0.2)] border border-[#08bfea] text-[#08bfea] flex items-center justify-center font-black text-base shadow-[0_0_12px_rgba(8,191,234,0.2)]">
                  {userInitial}
                </div>
                <div>
                  <div className="font-black text-white text-sm">
                    {username}
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
