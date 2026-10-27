"use client";

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

function getUserErrorMessage(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const isError = (name: string) => code === name || message.includes(name);

  if (code === "23505" || isError("game_in_progress")) {
    return "⚡ У тебе вже відкрита партія на столі.";
  }
  if (isError("insufficient_funds")) return "💸 Агенте, у тебе закінчилися монети на колу!";
  if (isError("invalid_bet")) return "⚠ Ставка від 1 до 500 монет";
  if (isError("no_active_game")) return "🃏 Активної гри немає";
  if (isError("cannot_double")) {
    return "✋ Подвоїти можна лише на перших двох картах";
  }
  if (isError("not_authenticated")) return "🔒 Спочатку покажи перепустку (увійди в акаунт)";
  return "❌ Збій зв'язку з підпільним баром. Спробуй ще раз";
}

function renderCard(card: number, key: string) {
  const suit = suits[Math.floor(card / 13)];
  const isRed = suit === "♥" || suit === "♦";
  return (
    <span
      key={key}
      className={`flex h-[7rem] w-[5rem] shrink-0 flex-col items-center justify-center rounded-lg border-2 text-2xl font-bold shadow-lg transition-transform hover:scale-105 sm:h-[8rem] sm:w-[5.5rem] ${
        isRed
          ? "border-red-500/60 bg-gradient-to-br from-gray-900 to-gray-800 text-red-400"
          : "border-cyan-500/60 bg-gradient-to-br from-gray-900 to-gray-800 text-cyan-300"
      }`}
      aria-label={`${ranks[card % 13]} ${suit}`}
    >
      <span className="text-xl font-mono">{ranks[card % 13]}</span>
      <span className="text-2xl">{suit}</span>
    </span>
  );
}

function renderHiddenCard(key: string) {
  return (
    <span
      key={key}
      className="flex h-[7rem] w-[5rem] shrink-0 flex-col items-center justify-center rounded-lg border-2 border-yellow-500/40 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-yellow-400 shadow-lg sm:h-[8rem] sm:w-[5.5rem]"
      aria-label="Секретна карта агента"
    >
      <span className="text-2xl">🕶️</span>
      <span className="text-xs font-mono text-yellow-500/80">TOP SECRET</span>
    </span>
  );
}

const AGENT_QUOTES = {
  idle: [
    "«Сідай за стіл. Холодна кола з льодом уже налита. Роби ставку, агенте.»",
    "«Справжні справи вирішуються в темряві бару за склянкою коли. Твій хід.»",
    "«Усі карти чисті, як моє досьє. На скільки граємо сьогодні?»",
  ],
  deal: [
    "«Роздаю карти. Відпий ковтнути коли і тримай покерфейс...»",
    "«Погнали. Летимо тихо, ставимо солідно. Що скажеш?»",
  ],
  hit: [
    "«Ще одна карта? Люблю азартних агентів. Тільки не розлий колу.»",
    "«Приймається. Карта лягає на стіл...»",
  ],
  double: [
    "«Подвоєння?! Оце по-нашому. Ставка подвоєна, агент ризикує по-крупному!»",
  ],
  win: [
    "«Чиста робота! Твоя інтуїція сьогодні на висоті. Чокаємося колою! 🥤»",
    "«Ти переграв агентство. Забирай свій банк і випий за перемогу!»",
  ],
  blackjack: [
    "«БЛЕКДЖЕК! Неперевершений хід. Навіть мої окуляри спітніли від такого фіналу! 🔥»",
  ],
  lose: [
    "«Цього разу агентство перемогло. Допивай колу, віддихайся і відігравайся!»",
    "«Удача вислизнула, як секретний агент. Наливаю ще одну склянку коли?»",
  ],
  push: [
    "«Нічия. Залишились при своїх, як два агенти після переговорів. Мир і кола.»",
  ],
};

function getRandomQuote(category: keyof typeof AGENT_QUOTES): string {
  const list = AGENT_QUOTES[category];
  return list[Math.floor(Math.random() * list.length)];
}

