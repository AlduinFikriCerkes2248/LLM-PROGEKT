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

type LeaderboardUser = {
  username: string;
  points: number;
  rank: number;
};

export default function DashboardPage() {
  const [username, setUsername] = useState<string>("Гравець");
  const [balance, setBalance] = useState<number>(1080000);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [rank, setRank] = useState<number>(1);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      const client = getSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

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
          }
        }
      } catch (err) {
        console.error("Помилка завантаження дашборду:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadDashboardData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen text-[var(--text-main)] font-sans antialiased overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* М'яке стадіонне сяйво */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-600/20 blur-[140px]" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-orange-600/20 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <DemoNoticeBadge />

        {/* НАВІГАЦІЙНА ШАПКА MATCHDAY */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2 cursor-pointer transition">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3.5 bg-[#08BFEA] rounded-full group-hover:h-4 transition-all" />
                <span className="w-1 h-4.5 bg-[#08BFEA] rounded-full group-hover:h-5 transition-all" />
                <span className="w-1 h-3.5 bg-[#08BFEA] rounded-full group-hover:h-4 transition-all" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-[0.16em] uppercase text-white group-hover:text-cyan-400 transition ml-1">
                MATCHDAY
              </span>
            </Link>
            <span className="text-[var(--text-secondary)]/50">/</span>
            <span className="text-xs font-semibold text-cyan-300">
              Головна панель
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/leagues" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Ліги
            </Link>
            <Link href="/online" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Онлайн PvP
            </Link>
            <Link href="/cases" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Кейси
            </Link>
            <Link href="/wheel" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Колесо
            </Link>
            <Link href="/blackjack" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Блекджек
            </Link>
            <Link href="/dice" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Кості
            </Link>

            <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold">Баланс:</span>
              <span>{balance.toLocaleString()} монет</span>
            </div>
          </div>
        </header>

        {/* ОСНОВНА СІТКА ДАШБОРДУ: 8 колонок зліва + 4 колонки справа */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ЛІВА ЧАСТИНА (8 з 12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* ПРИВІТАННЯ */}
            <div className="matchday-card p-6 sm:p-8 bg-gradient-to-r from-[#0d1726] via-[#101b2d] to-[#0d1726] relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs uppercase font-bold tracking-wider text-cyan-400 block mb-1">
                  Футбольний простір
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Привіт, {username}!
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl">
                  Ласкаво просимо до MATCHDAY — створюйте ліги, робіть аналітичні прогнози та беріть участь у змаганнях без реальних грошей.
                </p>
              </div>
            </div>

            {/* СТАТИСТИКА У 3 ПАНЕЛІ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="matchday-card p-5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block">
                  Баланс клубу
                </span>
                <div className="mt-2 text-2xl font-black text-amber-300 font-mono">
                  {balance.toLocaleString()}
                </div>
                <span className="text-[10px] text-amber-400/80 font-semibold mt-1 block">
                  Віртуальні монети
                </span>
              </div>

              <div className="matchday-card p-5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block">
                  Влучні прогнози
                </span>
                <div className="mt-2 text-2xl font-black text-cyan-300 font-mono">
                  {accuracy}
                </div>
                <span className="text-[10px] text-cyan-400/80 font-semibold mt-1 block">
                  Точних рахунків
                </span>
              </div>

              <div className="matchday-card p-5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block">
                  Місце в рейтингу
                </span>
                <div className="mt-2 text-2xl font-black text-emerald-300 font-mono">
                  #{rank}
                </div>
                <span className="text-[10px] text-emerald-400/80 font-semibold mt-1 block">
                  Загальний залік
                </span>
              </div>
            </div>

            {/* НАЙБЛИЖЧИЙ МАТЧ */}
            <div className="matchday-card p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="status-dot status-dot-active" />
                  <span className="text-xs uppercase font-bold tracking-wider text-white">
                    Найближчий матч
                  </span>
                </div>
                <Link href="/leagues" className="text-xs font-bold text-cyan-400 hover:underline">
                  Усі матчі →
                </Link>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[#070b14] p-5 sm:p-6 text-center">
                <span className="inline-block rounded-full bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 text-[11px] font-bold text-emerald-300 mb-4">
                  Заплановано · 18:00
                </span>

                <div className="grid grid-cols-7 items-center justify-items-center">
                  <div className="col-span-3 text-center sm:text-right pr-2">
                    <span className="text-base sm:text-lg font-black text-white block">Реал Мадрид</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Господарі</span>
                  </div>

                  <div className="col-span-1">
                    <span className="inline-block rounded-md border border-[var(--border)] bg-[#0d1522] px-2.5 py-1 text-xs font-black text-cyan-400">
                      VS
                    </span>
                  </div>

                  <div className="col-span-3 text-center sm:text-left pl-2">
                    <span className="text-base sm:text-lg font-black text-white block">Барселона</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Гості</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/leagues" className="btn-cyan py-2.5 px-6 text-xs uppercase tracking-wider font-bold">
                    Зробити прогноз
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ПРАВА ЧАСТИНА (4 з 12): ТАБЛИЦЯ ЛІДЕРІВ ТА ПРОФІЛЬ */}
          <div className="lg:col-span-4 space-y-6">
            {/* ТАБЛИЦЯ ЛІДЕРІВ */}
            <div className="matchday-card p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-4">
                Таблиця лідерів
              </h3>

              <div className="space-y-2.5">
                {[
                  { name: "ShadowKick", points: 452, rank: 1 },
                  { name: "Futbolist", points: 431, rank: 2 },
                  { name: "GoalMaster", points: 398, rank: 3 },
                  { name: "DimaPredict", points: 375, rank: 4 },
                  { name: "FootballFan", points: 362, rank: 5 },
                ].map((u) => (
                  <div
                    key={u.name}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)]/60 bg-[#070b14] p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{u.rank}
                      </span>
                      <span className="font-bold text-white">{u.name}</span>
                    </div>
                    <span className="font-mono font-bold text-cyan-400">
                      +{u.points} очок
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border)] text-center">
                <Link href="/leagues" className="text-xs font-bold text-[var(--text-secondary)] hover:text-white transition">
                  Переглянути повний рейтинг →
                </Link>
              </div>
            </div>

            {/* ПРОФІЛЬ КОРИСТУВАЧА */}
            <div className="matchday-card p-6">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block mb-3">
                Ваш профіль
              </span>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center font-black text-cyan-300">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{username}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Рівень {level}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[var(--text-secondary)]">Досвід (XP)</span>
                  <span className="text-cyan-400 font-bold">{xp} / 100 XP</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
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
