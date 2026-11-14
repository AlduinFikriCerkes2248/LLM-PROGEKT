"use client";

import { DemoNoticeBadge } from "../demo-banner";
import Link from "next/link";
import { formatErrorMessage } from "../../lib/error-utils";
import { useEffect, useState, type FormEvent } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type GameResult = "blackjack" | "win" | "lose" | "push" | null;

type BlackjackGame = {
  id: string;
  bet: number;
  status: "active" | "finished";
  result: GameResult;
  payout: number;
  player_cards: number[];
  player_value: number;
  dealer_cards: number[];
  dealer_value: number;
  dealer_hidden: boolean;
  can_double: boolean;
};

type LeaderboardEntry = {
  username: string;
  games: number;
  wins: number;
  net: number;
};

const LEVELS = [
  { level: 1, title: "Новачок за столом", minXp: 0, maxXp: 200, maxBet: 500 },
  { level: 2, title: "Завсідник бару", minXp: 200, maxXp: 600, maxBet: 1500 },
  { level: 3, title: "Спецагент", minXp: 600, maxXp: 1400, maxBet: 5000 },
  { level: 4, title: "Професійний гравець", minXp: 1400, maxXp: 3000, maxBet: 15000 },
  { level: 5, title: "Хайролер", minXp: 3000, maxXp: 7000, maxBet: 50000 },
  { level: 6, title: "Тіньовий дилер", minXp: 7000, maxXp: 15000, maxBet: 120000 },
  { level: 7, title: "VIP-Гравець клубу", minXp: 15000, maxXp: 30000, maxBet: 250000 },
  { level: 8, title: "Магнат азарту", minXp: 30000, maxXp: 60000, maxBet: 500000 },
  { level: 9, title: "Сіндикат", minXp: 60000, maxXp: 120000, maxBet: 750000 },
  { level: 10, title: "Олігарх / Власник клубу", minXp: 120000, maxXp: 250000, maxBet: 1000000 },
];

function getLevelInfo(totalXp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}

const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const suits = ["♠", "♥", "♦", "♣"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((card) => Number.isInteger(card) && card >= 0 && card <= 51)
  );
}

function parseGame(value: unknown): BlackjackGame | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.bet !== "number" ||
    !Number.isInteger(value.bet) ||
    (value.status !== "active" && value.status !== "finished") ||
    !(
      value.result === null ||
      value.result === "blackjack" ||
      value.result === "win" ||
      value.result === "lose" ||
      value.result === "push"
    ) ||
    (value.payout !== null && typeof value.payout !== "number") ||
    !isNumberArray(value.player_cards) ||
    typeof value.player_value !== "number" ||
    !isNumberArray(value.dealer_cards) ||
    typeof value.dealer_value !== "number" ||
    typeof value.dealer_hidden !== "boolean" ||
    typeof value.can_double !== "boolean"
  ) {
    throw new Error("bj_state повернув неочікуваний формат.");
  }
  return {
    id: value.id,
    bet: value.bet,
    status: value.status,
    result: value.result,
    payout: value.payout ?? 0,
    player_cards: value.player_cards,
    player_value: value.player_value,
    dealer_cards: value.dealer_cards,
    dealer_value: value.dealer_value,
    dealer_hidden: value.dealer_hidden,
    can_double: value.can_double,
  };
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  return (
    isRecord(value) &&
    typeof value.username === "string" &&
    typeof value.games === "number" &&
    typeof value.wins === "number" &&
    typeof value.net === "number"
  );
}

function parseLeaderboard(value: unknown): LeaderboardEntry[] {
  if (!Array.isArray(value) || !value.every(isLeaderboardEntry)) {
    throw new Error("bj_leaderboard повернув неочікуваний формат.");
  }
  return value;
}

function getErrorCode(error: unknown) {
  return isRecord(error) && typeof error.code === "string" ? error.code : null;
}

function getErrorMessage(error: unknown) {
  return isRecord(error) && typeof error.message === "string"
    ? error.message.toLowerCase()
    : "";
}

