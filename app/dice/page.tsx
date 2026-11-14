"use client";

import Link from "next/link";
import { DemoNoticeBadge } from "../demo-banner";
import { useEffect, useState } from "react";
import { formatErrorMessage } from "../../lib/error-utils";
import {
  getSupabaseClient,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type BetOption = "under7" | "seven" | "over7" | "doubles";

type LeaderboardEntry = {
  username: string;
  coins: number;
  hohlyantsi: number;
};

type RollHistoryItem = {
  id: string;
  dice1: number;
  dice2: number;
  sum: number;
  bet: BetOption;
  won: boolean;
  payout: number;
  time: string;
};

const MULTIPLIERS: Record<BetOption, number> = {
  under7: 2.0,
  seven: 5.8,
  over7: 2.0,
  doubles: 4.5,
};

const BET_LABELS: Record<BetOption, string> = {
  under7: "Менше 7 (< 7)",
  seven: "Рівно 7 (= 7)",
  over7: "Більше 7 (> 7)",
  doubles: "Дублі (Дві однакові)",
};

// Реалістичне відображення граней 3D-кістки з крапками (Pips)
function DiceFace({ value, isRolling }: { value: number; isRolling: boolean }) {
  // Розмітка крапок за значенням від 1 до 6 (3x3 сітка)
  const pipMap: Record<number, number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const activePips = pipMap[value] ?? [4];

  return (
    <div
      className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-white via-slate-100 to-slate-300 p-3 shadow-[0_15px_30px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
        isRolling ? "animate-dice-shake scale-95" : "hover:scale-105"
      }`}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 items-center justify-items-center">
        {Array.from({ length: 9 }).map((_, i) => {
          const isFilled = activePips.includes(i);
          return (
            <div key={i} className="flex h-full w-full items-center justify-center">
              {isFilled && (
                <div
                  className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full shadow-inner ${
                    value === 1 || value === 4
                      ? "bg-rose-600 shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                      : "bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                  }`}
                />
              )}
            </div>
          );
        })}
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
      className="group flex cursor-pointer flex-col items-center justify-end rounded-xl border border-slate-700/80 bg-black/60 p-2 shadow-lg transition hover:border-amber-500 hover:bg-black/80"
      title="Зробити ковток холодної коли!"
    >
      <div className="relative h-20 w-12 overflow-hidden rounded-b-xl border-x-2 border-b-4 border-slate-400/40 bg-slate-900/40 backdrop-blur-sm">
        <div className="absolute -top-2 left-5 h-12 w-1.5 rotate-12 bg-rose-600 border border-rose-700 shadow-sm" />
        {level > 15 && (
          <div className="absolute top-5 left-2 h-3.5 w-3.5 rotate-12 rounded border border-white/40 bg-white/30 backdrop-blur-sm z-10" />
        )}
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-[#150603] via-[#2d0e07] to-[#42170d] transition-all duration-300 flex items-start justify-center"
          style={{ height: `${level}%` }}
        >
          {level > 0 && (
            <div className="h-1 w-full bg-amber-700/70 animate-pulse border-t border-amber-400/50" />
          )}
        </div>
      </div>
      <div className="mt-1 text-center">
        <span className="font-mono text-[10px] font-bold text-amber-300">
          {level > 0 ? `${level}% кола` : "Порожньо"}
        </span>
      </div>
    </div>
  );
}