const ASCII_HEADER = `
 ██████╗ ██╗      █████╗  ██████╗██╗  ██╗     ██╗ █████╗  ██████╗██╗  ██╗
 ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝     ██║██╔══██╗██╔════╝██║ ██╔╝
 ██████╔╝██║     ███████║██║     █████╔╝      ██║███████║██║     █████╔╝ 
 ██╔══██╗██║     ██╔══██║██║     ██╔═██╗ ██   ██║██╔══██║██║     ██╔═██╗ 
 ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗╚█████╔╝██║  ██║╚██████╗██║  ██╗
 ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`.trim();

export default function BlackjackPage() {
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isBusy, setIsBusy] = useState(false);
  const [betInput, setBetInput] = useState("10");
  const [agentSpeech, setAgentSpeech] = useState(
    "«Сідай за стіл. Холодна кола з льодом уже налита. Роби ставку, агенте.»"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : "Спочатку налаштуйте підключення до Supabase.",
  );
  const [leaderboardError, setLeaderboardError] = useState<string | null>(
    isSupabaseConfigured ? null : "Таблиця лідерів тимчасово недоступна.",
  );

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    const supabase = client;

    let active = true;

    async function loadGame() {
      try {
        const { data, error } = await supabase.rpc("bj_state");
        if (error) throw error;
        const parsedGame = parseGame(data);
        if (active && parsedGame) {
          setGame(parsedGame);
          if (parsedGame.status === "active") {
            setAgentSpeech("«Твоя партія чекає на столі. Роби свій хід, кола холоне!»");
          }
        }
      } catch (error) {
        console.error("Не вдалося завантажити стан блекджеку:", error);
        if (active) setErrorMessage(getUserErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    async function loadLeaderboard() {
      try {
        const { data, error } = await supabase.rpc("bj_leaderboard");
        if (error) throw error;
        const rows = parseLeaderboard(data);
        if (active) setLeaderboard(rows);
      } catch (error) {
        console.error("Не вдалося завантажити таблицю блекджеку:", error);
        if (active) setLeaderboardError("Не вдалося завантажити таблицю друзів.");
      }
    }

    async function loadBalance() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
          if (active) setBalance(null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (error) throw error;
        if (active) {
          setBalance(
            data && typeof data.coins === "number" ? data.coins : null,
          );
        }
      } catch (error) {
        console.error("Не вдалося завантажити баланс для ставки:", error);
        if (active) {
          setBalance(null);
          setErrorMessage("Не вдалося перевірити баланс. Спробуйте ще раз.");
        }
      }
    }

    void loadGame();
    void loadLeaderboard();
    void loadBalance();

    return () => {
      active = false;
    };
  }, []);

  async function refreshBalance() {
    const client = getSupabaseClient();
    if (!client) return;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) {
      setBalance(null);
      return;
    }
    const { data, error } = await client
      .from("profiles")
      .select("coins")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (error) throw error;
    setBalance(data && typeof data.coins === "number" ? data.coins : null);
  }

  async function refreshLeaderboard() {
    const client = getSupabaseClient();
    if (!client) return;
    const { data, error } = await client.rpc("bj_leaderboard");
    if (error) throw error;
    setLeaderboard(parseLeaderboard(data));
    setLeaderboardError(null);
  }

  async function handleDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bet = Number(betInput);
    if (!Number.isInteger(bet) || bet < 1 || bet > 500) {
      setErrorMessage("⚠ Ставка від 1 до 500 монет");
      return;
    }
    if (balance === null || bet > balance) {
      setErrorMessage("💸 Недостатньо монет на ставку");
      return;
    }

    const client = getSupabaseClient();
    if (!client || isBusy) return;
    setIsBusy(true);
    setErrorMessage(null);
    setAgentSpeech(getRandomQuote("deal"));

    try {
      const { data, error } = await client.rpc("bj_start", { p_bet: bet });
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error("bj_start повернув неочікувану відповідь.");
      setGame(nextGame);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

      if (nextGame.status === "finished") {
        if (nextGame.result === "blackjack") {
          setAgentSpeech(getRandomQuote("blackjack"));
        } else if (nextGame.result === "win") {
          setAgentSpeech(getRandomQuote("win"));
        } else if (nextGame.result === "lose") {
          setAgentSpeech(getRandomQuote("lose"));
        } else {
          setAgentSpeech(getRandomQuote("push"));
        }
        void refreshLeaderboard();
      }
      void refreshBalance();
    } catch (error) {
      console.error("Не вдалося роздати карти:", error);
      const msg = getErrorMessage(error);
      if (msg.includes("game_in_progress") || getErrorCode(error) === "23505") {
        try {
          const { data, error: stateError } = await client.rpc("bj_state");
          if (stateError) throw stateError;
          const existingGame = parseGame(data);
          if (existingGame) {
            setGame(existingGame);
            setAgentSpeech("«Твоя партія вже активна. Карти на столі, допивай колу та грай!»");
            setErrorMessage(null);
          } else {
            setErrorMessage(getUserErrorMessage(error));
          }
        } catch (stateErr) {
          console.error("Failed to load active game:", stateErr);
          setErrorMessage(getUserErrorMessage(error));
        }
      } else {
        setErrorMessage(getUserErrorMessage(error));
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

    if (action === "bj_hit") setAgentSpeech(getRandomQuote("hit"));
    if (action === "bj_double") setAgentSpeech(getRandomQuote("double"));

    try {
      const { data, error } = await client.rpc(action);
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error(`${action} повернув неочікувану відповідь.`);
      setGame(nextGame);

      if (nextGame.status === "finished") {
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        if (nextGame.result === "blackjack") {
          setAgentSpeech(getRandomQuote("blackjack"));
        } else if (nextGame.result === "win") {
          setAgentSpeech(getRandomQuote("win"));
        } else if (nextGame.result === "lose") {
          setAgentSpeech(getRandomQuote("lose"));
        } else {
          setAgentSpeech(getRandomQuote("push"));
        }
        void refreshLeaderboard();
        void refreshBalance();
      }
    } catch (error) {
      console.error(`Не вдалося виконати ${action}:`, error);
      setErrorMessage(getUserErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  function startNewGame() {
    setGame(null);
    setErrorMessage(null);
    setAgentSpeech(getRandomQuote("idle"));
  }

  const isActiveGame = game?.status === "active";

  return (
    <main className="min-h-screen flex-1 bg-[#0a0a0a] px-4 py-8 font-mono text-gray-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Navigation & Bar Atmosphere Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-4">
          <Link
            href="/leagues"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
          >
            ← До ліг
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/20 px-3 py-1 text-xs text-red-300">
            <span className="inline-block animate-pulse text-base">🥤</span>
            <span>UNDERGROUND COLA BAR · 24/7</span>
          </div>
        </div>

        {/* ASCII Header */}
        <header className="mb-6 text-center">
          <pre className="mx-auto hidden overflow-x-auto text-[0.45rem] font-bold leading-tight text-cyan-400 sm:block sm:text-[0.55rem] md:text-xs" aria-hidden="true">
            {ASCII_HEADER}
          </pre>
          <h1 className="text-4xl font-bold text-cyan-400 sm:hidden">
            BLACKJACK
          </h1>
          <p className="mt-2 text-sm text-yellow-400">
            🕶️ АГЕНТ "SHADOW" & ПІДПІЛЬНИЙ БАР 🥤
          </p>
        </header>

        {/* AGENT & DIALOGUE BOX */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-cyan-800/40 bg-gradient-to-r from-[#0d1713] via-[#09120e] to-[#120f17] p-4 shadow-[0_0_25px_rgba(0,255,200,0.04)] sm:flex-row sm:items-center">
          {/* Agent Avatar */}
          <div className="flex shrink-0 items-center gap-3 sm:border-r sm:border-cyan-900/40 sm:pr-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border-2 border-cyan-400 bg-gray-900 shadow-[0_0_15px_rgba(34,211,238,0.25)] text-3xl">
              🕶️
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-bold" title="Склянка коли з льодом">
                🥤
              </span>
            </div>
            <div>
              <p className="font-bold text-cyan-300">Агент "Shadow"</p>
              <p className="text-[11px] text-gray-500">Дилер у смокінгу</p>
              <p className="text-[10px] text-red-400 font-bold">*посьорбує колу*</p>
            </div>
          </div>

          {/* Speech Bubble */}
          <div className="flex-1 rounded-lg border border-cyan-900/30 bg-black/40 p-3">
            <p className="text-xs text-yellow-300 sm:text-sm font-medium italic">
              {agentSpeech}
            </p>
          </div>
        </div>

        {/* Main Game Table */}
        <section
          aria-label="Гра в блекджек"
          className="rounded-xl border border-cyan-900/50 bg-gradient-to-b from-[#0f1a15] to-[#0a120e] p-5 shadow-[0_0_30px_rgba(0,255,200,0.05)] sm:p-8"
        >
          {/* Bar Top Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍸</span>
              <h2 className="text-base font-bold text-cyan-300">
                Барна стійка дилера
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Твоя кола: <span className="text-red-400 font-bold">100% 🥤</span></span>
              <p className="font-mono text-sm font-bold text-yellow-400" aria-live="polite">
                💰 {balance === null ? "—" : `${balance.toLocaleString()} монет`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p role="status" className="py-12 text-center text-gray-500">
              <span className="animate-pulse">▌</span> Агент розкладає фішки та наливає колу…
            </p>
          ) : (
            <>
              {game && (
                <div className="mb-6 space-y-6">
                  {/* Dealer Section */}
                  <section aria-label="Карти дилера">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="flex items-center gap-1.5 font-bold text-red-400">
                        <span>🕶️ Агент-дилер</span>
                        <span className="text-xs text-gray-500">[Банк агентства]</span>
                      </h3>
                      <p className="font-mono text-sm text-gray-400">
                        {game.dealer_hidden ? "Очки: ?" : `Очки: ${game.dealer_value}`}
                      </p>
                    </div>
                    <div className="flex min-h-28 flex-wrap gap-3">
                      {game.dealer_cards.map((card, index) =>
                        game.dealer_hidden && index === game.dealer_cards.length - 1
                          ? renderHiddenCard(`hidden-${index}`)
                          : renderCard(card, `dealer-${index}`),
                      )}
                    </div>
                  </section>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-800/50 to-transparent" />
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      🥤 <span>ЧОКАЄМОСЯ КОЛОЮ</span> 🥤
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-800/50 to-transparent" />
                  </div>

                  {/* Player Section */}
                  <section aria-label="Карти гравця">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="flex items-center gap-1.5 font-bold text-cyan-300">
                        <span>🎮 Твої карти</span>
                        <span className="text-xs text-gray-500">[Гравець під прикриттям]</span>
                      </h3>
                      <p className="font-mono text-sm text-gray-400">
                        Очки: {game.player_value}
                      </p>
                    </div>
                    <div className="flex min-h-28 flex-wrap gap-3">
                      {game.player_cards.map((card, index) =>
                        renderCard(card, `player-${index}`),
                      )}
                    </div>
                  </section>

                  {/* Result Box */}
                  {game.status === "finished" && (
                    <div
                      role="status"
                      className={`rounded-lg border px-4 py-3 text-center font-bold ${
                        game.result === "lose"
                          ? "border-red-800/50 bg-red-950/30 text-red-400"
                          : game.result === "push"
                            ? "border-yellow-800/50 bg-yellow-950/30 text-yellow-400"
                            : "border-cyan-800/50 bg-cyan-950/30 text-cyan-300"
                      }`}
                    >
                      {game.result === "blackjack" && "🔥 БЛЕКДЖЕК! Агент визнає поразку! 🔥"}
                      {game.result === "win" && `✅ Перемога! Виграш +${game.payout - game.bet} монет`}
                      {game.result === "push" && "🤝 Нічия! Ставку повернуто до кишені"}
                      {game.result === "lose" && "💀 Програш! Агент забрав фішки на нову партію коли"}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {isActiveGame ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleAction("bj_hit")}
                    disabled={isBusy}
                    className="h-11 rounded-lg bg-cyan-600 px-6 text-sm font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy ? "⏳" : "🃏 Ще карту"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAction("bj_stand")}
                    disabled={isBusy}
                    className="h-11 rounded-lg border border-gray-600 px-6 text-sm font-bold text-gray-300 transition hover:border-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ✋ Досить (Стоп)
                  </button>
                  {game?.can_double && (
                    <button
                      type="button"
                      onClick={() => void handleAction("bj_double")}
                      disabled={isBusy}
                      className="h-11 rounded-lg bg-yellow-600 px-6 text-sm font-bold text-black shadow-lg shadow-yellow-600/20 transition hover:bg-yellow-500 hover:shadow-yellow-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ⚡ Подвоїти ставку
                    </button>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={(event) => void handleDeal(event)}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="flex-1">
                    <label
                      htmlFor="blackjack-bet"
                      className="mb-1.5 block text-sm font-medium text-gray-400"
                    >
                      Ставка агенту на стіл (1–500 монет)
                    </label>
                    <input
                      id="blackjack-bet"
                      name="bet"
                      type="number"
                      min="1"
                      max="500"
                      step="1"
                      required
                      value={betInput}
                      onChange={(event) => setBetInput(event.target.value)}
                      disabled={isBusy}
                      className="h-11 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 font-mono text-sm text-cyan-300 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                    />
                  </div>
                  {game?.status === "finished" ? (
                    <button
                      type="button"
                      onClick={startNewGame}
                      disabled={isBusy}
                      className="h-11 shrink-0 rounded-lg bg-cyan-600 px-6 text-sm font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      🔄 Ще по склянці коли (Нова гра)
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isBusy || balance === null}
                      className="h-11 shrink-0 rounded-lg bg-gradient-to-r from-red-600 via-amber-600 to-yellow-600 px-6 text-sm font-bold text-white shadow-lg shadow-amber-600/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy ? "⏳ Роздаємо…" : "🥤 Роздати & Пити колу"}
                    </button>
                  )}
                </form>
              )}
            </>
          )}

          {/* Error Message */}
          {errorMessage && (
            <p role="alert" className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 font-mono text-sm text-red-400">
              {errorMessage}
            </p>
          )}
        </section>

        {/* Leaderboard */}
        <section
          aria-labelledby="blackjack-leaderboard-heading"
          className="mt-8 rounded-xl border border-cyan-900/30 bg-gradient-to-b from-[#0f1a15] to-[#0a120e] p-5 shadow-[0_0_20px_rgba(0,255,200,0.03)] sm:p-6"
        >
          <h2 id="blackjack-leaderboard-heading" className="mb-4 text-lg font-bold text-cyan-300">
            🏆 Топ агентів підпільного клубу
          </h2>
          {leaderboardError ? (
            <p role="alert" className="text-sm text-red-400">
              {leaderboardError}
            </p>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500">Поки що немає зіграних партій.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-cyan-900/40 text-gray-500">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Агент</th>
                    <th scope="col" className="px-3 py-2 font-medium">Партії</th>
                    <th scope="col" className="px-3 py-2 font-medium">Перемоги</th>
                    <th scope="col" className="px-3 py-2 font-medium">Профіт</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={`${entry.username}-${index}`}
                      className="border-b border-gray-800/50 last:border-0 transition hover:bg-cyan-950/20"
                    >
                      <th scope="row" className="px-3 py-3 font-bold text-cyan-300">
                        {index === 0 ? "👑 " : "🕶️ "}{entry.username}
                      </th>
                      <td className="px-3 py-3 text-gray-400">{entry.games}</td>
                      <td className="px-3 py-3 text-gray-400">{entry.wins}</td>
                      <td
                        className={`px-3 py-3 font-bold font-mono ${
                          entry.net > 0
                            ? "text-cyan-400"
                            : entry.net < 0
                              ? "text-red-400"
                              : "text-gray-500"
                        }`}
                      >
                        {entry.net > 0 ? "+" : ""}
                        {entry.net}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          Underground Cola Club · Монети віртуальні · 2026
        </p>
      </div>
    </main>
  );
}