function getUserErrorMessage(error: unknown, maxBetAllowed = 1000000) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const isError = (name: string) => code === name || message.includes(name);

  if (code === "23505" || isError("game_in_progress")) {
    return "Партія вже активна. Карти на столі.";
  }
  if (isError("insufficient_funds")) return "Недостатньо монет для ставки.";
  if (isError("invalid_bet"))
    return `Ставка від 1 до ${maxBetAllowed.toLocaleString()} монет.`;
  if (isError("no_active_game")) return "Активної партії немає.";
  if (isError("cannot_double"))
    return "Подвоїти можна лише на перших двох картах.";
  if (isError("not_authenticated")) return "Необхідно увійти до системи.";
  return "Помилка зв'язку з сервером. Спробуйте ще раз.";
}

// Картка гравця з плавною анімацією роздачі
function RenderNightCard({ card, index }: { card: number; index: number }) {
  const suit = suits[Math.floor(card / 13)];
  const isRed = suit === "♥" || suit === "♦";

  return (
    <div
      style={{
        animation: `cardDealIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${index * 80}ms forwards`,
      }}
      className={`relative flex h-28 w-20 sm:h-32 sm:w-22 shrink-0 flex-col justify-between rounded-xl border-2 border-slate-700 bg-gradient-to-b from-white to-slate-200 p-2.5 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 ${
        isRed ? "text-rose-600" : "text-slate-900"
      }`}
    >
      <div className="flex justify-between items-start font-mono text-base font-black leading-none">
        <span>{ranks[card % 13]}</span>
        <span className="text-sm">{suit}</span>
      </div>
      <div className="self-center text-3xl select-none opacity-90">{suit}</div>
      <div className="flex justify-between items-end font-mono text-base font-black leading-none rotate-180">
        <span>{ranks[card % 13]}</span>
        <span className="text-sm">{suit}</span>
      </div>
    </div>
  );
}

