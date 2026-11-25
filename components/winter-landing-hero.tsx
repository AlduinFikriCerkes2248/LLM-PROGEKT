"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import { getSupabaseClient, PROFILE_UPDATED_EVENT } from "@/lib/supabase/client";
import { triggerSteamAchievement } from "./steam-achievement-notification";

const LUCKY_DAILY_KEY = "matchday:winter_lucky_date";

export default function WinterLandingHero() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("Максим");
  const [luckyModalOpen, setLuckyModalOpen] = useState(false);
  const [luckyClaimedToday, setLuckyClaimedToday] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const localName = localStorage.getItem("matchday_username");
      if (localName) setUsername(localName);
      const today = new Date().toISOString().slice(0, 10);
      setLuckyClaimedToday(localStorage.getItem(LUCKY_DAILY_KEY) === today);
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      client.auth.getSession().then(({ data }) => {
        if (data?.session) {
          setIsAuthenticated(true);
        }
      });
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleClaimLucky = async () => {
    setLuckyModalOpen(false);
    const today = new Date().toISOString().slice(0, 10);
    if (luckyClaimedToday) {
      showToast("✨ Сьогодні ви вже забрали святковий бонус! Гарної гри!");
      return;
    }

    setLuckyClaimedToday(true);
    try {
      localStorage.setItem(LUCKY_DAILY_KEY, today);
      const c = parseInt(localStorage.getItem("matchday:coins") || localStorage.getItem("matchday_coins") || "1088233", 10);
      const h = parseInt(localStorage.getItem("matchday:hohlyantsi") || localStorage.getItem("matchday_hohlyantsi") || "45", 10);
      const nextCoins = c + 500;
      const nextBonuses = h + 10;
      localStorage.setItem("matchday:coins", nextCoins.toString());
      localStorage.setItem("matchday_coins", nextCoins.toString());
      localStorage.setItem("matchday:hohlyantsi", nextBonuses.toString());
      localStorage.setItem("matchday_hohlyantsi", nextBonuses.toString());

      const client = getSupabaseClient();
      if (client) {
        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          await client
            .from("profiles")
            .update({ coins: nextCoins, hohlyantsi: nextBonuses })
            .eq("id", authData.user.id);
        }
      }

      window.dispatchEvent(
        new CustomEvent(PROFILE_UPDATED_EVENT, {
          detail: { coins: nextCoins, hohlyantsi: nextBonuses },
        })
      );
      window.dispatchEvent(new Event("storage"));
    } catch {}

    triggerSteamAchievement({
      id: "winter_lucky_bonus",
      title: "🎁 Різдвяний Бонус Дня",
      desc: "Отримано +500 монет, +10 бонусів та x2 буст!",
      rarity: "rare",
      iconType: "crate",
      coins: 500,
      bonuses: 10,
      xp: 150,
      soundType: "default",
    });

    showToast("✨ +500 монет, +10 бонусів та буст x2 активовано!");
  };

  const primaryActionUrl = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="relative min-h-screen w-full font-sans text-white overflow-x-hidden flex flex-col justify-between">
      {/* 4K Cozy Winter Village Full-Page Background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-cover bg-center scale-[1.01]"
        style={{
          backgroundImage: "url(/images/winter/village-bg.jpg)",
        }}
      />
      {/* Scrim for high contrast */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1]"
        style={{
          background: `radial-gradient(ellipse 68% 42% at 50% 24%, rgba(3, 12, 26, 0.72) 0%, rgba(3, 12, 26, 0.28) 65%, transparent 100%),
          linear-gradient(180deg, rgba(2, 10, 24, 0.85) 0%, rgba(4, 15, 32, 0.16) 28%, rgba(4, 15, 32, 0.15) 60%, rgba(2, 8, 20, 0.82) 100%)`,
        }}
      />

      <div className="relative z-10 flex flex-col justify-between min-h-screen max-w-[1380px] w-full mx-auto px-4 sm:px-7">
        {/* TOP NAVIGATION BAR */}
        <header className="flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0a2346]/70 border border-sky-300/35 text-sky-400 shadow-[0_0_18px_rgba(22,198,255,0.28)]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </div>
            <span className="font-black text-base tracking-[0.14em] uppercase">
              MATCH<span className="text-[#16c6ff]">DAY</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1.5 bg-[#061428]/55 backdrop-blur-md border border-white/10 rounded-full p-1">
            <Link href="/dashboard" className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-400/20 border border-sky-300/40 text-white">
              🏠 Дашборд
            </Link>
            <Link href="/leagues" className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition">
              Ліги
            </Link>
            <Link href="/online" className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition">
              Онлайн PvP
            </Link>
            <Link href="/cases" className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition">
              Кейси
            </Link>
            <Link href="/achievements" className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition">
              Досягнення
            </Link>
            <Link href="/dice" className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition">
              Кості
            </Link>
            <Link href="/blackjack" className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition">
              Блекджек
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setLuckyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#ff8a2b] to-[#ff6116] text-white text-xs font-extrabold shadow-[0_6px_22px_rgba(255,123,28,0.45)] hover:scale-105 transition cursor-pointer"
            >
              <span>🎁</span>
              <span className="hidden sm:inline">Потягни удачу</span>
            </button>
            <Link
              href={primaryActionUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-500/25 border border-sky-300/45 text-sky-100 hover:bg-sky-500/40 text-xs font-bold backdrop-blur-md transition"
            >
              <span>{isAuthenticated ? `👤 ${username}` : "Увійти →"}</span>
            </Link>
          </div>
        </header>

        {/* HERO HEADLINE */}
        <main className="flex-1 flex flex-col justify-between py-4 sm:py-6">
          <section className="text-center max-w-3xl mx-auto pt-4 sm:pt-8">
            <h1 className="text-4xl sm:text-5xl md:text-[62px] font-black tracking-tight leading-[1.08] text-white drop-shadow-[0_6px_28px_rgba(2,8,20,0.8)]">
              <span className="relative inline-block">
                П
                {/* Santa Hat SVG perched on letter П */}
                <svg
                  className="absolute -top-6 -left-4 w-11 h-10 sm:w-14 sm:h-12 pointer-events-none -rotate-[14deg] drop-shadow-md"
                  viewBox="0 0 64 56"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="wlHatRed" x1="15" y1="6" x2="52" y2="38" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ff4d5e" />
                      <stop offset="55%" stopColor="#d82032" />
                      <stop offset="100%" stopColor="#8b0e1b" />
                    </linearGradient>
                    <linearGradient id="wlHatFur" x1="32" y1="32" x2="32" y2="48" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#dce7f5" />
                    </linearGradient>
                  </defs>
                  <path d="M12 29C14 14 27 5 41 9C49 12 53 24 54 36L18 37C17 31 15 29 12 29Z" fill="url(#wlHatRed)" />
                  <path d="M12 29C15 22 22 18 29 20C24 23 22 29 22 36L18 37C17 31 15 29 12 29Z" fill="rgba(75, 5, 12, 0.35)" />
                  <rect x="13" y="33" width="45" height="12" rx="6" fill="url(#wlHatFur)" />
                  <circle cx="10" cy="30" r="6.8" fill="#ffffff" />
                </svg>
              </span>
              рогнози зі швидкістю{" "}
              <span className="relative inline-block italic text-white">
                думки.
                <svg
                  className="absolute left-0 -bottom-2 w-full h-3 pointer-events-none"
                  viewBox="0 0 180 14"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M3 10C48 3 125 2 176 7" stroke="#16c6ff" strokeWidth="3.2" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed drop-shadow">
              Змагайтеся у футбольних прогнозах з друзями без реальних ставок, аналізуйте європейські матчі та заробляйте кубки ліг.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3.5">
              <span className="w-24 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              <span className="text-lg">🏆</span>
              <span className="w-24 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            </div>
          </section>

          {/* FLOATING KPI STATS FLANKING THE CENTRAL VALLEY */}
          <section className="my-6 flex flex-wrap justify-between items-center gap-6 px-2 sm:px-6">
            <div className="flex gap-8 sm:gap-12">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white drop-shadow">
                  3X <span className="text-[#16c6ff]">↑</span>
                </div>
                <div className="text-xs font-semibold text-slate-300">Більше виграшів у 1vs2</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white drop-shadow">
                  87% <span className="text-[#16c6ff]">↑</span>
                </div>
                <div className="text-xs font-semibold text-slate-300">Задоволених користувачів</div>
              </div>
            </div>

            <div className="flex gap-8 sm:gap-12">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white drop-shadow">
                  120K+ <span className="text-[#16c6ff]">↑</span>
                </div>
                <div className="text-xs font-semibold text-slate-300">Загальних прогнозів</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white drop-shadow">
                  2.4M <span className="text-[#16c6ff]">↑</span>
                </div>
                <div className="text-xs font-semibold text-slate-300">Активних подій</div>
              </div>
            </div>
          </section>

          {/* BOTTOM 3 GLASSMORPHIC CARDS */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-6">
            {/* CARD 1: MATCH CENTER */}
            <article className="rounded-2xl p-5 bg-[#061226]/70 border border-white/15 backdrop-blur-xl shadow-2xl flex flex-col justify-between gap-4 hover:border-sky-300/40 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <span>⚽</span>
                  <span>Матч-центр</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <svg width="42" height="42" viewBox="0 0 64 64" fill="none">
                    <path d="M22 14L25 18L32 12L39 18L42 14L40 22H24L22 14Z" fill="#ffc837" />
                    <circle cx="32" cy="38" r="20" fill="rgba(7, 18, 46, 0.9)" stroke="#ffc837" strokeWidth="2.5" />
                    <path d="M25 32V45M25 32L32 39L39 32M39 32V45" stroke="#ffc837" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <span className="text-xs font-bold text-slate-100">Реал Мадрид</span>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-black text-white font-mono">2 : 1</div>
                  <div className="text-[11px] font-bold text-[#16c6ff]">72:34 ⏱</div>
                </div>

                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <svg width="42" height="42" viewBox="0 0 64 64" fill="none">
                    <path d="M14 16C14 16 22 14 32 14C42 14 50 16 50 16C50 36 32 52 32 52C32 52 14 36 14 16Z" fill="rgba(7, 18, 46, 0.9)" stroke="#ffc837" strokeWidth="2.5" />
                    <rect x="17" y="24" width="13" height="3" fill="#e03444" />
                    <rect x="22" y="19" width="3" height="13" fill="#e03444" />
                    <rect x="33" y="18" width="12" height="14" fill="#ffc837" opacity="0.85" />
                    <path d="M18 35H46C46 41 38 48 32 49C26 48 18 41 18 35Z" fill="#1e3a8a" />
                  </svg>
                  <span className="text-xs font-bold text-slate-100">Барселона</span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-sky-400/20 border border-white/15 hover:border-sky-300/40 text-xs font-bold text-center text-white transition"
              >
                ▶ Перейти до прогнозу
              </Link>
            </article>

            {/* CARD 2: USEFUL PREDICTIONS CHART */}
            <article className="rounded-2xl p-5 bg-[#061226]/70 border border-white/15 backdrop-blur-xl shadow-2xl flex flex-col justify-between gap-3 hover:border-sky-300/40 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <span>📊</span>
                  <span>Корисні прогнози</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-black">
                  🏆 Точність: 74%
                </span>
              </div>

              <div className="h-24 w-full">
                <svg width="100%" height="100%" viewBox="0 0 320 110" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="wlChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16c6ff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#16c6ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M8 94 L46 84 L84 78 L122 65 L160 68 L198 52 L236 46 L274 32 L312 16 L312 108 L8 108 Z" fill="url(#wlChartGrad)" />
                  <path d="M8 94 L46 84 L84 78 L122 65 L160 68 L198 52 L236 46 L274 32 L312 16" fill="none" stroke="#16c6ff" strokeWidth="2.6" strokeLinecap="round" />
                  <circle cx="312" cy="16" r="4.5" fill="#fff" stroke="#16c6ff" strokeWidth="2.5" />
                </svg>
              </div>

              <Link
                href="/dashboard"
                className="flex items-center justify-between text-xs font-bold text-sky-300 hover:text-white transition"
              >
                <span>📈 Динаміка ваших прогнозів</span>
                <span>→</span>
              </Link>
            </article>

            {/* CARD 3: LEAGUE TABLE */}
            <article className="rounded-2xl p-5 bg-[#061226]/70 border border-white/15 backdrop-blur-xl shadow-2xl flex flex-col justify-between gap-3 hover:border-sky-300/40 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <span>👥</span>
                  <span>Таблиця ліг</span>
                </div>
                <Link href="/leagues" className="text-xs font-bold text-sky-300 hover:text-white transition">
                  Усі ліги →
                </Link>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="font-black text-amber-400">1</span>
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center font-black text-[10px]">S</div>
                  <span className="font-bold flex-1">👑 ShadowKick</span>
                  <span className="font-mono font-bold text-amber-300">432 очки</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="font-black text-slate-300">2</span>
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-black text-[10px]">F</div>
                  <span className="font-bold flex-1">Futbolist</span>
                  <span className="font-mono font-bold text-slate-300">413 очки</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="font-black text-emerald-400">3</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-black text-[10px]">G</div>
                  <span className="font-bold flex-1">GoalMaster</span>
                  <span className="font-mono font-bold text-slate-300">398 очки</span>
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>

      {/* LUCKY GIFT MODAL */}
      {luckyModalOpen && (
        <div
          onClick={() => setLuckyModalOpen(false)}
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-sm w-full rounded-2xl border border-amber-400/50 bg-[#0a1936] p-7 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)]"
          >
            <div className="text-5xl mb-3">🎁</div>
            <h3 className="text-xl font-black text-white mb-2">Різдвяний Бонус Дня!</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Вітаємо, <b>{username}</b>! Ви відкрили святкову скриню зимового селища та отримуєте{" "}
              <b className="text-amber-300">+500 монет</b>, <b className="text-sky-300">+10 бонусів</b> і буст <b>x2</b>!
            </p>
            <button
              type="button"
              onClick={handleClaimLucky}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff8a2b] to-[#ff6116] text-white font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] transition cursor-pointer"
            >
              {luckyClaimedToday ? "✓ Сьогодні вже забрано" : "Забрати нагороду"}
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1600] rounded-full border border-sky-400/50 bg-[#0a1a3e]/95 px-5 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-md">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
