"use client";
import { DemoNoticeBadge } from "../demo-banner";

import Link from "next/link";
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
  { level: 7, title: "VIP-Гість казино", minXp: 15000, maxXp: 30000, maxBet: 250000 },
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
  if (isError("invalid_bet")) return `Ставка від 1 до ${maxBetAllowed.toLocaleString()} монет.`;
  if (isError("no_active_game")) return "Активної партії немає.";
  if (isError("cannot_double")) return "Подвоїти можна лише на перших двох картах.";
  if (isError("not_authenticated")) return "Необхідно увійти до системи.";
  return "Помилка зв'язку з сервером. Спробуйте ще раз.";
}

function renderCard(card: number, key: string) {
  const suit = suits[Math.floor(card / 13)];
  const isRed = suit === "♥" || suit === "♦";
  return (
    <div
      key={key}
      className={`relative flex h-28 w-20 shrink-0 flex-col justify-between rounded-xl border-2 border-slate-700 bg-gradient-to-b from-white to-slate-200 p-2 shadow-2xl transition-all sm:h-32 sm:w-22 ${
        isRed ? "text-red-600" : "text-slate-900"
      }`}
    >
      <div className="flex justify-between items-start font-mono text-base font-extrabold leading-none">
        <span>{ranks[card % 13]}</span>
        <span className="text-sm">{suit}</span>
      </div>
      <div className="self-center text-3xl select-none">{suit}</div>
      <div className="flex justify-between items-end font-mono text-base font-extrabold leading-none rotate-180">
        <span>{ranks[card % 13]}</span>
        <span className="text-sm">{suit}</span>
      </div>
    </div>
  );
}

