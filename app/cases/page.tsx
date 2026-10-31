"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getSupabaseClient,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type CaseType = "starter" | "pro";

type CaseItem = {
  id: CaseType;
  title: string;
  tagline: string;
  coinsDisplay: string;
  xpDisplay: string;
  hohlyantsiPrice: number;
  badge: string;
  badgeColor: string;
  boxColor: string;
  glowColor: string;
  icon: string;
};



const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const CASES: CaseItem[] = [
  {
    id: "starter",
    title: "Кейс 1",
    tagline: "Швидкий стартовий набір монет та очок досвіду.",
    coinsDisplay: "500 - 800 монет",
    xpDisplay: "+60 XP",
    hohlyantsiPrice: 5,
    badge: "СТАРТОВИЙ",
    badgeColor: "border-emerald-600/50 bg-emerald-950/40 text-emerald-300",
    boxColor: "from-emerald-950 via-slate-900 to-black border-emerald-700/60",
    glowColor: "rgba(16,185,129,0.15)",
    icon: "📦",
  },
  {
    id: "pro",
    title: "Кейс 2",
    tagline: "Солідний запас монет для великої гри.",
    coinsDisplay: "20 000 - 25 000 монет",
    xpDisplay: "+400 XP",
    hohlyantsiPrice: 25,
    badge: "ПРОФЕСІЙНИЙ",
    badgeColor: "border-cyan-600/50 bg-cyan-950/40 text-cyan-300",
    boxColor: "from-cyan-950 via-slate-900 to-black border-cyan-500/60",
    glowColor: "rgba(6,182,212,0.25)",
    icon: "💼",
  },
];

