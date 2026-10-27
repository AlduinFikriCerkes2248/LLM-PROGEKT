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
    typeof value.payout !== "number" ||
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
    payout: value.payout,
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
    return "У вас уже є активна гра";
  }
  if (isError("insufficient_funds")) return "Недостатньо монет";
  if (isError("invalid_bet")) return "Ставка від 1 до 500 монет";
  if (isError("no_active_game")) return "Активної гри немає";
  if (isError("cannot_double")) {
    return "Подвоїти можна лише на двох картах";
  }
  if (isError("not_authenticated")) return "Увійдіть, щоб грати";
  return "Не вдалося виконати дію. Спробуйте ще раз";
}

function renderCard(card: number, key: string) {
  const suit = suits[Math.floor(card / 13)];
  const isRed = suit === "♥" || suit === "♦";
  return (
    <span
      key={key}
      className={`flex h-24 w-16 shrink-0 flex-col items-center justify-center rounded-md border border-[#ded8ca] bg-[#fffdf7] text-2xl font-semibold shadow-md sm:h-28 sm:w-20 ${
        isRed ? "text-rose-700" : "text-[#202722]"
      }`}
      aria-label={`${ranks[card % 13]} ${suit}`}
    >
      <span>{ranks[card % 13]}</span>
      <span className="text-xl">{suit}</span>
    </span>
  );
}

function resultText(game: BlackjackGame) {
  const winnings = game.payout - game.bet;
  switch (game.result) {
    case "blackjack":
      return `Блекджек! +${winnings} монет`;
    case "win":
      return `Виграш +${winnings} монет`;
    case "push":
      return "Нічия, ставку повернено";
    case "lose":
      return "Програш";
    default:
      return "Партію завершено";
  }
}