function renderHiddenCard(key: string) {
  return (
    <div
      key={key}
      className="relative flex h-28 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-red-700 bg-gradient-to-br from-red-800 to-red-950 p-2 shadow-2xl sm:h-32 sm:w-22"
    >
      <div className="h-full w-full rounded-lg border border-red-600/40 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px] flex items-center justify-center text-center">
        <span className="font-mono text-[10px] text-red-200 font-bold uppercase tracking-wider">SECRET</span>
      </div>
    </div>
  );
}

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
        <div className="h-8 w-3 bg-amber-400 rounded-b-sm shadow-md" />
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
  const [agentSpeech, setAgentSpeech] = useState(
    "Beat the dealer without busting 21. Place your bet and enjoy cold cola!"
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
      setAgentSpeech(
        nextLevel === 0
          ? "Допив до дна! Наливаю свіжу склянку з льодом, продовжуємо гру."
          : "Холодний ковток коли заспокоює нерви перед роздачею!"
      );
    } else {
      setColaLevel(100);
      setAgentSpeech("Свіжа склянка коли на столі. Зроби ставку!");
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
      setAgentSpeech(
        `LEVEL UP! Твій ранг: ${nextLevelInfo.title} (Рівень ${nextLevelInfo.level}). Ліміт ставки: ${nextLevelInfo.maxBet.toLocaleString()} монет!`
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
        console.error("Помилка завантаження:", error);
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
    setAgentSpeech("Cards on the table. Good luck!");

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
          setAgentSpeech("BLACKJACK! Amazing natural 21! Випий за перемогу!");
        } else if (nextGame.result === "win") {
          setAgentSpeech("You win! House pays out.");
        } else if (nextGame.result === "lose") {
          setAgentSpeech("Dealer wins this round. Спробуй ще!");
        } else {
          setAgentSpeech("Push. Bets returned.");
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
            setAgentSpeech("Game in progress. Finish your hand!");
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

    if (action === "bj_hit") setAgentSpeech("Hit! Dealing another card...");
    if (action === "bj_double") setAgentSpeech("Double Down! Doubling the bet!");

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
          setAgentSpeech("Blackjack! Flawless victory.");
        } else if (nextGame.result === "win") {
          setAgentSpeech("You beat the dealer!");
        } else if (nextGame.result === "lose") {
          setAgentSpeech("Bust / Dealer takes the pot.");
        } else {
          setAgentSpeech("Push. Hand tied.");
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
    setAgentSpeech("Ready for the next hand. Place your bet!");
  }

  const isActiveGame = game?.status === "active";

  return (
    <main className="min-h-screen flex-1 bg-[#07090c] px-3 py-6 font-mono text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <DemoNoticeBadge />
        {/* Top Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <Link
            href="/leagues"
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
          >
            ← Меню ліг
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/online"
              className="rounded-lg border border-indigo-600/60 bg-indigo-950/40 px-3 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-900/60 transition"
            >
              🌐 Онлайн Дуелі
            </Link>
            <Link
              href="/dice"
              className="rounded-lg border border-red-600/60 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-900/40 transition"
            >
              🎲 Кості
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

        {/* 3D CASINO TABLE CONTAINER */}
        <div className="relative overflow-hidden rounded-3xl border-4 border-amber-900/60 bg-gradient-to-b from-[#141822] via-[#0d1017] to-[#08090d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] sm:p-8">
          
          {/* Верхня панель: Квест LUCKY STREAK + Кола + Інфо рівня */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            {/* Квест: LUCKY STREAK */}
            <div className="rounded-2xl border-2 border-slate-700 bg-black/60 p-3 shadow-lg min-w-52">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CHALLENGE</span>
                <span className="text-xs font-extrabold text-amber-400">+{winStreak * 2} 🪙</span>
              </div>
              <div className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
                <span>🔥 LUCKY STREAK</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-xs text-amber-300">{winStreak}/3</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">3 перемоги поспіль = кейс!</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (winStreak / 3) * 100)}%` }}
                />
              </div>
            </div>

            {/* Інтерактивна склянка коли поруч зі столом */}
            <InteractiveColaGlass level={colaLevel} onDrink={handleDrinkCola} />

            {/* Рівень гравця та XP */}
            <div className="rounded-2xl border border-slate-800 bg-black/40 p-3 text-right">
              <div className="text-xs font-bold text-emerald-400">
                РІВЕНЬ {currentLevelInfo.level} · {currentLevelInfo.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {xp.toLocaleString()} / {currentLevelInfo.maxXp.toLocaleString()} XP
              </div>
              <div className="text-xs font-bold text-amber-400 mt-1">
                Макс. ставка: {currentLevelInfo.maxBet.toLocaleString()} монет
              </div>
            </div>
          </div>

          {/* ПОЛЕ СТОЛУ З ДИЛЕРОМ ПО ЦЕНТРУ */}
          <div className="relative mx-auto max-w-3xl rounded-[3rem] border-4 border-amber-800/80 bg-gradient-to-b from-[#1b3d2b] via-[#142e20] to-[#0e2017] p-6 shadow-2xl sm:p-10 text-center">
            
            {/* Дилер по центру столу */}
            <div className="mb-4 flex flex-col items-center">
              <CasinoDealer3D />
              <div className="mt-3 rounded-full border border-emerald-600/40 bg-black/60 px-5 py-1.5 text-xs text-emerald-300 font-serif italic shadow-md">
                &quot;{agentSpeech}&quot;
              </div>
            </div>

            {/* Золотий напис на напівкруглому сукні */}
            <div className="mb-8 inline-block rounded-xl border border-amber-500/30 bg-black/30 px-6 py-1.5">
              <span className="font-serif text-xs font-bold tracking-widest text-amber-300/80 uppercase sm:text-sm">
                Beat the dealer without busting 21
              </span>
            </div>

            {/* КАРТИ ДИЛЕРА */}
            <div className="mb-8">
              <div className="mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                КАРТИ ДИЛЕРА {game && !game.dealer_hidden && `(ОЧКИ: ${game.dealer_value})`}
              </div>
              <div className="flex min-h-32 flex-wrap items-center justify-center gap-3">
                {game ? (
                  game.dealer_cards.map((card, index) =>
                    game.dealer_hidden && index === game.dealer_cards.length - 1
                      ? renderHiddenCard(`hidden-${index}`)
                      : renderCard(card, `dealer-${index}`)
                  )
                ) : (
                  <div className="flex h-28 w-20 items-center justify-center rounded-xl border-2 border-dashed border-emerald-800/70 text-xs text-emerald-700">
                    EMPTY
                  </div>
                )}
              </div>
            </div>

            {/* КАРТИ ГРАВЦЯ */}
            <div className="mb-6">
              <div className="mb-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                ТВОЇ КАРТИ {game && `(ОЧКИ: ${game.player_value})`}
              </div>
              <div className="flex min-h-32 flex-wrap items-center justify-center gap-3">
                {game ? (
                  game.player_cards.map((card, index) => renderCard(card, `player-${index}`))
                ) : (
                  <div className="flex h-28 w-20 items-center justify-center rounded-xl border-2 border-dashed border-emerald-800/70 text-xs text-emerald-700">
                    EMPTY
                  </div>
                )}
              </div>
            </div>

            {/* Результат раунду */}
            {game?.status === "finished" && (
              <div className="animate-in zoom-in-95 my-4 rounded-2xl border-2 border-yellow-500 bg-black/80 p-4 text-center">
                <div className="text-xl font-black text-amber-300 uppercase">
                  {game.result === "blackjack" && "🔥 BLACKJACK! ПОДВІЙНИЙ ВИГРАШ 🔥"}
                  {game.result === "win" && `🎉 ВИГРАШ: +${(game.payout - game.bet).toLocaleString()} МОНЕТ`}
                  {game.result === "push" && "🤝 НІЧИЯ · СТАВКУ ПОВЕРНЕНО"}
                  {game.result === "lose" && "💀 ДИЛЕР ПЕРЕМІГ"}
                </div>
              </div>
            )}
          </div>

          {/* НИЖНЯ ПАНЕЛЬ: ВЕЛИЧЕЗНІ КНОПКИ ДІЙ */}
          <div className="mt-8">
            {isActiveGame ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void handleAction("bj_hit")}
                  disabled={isBusy}
                  className="h-20 rounded-2xl bg-gradient-to-b from-red-500 to-red-700 border-b-8 border-red-900 font-sans text-2xl font-black uppercase tracking-wider text-white shadow-[0_10px_25px_rgba(239,68,68,0.5)] active:translate-y-1 active:border-b-4 transition disabled:opacity-50"
                >
                  HIT
                </button>

                <button
                  type="button"
                  onClick={() => void handleAction("bj_stand")}
                  disabled={isBusy}
                  className="h-20 rounded-2xl bg-gradient-to-b from-amber-400 to-yellow-600 border-b-8 border-yellow-800 font-sans text-2xl font-black uppercase tracking-wider text-slate-950 shadow-[0_10px_25px_rgba(234,179,8,0.5)] active:translate-y-1 active:border-b-4 transition disabled:opacity-50"
                >
                  STAND
                </button>

                {game?.can_double && (
                  <button
                    type="button"
                    onClick={() => void handleAction("bj_double")}
                    disabled={isBusy}
                    className="col-span-2 sm:col-span-1 h-20 rounded-2xl bg-gradient-to-b from-orange-500 to-amber-700 border-b-8 border-amber-950 font-sans text-xl font-black uppercase tracking-wider text-white shadow-[0_10px_25px_rgba(249,115,22,0.5)] active:translate-y-1 active:border-b-4 transition disabled:opacity-50"
                  >
                    DOUBLE
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleDeal} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="bet-input" className="text-xs font-bold text-slate-300">
                      СТАВКА НА СТІЛ (1 – {currentLevelInfo.maxBet.toLocaleString()}):
                    </label>
                    <span className="text-[11px] font-bold text-amber-400">
                      Макс: {currentLevelInfo.maxBet.toLocaleString()} монет
                    </span>
                  </div>
                  <input
                    id="bet-input"
                    type="number"
                    min="1"
                    max={currentLevelInfo.maxBet}
                    value={betInput}
                    onChange={(e) => setBetInput(e.target.value)}
                    disabled={isBusy}
                    required
                    className="h-16 w-full rounded-2xl border-2 border-slate-700 bg-slate-900 px-4 font-mono text-xl font-bold text-white outline-none focus:border-emerald-500 transition shadow-inner"
                  />
                </div>

                {game?.status === "finished" ? (
                  <button
                    type="button"
                    onClick={startNewGame}
                    disabled={isBusy}
                    className="h-16 shrink-0 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 border-b-8 border-emerald-900 px-8 font-sans text-xl font-black uppercase tracking-wider text-white shadow-[0_10px_25px_rgba(16,185,129,0.5)] active:translate-y-1 active:border-b-4 transition disabled:opacity-50"
                  >
                    PLAY AGAIN
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isBusy || balance === null}
                    className="h-16 shrink-0 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 border-b-8 border-emerald-900 px-10 font-sans text-2xl font-black uppercase tracking-wider text-white shadow-[0_10px_30px_rgba(16,185,129,0.6)] active:translate-y-1 active:border-b-4 transition disabled:opacity-50"
                  >
                    {isBusy ? "DEALING..." : "PLAY"}
                  </button>
                )}
              </form>
            )}

            {errorMessage && (
              <p role="alert" className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-center text-xs text-red-300 font-bold">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* ТАБЛИЦЯ ЛІДЕРІВ / РЕЙТИНГ КЛУБУ (ПОВЕРНУТО) */}
        <section className="mt-8 rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-[#0f1217] to-black p-6 shadow-xl">
          <h2 className="mb-4 text-xs font-bold font-mono tracking-wider uppercase text-amber-400 flex items-center gap-2">
            <span>🏆</span> РЕЙТИНГ ГРАВЦІВ ПІДПІЛЬНОГО КЛУБУ
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500">Поки що немає зіграних партій.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-500">
                  <tr>
                    <th className="py-2.5">Гравець</th>
                    <th className="py-2.5">Партії</th>
                    <th className="py-2.5">Перемоги</th>
                    <th className="py-2.5">Баланс / Профіт</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {leaderboard.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 font-bold text-slate-200">
                        {idx === 0 ? "👑 " : "🕶️ "}{entry.username}
                      </td>
                      <td className="py-3 text-slate-400">{entry.games}</td>
                      <td className="py-3 text-slate-400">{entry.wins}</td>
                      <td className={`py-3 font-bold ${entry.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {entry.net >= 0 ? `+${entry.net.toLocaleString()}` : entry.net.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
