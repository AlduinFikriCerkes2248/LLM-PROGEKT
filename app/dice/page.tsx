"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type BetOption = "under7" | "seven" | "over7" | "doubles";

function CasinoDealer3D() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full bg-slate-400 border-4 border-slate-600 shadow-2xl">
        <div className="absolute top-3 flex w-16 justify-between px-1">
          <div className="h-3 w-6 rounded-full bg-slate-900 -rotate-12" />
          <div className="h-3 w-6 rounded-full bg-slate-900 rotate-12" />
        </div>
        <div className="flex w-16 justify-between px-1.5 mt-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-700">
            <div className="h-4 w-4 rounded-full bg-slate-900" />
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-700">
            <div className="h-4 w-4 rounded-full bg-slate-900" />
          </div>
        </div>
        <div className="h-2 w-2.5 rounded-full bg-slate-500 mt-1" />
      </div>
      <div className="relative -mt-3 h-14 w-28 rounded-t-3xl bg-slate-800 border-x-4 border-t-4 border-slate-700 flex flex-col items-center">
        <div className="h-3 w-10 bg-white" />
        <div className="h-8 w-3 bg-red-500 rounded-b-sm shadow-md" />
      </div>
    </div>
  );
}

function InteractiveColaGlass({
  level,
  onDrink,
}: {
  level: number;
  onDrink: () => void;
}) {
  return (
    <div
      onClick={onDrink}
      className="group flex cursor-pointer flex-col items-center justify-end rounded-2xl border border-slate-700/80 bg-black/60 p-2.5 shadow-lg transition hover:border-amber-500 hover:bg-black/80"
      title="Зробити ковток холодної коли!"
    >
      <div className="relative h-24 w-14 overflow-hidden rounded-b-xl border-x-2 border-b-4 border-slate-400/40 bg-slate-900/40 backdrop-blur-sm">
        <div className="absolute -top-2 left-6 h-14 w-2 rotate-12 bg-rose-600 border border-rose-700 shadow-sm" />
        {level > 15 && (
          <div className="absolute top-6 left-2.5 h-4 w-4 rotate-12 rounded border border-white/40 bg-white/30 backdrop-blur-sm z-10" />
        )}
        {level > 40 && (
          <div className="absolute top-12 right-2 h-4 w-4 -rotate-12 rounded border border-white/40 bg-white/30 backdrop-blur-sm z-10" />
        )}
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-[#150603] via-[#2d0e07] to-[#42170d] transition-all duration-300 flex items-start justify-center"
          style={{ height: `${level}%` }}
        >
          {level > 0 && (
            <div className="h-1.5 w-full bg-amber-700/70 animate-pulse border-t border-amber-400/50" />
          )}
        </div>
      </div>
      <div className="mt-1.5 text-center">
        <span className="font-mono text-[11px] font-bold text-amber-300">
          {level > 0 ? `${level}% кола` : "Порожньо"}
        </span>
        <p className="text-[9px] text-slate-500 uppercase">клік = ковток</p>
      </div>
    </div>
  );
}

export default function DicePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("50");
  const [selectedBet, setSelectedBet] = useState<BetOption>("over7");
  const [isRolling, setIsRolling] = useState(false);
  const [dice1, setDice1] = useState(3);
  const [dice2, setDice2] = useState(4);
  const [colaLevel, setColaLevel] = useState(100);
  const [dealerSpeech, setDealerSpeech] = useState(
    "Кидай кості на сукно! Обери ставку та пий холодну колу."
  );
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

  function handleDrinkCola() {
    if (colaLevel > 0) {
      const nextLevel = Math.max(0, colaLevel - 25);
      setColaLevel(nextLevel);
      setDealerSpeech(
        nextLevel === 0
          ? "Кола допита! Наливаю свіжу зі столу, кидай кубики!"
          : "Холодний ковток коли перед кидком приносить удачу!"
      );
    } else {
      setColaLevel(100);
      setDealerSpeech("Свіжа склянка коли на столі. Зроби ставку на кості!");
    }
  }

  async function handleRollDice() {
    const bet = Number(betAmount);
    if (!Number.isInteger(bet) || bet < 1 || bet > 500000) {
      setErrorMessage("Ставка від 1 до 500 000 монет.");
      return;
    }
    if (balance === null || bet > balance) {
      setErrorMessage("Недостатньо монет на балансі.");
      return;
    }

    const client = getSupabaseClient();
    if (!client || isRolling) return;

    setIsRolling(true);
    setErrorMessage(null);
    setGameResult(null);
    setDealerSpeech("Кубики летять по столу...");

    // Анімація прокрутки кубиків
    let rolls = 0;
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      rolls++;
    }, 80);

    try {
      // Виклик захищеної RPC-функції в базі Supabase (без 403 помилок!)
      const { data, error } = await client.rpc("play_dice", {
        p_bet: bet,
        p_pick: selectedBet,
      });

      setTimeout(() => {
        clearInterval(interval);
        if (error) {
          console.error("Помилка play_dice:", error);
          setErrorMessage("Помилка ставки. Переконайся, що функція play_dice створена в базі.");
          setIsRolling(false);
          return;
        }

        if (data) {
          setDice1(data.dice1);
          setDice2(data.dice2);
          if (typeof data.balance === "number") setBalance(data.balance);

          if (data.won) {
            setDealerSpeech("ТОЧНО В ЦІЛЬ! Вітаю з виграшем!");
            setGameResult({
              win: true,
              payout: data.payout - bet,
              message: `🎉 ПЕРЕМОГА! Сума ${data.sum} (${data.dice1}+${data.dice2}). Виплата: +${data.payout.toLocaleString()} монет!`,
            });
          } else {
            setDealerSpeech("Цього разу не пощастило. Допивай колу і спробуй ще!");
            setGameResult({
              win: false,
              payout: 0,
              message: `💀 Програш. Випало ${data.sum} (${data.dice1}+${data.dice2}). Спробуй ще раз!`,
            });
          }
          window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        }
        setIsRolling(false);
      }, 1000);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setErrorMessage("Збій зв'язку з базою.");
      setIsRolling(false);
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-[#07090c] px-3 py-6 font-mono text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        {/* Navigation */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <Link
            href="/leagues"
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
          >
            ← Меню ліг
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/blackjack"
              className="rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
            >
              🃏 Блекджек
            </Link>
            <Link
              href="/cases"
              className="rounded-lg border border-purple-600/60 bg-purple-950/30 px-3 py-1 text-xs font-bold text-purple-300 hover:bg-purple-900/40 transition"
            >
              🎁 Кейси
            </Link>
            <div className="rounded-lg bg-amber-950/40 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
              🪙 {balance === null ? "—" : `${balance.toLocaleString()} монет`}
            </div>
          </div>
        </div>

        {/* 3D DICE TABLE CONTAINER */}
        <div className="relative overflow-hidden rounded-3xl border-4 border-red-900/60 bg-gradient-to-b from-[#18131d] via-[#100d14] to-[#0a070e] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] sm:p-8">
          
          {/* Верхня панель: Інфо + Кола */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="rounded-2xl border-2 border-red-800/60 bg-black/60 p-3">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block">
                🎲 UNDERGROUND CRAPS TABLE
              </span>
              <span className="text-sm font-black text-white">ПІДПІЛЬНІ КОСТІ</span>
            </div>

            {/* Інтерактивна склянка коли */}
            <InteractiveColaGlass level={colaLevel} onDrink={handleDrinkCola} />

            <div className="rounded-2xl border border-slate-800 bg-black/40 p-3 text-right">
              <span className="text-xs font-bold text-amber-400 block">Макс. ставка: 500,000</span>
              <span className="text-[11px] text-slate-400">Коефіцієнт до x6.0</span>
            </div>
          </div>

          {/* ПОЛЕ СТОЛУ З ДИЛЕРОМ */}
          <div className="relative mx-auto max-w-3xl rounded-[3rem] border-4 border-red-900/80 bg-gradient-to-b from-[#381616] via-[#240e0e] to-[#140808] p-6 shadow-2xl sm:p-10 text-center">
            
            {/* Дилер */}
            <div className="mb-4 flex flex-col items-center">
              <CasinoDealer3D />
              <div className="mt-3 rounded-full border border-red-500/40 bg-black/60 px-5 py-1.5 text-xs text-red-300 font-serif italic shadow-md">
                "{dealerSpeech}"
              </div>
            </div>

            {/* Кубики */}
            <div className="my-8 flex items-center justify-center gap-6 sm:gap-10">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-slate-300 bg-gradient-to-br from-white via-slate-100 to-slate-300 text-5xl font-black text-slate-900 shadow-[0_15px_30px_rgba(255,255,255,0.2)] sm:h-32 sm:w-32 sm:text-6xl transition-transform ${
                  isRolling ? "animate-spin scale-110" : ""
                }`}
              >
                {dice1}
              </div>
              <div className="text-3xl font-black text-amber-400 select-none">+</div>
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-slate-300 bg-gradient-to-br from-white via-slate-100 to-slate-300 text-5xl font-black text-slate-900 shadow-[0_15px_30px_rgba(255,255,255,0.2)] sm:h-32 sm:w-32 sm:text-6xl transition-transform ${
                  isRolling ? "animate-spin scale-110" : ""
                }`}
              >
                {dice2}
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-slate-300">
              СУМА НА СТОЛІ: <span className="text-2xl text-amber-400 font-black">{dice1 + dice2}</span>
            </div>

            {/* Результат раунду */}
            {gameResult && (
              <div
                className={`my-6 rounded-2xl border-2 p-4 font-black text-base uppercase animate-in zoom-in-95 ${
                  gameResult.win
                    ? "border-emerald-500 bg-black/80 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    : "border-rose-700 bg-black/80 text-rose-300"
                }`}
              >
                {gameResult.message}
              </div>
            )}
          </div>

          {/* ВАРІАНТИ СТАВОК */}
          <div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setSelectedBet("under7")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition active:scale-95 ${
                selectedBet === "under7"
                  ? "border-cyan-400 bg-cyan-950/70 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="text-lg font-black text-white">МЕНШЕ 7</div>
              <div className="text-xs text-cyan-300 font-bold mt-1">x2.0 ВИПЛАТА</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBet("seven")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition active:scale-95 ${
                selectedBet === "seven"
                  ? "border-amber-400 bg-amber-950/70 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="text-lg font-black text-amber-300">РІВНО 7</div>
              <div className="text-xs text-amber-400 font-bold mt-1">x5.8 ДЖЕКПОТ</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBet("over7")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition active:scale-95 ${
                selectedBet === "over7"
                  ? "border-cyan-400 bg-cyan-950/70 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="text-lg font-black text-white">БІЛЬШЕ 7</div>
              <div className="text-xs text-cyan-300 font-bold mt-1">x2.0 ВИПЛАТА</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBet("doubles")}
              disabled={isRolling}
              className={`rounded-2xl border-2 p-4 text-center transition active:scale-95 ${
                selectedBet === "doubles"
                  ? "border-purple-400 bg-purple-950/70 shadow-[0_0_20px_rgba(192,132,252,0.35)]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="text-lg font-black text-purple-300">ДУБЛЬ (1-1..6-6)</div>
              <div className="text-xs text-purple-400 font-bold mt-1">x6.0 ВИПЛАТА</div>
            </button>
          </div>

          {/* ФОРМА СТАВКИ ТА КНОПКА КИНУТИ КОСТІ */}
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
              disabled={isRolling || balance === null}
              className="h-16 shrink-0 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-700 border-b-8 border-amber-900 px-10 font-sans text-xl font-black uppercase tracking-wider text-slate-950 shadow-[0_10px_25px_rgba(245,158,11,0.5)] active:translate-y-1 active:border-b-4 transition disabled:opacity-50"
            >
              {isRolling ? "КИДАЄМО..." : "🎲 КИНУТИ КОСТІ"}
            </button>
          </div>

          {errorMessage && (
            <p className="mt-4 text-xs font-bold text-rose-400 text-center">{errorMessage}</p>
          )}
        </div>
      </div>
    </main>
  );
}