export default function BlackjackPage() {
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isBusy, setIsBusy] = useState(false);
  const [betInput, setBetInput] = useState("10");
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
        if (active) setGame(parsedGame);
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
      setErrorMessage("Ставка від 1 до 500 монет");
      return;
    }
    if (balance === null || bet > balance) {
      setErrorMessage("Недостатньо монет");
      return;
    }

    const client = getSupabaseClient();
    if (!client || isBusy) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const { data, error } = await client.rpc("bj_start", { p_bet: bet });
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error("bj_start повернув неочікувану відповідь.");
      setGame(nextGame);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      if (nextGame.status === "finished") {
        try {
          await refreshLeaderboard();
        } catch (error) {
          console.error("Не вдалося оновити таблицю після блекджеку:", error);
          setLeaderboardError("Не вдалося оновити таблицю друзів.");
        }
      }
      try {
        await refreshBalance();
      } catch (error) {
        console.error("Не вдалося оновити баланс після ставки:", error);
        setErrorMessage("Гру розпочато, але не вдалося оновити баланс.");
      }
    } catch (error) {
      console.error("Не вдалося роздати карти:", error);
      setErrorMessage(getUserErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAction(action: "bj_hit" | "bj_stand" | "bj_double") {
    const client = getSupabaseClient();
    if (!client || isBusy) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const { data, error } = await client.rpc(action);
      if (error) throw error;
      const nextGame = parseGame(data);
      if (!nextGame) throw new Error(`${action} повернув неочікувану відповідь.`);
      setGame(nextGame);
      if (nextGame.status === "finished") {
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        try {
          await refreshLeaderboard();
        } catch (error) {
          console.error("Не вдалося оновити таблицю після партії:", error);
          setLeaderboardError("Не вдалося оновити таблицю друзів.");
        }
        try {
          await refreshBalance();
        } catch (error) {
          console.error("Не вдалося оновити баланс після завершення гри:", error);
          setErrorMessage("Партію завершено, але не вдалося оновити баланс.");
        }
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
  }

  const isActiveGame = game?.status === "active";

  return (
    <main className="min-h-screen flex-1 bg-[#f4f5f1] px-5 py-10 text-[#202722] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/leagues"
          className="mb-8 inline-flex text-sm font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 hover:text-emerald-950"
        >
          ← До ліг
        </Link>

        <header className="mb-8 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            Matchday · Блекджек
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Блекджек
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[#626b64]">
            Зроби ставку віртуальними монетами та зіграй проти дилера.
          </p>
        </header>

        <section
          aria-label="Гра в блекджек"
          className="border border-[#d9ddd6] bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e3dd] pb-4">
            <h2 className="text-lg font-semibold">Ігровий стіл</h2>
            <p className="text-sm font-medium text-amber-800" aria-live="polite">
              Баланс: {balance === null ? "—" : `${balance} монет`}
            </p>
          </div>

          {isLoading ? (
            <p role="status" className="py-12 text-center text-[#626b64]">
              Завантаження гри…
            </p>
          ) : (
            <>
              {game && (
                <div className="mb-6 space-y-6">
                  <section aria-label="Карти дилера">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold">Дилер</h3>
                      <p className="text-sm text-[#626b64]">
                        {game.dealer_hidden ? "Очки: ?" : `Очки: ${game.dealer_value}`}
                      </p>
                    </div>
                    <div className="flex min-h-28 flex-wrap gap-3">
                      {game.dealer_cards.map((card, index) =>
                        game.dealer_hidden && index === game.dealer_cards.length - 1 ? (
                          <span
                            key={`hidden-${index}`}
                            className="flex h-24 w-16 items-center justify-center rounded-md border-2 border-emerald-900 bg-[#202722] text-3xl font-semibold text-white shadow-md sm:h-28 sm:w-20"
                            aria-label="Закрита карта дилера"
                          >
                            ?
                          </span>
                        ) : (
                          renderCard(card, `dealer-${index}`)
                        ),
                      )}
                    </div>
                  </section>

                  <section aria-label="Карти гравця">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold">Твої карти</h3>
                      <p className="text-sm text-[#626b64]">
                        Очки: {game.player_value}
                      </p>
                    </div>
                    <div className="flex min-h-28 flex-wrap gap-3">
                      {game.player_cards.map((card, index) =>
                        renderCard(card, `player-${index}`),
                      )}
                    </div>
                  </section>

                  {game.status === "finished" && (
                    <div
                      role="status"
                      className="border-l-4 border-emerald-700 bg-emerald-50 px-4 py-3 font-semibold text-emerald-950"
                    >
                      {resultText(game)}
                    </div>
                  )}
                </div>
              )}

              {isActiveGame ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleAction("bj_hit")}
                    disabled={isBusy}
                    className="h-11 bg-[#202722] px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy ? "Зачекайте…" : "Ще"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAction("bj_stand")}
                    disabled={isBusy}
                    className="h-11 border border-[#202722] px-5 text-sm font-semibold text-[#202722] transition hover:bg-[#eef1ec] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Стоп
                  </button>
                  {game?.can_double && (
                    <button
                      type="button"
                      onClick={() => void handleAction("bj_double")}
                      disabled={isBusy}
                      className="h-11 border border-amber-700 px-5 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Подвоїти
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
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Ставка (1–500 монет)
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
                      className="h-11 w-full border border-[#c8cec7] bg-[#fbfcfa] px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:opacity-60"
                    />
                  </div>
                  {game?.status === "finished" ? (
                    <button
                      type="button"
                      onClick={startNewGame}
                      disabled={isBusy}
                      className="h-11 shrink-0 bg-[#202722] px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Нова роздача
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isBusy || balance === null}
                      className="h-11 shrink-0 bg-[#202722] px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy ? "Роздаємо…" : "Роздати"}
                    </button>
                  )}
                </form>
              )}
            </>
          )}

          {errorMessage && (
            <p role="alert" className="mt-4 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}
        </section>

        <section
          aria-labelledby="blackjack-leaderboard-heading"
          className="mt-8 border border-[#e0e3dd] bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 id="blackjack-leaderboard-heading" className="mb-4 text-lg font-semibold">
            Таблиця друзів
          </h2>
          {leaderboardError ? (
            <p role="alert" className="text-sm text-rose-700">
              {leaderboardError}
            </p>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-[#626b64]">Поки що немає зіграних партій.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-[#d9ddd6] text-[#626b64]">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Гравець</th>
                    <th scope="col" className="px-3 py-2 font-medium">Партії</th>
                    <th scope="col" className="px-3 py-2 font-medium">Перемоги</th>
                    <th scope="col" className="px-3 py-2 font-medium">Чистий виграш</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={`${entry.username}-${index}`}
                      className="border-b border-[#eef0ec] last:border-0"
                    >
                      <th scope="row" className="px-3 py-3 font-semibold">
                        {entry.username}
                      </th>
                      <td className="px-3 py-3">{entry.games}</td>
                      <td className="px-3 py-3">{entry.wins}</td>
                      <td
                        className={`px-3 py-3 font-medium ${
                          entry.net > 0
                            ? "text-emerald-800"
                            : entry.net < 0
                              ? "text-rose-700"
                              : "text-[#626b64]"
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
      </div>
    </main>
  );
}