export default function DicePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [, setHohlyantsi] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("50");
  const [selectedBet, setSelectedBet] = useState<BetOption>("over7");
  const [isRolling, setIsRolling] = useState(false);
  const [dice1, setDice1] = useState(3);
  const [dice2, setDice2] = useState(4);
  const [colaLevel, setColaLevel] = useState(100);
  const [dealerSpeech, setDealerSpeech] = useState(
    "Кидай кості на нічне сукно Matchday! Обери результат та випробуй долю.",
  );
  const [gameResult, setGameResult] = useState<{
    win: boolean;
    payout: number;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rollHistory, setRollHistory] = useState<RollHistoryItem[]>([
    {
      id: "init-1",
      dice1: 3,
      dice2: 4,
      sum: 7,
      bet: "seven",
      won: true,
      payout: 290,
      time: "Щойно",
    },
    {
      id: "init-2",
      dice1: 5,
      dice2: 6,
      sum: 11,
      bet: "over7",
      won: true,
      payout: 100,
      time: "2 хв тому",
    },
    {
      id: "init-3",
      dice1: 2,
      dice2: 3,
      sum: 5,
      bet: "over7",
      won: false,
      payout: 0,
      time: "5 хв тому",
    },
  ]);

  useEffect(() => {
    async function loadData() {
      const client = getSupabaseClient();
      if (!client) return;
      const { data: authData } = await client.auth.getUser();
      if (authData?.user) {
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

      try {
        const { data: topUsers } = await client
          .from("profiles")
          .select("username, coins, hohlyantsi")
          .order("coins", { ascending: false })
          .limit(10);
        if (topUsers) {
          setLeaderboard(
            topUsers.map((u) => ({
              username: u.username || "Агент",
              coins: u.coins ?? 0,
              hohlyantsi: u.hohlyantsi ?? 25,
            })),
          );
        }
      } catch {
        // ignore
      }
    }
    void loadData();
  }, []);

  function handleDrinkCola() {
    if (colaLevel > 0) {
      const nextLevel = Math.max(0, colaLevel - 25);
      setColaLevel(nextLevel);
      setDealerSpeech(
        nextLevel === 0
          ? "Кола допита! Наливаю свіжу з льодом, продовжуй кидок!"
          : "Холодний ковток коли перед вирішальним кидком приносить фарт!",
      );
    } else {
      setColaLevel(100);
      setDealerSpeech("Свіжа склянка коли на столі. Зроби свій кидок долі!");
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
    setDealerSpeech("Кубики летять по сукну арени...");

    // Анімація випадкових чисел під час кидка
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
    }, 70);

    try {
      const { data, error } = await client.rpc("play_dice", {
        p_bet: bet,
        p_pick: selectedBet,
      });

      setTimeout(() => {
        clearInterval(interval);
        if (error) {
          console.error("Помилка play_dice:", formatErrorMessage(error));
          setErrorMessage(
            "Помилка ставки. Переконайся, що функція play_dice створена в базі Supabase.",
          );
          setIsRolling(false);
          return;
        }

        if (data) {
          setDice1(data.dice1);
          setDice2(data.dice2);
          if (typeof data.balance === "number") setBalance(data.balance);

          const isWin = Boolean(data.won);
          if (isWin) {
            setDealerSpeech("Точний прогноз! Чудовий кидок, вітаю з виграшем!");
            setGameResult({
              win: true,
              payout: data.payout - bet,
              message: `Перемога! Сума ${data.sum} (${data.dice1} + ${data.dice2}). Виплата: +${data.payout.toLocaleString()} монет`,
            });
          } else {
            setDealerSpeech("Цього разу випала інша сума. Спробуйте змінити ставку.");
            setGameResult({
              win: false,
              payout: 0,
              message: `Не випало. Сума ${data.sum} (${data.dice1} + ${data.dice2}). Спробуйте ще раз.`,
            });
          }

          // Додаємо в історію кидків
          setRollHistory((prev) => [
            {
              id: Date.now().toString(),
              dice1: data.dice1,
              dice2: data.dice2,
              sum: data.sum,
              bet: selectedBet,
              won: isWin,
              payout: isWin ? data.payout : 0,
              time: "Щойно",
            },
            ...prev.slice(0, 7),
          ]);

          window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        }
        setIsRolling(false);
      }, 850);
    } catch (err) {
      clearInterval(interval);
      console.error("Помилка гри в кості:", formatErrorMessage(err));
      setErrorMessage("Збій зв'язку з базою.");
      setIsRolling(false);
    }
  }

  const multiplier = MULTIPLIERS[selectedBet];
  const parsedBet = Number(betAmount) || 0;
  const potentialWin = Math.floor(parsedBet * multiplier);
  const currentSum = dice1 + dice2;

  return (
    <div className="relative min-h-screen text-[var(--text-main)] font-sans antialiased overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
      {/* М'яке фонове стадіонне сяйво */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute top-10 left-1/4 h-[500px] w-[500px] rounded-full bg-orange-600/20 blur-[150px]" />
        <div className="absolute bottom-10 right-1/4 h-[450px] w-[450px] rounded-full bg-cyan-600/15 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <DemoNoticeBadge />

        {/* НАВІГАЦІЯ */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5 transition">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 font-black text-xs text-black shadow-md shadow-orange-500/30">
                MD
              </div>
              <span className="font-black text-base tracking-[0.16em] uppercase text-white group-hover:text-orange-400 transition">
                MATCHDAY
              </span>
            </Link>
            <span className="text-[var(--text-secondary)]/50">/</span>
            <span className="text-xs font-semibold text-orange-400">
              Кості
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Дашборд
            </Link>
            <Link href="/leagues" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Ліги
            </Link>
            <Link href="/blackjack" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Блекджек
            </Link>
            <Link href="/wheel" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              Колесо
            </Link>

            {balance !== null && (
              <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold">Баланс:</span>
                <span>{balance.toLocaleString()} монет</span>
              </div>
            )}
          </div>
        </header>

        {/* ВЕРХНЯ ІНТЕРАКТИВНА ПАНЕЛЬ: ДИЛЕР ТА ХОЛОДНА КОЛА */}
        <section className="matchday-card mb-6 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <InteractiveColaGlass level={colaLevel} onDrink={handleDrinkCola} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-live">Дилер за столом</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    (клікни на склянку, щоб випити ковток!)
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-300 font-medium italic">
                  «{dealerSpeech}»
                </p>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                Стан коли
              </span>
              <span className="text-sm font-black text-amber-400">
                {colaLevel}% наповнено
              </span>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-600/70 bg-rose-950/60 p-4 text-center text-xs font-bold text-rose-200 animate-fade-in shadow-lg"
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ====================================================================
            ВЕЛИКА ЦЕНТРАЛЬНА ІГРОВА ЗОНА (ROLL OF FATE)
            ==================================================================== */}
        <section className="relative mb-8 rounded-[36px] border-4 border-[#2d1212] bg-gradient-to-b from-[#200a0a] via-[#140606] to-[#0a0303] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_0_60px_rgba(255,122,36,0.08)] text-center overflow-hidden">
          {/* Декоративні концентричні кола столу */}
          <div className="pointer-events-none absolute inset-x-12 top-1/2 -translate-y-1/2 h-56 rounded-full border border-orange-500/10 [border-dasharray:8_8]" />

          {/* 1. ДВІ ВЕЛИКІ 3D-КІСТКИ В ЦЕНТРІ */}
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400/80 mb-6">
              Центральна зона кидка
            </span>

            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6">
              <DiceFace value={dice1} isRolling={isRolling} />
              <div className="text-2xl font-black text-orange-500/60">+</div>
              <DiceFace value={dice2} isRolling={isRolling} />
            </div>

            {/* Відображення поточної суми */}
            <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/40 bg-black/60 px-5 py-2 backdrop-blur-md shadow-lg">
              <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">
                Сума очок:
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-300">
                {isRolling ? "..." : currentSum}
              </span>
              {!isRolling && dice1 === dice2 && (
                <span className="ml-2 rounded bg-orange-500/20 border border-orange-500/50 px-2 py-0.5 text-[10px] font-bold text-orange-300 uppercase">
                  Дубль
                </span>
              )}
            </div>

            {/* Результат останнього кидка */}
            {gameResult && (
              <div className="mt-5 animate-fade-in">
                {gameResult.win ? (
                  <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/80 px-6 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <span className="text-sm font-bold text-emerald-300">
                      {gameResult.message}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-600/50 bg-rose-950/80 px-6 py-2.5 shadow-[0_0_15px_rgba(225,29,72,0.25)]">
                    <span className="text-xs font-bold text-rose-300">
                      {gameResult.message}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 2. ПОМІТНА КНОПКА «ROLL DICE» */}
            <div className="mt-8">
              <button
                type="button"
                disabled={isRolling}
                onClick={() => void handleRollDice()}
                className="btn-orange text-base sm:text-lg font-bold uppercase tracking-wider py-4 px-12 rounded-full shadow-[0_8px_30px_rgba(255,122,36,0.55)] transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {isRolling ? "Кубики котяться..." : "Кинути кубики"}
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================================
            ПАНЕЛЬ СТАВОК ТА КОЕФІЦІЄНТІВ
            ==================================================================== */}
        <section className="matchday-card mb-8 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
              1. Оберіть результат кидка:
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-secondary)]">Потенційний виграш:</span>
              <span className="font-mono text-sm font-black text-emerald-400">
                +{potentialWin.toLocaleString()} 🪙
              </span>
            </div>
          </div>

          {/* 4 варіанти результату */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            {(
              [
                ["under7", "Менше 7 (< 7)", "2.00x"],
                ["seven", "Рівно 7 (= 7)", "5.80x"],
                ["over7", "Більше 7 (> 7)", "2.00x"],
                ["doubles", "Дублі (1+1, 2+2...)", "4.50x"],
              ] as const
            ).map(([opt, label, coef]) => {
              const isSelected = selectedBet === opt;
              const isSeven = opt === "seven";

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedBet(opt)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition ${
                    isSelected
                      ? "border-orange-500 bg-orange-950/30 shadow-[0_0_15px_rgba(255,122,36,0.3)]"
                      : "border-[var(--border)] bg-[#070b14] hover:border-slate-600 hover:bg-[#0d1522]"
                  }`}
                >
                  <span
                    className={`text-xs font-black truncate w-full ${
                      isSelected ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`mt-1 font-mono text-sm font-black ${
                      isSeven
                        ? "text-amber-400"
                        : isSelected
                          ? "text-orange-400"
                          : "text-cyan-400"
                    }`}
                  >
                    {coef}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Встановлення суми ставки */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] mr-2">
                Швидкі суми:
              </span>
              {[25, 50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBetAmount(amt.toString())}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    betAmount === amt.toString()
                      ? "border-orange-500 bg-orange-950/50 text-orange-300"
                      : "border-[var(--border)] bg-[#070b14] text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  🪙 {amt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-36">
                <label htmlFor="dice-bet" className="sr-only">
                  Сума ставки
                </label>
                <input
                  id="dice-bet"
                  type="number"
                  min="1"
                  max="500000"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="matchday-input text-center font-mono text-sm font-black"
                />
              </div>

              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-right">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                  Виплата при перемозі
                </span>
                <span className="font-mono text-sm font-black text-emerald-300">
                  {potentialWin.toLocaleString()} 🪙
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            ІСТОРІЯ ПОПЕРЕДНІХ КИДКІВ (ROLL HISTORY)
            ==================================================================== */}
        <section className="matchday-card p-6">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-xs font-bold uppercase text-amber-300 tracking-wider">
              Історія останніх кидків
            </h3>
            <span className="text-xs text-[var(--text-secondary)]">
              Останні {rollHistory.length} раундів
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {rollHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#070b14] p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-white">
                    {item.dice1} + {item.dice2}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    = {item.sum}
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold text-xs block ${
                      item.won ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.won ? `+${item.payout} монет` : "0"}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)]">
                    {BET_LABELS[item.bet].split(" ")[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Зала слави Костей */}
        {leaderboard.length > 0 && (
          <section className="matchday-card mt-8 p-6">
            <h3 className="text-xs font-bold uppercase text-amber-300 tracking-wider mb-4">
              Таблиця лідерів костей
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="pb-2">Позиція</th>
                    <th className="pb-2">Гравець</th>
                    <th className="pb-2 text-right">Баланс монет</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/40">
                  {leaderboard.slice(0, 5).map((entry, idx) => (
                    <tr key={entry.username} className="hover:bg-slate-800/20">
                      <td className="py-2.5 font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 font-bold text-white">{entry.username}</td>
                      <td className="py-2.5 text-right font-black text-amber-300">
                        {entry.coins.toLocaleString()} монет
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
