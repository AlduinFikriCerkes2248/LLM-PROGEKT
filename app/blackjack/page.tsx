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
    return "Партія вже активна. Карти на столі.";
  }
  if (isError("insufficient_funds")) return "Недостатньо монет для ставки.";
  if (isError("invalid_bet")) return "Ставка від 1 до 500 монет.";
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
      className={`relative flex h-32 w-24 shrink-0 flex-col justify-between rounded-lg border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-2 shadow-2xl transition-all sm:h-36 sm:w-26 ${
        isRed ? "text-rose-500" : "text-slate-100"
      }`}
    >
      <div className="flex justify-between items-start font-mono text-base font-bold leading-none">
        <span>{ranks[card % 13]}</span>
        <span className="text-sm">{suit}</span>
      </div>
      <div className="self-center text-4xl select-none opacity-90">{suit}</div>
      <div className="flex justify-between items-end font-mono text-base font-bold leading-none rotate-180">
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
      className="relative flex h-32 w-24 shrink-0 items-center justify-center rounded-lg border-2 border-amber-600/40 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-2 shadow-2xl sm:h-36 sm:w-26"
    >
      <div className="h-full w-full rounded border border-neutral-800 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:8px_8px] flex items-center justify-center">
        <span className="font-mono text-xs tracking-widest text-amber-500/70 font-bold uppercase">SECRET</span>
      </div>
    </div>
  );
}

// SVG Аватар людини-агента у строгому костюмі та темних окулярах
function AgentAvatar() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20 shrink-0 drop-shadow-md">
      {/* Тіло / Костюм */}
      <path d="M20 120 C20 88 35 75 60 75 C85 75 100 88 100 120 Z" fill="#111827" />
      {/* Біла сорочка */}
      <polygon points="50,75 70,75 64,105 56,105" fill="#f8fafc" />
      {/* Чорна краватка */}
      <polygon points="58,78 62,78 64,108 60,114 56,108" fill="#0f172a" stroke="#000" strokeWidth="1" />
      {/* Шия */}
      <rect x="52" y="60" width="16" height="18" fill="#d4a373" />
      {/* Обличчя */}
      <ellipse cx="60" cy="48" rx="22" ry="26" fill="#e0a96d" />
      {/* Зачіска (гладке коротке чорне волосся) */}
      <path d="M38 45 C38 24 50 20 60 20 C70 20 82 24 82 45 C82 30 76 25 60 25 C44 25 38 32 38 45 Z" fill="#0f172a" />
      {/* Темні сонцезахисні окуляри агента */}
      <rect x="42" y="42" width="16" height="10" rx="2" fill="#09090b" stroke="#27272a" strokeWidth="1.5" />
      <rect x="62" y="42" width="16" height="10" rx="2" fill="#09090b" stroke="#27272a" strokeWidth="1.5" />
      <line x1="58" y1="46" x2="62" y2="46" stroke="#27272a" strokeWidth="2" />
      {/* Відблиск на склі окулярів */}
      <line x1="45" y1="44" x2="52" y2="49" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="65" y1="44" x2="72" y2="49" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Ніс і суворі губи */}
      <path d="M59 56 L61 56" stroke="#b07d4b" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 64 L66 64" stroke="#8c582f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Інтерактивна склянка коли