export default function CasesPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [hohlyantsi, setHohlyantsi] = useState<number | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openedReward, setOpenedReward] = useState<{
    box: string;
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
    async function loadBalances() {
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
        if (typeof data.coins === "number") setBalance(data.coins);
        if (typeof data.hohlyantsi === "number") setHohlyantsi(data.hohlyantsi);
      }
    }
    void loadBalances();
  }, []);

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
                🃏 Блекджек
              </Link>
              <Link
                href="/wheel"
                className="rounded-lg border border-purple-800 bg-purple-950/30 px-3 py-1 text-xs font-bold text-purple-300 hover:bg-purple-900/40 transition"
              >
                🎡 Колесо
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

  async function handleOpenDailyCase() {
    if (isDemoMode || isOpening) return;
    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage("Підключення до Supabase відсутнє.");
      return;
    }

    setIsOpening(true);
    setErrorMessage(null);
    setOpenedReward(null);

    try {
      const { data, error } = await client.rpc("open_loot_box", {
        p_box_type: "starter",
      });

      if (error) throw error;

      if (data && data.success) {
        setOpenedReward({
          box: "Кейс 1",
          coins: data.coins,
          xp: data.xp,
          costMessage: "Безкоштовний щоденний бонус",
        });

        try {
          const currentXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
          localStorage.setItem("matchday:bj_xp", (currentXp + data.xp).toString());
        } catch {
          // ignore
        }

        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem("matchday:last_daily_case", today);
        setDailyClaimed(true);

        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          const { data: prof } = await client
            .from("profiles")
            .select("coins, hohlyantsi")
            .eq("id", authData.user.id)
            .maybeSingle();
          if (prof) {
            if (typeof prof.coins === "number") setBalance(prof.coins);
            if (typeof prof.hohlyantsi === "number") setHohlyantsi(prof.hohlyantsi);
          }
        }
      }
    } catch (err: unknown) {
      console.error("Помилка відкриття кейсу:", err);
      setErrorMessage("Не вдалося відкрити кейс. Переконайтеся, що ви увійшли у систему.");
    } finally {
      setIsOpening(false);
    }
  }

  async function handleBuyWithHohlyantsi(caseItem: CaseItem) {
    if (isDemoMode || isOpening) return;
    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage("Підключення до Supabase відсутнє.");
      return;
    }

    if (hohlyantsi !== null && hohlyantsi < caseItem.hohlyantsiPrice) {
      setErrorMessage(`Недостатньо Бонусів! Потрібно: ${caseItem.hohlyantsiPrice} 🔘`);
      return;
    }

    setIsOpening(true);
    setErrorMessage(null);
    setOpenedReward(null);

    try {
      const { data, error } = await client.rpc("buy_case_with_hohlyantsi", {
        p_box_type: caseItem.id,
      });

      if (error) {
        if (error.message.includes("insufficient_hohlyantsi")) {
          throw new Error("Недостатньо Бонусів на вашому рахунку.");
        }
        throw error;
      }

      if (data && data.success) {
        setOpenedReward({
          box: "Кейс 1",
          coins: data.coins_reward,
          xp: data.xp_reward,
          costMessage: `Куплено за ${data.cost} Бонусів`,
        });

        try {
          const currentXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
          localStorage.setItem("matchday:bj_xp", (currentXp + data.xp_reward).toString());
        } catch {
          // ignore
        }

        if (typeof data.coins === "number") setBalance(data.coins);
        if (typeof data.hohlyantsi === "number") setHohlyantsi(data.hohlyantsi);

        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      console.error("Помилка купівлі кейсу:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Помилка при купівлі кейсу за Бонуси. Перевірте базу даних."
      );
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-[#090b0e] px-4 py-8 font-mono text-slate-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <Link
            href="/leagues"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition"
          >
            ← До ліг
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/online"
              className="rounded-lg border border-indigo-600/60 bg-indigo-950/40 px-3 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-900/60 transition"
            >
              🌐 Онлайн Дуелі
            </Link>
            <Link
              href="/blackjack"
              className="rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
            >
              🃏 Блекджек
            </Link>
            <Link
              href="/dice"
              className="rounded-lg border border-red-800 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-900/40 transition"
            >
              🎲 Кості
            </Link>
            {/* Баланс золотих монет */}
            <div className="font-mono text-xs text-amber-400 font-semibold">
              🪙 {balance === null ? "—" : `${balance.toLocaleString()} монет`}
            </div>
            {/* Баланс Бонусів */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-200 shadow-inner">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 text-[10px] font-black text-slate-950">
                Б
              </span>
              <span>{hohlyantsi === null ? "25" : hohlyantsi.toLocaleString()} Бонусів</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-block rounded-full border border-amber-600/40 bg-amber-950/20 px-4 py-1 text-xs text-amber-300 font-bold mb-3">
            🎁 СЕКРЕТНІ КЕЙСИ ТА ВАЛЮТА «БОНУСИ»
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            КЕЙСИ ТА КВЕСТИ
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-400 sm:text-sm">
            Забирай щоденний бонус або купуй кейси за Бонуси, вибивай до 1 000 000 монет і прокачуй рівень агента!
          </p>
        </header>

        {/* Щоденна нагорода Banner */}
        <div className="mb-10 rounded-2xl border border-emerald-600/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                ⚡ БЕЗКОШТОВНИЙ ЩОДЕННИЙ БОНУС (1 РАЗ НА ДОБУ)
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Безкоштовний «Кейс 1»
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Заходь щодня та отримуй 500-800 монет і +60 XP безкоштовно.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenDailyCase}
              disabled={isOpening || dailyClaimed}
              className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isOpening
                ? "Відкриття..."
                : dailyClaimed
                  ? "Вже забрано сьогодні"
                  : "🎁 Забрати безкоштовно"}
            </button>
          </div>
        </div>

        {/* Modal-like Reward Alert */}
        {openedReward && (
          <div className="mb-10 animate-in fade-in zoom-in duration-300 rounded-2xl border-2 border-yellow-500 bg-gradient-to-b from-yellow-950/60 to-black p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)]">
            <span className="text-4xl">🎉</span>
            <h3 className="mt-2 text-lg font-bold text-amber-300 uppercase">
              КЕЙС «{openedReward.box}» ВІДКРИТО!
            </h3>
            {openedReward.costMessage && (
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                {openedReward.costMessage}
              </p>
            )}
            <p className="mt-2 text-3xl font-black text-white">
              +{openedReward.coins.toLocaleString()} МОНЕТ
            </p>
            <p className="text-sm font-bold text-emerald-400 mt-1">
              +{openedReward.xp} XP ДОСВІДУ АГЕНТА
            </p>
            <button
              onClick={() => setOpenedReward(null)}
              className="mt-4 rounded-lg bg-yellow-500 px-6 py-1.5 text-xs font-bold text-black uppercase hover:bg-yellow-400 transition"
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

        {/* Cases Grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          {CASES.map((c) => (
            <div
              key={c.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-gradient-to-b ${c.boxColor} p-6 shadow-xl transition hover:-translate-y-1`}
              style={{ boxShadow: `0 10px 30px ${c.glowColor}` }}
            >
              <div>
                <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-4 ${c.badgeColor}`}>
                  {c.badge}
                </span>

                <div className="my-6 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-black/40 border border-slate-700/60 text-5xl shadow-inner">
                    {c.icon}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white text-center">{c.title}</h3>
                <p className="mt-2 text-xs text-slate-400 text-center leading-relaxed">
                  {c.tagline}
                </p>

                <div className="mt-6 rounded-xl border border-slate-800 bg-black/50 p-3 space-y-1.5 font-mono text-center">
                  <div className="text-sm font-bold text-amber-400">{c.coinsDisplay}</div>
                  <div className="text-xs font-semibold text-emerald-400">{c.xpDisplay}</div>
                  <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800 flex items-center justify-center gap-1 font-bold">
                    <span>Ціна:</span>
                    <span className="text-slate-100">{c.hohlyantsiPrice}</span>
                    <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-400 text-[8px] font-black text-slate-950">Б</span>
                    <span>Бонусів</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => handleBuyWithHohlyantsi(c)}
                  disabled={isOpening || (hohlyantsi !== null && hohlyantsi < c.hohlyantsiPrice)}
                  className="w-full rounded-xl bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-40"
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