function RenderHiddenCard() {
  return (
    <div
      style={{
        animation: "cardDealIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) 120ms forwards",
      }}
      className="relative flex h-28 w-20 sm:h-32 sm:w-22 shrink-0 items-center justify-center rounded-xl border-2 border-rose-800 bg-gradient-to-br from-rose-950 via-[#180a0a] to-slate-950 p-2 shadow-2xl transition-all"
    >
      <div className="h-full w-full rounded-lg border border-rose-600/40 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:6px_6px] flex flex-col items-center justify-center text-center shadow-inner">
        <span className="font-mono text-xl text-rose-400 select-none font-black">
          🂠
        </span>
        <span className="text-[8px] text-rose-400/80 uppercase font-black tracking-widest mt-0.5">
          ТАЄМНИЦЯ
        </span>
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

export default function BlackjackPage() {
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [, setIsLoading] = useState(isSupabaseConfigured);
  const [isBusy, setIsBusy] = useState(false);
  const [betInput, setBetInput] = useState("100");
  const [colaLevel, setColaLevel] = useState(100);

  const [xp, setXp] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const savedXp = localStorage.getItem("matchday:bj_xp");
      return savedXp ? Math.max(0, parseInt(savedXp, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });

  const [winStreak, setWinStreak] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const savedStreak = localStorage.getItem("matchday:streak");
      return savedStreak ? Math.max(0, parseInt(savedStreak, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });

  const [dealerSpeech, setDealerSpeech] = useState(
    "Ласкаво просимо за нічний стіл Matchday! Оберіть ставку та переграйте дилера.",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentLevelInfo = getLevelInfo(xp);

  function saveXp(newXp: number) {
    const clamped = Math.max(0, newXp);
    setXp(clamped);
    try {
      localStorage.setItem("matchday:bj_xp", clamped.toString());
    } catch {
      // ignore
    }
  }

  function handleDrinkCola() {
    if (colaLevel > 0) {
      const nextLevel = Math.max(0, colaLevel - 25);
      setColaLevel(nextLevel);
      setDealerSpeech(
        nextLevel === 0
          ? "Колу допито до дна! Наливаю свіжу склянку з льодом."
          : "Холодний ковток коли заспокоює нерви перед вирішальною картою!",
      );
    } else {
      setColaLevel(100);
      setDealerSpeech("Свіжа кола на столі. Роби свій хід!");
    }
  }

  function handleGameOutcome(outcome: GameResult, betAmount: number) {
    let delta = 0;
    const oldLevel = currentLevelInfo.level;

    if (outcome === "blackjack") {
      delta = Math.min(2000, Math.max(50, betAmount));
      saveXp(xp + delta);
      const nextStreak = winStreak + 1;
      setWinStreak(nextStreak);
      localStorage.setItem("matchday:streak", nextStreak.toString());
    } else if (outcome === "win") {
      delta = Math.min(1000, Math.max(25, Math.floor(betAmount / 2)));
      saveXp(xp + delta);
      const nextStreak = winStreak + 1;
      setWinStreak(nextStreak);
      localStorage.setItem("matchday:streak", nextStreak.toString());
    } else if (outcome === "push") {
      delta = 10;
      saveXp(xp + delta);
    } else if (outcome === "lose") {
      const currentLevelBase = currentLevelInfo.minXp;
      const progressInLevel = Math.max(0, xp - currentLevelBase);
      const lostXp = Math.floor(progressInLevel / 2);
      saveXp(xp - lostXp);
      setWinStreak(0);
      localStorage.setItem("matchday:streak", "0");
    }

    const nextLevelInfo = getLevelInfo(Math.max(0, xp + delta));
    if (nextLevelInfo.level > oldLevel) {
      setDealerSpeech(
        `LEVEL UP! Твій ранг: ${nextLevelInfo.title} (Рівень ${nextLevelInfo.level}). Ліміт ставки: ${nextLevelInfo.maxBet.toLocaleString()} монет!`,
      );
    }
  }

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    async function loadGame() {
      try {
        const { data, error } = await client!.rpc("bj_state");
        if (error) throw error;
        const parsedGame = parseGame(data);
        if (parsedGame) setGame(parsedGame);
      } catch (error) {
        console.error("Помилка завантаження блекджеку:", formatErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    async function loadLeaderboard() {
      try {
        const { data } = await client!.rpc("bj_leaderboard");
        if (data) setLeaderboard(parseLeaderboard(data));
      } catch {
        // ignore
      }
    }

    async function loadBalance() {
      try {
        const { data: authData } = await client!.auth.getUser();
        if (!authData?.user) return;
        const { data } = await client!
          .from("profiles")
          .select("coins")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (data && typeof data.coins === "number") setBalance(data.coins);
      } catch {
        // ignore
      }
    }

    void loadGame();
    void loadLeaderboard();
    void loadBalance();
  }, []);

  async function refreshBalance() {
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

  async function refreshLeaderboard() {
    const client = getSupabaseClient();
    if (!client) return;
    const { data } = await client.rpc("bj_leaderboard");
    if (data) setLeaderboard(parseLeaderboard(data));
  }

  async function handleDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bet = Number(betInput);
    const maxAllowed = currentLevelInfo.maxBet;

    if (!Number.isInteger(bet) || bet < 1 || bet > maxAllowed) {
      setErrorMessage(`Твій ліміт ставки від 1 до ${maxAllowed.toLocaleString()} монет.`);
      return;
    }
    if (balance === null || bet > balance) {
      setErrorMessage("Недостатньо монет на балансі.");
      return;
    }

    const client = getSupabaseClient();
    if (!client || isBusy) return;
    setIsBusy(true);
    setErrorMessage(null);
    setDealerSpeech("Карти на столі. Успіху у грі!");

    try {
      const { data, error } = await client.rpc("bj_start", { p_bet: bet });
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error("Неочікувана відповідь від сервера.");
      setGame(nextGame);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

      if (nextGame.status === "finished") {
        handleGameOutcome(nextGame.result, bet);
        if (nextGame.result === "blackjack") {
          setDealerSpeech("BLACKJACK! Натуральні 21! Випий за блискучу перемогу!");
        } else if (nextGame.result === "win") {
          setDealerSpeech("Перемога! Банк виплачує виграш.");
        } else if (nextGame.result === "lose") {
          setDealerSpeech("Дилер забрав цей раунд. Спробуй ще!");
        } else {
          setDealerSpeech("Нічия (Push). Ставку повернуто на баланс.");
        }
      }
      void refreshBalance();
      void refreshLeaderboard();
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg.includes("game_in_progress") || getErrorCode(error) === "23505") {
        try {
          const { data: stateData } = await client.rpc("bj_state");
          const existingGame = parseGame(stateData);
          if (existingGame) {
            setGame(existingGame);
            setDealerSpeech("Партія активна. Завершіть поточну руку!");
            setErrorMessage(null);
          }
        } catch {
          setErrorMessage(getUserErrorMessage(error, maxAllowed));
        }
      } else {
        setErrorMessage(getUserErrorMessage(error, maxAllowed));
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAction(action: "bj_hit" | "bj_stand" | "bj_double") {
    const client = getSupabaseClient();
    if (!client || isBusy) return;
    setIsBusy(true);
    setErrorMessage(null);

    if (action === "bj_hit") setDealerSpeech("Ще карту! Дилер роздає...");
    if (action === "bj_double") setDealerSpeech("Подвоєння ставки (Double Down)!");

    try {
      const { data, error } = await client.rpc(action);
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error("Помилка ходу.");
      setGame(nextGame);

      if (nextGame.status === "finished") {
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        handleGameOutcome(nextGame.result, nextGame.bet);

        if (nextGame.result === "blackjack") {
          setDealerSpeech("Блекджек! Бездоганна комбінація.");
        } else if (nextGame.result === "win") {
          setDealerSpeech("Ви обіграли дилера! Чудова рука!");
        } else if (nextGame.result === "lose") {
          setDealerSpeech("Перебір або дилер набрав більше. Банк закладено.");
        } else {
          setDealerSpeech("Нічия (Push). Ставки повернуто.");
        }
        void refreshBalance();
        void refreshLeaderboard();
      }
    } catch (error) {
      setErrorMessage(getUserErrorMessage(error, currentLevelInfo.maxBet));
    } finally {
      setIsBusy(false);
    }
  }

  function startNewGame() {
    setGame(null);
    setErrorMessage(null);
    setDealerSpeech("Стіл готовий до нової руки. Робіть ставку!");
  }

  const isActiveGame = game?.status === "active";

  return (
    <div className="relative min-h-screen text-[var(--text-main)] font-sans antialiased overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* М'яке фонове стадіонне сяйво */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-600/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[550px] w-[550px] rounded-full bg-orange-600/15 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <DemoNoticeBadge />

        {/* НАВІГАЦІЯ */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5 transition">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 font-black text-black shadow-md shadow-cyan-500/30">
                🏆
              </div>
              <span className="font-black text-base tracking-[0.16em] uppercase text-white group-hover:text-cyan-400 transition">
                MATCHDAY
              </span>
            </Link>
            <span className="text-[var(--text-secondary)]/50">/</span>
            <span className="text-xs font-semibold text-cyan-300">
              🃏 Night Table Blackjack
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🏠 Дашборд
            </Link>
            <Link href="/leagues" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              ⚽ Ліги
            </Link>
            <Link href="/dice" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🎲 Кості
            </Link>
            <Link href="/wheel" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🎡 Колесо
            </Link>

            {balance !== null && (
              <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <span>🪙</span>
                <span>{balance.toLocaleString()} монет</span>
              </div>
            )}
          </div>
        </header>

        {/* КОМПАКТНА ВЕРХНЯ ПАНЕЛЬ: РАНГ, КОЛА, РЕПЛІКА ДИЛЕРА */}
        <section className="matchday-card mb-6 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <InteractiveColaGlass level={colaLevel} onDrink={handleDrinkCola} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-scheduled">Рівень {currentLevelInfo.level}</span>
                  <span className="text-xs font-bold text-white">
                    {currentLevelInfo.title}
                  </span>
                  {winStreak > 1 && (
                    <span className="rounded-full bg-orange-500/20 border border-orange-500/50 px-2 py-0.5 text-[10px] font-black text-orange-400">
                      🔥 {winStreak} в ряд
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] italic max-w-lg">
                  «{dealerSpeech}»
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                Ліміт ставки рангу
              </span>
              <span className="text-sm font-black text-cyan-300">
                до {currentLevelInfo.maxBet.toLocaleString()} 🪙
              </span>
            </div>
          </div>
        </section>

        {/* Повідомлення про помилку */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-600/70 bg-rose-950/60 p-4 text-center text-xs font-bold text-rose-200 animate-fade-in shadow-lg"
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ====================================================================
            ЦЕНТРАЛЬНИЙ НІЧНИЙ ІГРОВИЙ СТІЛ (BLACKJACK: NIGHT TABLE)
            ==================================================================== */}
        <section className="relative mb-8 rounded-[36px] border-4 border-[#122b3d] bg-gradient-to-b from-[#0a1826] via-[#07111c] to-[#04080e] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_0_60px_rgba(8,191,234,0.06)] overflow-hidden">
          {/* Декоративна розмітка столу */}
          <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-44 rounded-full border border-cyan-500/10 [border-dasharray:6_6]" />

          {/* 1. ЗОНА ДИЛЕРА */}
          <div className="relative z-10 flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                Карти дилера
              </span>
              {game && (
                <span className="rounded-md border border-[var(--border)] bg-[#070b14] px-2 py-0.5 font-mono text-xs font-black text-cyan-400">
                  {game.dealer_hidden ? "?" : game.dealer_value}
                </span>
              )}
            </div>

            <div className="flex justify-center gap-3 sm:gap-4 min-h-[120px]">
              {game ? (
                <>
                  {game.dealer_cards.map((card, idx) => (
                    <RenderNightCard key={`dealer-${idx}`} card={card} index={idx} />
                  ))}
                  {game.dealer_hidden && <RenderHiddenCard key="dealer-hidden" />}
                </>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-700/60 p-6 text-xs text-slate-500">
                  Чекаємо на роздачу...
                </div>
              )}
            </div>
          </div>

          {/* 2. ЦЕНТРАЛЬНА АНІМАЦІЯ ПІДСУМКУ ГРИ */}
          {game?.status === "finished" && (
            <div className="relative z-20 my-4 text-center animate-fade-in">
              {game.result === "blackjack" && (
                <div className="inline-block rounded-2xl border-2 border-amber-400 bg-amber-950/80 px-6 py-3 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                  <span className="text-xl sm:text-2xl font-black uppercase text-amber-300 block">
                    🏆 BLACKJACK! НАТУРАЛЬНІ 21!
                  </span>
                  <span className="text-xs font-bold text-amber-200">
                    Виплата: +{game.payout.toLocaleString()} монет!
                  </span>
                </div>
              )}

              {game.result === "win" && (
                <div className="inline-block rounded-2xl border-2 border-emerald-500 bg-emerald-950/80 px-6 py-3 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                  <span className="text-lg sm:text-xl font-black uppercase text-emerald-300 block">
                    🎉 ПЕРЕМОГА! ДИЛЕРА ОБІГРАНО!
                  </span>
                  <span className="text-xs font-bold text-emerald-200">
                    Виграш: +{game.payout.toLocaleString()} монет
                  </span>
                </div>
              )}

              {game.result === "lose" && (
                <div className="inline-block rounded-2xl border-2 border-rose-600 bg-rose-950/80 px-6 py-3 shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                  <span className="text-base sm:text-lg font-black uppercase text-rose-300 block">
                    💀 ДИЛЕР ЗАБРАВ БАНК
                  </span>
                  <span className="text-xs text-rose-200">
                    Спробуйте змінити тактику в наступній роздачі.
                  </span>
                </div>
              )}

              {game.result === "push" && (
                <div className="inline-block rounded-2xl border-2 border-cyan-500 bg-cyan-950/80 px-6 py-3 shadow-[0_0_20px_rgba(8,191,234,0.3)]">
                  <span className="text-base sm:text-lg font-black uppercase text-cyan-300 block">
                    ⚖️ НІЧИЯ (PUSH)
                  </span>
                  <span className="text-xs text-cyan-200">
                    Рівна кількість очок. Ставку повернено.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. ЗОНА ГРАВЦЯ */}
          <div className="relative z-10 flex flex-col items-center mt-6">
            <div className="flex justify-center gap-3 sm:gap-4 min-h-[120px] mb-3">
              {game ? (
                game.player_cards.map((card, idx) => (
                  <RenderNightCard key={`player-${idx}`} card={card} index={idx} />
                ))
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-700/60 p-6 text-xs text-slate-500">
                  Зробіть ставку, щоб отримати перші карти
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                Ваша рука
              </span>
              {game && (
                <span className="rounded-md border border-cyan-500/50 bg-cyan-950/80 px-2.5 py-0.5 font-mono text-sm font-black text-cyan-300 shadow-[0_0_10px_rgba(8,191,234,0.2)]">
                  {game.player_value} {game.player_value === 21 && "⚡ 21!"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================================
            ПАНЕЛЬ ДІЙ ТА СТАВОК (КОМПАКТНА ТА ЗРУЧНА)
            ==================================================================== */}
        <section className="matchday-card p-6">
          {isActiveGame ? (
            /* ВЕЛИКІ ЗРОЗУМІЛІ КНОПКИ ДІЙ ПІД ЧАС АКТИВНОЇ ГРИ */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">
                  Поточна ставка на столі:
                </span>
                <span className="rounded-lg bg-amber-950/60 border border-amber-500/40 px-3 py-1 font-mono text-sm font-black text-amber-300">
                  🪙 {game.bet.toLocaleString()} монет
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleAction("bj_hit")}
                  className="btn-cyan flex-1 sm:flex-initial py-3 px-6 text-sm font-black uppercase tracking-wider rounded-xl shadow-lg"
                >
                  ➕ Ще карту (Hit)
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleAction("bj_stand")}
                  className="btn-orange flex-1 sm:flex-initial py-3 px-6 text-sm font-black uppercase tracking-wider rounded-xl shadow-lg"
                >
                  ✋ Досить (Stand)
                </button>

                <button
                  type="button"
                  disabled={isBusy || !game.can_double || balance === null || balance < game.bet}
                  onClick={() => void handleAction("bj_double")}
                  className="btn-ghost flex-1 sm:flex-initial py-3 px-5 text-sm font-black uppercase tracking-wider rounded-xl disabled:opacity-40"
                  title="Подвоїти ставку та отримати рівно 1 карту"
                >
                  ⚡ x2 Double
                </button>
              </div>
            </div>
          ) : (
            /* ФОРМА ВИБОРУ СТАВКИ ТА СТАРТУ НОВОЇ РОЗДАЧІ */
            <form onSubmit={handleDeal} className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-secondary)] mr-2">
                  Швидкі фішки:
                </span>
                {[50, 100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBetInput(amt.toString())}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                      betInput === amt.toString()
                        ? "border-amber-400 bg-amber-950/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                        : "border-[var(--border)] bg-[#070b14] text-[var(--text-secondary)] hover:text-white"
                    }`}
                  >
                    🪙 {amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-36">
                  <label htmlFor="bet-amount" className="sr-only">
                    Ставка монет
                  </label>
                  <input
                    id="bet-amount"
                    type="number"
                    min="1"
                    max={currentLevelInfo.maxBet}
                    value={betInput}
                    onChange={(e) => setBetInput(e.target.value)}
                    className="matchday-input text-center font-mono text-sm font-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="btn-cyan py-3 px-8 text-sm font-black uppercase tracking-wider rounded-xl shadow-lg shrink-0"
                >
                  {isBusy ? "Роздача..." : "⚡ Роздати карти (Deal)"}
                </button>

                {game?.status === "finished" && (
                  <button
                    type="button"
                    onClick={startNewGame}
                    className="btn-ghost py-3 px-4 text-xs font-bold rounded-xl"
                  >
                    Очистити стіл
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* ТАБЛИЦЯ ЛІДЕРІВ БЛЕКДЖЕКУ */}
        {leaderboard.length > 0 && (
          <section className="matchday-card mt-8 p-6">
            <h3 className="text-sm font-black uppercase text-amber-300 tracking-wider mb-4 flex items-center gap-2">
              <span>🏆</span> Зала слави Блекджеку Matchday
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="pb-2">#</th>
                    <th className="pb-2">Гравець</th>
                    <th className="pb-2 text-center">Партій</th>
                    <th className="pb-2 text-center">Перемог</th>
                    <th className="pb-2 text-right">Чистий профіт</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/40">
                  {leaderboard.slice(0, 5).map((entry, idx) => (
                    <tr key={entry.username} className="hover:bg-slate-800/20">
                      <td className="py-2.5 font-bold text-slate-400">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </td>
                      <td className="py-2.5 font-bold text-white">{entry.username}</td>
                      <td className="py-2.5 text-center text-slate-300">{entry.games}</td>
                      <td className="py-2.5 text-center text-emerald-400 font-bold">{entry.wins}</td>
                      <td className="py-2.5 text-right font-black text-amber-300">
                        +{entry.net.toLocaleString()} 🪙
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
