"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatErrorMessage } from "../../lib/error-utils";
import {
  getSupabaseClient,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";
import CaseBoxGraphic, { CaseTier } from "../../components/case-box-graphic";
import CaseRoulette from "../../components/case-roulette";
import { fireGoldJackpotConfetti, fireWinterFrostConfetti } from "@/lib/confetti";
import { AppTheme, getStoredTheme, THEME_CHANGE_EVENT } from "@/lib/theme";
import AnimatedNumber from "@/components/animated-number";
import { trackAchievement } from "@/lib/achievements-tracker";

type CaseType = CaseTier;

type CaseItem = {
  id: CaseType;
  rpcType: string;
  title: string;
  tierNumber: string;
  tagline: string;
  coinsDisplay: string;
  xpDisplay: string;
  hohlyantsiPrice: number;
  badge: string;
  badgeColor: string;
  boxColor: string;
  glowColor: string;
};

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const CASES: CaseItem[] = [
  {
    id: "starter",
    rpcType: "khokhlov",
    title: "Кейс 1 · Стартовий",
    tierNumber: "Tier I",
    tagline: "Швидкий стартовий набір монет та очок досвіду для нових агентів.",
    coinsDisplay: "500 - 800 монет",
    xpDisplay: "+60 XP",
    hohlyantsiPrice: 5,
    badge: "СТАРТОВИЙ",
    badgeColor: "border-emerald-500/50 bg-emerald-950/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    boxColor: "from-emerald-950/80 via-[#0d1620] to-[#070b12] border-emerald-600/50 hover:border-emerald-400",
    glowColor: "rgba(16,185,129,0.25)",
  },
  {
    id: "pro",
    rpcType: "marchenko",
    title: "Кейс 2 · Професійний",
    tierNumber: "Tier II",
    tagline: "Солідний бойовий запас монет для великої гри в турнірах та лігах.",
    coinsDisplay: "20 000 - 25 000 монет",
    xpDisplay: "+400 XP",
    hohlyantsiPrice: 25,
    badge: "ПРОФЕСІЙНИЙ",
    badgeColor: "border-cyan-500/50 bg-cyan-950/60 text-cyan-300 shadow-[0_0_12px_rgba(8,191,234,0.3)]",
    boxColor: "from-cyan-950/80 via-[#0d1620] to-[#070b12] border-cyan-500/50 hover:border-cyan-400",
    glowColor: "rgba(8,191,234,0.3)",
  },
  {
    id: "legendary",
    rpcType: "admin",
    title: "Кейс 3 · Легендарний VIP",
    tierNumber: "Tier III",
    tagline: "Елітний хайролер-кейс із шансом вибити до 1 000 000 монет та отримати максимальний статус.",
    coinsDisplay: "До 1 000 000 монет",
    xpDisplay: "+5 000 XP VIP",
    hohlyantsiPrice: 100,
    badge: "👑 ЛЕГЕНДАРНИЙ VIP",
    badgeColor: "border-amber-500/60 bg-amber-950/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
    boxColor: "from-amber-950/80 via-[#181109] to-[#070b12] border-amber-500/60 hover:border-amber-400",
    glowColor: "rgba(245,158,11,0.35)",
  },
];

export default function CasesPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [hohlyantsi, setHohlyantsi] = useState<number | null>(null);
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [isOpening, setIsOpening] = useState(false);
  const [hoveredCase, setHoveredCase] = useState<CaseType | null>(null);
  const [pendingRoulette, setPendingRoulette] = useState<{
    box: string;
    tier: CaseType;
    coins: number;
    xp: number;
    costMessage?: string;
    nextCoins?: number;
    nextBonuses?: number;
  } | null>(null);
  const [openedReward, setOpenedReward] = useState<{
    box: string;
    tier?: CaseType;
    coins: number;
    xp: number;
    costMessage?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dailyClaimed, setDailyClaimed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const today = new Date().toISOString().slice(0, 10);
      return localStorage.getItem("matchday:last_daily_case") === today;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setTheme(getStoredTheme());
    const onTheme = (e: Event) => {
      const custom = e as CustomEvent<{ theme?: AppTheme }>;
      setTheme(custom.detail?.theme || getStoredTheme());
    };
    window.addEventListener(THEME_CHANGE_EVENT, onTheme);

    async function loadBalances() {
      // Локальний кеш
      try {
        const c = localStorage.getItem("matchday:coins") || localStorage.getItem("matchday_coins");
        if (c) setBalance(parseInt(c, 10));
        const h = localStorage.getItem("matchday:hohlyantsi") || localStorage.getItem("matchday_hohlyantsi");
        if (h) setHohlyantsi(parseInt(h, 10));
      } catch {}

      if (isDemoMode) return;
      const client = getSupabaseClient();
      if (!client) return;
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;

      const { data } = await client
        .from("profiles")
        .select("coins, hohlyantsi")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (data) {
        if (typeof data.coins === "number") {
          setBalance(data.coins);
          try {
            localStorage.setItem("matchday:coins", data.coins.toString());
            localStorage.setItem("matchday_coins", data.coins.toString());
          } catch {}
        }
        if (typeof data.hohlyantsi === "number") {
          setHohlyantsi(data.hohlyantsi);
          try {
            localStorage.setItem("matchday:hohlyantsi", data.hohlyantsi.toString());
            localStorage.setItem("matchday_hohlyantsi", data.hohlyantsi.toString());
          } catch {}
        }
      }
    }
    void loadBalances();
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onTheme);
  }, []);

  const isWinter = theme === "winter";

  if (isDemoMode) {
    return (
      <main className="min-h-screen flex-1 bg-[#090b0e] px-4 py-8 font-mono text-slate-100 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <Link
              href="/leagues"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition"
            >
              ← До ліг
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/blackjack"
                className="rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
              >
                Блекджек
              </Link>
              <Link
                href="/wheel"
                className="rounded-lg border border-purple-800 bg-purple-950/30 px-3 py-1 text-xs font-bold text-purple-300 hover:bg-purple-900/40 transition"
              >
                Колесо
              </Link>
            </div>
          </div>

          <div className="my-16 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-950/30 text-4xl shadow-xl shadow-amber-950/50 mb-6">
              🔒
            </div>
            <div className="inline-block rounded-full border border-amber-500/50 bg-amber-950/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300 mb-4">
              Демо-режим
            </div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
              Недоступно в демо-версії
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm text-slate-400 leading-relaxed">
              Відкриття кейсів вимкнено для показу освітнім партнерам. Інші розділи платформи (ліги прогнозів, блекджек, колесо) доступні з віртуальними монетами.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/leagues"
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-teal-400"
              >
                Перейти до ліг прогнозів
              </Link>
              <Link
                href="/blackjack"
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-slate-700"
              >
                Грати в Блекджек
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const getDisplayCaseTitle = (item: CaseItem) => {
    if (!isWinter) return item.title;
    if (item.id === "starter") return "🎁 Мішок Святого Миколая";
    if (item.id === "pro") return "❄️ Крижана Скриня Мороза";
    return "🔔 Золотий Дзвіночок Хайролера";
  };

  function finishRouletteReveal() {
    if (!pendingRoulette) return;
    const reward = pendingRoulette;
    setPendingRoulette(null);
    setOpenedReward({
      box: reward.box,
      tier: reward.tier,
      coins: reward.coins,
      xp: reward.xp,
      costMessage: reward.costMessage,
    });

    if (typeof reward.nextCoins === "number") {
      setBalance(reward.nextCoins);
      try {
        localStorage.setItem("matchday:coins", reward.nextCoins.toString());
        localStorage.setItem("matchday_coins", reward.nextCoins.toString());
      } catch {}
    }
    if (typeof reward.nextBonuses === "number") {
      setHohlyantsi(reward.nextBonuses);
      try {
        localStorage.setItem("matchday:hohlyantsi", reward.nextBonuses.toString());
        localStorage.setItem("matchday_hohlyantsi", reward.nextBonuses.toString());
      } catch {}
    }

    if (isWinter) {
      fireWinterFrostConfetti();
      trackAchievement("polar_highroller", 1, "increment");
    } else {
      fireGoldJackpotConfetti();
    }

    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATED_EVENT, {
        detail: {
          coins: reward.nextCoins,
          hohlyantsi: reward.nextBonuses,
        },
      })
    );
    window.dispatchEvent(new Event("storage"));
    setIsOpening(false);
  }

  async function handleOpenDailyCase() {
    if (isDemoMode || isOpening) return;
    const client = getSupabaseClient();

    setIsOpening(true);
    setErrorMessage(null);
    setOpenedReward(null);

    const starterTitle = isWinter ? "🎁 Мішок Святого Миколая" : "Кейс 1 · Стартовий";

    try {
      if (client) {
        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          let { data, error } = await client.rpc("open_loot_box", {
            p_box_type: "starter",
          });

          if (error && (error.message?.includes("invalid_box_type") || error.code === "P0001")) {
            const retryRes = await client.rpc("open_loot_box", {
              p_box_type: "khokhlov",
            });
            data = retryRes.data;
            error = retryRes.error;
          }

          if (error) throw error;

          if (data && data.success) {
            try {
              const currentXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
              localStorage.setItem("matchday:bj_xp", (currentXp + data.xp).toString());
            } catch {}

            const today = new Date().toISOString().slice(0, 10);
            localStorage.setItem("matchday:last_daily_case", today);
            setDailyClaimed(true);

            const { data: prof } = await client
              .from("profiles")
              .select("coins, hohlyantsi")
              .eq("id", authData.user.id)
              .maybeSingle();

            setPendingRoulette({
              box: starterTitle,
              tier: "starter",
              coins: data.coins,
              xp: data.xp,
              costMessage: "Безкоштовний щоденний бонус",
              nextCoins: typeof prof?.coins === "number" ? prof.coins : undefined,
              nextBonuses: typeof prof?.hohlyantsi === "number" ? prof.hohlyantsi : undefined,
            });
            return;
          }
        }
      }

      // Локальний режим без сесії Supabase
      const rewardCoins = 500 + Math.floor(Math.random() * 300);
      const rewardXp = 60;
      const curCoins = balance ?? parseInt(localStorage.getItem("matchday:coins") || "1088233", 10);
      const nextCoins = curCoins + rewardCoins;

      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("matchday:last_daily_case", today);
      setDailyClaimed(true);
      try {
        const currentXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
        localStorage.setItem("matchday:bj_xp", (currentXp + rewardXp).toString());
      } catch {}

      setPendingRoulette({
        box: starterTitle,
        tier: "starter",
        coins: rewardCoins,
        xp: rewardXp,
        costMessage: "Безкоштовний щоденний бонус",
        nextCoins,
      });
    } catch (err: unknown) {
      console.error("Помилка відкриття кейсу:", formatErrorMessage(err));
      setErrorMessage("Не вдалося відкрити кейс. Перевірте статус сесії або спробуйте пізніше.");
      setIsOpening(false);
    }
  }

  async function handleBuyWithHohlyantsi(caseItem: CaseItem) {
    if (isDemoMode || isOpening) return;
    const client = getSupabaseClient();
    const displayTitle = getDisplayCaseTitle(caseItem);

    if (hohlyantsi !== null && hohlyantsi < caseItem.hohlyantsiPrice) {
      setErrorMessage(`Недостатньо Бонусів! Потрібно: ${caseItem.hohlyantsiPrice} бонусів`);
      return;
    }

    setIsOpening(true);
    setErrorMessage(null);
    setOpenedReward(null);

    try {
      if (client) {
        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          let { data, error } = await client.rpc("buy_case_with_hohlyantsi", {
            p_box_type: caseItem.id,
          });

          if (error && (error.message?.includes("invalid_box_type") || error.code === "P0001")) {
            const retryRes = await client.rpc("buy_case_with_hohlyantsi", {
              p_box_type: caseItem.rpcType,
            });
            data = retryRes.data;
            error = retryRes.error;
          }

          if (error) {
            if (error.message.includes("insufficient_hohlyantsi")) {
              throw new Error("Недостатньо Бонусів на вашому рахунку.");
            }
            throw error;
          }

          if (data && data.success) {
            try {
              const currentXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
              localStorage.setItem("matchday:bj_xp", (currentXp + data.xp_reward).toString());
            } catch {}

            setPendingRoulette({
              box: displayTitle,
              tier: caseItem.id,
              coins: data.coins_reward,
              xp: data.xp_reward,
              costMessage: `Куплено за ${data.cost || caseItem.hohlyantsiPrice} Бонусів`,
              nextCoins: typeof data.coins === "number" ? data.coins : undefined,
              nextBonuses: typeof data.hohlyantsi === "number" ? data.hohlyantsi : undefined,
            });
            return;
          }
        }
      }

      // Локальний режим
      const curBonuses = hohlyantsi ?? parseInt(localStorage.getItem("matchday:hohlyantsi") || "45", 10);
      if (curBonuses < caseItem.hohlyantsiPrice) {
        throw new Error(`Недостатньо Бонусів! Потрібно ${caseItem.hohlyantsiPrice} Б.`);
      }
      const rewardCoins =
        caseItem.id === "starter"
          ? 500 + Math.floor(Math.random() * 300)
          : caseItem.id === "pro"
            ? 20000 + Math.floor(Math.random() * 5000)
            : Math.random() < 0.08
              ? 1000000
              : 75000 + Math.floor(Math.random() * 125000);
      const rewardXp = caseItem.id === "starter" ? 60 : caseItem.id === "pro" ? 400 : 5000;
      const curCoins = balance ?? parseInt(localStorage.getItem("matchday:coins") || "1088233", 10);

      try {
        const currentXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
        localStorage.setItem("matchday:bj_xp", (currentXp + rewardXp).toString());
      } catch {}

      setPendingRoulette({
        box: displayTitle,
        tier: caseItem.id,
        coins: rewardCoins,
        xp: rewardXp,
        costMessage: `Куплено за ${caseItem.hohlyantsiPrice} Бонусів`,
        nextCoins: curCoins + rewardCoins,
        nextBonuses: curBonuses - caseItem.hohlyantsiPrice,
      });
    } catch (err: unknown) {
      console.error("Помилка купівлі кейсу:", formatErrorMessage(err));
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Помилка при купівлі кейсу за Бонуси."
      );
      setIsOpening(false);
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-transparent px-4 py-6 font-sans text-slate-100 sm:px-8 sm:py-10 relative overflow-hidden select-none">
      {/* М'яке фонове дифузне світіння */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-[#FC7340]/15 via-[#0297DE]/10 to-transparent blur-[130px] rounded-full" />
        <div className="absolute bottom-[-50px] right-[-50px] w-[350px] h-[350px] bg-[#0297DE]/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Navigation Bar */}
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
              <span className="h-2 w-2 rounded-full bg-[#FC7340] shadow-[0_0_8px_#FC7340]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#FC7340]">КЕЙСИ ТА КВЕСТИ</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/leagues"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              MD Мої ліги
            </Link>
            <Link
              href="/online"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Онлайн PvP
            </Link>
            <Link
              href="/wheel"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Колесо
            </Link>
            <Link
              href="/blackjack"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Блекджек
            </Link>
            <Link
              href="/dice"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Кості
            </Link>
            <div className="rounded-xl bg-[#060A17] border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
               {balance === null ? "—" : <AnimatedNumber value={balance} suffix=" монет" />}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-block rounded-full border border-amber-600/40 bg-amber-950/20 px-4 py-1 text-xs text-amber-300 font-bold mb-3">
            {isWinter ? "❄️ Святкові зимові кейси та бонуси" : "Секретні кейси та бонуси"}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {isWinter ? "🎄 ЗИМОВІ КЕЙСИ ТА ПОДАРУНКИ" : "КЕЙСИ ТА КВЕСТИ"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-400 sm:text-sm">
            Забирай щоденний бонус або крути CS2-рулетку кейсів за Бонуси, вибивай до 1 000 000 монет і прокачуй рівень агента!
          </p>
        </header>

        {/* Щоденна нагорода Banner */}
        <div
          className={`mb-10 rounded-2xl border p-6 shadow-2xl relative overflow-hidden ${
            isWinter
              ? "border-sky-300/45 bg-gradient-to-r from-[#071f3b]/90 via-[#0a1b33]/90 to-[#061124]/95"
              : "border-emerald-600/40 bg-gradient-to-r from-emerald-950/50 via-[#0d1620] to-[#070b12]"
          }`}
        >
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="shrink-0 p-1.5 rounded-2xl bg-black/40 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <CaseBoxGraphic tier="starter" size={72} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  БЕЗКОШТОВНИЙ ЩОДЕННИЙ БОНУС (1 РАЗ НА ДОБУ)
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  {isWinter ? "Безкоштовний «🎁 Мішок Святого Миколая»" : "Безкоштовний «Кейс 1 · Стартовий»"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Заходь щодня, запускай рулетку та отримуй 500-800 монет і +60 XP безкоштовно.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenDailyCase}
              disabled={isOpening || dailyClaimed}
              className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-600/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isOpening
                ? "Прокрутка..."
                : dailyClaimed
                  ? "Вже забрано сьогодні"
                  : "Крутити безкоштовно"}
            </button>
          </div>
        </div>

        {/* CS2 Roulette Animation Overlay */}
        {pendingRoulette && (
          <CaseRoulette
            winningCoins={pendingRoulette.coins}
            winningXp={pendingRoulette.xp}
            caseTitle={pendingRoulette.box}
            tier={pendingRoulette.tier}
            isWinter={isWinter}
            onFinish={finishRouletteReveal}
          />
        )}

        {/* Modal-like Reward Alert */}
        {openedReward && (
          <div className="mb-10 animate-in fade-in zoom-in duration-300 rounded-2xl border-2 border-amber-500 bg-gradient-to-b from-[#1c1409] via-[#0d1017] to-black p-6 text-center shadow-[0_0_60px_rgba(245,158,11,0.4)]">
            <div className="flex justify-center mb-3">
              <CaseBoxGraphic tier={openedReward.tier || "starter"} size={110} />
            </div>
            <h3 className="mt-2 text-xl font-black text-amber-300 uppercase tracking-wide">
              «{openedReward.box}» ВІДКРИТО!
            </h3>
            {openedReward.costMessage && (
              <p className="text-xs font-bold text-slate-400 mt-1">
                {openedReward.costMessage}
              </p>
            )}
            <p className="mt-3 text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              +{openedReward.coins.toLocaleString()} МОНЕТ
            </p>
            <p className="text-sm font-bold text-emerald-400 mt-1">
              +{openedReward.xp} XP ДОСВІДУ АГЕНТА
            </p>
            <button
              onClick={() => setOpenedReward(null)}
              className="mt-5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-2.5 text-xs font-extrabold text-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-amber-500/30 transition active:scale-95"
            >
              Чудово, забрати
            </button>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="mb-6 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-center text-xs text-rose-400">
            {errorMessage}
          </p>
        )}

        {/* Cases Grid (3 однакових стильних кейси) */}
        <div className="grid gap-6 sm:grid-cols-3">
          {CASES.map((c) => (
            <div
              key={c.id}
              onMouseEnter={() => setHoveredCase(c.id)}
              onMouseLeave={() => setHoveredCase(null)}
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-gradient-to-b ${c.boxColor} p-6 shadow-xl transition-all duration-300 hover:-translate-y-2`}
              style={{ boxShadow: `0 14px 35px ${c.glowColor}` }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${c.badgeColor}`}>
                    {c.badge}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-bold">
                    {c.tierNumber}
                  </span>
                </div>

                {/* ОДНОТИПНА СТИЛЬНА ВЕКТОРНА ІЛЮСТРАЦІЯ КЕЙСА */}
                <div className="my-5 flex items-center justify-center">
                  <CaseBoxGraphic
                    tier={c.id}
                    size={155}
                    isHovered={hoveredCase === c.id}
                  />
                </div>

                <h3 className="text-lg font-black text-white text-center tracking-tight">
                  {getDisplayCaseTitle(c)}
                </h3>
                <p className="mt-2 text-xs text-slate-400 text-center leading-relaxed min-h-[36px]">
                  {c.tagline}
                </p>

                <div className="mt-6 rounded-xl border border-slate-800 bg-black/60 p-3.5 space-y-1.5 font-mono text-center shadow-inner">
                  <div className="text-sm font-black text-amber-400 tracking-wide">{c.coinsDisplay}</div>
                  <div className="text-xs font-bold text-emerald-400">{c.xpDisplay}</div>
                  <div className="text-[11px] text-slate-300 pt-2 border-t border-slate-800 flex items-center justify-center gap-1.5 font-bold">
                    <span className="text-slate-400">Ціна:</span>
                    <span className="text-white text-sm font-extrabold">{c.hohlyantsiPrice}</span>
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-400 text-[9px] font-black text-slate-950">Б</span>
                    <span className="text-slate-300">Бонусів</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => handleBuyWithHohlyantsi(c)}
                  disabled={isOpening || (hohlyantsi !== null && hohlyantsi < c.hohlyantsiPrice)}
                  className={`w-full rounded-xl py-3 font-mono text-xs font-black uppercase tracking-wider shadow-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                    c.id === "starter"
                      ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40"
                      : c.id === "pro"
                      ? "bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-cyan-950/40"
                      : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  }`}
                >
                  {isOpening
                    ? "Відкриття..."
                    : `Купити за ${c.hohlyantsiPrice} Бонусів`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-slate-600">
          Matchday Lootbox & Currency System · Бонуси та монети віртуальні · 2026
        </p>
      </div>
    </main>
  );
}