function ColaGlass({
  level,
  onDrink,
}: {
  level: number;
  onDrink: () => void;
}) {
  return (
    <div
      onClick={onDrink}
      className="group relative flex cursor-pointer flex-col items-center justify-end rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 shadow-inner transition hover:border-amber-600/50 hover:bg-neutral-900"
      title="Натисніть, щоб зробити ковток коли!"
    >
      <div className="relative h-28 w-16 overflow-hidden rounded-b-xl border-x-2 border-b-4 border-slate-400/40 bg-slate-900/40 backdrop-blur-sm">
        {/* Соломинка */}
        <div className="absolute -top-3 left-7 h-16 w-2 rotate-12 bg-rose-600 border border-rose-700 shadow-sm" />
        
        {/* Кубики льоду */}
        {level > 10 && (
          <div className="absolute top-8 left-3 h-5 w-5 rotate-12 rounded border border-white/30 bg-white/20 backdrop-blur-sm z-10" />
        )}
        {level > 35 && (
          <div className="absolute top-14 right-2 h-5 w-5 -rotate-12 rounded border border-white/30 bg-white/20 backdrop-blur-sm z-10" />
        )}

        {/* Сама рідина коли */}
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-[#1a0804] via-[#2d0e07] to-[#42170d] transition-all duration-500 ease-out flex items-start justify-center"
          style={{ height: `${level}%` }}
        >
          {/* Піна / бульбашки зверху */}
          {level > 0 && (
            <div className="h-1.5 w-full bg-amber-700/60 animate-pulse border-t border-amber-500/40" />
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className="font-mono text-xs font-bold text-slate-300 group-hover:text-amber-400 transition-colors">
          {level > 0 ? `${level}% коли` : "Порожньо (клікни)"}
        </span>
        <p className="text-[10px] text-slate-500">ковток</p>
      </div>
    </div>
  );
}

export default function BlackjackPage() {
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isBusy, setIsBusy] = useState(false);
  const [betInput, setBetInput] = useState("20");
  const [colaLevel, setColaLevel] = useState(100);
  const [agentSpeech, setAgentSpeech] = useState(
    "Вітаю. Сідай за стіл. Склянка холодної коли поруч. Зроби ставку, коли будеш готовий."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSupabaseConfigured ? null : "Спочатку налаштуйте підключення до Supabase."
  );
  const [leaderboardError, setLeaderboardError] = useState<string | null>(
    isSupabaseConfigured ? null : "Таблиця лідерів тимчасово недоступна."
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
            setAgentSpeech("Твоя партія ще не завершена. Карти чекають.");
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
        if (active) setLeaderboardError("Не вдалося завантажити таблицю.");
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
          setBalance(data && typeof data.coins === "number" ? data.coins : null);
        }
      } catch (error) {
        console.error("Не вдалося завантажити баланс:", error);
        if (active) setBalance(null);
      }
    }

    void loadGame();
    void loadLeaderboard();
    void loadBalance();

    return () => {
      active = false;
    };
  }, []);

  function handleDrinkCola() {
    if (colaLevel > 0) {
      const nextLevel = Math.max(0, colaLevel - 25);
      setColaLevel(nextLevel);
      if (nextLevel === 0) {
        setAgentSpeech("Допив до дна. Зараз наллю ще склянку, зосередься на грі.");
      } else {
        setAgentSpeech("Гарний ковток. Холодний лід заспокоює нерви перед ставкою.");
      }
    } else {
      setColaLevel(100);
      setAgentSpeech("Ось нова свіжа склянка коли з льодом. Продовжуємо.");
    }
  }

  async function refreshBalance() {
    const client = getSupabaseClient();
    if (!client) return;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return;
    const { data } = await client
      .from("profiles")
      .select("coins")
      .eq("id", authData.user.id)
      .maybeSingle();
    setBalance(data && typeof data.coins === "number" ? data.coins : null);
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
    if (!Number.isInteger(bet) || bet < 1 || bet > 500) {
      setErrorMessage("Ставка має бути від 1 до 500 монет.");
      return;
    }
    if (balance === null || bet > balance) {
      setErrorMessage("Недостатньо монет на рахунку.");
      return;
    }

    const client = getSupabaseClient();
    if (!client || isBusy) return;
    setIsBusy(true);
    setErrorMessage(null);
    setAgentSpeech("Ставка прийнята. Роздаю карти.");

    try {
      const { data, error } = await client.rpc("bj_start", { p_bet: bet });
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error("Неочікувана відповідь від сервера.");
      setGame(nextGame);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

      if (nextGame.status === "finished") {
        if (nextGame.result === "blackjack") {
          setAgentSpeech("Блекджек. Бездоганна комбінація, банк твій.");
        } else if (nextGame.result === "win") {
          setAgentSpeech("Твоя перемога. Забирай виграш.");
        } else if (nextGame.result === "lose") {
          setAgentSpeech("Цього разу перевага на моєму боці.");
        } else {
          setAgentSpeech("Нічия. Ставка повертається.");
        }
        void refreshLeaderboard();
      }
      void refreshBalance();
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg.includes("game_in_progress") || getErrorCode(error) === "23505") {
        try {
          const { data: stateData } = await client.rpc("bj_state");
          const existingGame = parseGame(stateData);
          if (existingGame) {
            setGame(existingGame);
            setAgentSpeech("Партія вже на столі. Заверши її перед новою роздачею.");
            setErrorMessage(null);
          }
        } catch {
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

    if (action === "bj_hit") setAgentSpeech("Береш ще карту. Подивимось...");
    if (action === "bj_double") setAgentSpeech("Подвоєння ставки. Серйозний ризик.");

    try {
      const { data, error } = await client.rpc(action);
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error("Неочікувана відповідь від сервера.");
      setGame(nextGame);

      if (nextGame.status === "finished") {
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        if (nextGame.result === "blackjack") {
          setAgentSpeech("Блекджек. Бездоганна комбінація.");
        } else if (nextGame.result === "win") {
          setAgentSpeech("Твій виграш. Розрахунок проведено.");
        } else if (nextGame.result === "lose") {
          setAgentSpeech("Партія програна. Дилер забирає банк.");
        } else {
          setAgentSpeech("Нічия. Фішки повернено.");
        }
        void refreshLeaderboard();
        void refreshBalance();
      }
    } catch (error) {
      setErrorMessage(getUserErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  function startNewGame() {
    setGame(null);
    setErrorMessage(null);
    setAgentSpeech("Стіл вільний. Роби ставку на наступну партію.");
  }

  const isActiveGame = game?.status === "active";

  return (
    <main className="min-h-screen flex-1 bg-[#090b0e] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <Link
            href="/leagues"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition"
          >
            ← Повернутися до ліг
          </Link>
          <div className="font-mono text-xs text-amber-400 font-semibold">
            Баланс: {balance === null ? "—" : `${balance.toLocaleString()} монет`}
          </div>
        </div>

        {/* Стіл переговорів / Бар агента */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-[#13171f] to-[#0c0f14] p-5 shadow-2xl sm:p-7">
          {/* Верхня панель: Агент + Кола */}
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Агент */}
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-800 to-slate-900 p-1.5 shadow-lg">
                <AgentAvatar />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-100">Агент Маркус</h1>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">ДИЛЕР</span>
                </div>
                <p className="mt-1 max-w-sm text-xs italic text-amber-200/90 font-serif leading-relaxed">
                  "{agentSpeech}"
                </p>
              </div>
            </div>

            {/* Інтерактивна склянка коли */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <ColaGlass level={colaLevel} onDrink={handleDrinkCola} />
            </div>
          </div>

          {/* Справжнє сукно ігрового столу */}
          <div className="relative rounded-2xl border border-emerald-950/80 bg-gradient-to-b from-[#0a2318] via-[#081b13] to-[#06140e] p-6 shadow-inner sm:p-8">
            {/* Декоративна розмітка столу казино */}
            <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 border-t border-dashed border-emerald-700/20" />

            {isLoading ? (
              <div className="py-16 text-center font-mono text-xs text-slate-500">
                Завантаження столу...
              </div>
            ) : (
              <div className="space-y-8">
                {/* Карти дилера */}
                <div>
                  <div className="mb-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">КАРТИ ДИЛЕРА</span>
                    <span className="font-bold text-slate-300">
                      {game ? (game.dealer_hidden ? "Очки: ?" : `Очки: ${game.dealer_value}`) : "—"}
                    </span>
                  </div>
                  <div className="flex min-h-36 flex-wrap gap-3 items-center">
                    {game ? (
                      game.dealer_cards.map((card, index) =>
                        game.dealer_hidden && index === game.dealer_cards.length - 1
                          ? renderHiddenCard(`hidden-${index}`)
                          : renderCard(card, `dealer-${index}`)
                      )
                    ) : (
                      <div className="flex h-32 w-24 items-center justify-center rounded-lg border border-dashed border-emerald-900/60 font-mono text-[11px] text-emerald-800">
                        порожньо
                      </div>
                    )}
                  </div>
                </div>

                {/* Карти гравця */}
                <div>
                  <div className="mb-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">ТВОЇ КАРТИ</span>
                    <span className="font-bold text-slate-300">
                      {game ? `Очки: ${game.player_value}` : "—"}
                    </span>
                  </div>
                  <div className="flex min-h-36 flex-wrap gap-3 items-center">
                    {game ? (
                      game.player_cards.map((card, index) =>
                        renderCard(card, `player-${index}`)
                      )
                    ) : (
                      <div className="flex h-32 w-24 items-center justify-center rounded-lg border border-dashed border-emerald-900/60 font-mono text-[11px] text-emerald-800">
                        порожньо
                      </div>
                    )}
                  </div>
                </div>

                {/* Результат партії */}
                {game?.status === "finished" && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 text-center">
                    <p className="font-mono text-sm font-bold text-slate-100">
                      {game.result === "blackjack" && "БЛЕКДЖЕК! ПЕРЕМОГА"}
                      {game.result === "win" && `ВИГРАШ: +${game.payout - game.bet} МОНЕТ`}
                      {game.result === "push" && "НІЧИЯ: СТАВКУ ПОВЕРНЕНО"}
                      {game.result === "lose" && "ПРОГРАШ ПАРТІЇ"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Панель керування та ставок */}
          <div className="mt-6">
            {isActiveGame ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleAction("bj_hit")}
                  disabled={isBusy}
                  className="h-11 rounded-lg bg-emerald-600 px-6 font-mono text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  Ще карту
                </button>
                <button
                  type="button"
                  onClick={() => void handleAction("bj_stand")}
                  disabled={isBusy}
                  className="h-11 rounded-lg border border-slate-700 bg-slate-800 px-6 font-mono text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  Досить
                </button>
                {game?.can_double && (
                  <button
                    type="button"
                    onClick={() => void handleAction("bj_double")}
                    disabled={isBusy}
                    className="h-11 rounded-lg border border-amber-500/60 bg-amber-950/40 px-6 font-mono text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-900/50 disabled:opacity-50"
                  >
                    Подвоїти
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleDeal} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="bet-input" className="mb-1 block font-mono text-xs text-slate-400">
                    Ставка на стіл (1–500):
                  </label>
                  <input
                    id="bet-input"
                    type="number"
                    min="1"
                    max="500"
                    value={betInput}
                    onChange={(e) => setBetInput(e.target.value)}
                    disabled={isBusy}
                    required
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-100 outline-none transition focus:border-emerald-500"
                  />
                </div>
                {game?.status === "finished" ? (
                  <button
                    type="button"
                    onClick={startNewGame}
                    disabled={isBusy}
                    className="h-11 rounded-lg bg-emerald-600 px-6 font-mono text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Нова роздача
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isBusy || balance === null}
                    className="h-11 rounded-lg bg-emerald-600 px-6 font-mono text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isBusy ? "Роздача..." : "Зробити ставку"}
                  </button>
                )}
              </form>
            )}

            {errorMessage && (
              <p className="mt-3 font-mono text-xs text-rose-400">{errorMessage}</p>
            )}
          </div>
        </div>

        {/* Таблиця лідерів */}
        <section className="rounded-2xl border border-slate-800 bg-[#0f1217] p-5 sm:p-6">
          <h2 className="mb-4 text-xs font-bold font-mono tracking-wider uppercase text-slate-400">
            Таблиця гравців клубу
          </h2>
          {leaderboardError ? (
            <p className="text-xs text-rose-400">{leaderboardError}</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500">Поки що немає зіграних партій.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-500">
                  <tr>
                    <th className="py-2">Гравець</th>
                    <th className="py-2">Партії</th>
                    <th className="py-2">Перемоги</th>
                    <th className="py-2">Баланс</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {leaderboard.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 font-bold text-slate-200">{entry.username}</td>
                      <td className="py-2.5 text-slate-400">{entry.games}</td>
                      <td className="py-2.5 text-slate-400">{entry.wins}</td>
                      <td className={`py-2.5 font-bold ${entry.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {entry.net >= 0 ? `+${entry.net}` : entry.net}
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
