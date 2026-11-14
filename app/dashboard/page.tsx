"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import { DemoNoticeBadge } from "../demo-banner";

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  match_time: string;
  status: "scheduled" | "finished" | "cancelled";
};

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

          // Спроба отримати реальну кількість прогнозів
          const { count } = await client
            .from("predictions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authData.user.id);

          if (active && typeof count === "number" && count > 0) {
            setAccuratePredictions(count);
          }

          // Спроба отримати найближчий матч
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
              predictionsCount: 18,
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
    <div className="relative min-h-screen bg-[#070b14] text-[#f1f5fa] font-sans antialiased overflow-x-hidden selection:bg-[#08bfea]/30 selection:text-[#2cd5fb]">
      {/* Фонове стадіонне світіння точ в точ як у GOYDAFF */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-36 left-[10%] h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle,rgba(8,191,234,0.3)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute -bottom-36 right-[5%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,122,36,0.2)_0%,transparent_70%)] blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <DemoNoticeBadge />

        {/* НАВІГАЦІЙНА ШАПКА MATCHDAY (ТОЧ В ТОЧ ЯК У GOYDAFF) */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(65,140,190,0.22)] pb-4">
          <Link href="/" className="group flex items-center gap-2 cursor-pointer transition">
            <div className="flex items-center gap-1">
              <span className="w-1 h-3.5 bg-[#08bfea] rounded-full group-hover:h-4 transition-all" />
              <span className="w-1 h-4.5 bg-[#08bfea] rounded-full group-hover:h-5 transition-all" />
              <span className="w-1 h-3.5 bg-[#08bfea] rounded-full group-hover:h-4 transition-all" />
            </div>
            <span className="font-black text-sm sm:text-base tracking-[0.16em] uppercase text-white group-hover:text-[#08bfea] transition ml-1">
              MATCHDAY
            </span>
          </Link>

          {/* Швидкі навігаційні кнопки */}
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-[#08bfea] bg-[rgba(8,191,234,0.15)] px-3.5 py-1.5 text-xs font-bold text-[#08bfea] transition shadow-[0_0_12px_rgba(8,191,234,0.2)]"
            >
              Головна
            </Link>
            <Link
              href="/leagues"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-[#f1f5fa] hover:text-white transition"
            >
              Ліги
            </Link>
            <Link
              href="/online"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-[#f1f5fa] hover:text-white transition"
            >
              Онлайн PvP
            </Link>
            <Link
              href="/cases"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-[#f1f5fa] hover:text-white transition"
            >
              Кейси
            </Link>
            <Link
              href="/wheel"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-[#f1f5fa] hover:text-white transition"
            >
              Колесо
            </Link>
            <Link
              href="/blackjack"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-[#f1f5fa] hover:text-white transition"
            >
              Блекджек
            </Link>
            <Link
              href="/dice"
              className="rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] hover:border-[#08bfea] hover:bg-[rgba(20,34,54,0.9)] px-3.5 py-1.5 text-xs font-bold text-[#f1f5fa] hover:text-white transition"
            >
              Кості
            </Link>
          </nav>

          {/* Профіль користувача в шапці */}
          <div className="flex items-center gap-3">
            <span className="text-lg cursor-pointer hover:scale-110 transition-transform">
              🔔
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-[rgba(65,140,190,0.22)] bg-[rgba(13,21,34,0.85)] px-3 py-1.5">
              <div className="h-6 w-6 rounded-md bg-[rgba(8,191,234,0.25)] border border-[#08bfea] text-[#08bfea] flex items-center justify-center font-black text-xs">
                {userInitial}
              </div>
              <span className="font-extrabold text-xs text-white">
                {username} ▾
              </span>
            </div>
          </div>
        </header>

        {/* ОСНОВНА РОЗКЛАДКА: 8 колонок зліва + 4 колонки справа */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ========================================================= */}
          {/* ЛІВА ЧАСТИНА (8 з 12)                                     */}
          {/* ========================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Привітальний банер (Hero Banner) */}
            <section className="bg-gradient-to-r from-[#0e1726] to-[#0a101a] border border-[rgba(65,140,190,0.22)] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="absolute right-0 top-0 bottom-0 w-64 bg-[radial-gradient(circle_at_center,rgba(8,191,234,0.18)_0%,transparent_70%)] pointer-events-none" />
              <div className="relative z-10">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1.5">
                  Привіт, {username}!
                </h1>
                <p className="text-xs sm:text-sm text-[#9aa9be] max-w-lg leading-relaxed">
                  Ласкаво просимо до MATCHDAY — твого футбольного простору прогнозів, AI-аналітики та турнірів із друзями.
                </p>
              </div>
            </section>

            {/* 2. Три картки метрик (Stats Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/cases"
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🪙</span>
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

              <Link
                href="/leagues"
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
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

              <Link
                href="/leagues"
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-4 sm:p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
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

            {/* 3. Блок "Найближчі матчі" з емблемами клубів точ в точ як у GOYDAFF */}
            <section className="bg-gradient-to-b from-[#101a29] to-[#0d1522] border border-[rgba(65,140,190,0.22)] rounded-2xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(65,140,190,0.22)] pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>⚽</span> Найближчі матчі
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

                {/* Рядок протистояння команд із фірмовими бейджами-крестами */}
                <div className="flex items-center justify-center gap-6 sm:gap-10 my-4">
                  {/* Господарі */}
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

                  {/* Гості */}
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

            {/* 4. Дві швидкі картки (Таблиця лідерів + Створити лігу) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/leagues"
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl">🏆</span>
                  <div>
                    <div className="text-sm font-black text-white group-hover:text-[#08bfea] transition-colors">
                      Таблиця лідерів
                    </div>
                    <div className="text-xs text-[#9aa9be] mt-0.5">
                      Порівняй результати з іншими гравцями
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:translate-x-1 group-hover:text-[#08bfea] transition-all">
                  ›
                </span>
              </Link>

              <Link
                href="/leagues"
                className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea]/50 rounded-xl p-5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 group shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl text-[#ff7a24] font-bold">+</span>
                  <div>
                    <div className="text-sm font-black text-white group-hover:text-[#ff7a24] transition-colors">
                      Створити лігу
                    </div>
                    <div className="text-xs text-[#9aa9be] mt-0.5">
                      Додай новий турнір для прогнозів
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:translate-x-1 group-hover:text-[#ff7a24] transition-all">
                  ›
                </span>
              </Link>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ПРАВА ЧАСТИНА (4 з 12): ВІДЖЕТИ ЛІДЕРІВ ТА ПРОФІЛЮ        */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* Віджет: Таблиця лідерів з табами */}
            <div className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(65,140,190,0.22)] pb-3">
                <h3 className="text-xs font-black uppercase text-[#fde68a] flex items-center gap-1.5">
                  <span>MD</span> Таблиця лідерів
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
                      <span className="text-xs">👑</span>
                      <span
                        className={`text-xs font-extrabold ${
                          u.highlight ? "text-[#08bfea]" : "text-white"
                        }`}
                      >
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

            {/* Віджет: Ваш профіль */}
            <div className="bg-[#101a29] border border-[rgba(65,140,190,0.22)] rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(65,140,190,0.22)] pb-3">
                <h3 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <span>👤</span> Ваш профіль
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
      </div>
    </div>
  );
}
