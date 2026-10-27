"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type BetOption = "under7" | "seven" | "over7" | "doubles";

export default function DicePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("50");
  const [selectedBet, setSelectedBet] = useState<BetOption>("over7");
  const [isRolling, setIsRolling] = useState(false);
  const [dice1, setDice1] = useState(3);
  const [dice2, setDice2] = useState(4);
  const [gameResult, setGameResult] = useState<{
    win: boolean;
    payout: number;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadBalance() {
      const client = getSupabaseClient();
      if (!client) return;
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      const { data } = await client
        .from("profiles")
        .select("coins")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (data && typeof data.coins === "number") setBalance(data.coins);
    }
    void loadBalance();
  }, []);

  async function handleRollDice() {
    const bet = Number(betAmount);
    if (!Number.isInteger(bet) || bet < 1) {
      setErrorMessage("Введіть коректну ставку.");
      return;
    }
    if (balance === null || bet > balance) {
      setErrorMessage("Недостатньо монет для ставки.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    setIsRolling(true);
    setErrorMessage(null);
    setGameResult(null);

    // Списуємо ставку з профілю
    const { data: authData } = await client.auth.getUser();
    if (!authData?.user) {
      setErrorMessage("Необхідно увійти.");
      setIsRolling(false);
      return;
    }

    try {
      // Списуємо ставку
      const { error: deductError } = await client
        .from("profiles")
        .update({ coins: balance - bet })
        .eq("id", authData.user.id);

      if (deductError) throw deductError;
      setBalance((prev) => (prev !== null ? prev - bet : null));

      // Анімація обертання кубиків
      let rolls = 0;
      const interval = setInterval(() => {
        setDice1(Math.floor(Math.random() * 6) + 1);
        setDice2(Math.floor(Math.random() * 6) + 1);
        rolls++;
        if (rolls > 10) {
          clearInterval(interval);
          finishRoll(authData.user.id, bet);
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setErrorMessage("Помилка ставки.");
      setIsRolling(false);
    }
  }

  async function finishRoll(userId: string, bet: number) {
    const final1 = Math.floor(Math.random() * 6) + 1;
    const final2 = Math.floor(Math.random() * 6) + 1;
    setDice1(final1);
    setDice2(final2);

    const sum = final1 + final2;
    const isDouble = final1 === final2;

    let won = false;
    let multiplier = 0;

    if (selectedBet === "under7" && sum < 7) {
      won = true;
      multiplier = 2;
    } else if (selectedBet === "over7" && sum > 7) {
      won = true;
      multiplier = 2;
    } else if (selectedBet === "seven" && sum === 7) {
      won = true;
      multiplier = 5.8;
    } else if (selectedBet === "doubles" && isDouble) {
      won = true;
      multiplier = 6;
    }

    const client = getSupabaseClient();
    if (won && client) {
      const payout = Math.floor(bet * multiplier);
      await client
        .from("profiles")
        .update({ coins: (balance ?? 0) - bet + payout })
        .eq("id", userId);

      setBalance((prev) => (prev !== null ? prev + payout : null));
      setGameResult({
        win: true,
        payout: payout - bet,
        message: `🎉 ВИГРАШ! Сума ${sum} (${final1}+${final2}). Отримано +${payout.toLocaleString()} монет!`,
      });
    } else {
      setGameResult({
        win: false,
        payout: 0,
        message: `💀 Програш. Випало ${sum} (${final1}+${final2}). Спробуй ще раз!`,
      });
    }

    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    setIsRolling(false);
  }

  return (
    <main className="min-h-screen flex-1 bg-[#07090c] px-4 py-8 font-mono text-slate-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <Link
            href="/leagues"
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
          >
            ← До ліг
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/blackjack"
              className="rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
            >
              🃏 Блекджек
            </Link>
            <div className="rounded-lg bg-amber-950/40 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
              🪙 {balance === null ? "—" : `${balance.toLocaleString()} монет`}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-block rounded-full border border-red-600/40 bg-red-950/20 px-4 py-1 text-xs text-red-300 font-bold mb-3">
            🎲 КЛАСИЧНЕ ПІДПІЛЬНЕ КАЗИНО
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            ГРА В КОСТІ (DICE)
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-400 sm:text-sm">
            Обери результат кидка, зроби ставку та вигравай з коефіцієнтом до 6x!
          </p>
        </header>

        {/* Dice Arena */}
        <div className="relative overflow-hidden rounded-3xl border-4 border-amber-900/60 bg-gradient-to-b from-[#141822] via-[#0d1017] to-[#08090d] p-6 shadow-2xl sm:p-10 text-center">
          
          {/* Анімовані кубики */}
          <div className="my-8 flex items-center justify-center gap-6 sm:gap-10">
            <div className={`flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-slate-600 bg-gradient-to-br from-white via-slate-100 to-slate-300 text-5xl font-black text-slate-900 shadow-[0_15px_30px_rgba(255,255,255,0.15)] sm:h-32 sm:w-32 sm:text-6xl ${isRolling ? "animate-spin" : ""}`}>
              {dice1}
            </div>
            <div className="text-2xl font-bold text-amber-400 select-none">+</div>
            <div className={`flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-slate-600 bg-gradient-to-br from-white via-slate-100 to-slate-300 text-5xl font-black text-slate-900 shadow-[0_15px_30px_rgba(255,255,255,0.15)] sm:h-32 sm:w-32 sm:text-6xl ${isRolling ? "animate-spin" : ""}`}>
              {dice2}
            </div>
          </div>

          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            СУМА ОЧОК: <span className="text-xl text-white font-black">{dice1 + dice2}</span>
          </div>

          {/* Результат */}
          {gameResult && (
            <div className={`my-6 rounded-2xl border-2 p-4 font-bold text-center animate-in zoom-in-95 ${gameResult.win ? "border-emerald-500 bg-emerald-950/40 text-emerald-300" : "border-rose-700 bg-rose-950/40 text-rose-300"}`}>
              {gameResult.message}
            </div>
          )}

          {/* Варіанти ставок */}
          <div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setSelectedBet("under7")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition ${selectedBet === "under7" ? "border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}
            >
              <div className="text-lg font-black text-white">МЕНШЕ 7</div>
              <div className="text-xs text-cyan-300 font-bold mt-1">x2.0 ВИПЛАТА</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBet("seven")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition ${selectedBet === "seven" ? "border-amber-400 bg-amber-950/60 shadow-[0_0_20px_rgba(251,191,36,0.3)]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}
            >
              <div className="text-lg font-black text-amber-300">РІВНО 7</div>
              <div className="text-xs text-amber-400 font-bold mt-1">x5.8 ДЖЕКПОТ</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBet("over7")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition ${selectedBet === "over7" ? "border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}
            >
              <div className="text-lg font-black text-white">БІЛЬШЕ 7</div>
              <div className="text-xs text-cyan-300 font-bold mt-1">x2.0 ВИПЛАТА</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBet("doubles")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition ${selectedBet === "doubles" ? "border-purple-400 bg-purple-950/60 shadow-[0_0_20px_rgba(192,132,252,0.3)]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}
            >
              <div className="text-lg font-black text-purple-300">ДУБЛЬ (1-1..6-6)</div>
              <div className="text-xs text-purple-400 font-bold mt-1">x6.0 ВИПЛАТА</div>
            </button>
          </div>

          {/* Форма ставки та кнопка КИНУТИ КОСТІ */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end max-w-xl mx-auto">
            <div className="flex-1 text-left">
              <label htmlFor="dice-bet" className="text-xs font-bold text-slate-300 mb-1.5 block">
                СУМА СТАВКИ (МОНЕТ):
              </label>
              <input
                id="dice-bet"
                type="number"
                min="1"
                max="500000"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isRolling}
                className="h-16 w-full rounded-2xl border-2 border-slate-700 bg-slate-900 px-4 font-mono text-xl font-bold text-white outline-none focus:border-amber-500 transition shadow-inner"
              />
            </div>

            <button
              type="button"
              onClick={handleRollDice}
              disabled={isRolling}
              className="h-16 shrink-0 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-700 border-b-8 border-amber-900 px-10 font-sans text-xl font-black uppercase tracking-wider text-slate-950 shadow-[0_10px_25px_rgba(245,158,11,0.5)] active:translate-y-1 active:border-b-4 transition disabled:opacity-50"
            >
              {isRolling ? "КИДАЄМО..." : "🎲 КИНУТИ КОСТІ"}
            </button>
          </div>

          {errorMessage && (
            <p className="mt-4 text-xs font-bold text-rose-400">{errorMessage}</p>
          )}
        </div>
      </div>
    </main>
  );
}
