"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type DuelCurrency = "coins" | "hohlyantsi";
type DuelGame = "blackjack" | "dice";

type Player = {
  id: string;
  username: string;
  coins: number;
  hohlyantsi: number;
  isBot?: boolean;
  status: "online" | "in_game";
};

type DuelInvite = {
  id: string;
  challenger_id: string;
  challenger_name: string;
  opponent_id: string;
  opponent_name: string;
  game_type: DuelGame;
  stake: number;
  currency: DuelCurrency;
  status: "pending" | "accepted" | "declined" | "completed";
  created_at: string;
};

type DuelResult = {
  challenger_name: string;
  opponent_name: string;
  game_type: DuelGame;
  stake: number;
  currency: DuelCurrency;
  challenger_score: number;
  opponent_score: number;
  challenger_roll?: number[];
  opponent_roll?: number[];
  winner_id: string | null;
  winner_name: string | null;
  pot: number;
};

const BOT_PLAYERS: Player[] = [
  {
    id: "bot-marchenko-01",
    username: "Марченко [PRO-BOT]",
    coins: 75400,
    hohlyantsi: 50,
    isBot: true,
    status: "online",
  },
  {
    id: "bot-admin-khohlov-02",
    username: "Адмін_Хохлов [VIP]",
    coins: 1500000,
    hohlyantsi: 200,
    isBot: true,
    status: "online",
  },
  {
    id: "bot-syoma-03",
    username: "Одесит_Сьома [Блефує]",
    coins: 14200,
    hohlyantsi: 30,
    isBot: true,
    status: "online",
  },
];

export default function OnlinePage() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    coins: number;
    hohlyantsi: number;
  } | null>(null);

  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<DuelInvite[]>([]);
  const [activeDuel, setActiveDuel] = useState<DuelResult | null>(null);
  const [isChallenging, setIsChallenging] = useState<Player | null>(null);

  // Форма виклику на гру
  const [duelGame, setDuelGame] = useState<DuelGame>("dice");
  const [duelCurrency, setDuelCurrency] = useState<DuelCurrency>("coins");
  const [duelStake, setDuelStake] = useState<string>("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Завантаження профілю та списку гравців
  useEffect(() => {
    async function init() {
      const client = getSupabaseClient();
      if (!client) return;

      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;

      const uid = authData.user.id;

      // Завантажуємо профіль
      const { data: prof } = await client
        .from("profiles")
        .select("id, username, coins, hohlyantsi")
        .eq("id", uid)
        .maybeSingle();

      const myUser = {
        id: uid,
        username: prof?.username || "Ви (Агент)",
        coins: typeof prof?.coins === "number" ? prof.coins : 1000,
        hohlyantsi: typeof prof?.hohlyantsi === "number" ? prof.hohlyantsi : 25,
      };
      setCurrentUser(myUser);

      // Завантажуємо інших гравців з бази
      try {
        const { data: profiles } = await client
          .from("profiles")
          .select("id, username, coins, hohlyantsi")
          .neq("id", uid)
          .not("username", "is", null)
          .limit(10);

        const realPlayers: Player[] = (profiles || []).map((p) => ({
          id: p.id,
          username: p.username || "Гравець",
          coins: p.coins ?? 500,
          hohlyantsi: p.hohlyantsi ?? 25,
          status: "online",
        }));

        setOnlinePlayers([...BOT_PLAYERS, ...realPlayers]);
      } catch (e) {
        setOnlinePlayers(BOT_PLAYERS);
      }
    }

    void init();
  }, []);

  // Опитування вхідних викликів на дуель кожні 3.5 секунди
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await client
          .from("pvp_duels")
          .select(`
            id,
            challenger_id,
            opponent_id,
            game_type,
            stake,
            currency,
            status,
            created_at,
            challenger:challenger_id(username)
          `)
          .eq("opponent_id", currentUser.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(3);

        if (data) {
          const formatted: DuelInvite[] = data.map((d: any) => ({
            id: d.id,
            challenger_id: d.challenger_id,
            challenger_name: d.challenger?.username || "Невідомий гравець",
            opponent_id: d.opponent_id,
            opponent_name: currentUser.username,
            game_type: d.game_type,
            stake: d.stake,
            currency: d.currency,
            status: d.status,
            created_at: d.created_at,
          }));
          setIncomingInvites(formatted);
        }
      } catch {
        // ignore polling errors
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Надіслати виклик на гру (приглос)
  async function handleSendChallenge() {
    if (!isChallenging || !currentUser) return;
    const stake = Number(duelStake);
    if (!Number.isInteger(stake) || stake < 1) {
      setErrorMsg("Введіть коректну суму ставки.");
      return;
    }

    if (duelCurrency === "coins" && currentUser.coins < stake) {
      setErrorMsg(`Недостатньо золотих монет! Баланс: ${currentUser.coins}`);
      return;
    }
    if (duelCurrency === "hohlyantsi" && currentUser.hohlyantsi < stake) {
      setErrorMsg(`Недостатньо Хохлянців! Баланс: ${currentUser.hohlyantsi}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setMessage(null);

    // Якщо це бот, симулюємо дуель одразу для фанової гри
    if (isChallenging.isBot) {
      setTimeout(() => {
        simulateBotDuel(isChallenging, duelGame, stake, duelCurrency);
        setIsSubmitting(false);
        setIsChallenging(null);
      }, 1200);
      return;
    }

    // Якщо живий гравець - відправляємо в Supabase
    const client = getSupabaseClient();
    if (!client) {
      setErrorMsg("Supabase клієнт відсутній.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error } = await client.rpc("send_duel_invite", {
        p_opponent: isChallenging.id,
        p_game: duelGame,
        p_stake: stake,
        p_currency: duelCurrency,
      });

      if (error) throw error;

      setMessage(`Приглос надіслано гравцю ${isChallenging.username}! Очікуйте відповіді.`);
      setIsChallenging(null);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg("Не вдалося надіслати виклик. Переконайтеся, що функція send_duel_invite додана в базу.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Симуляція дуелі проти бота
  function simulateBotDuel(bot: Player, game: DuelGame, stake: number, curr: DuelCurrency) {
    if (!currentUser) return;

    let pScore = 0;
    let bScore = 0;
    let pRoll: number[] = [];
    let bRoll: number[] = [];

    if (game === "dice") {
      const p1 = Math.floor(Math.random() * 6) + 1;
      const p2 = Math.floor(Math.random() * 6) + 1;
      const b1 = Math.floor(Math.random() * 6) + 1;
      const b2 = Math.floor(Math.random() * 6) + 1;
      pRoll = [p1, p2];
      bRoll = [b1, b2];
      pScore = p1 + p2;
      bScore = b1 + b2;
    } else {
      // Блекджек
      pScore = 17 + Math.floor(Math.random() * 5); // 17-21
      bScore = 17 + Math.floor(Math.random() * 5);
      pRoll = [pScore];
      bRoll = [bScore];
    }

    let winnerId: string | null = null;
    let winnerName: string | null = null;

    if (pScore > bScore) {
      winnerId = currentUser.id;
      winnerName = currentUser.username;
      // Додаємо виграш
      if (curr === "coins") {
        setCurrentUser({ ...currentUser, coins: currentUser.coins + stake });
      } else {
        setCurrentUser({ ...currentUser, hohlyantsi: currentUser.hohlyantsi + stake });
      }
    } else if (bScore > pScore) {
      winnerId = bot.id;
      winnerName = bot.username;
      // Знімаємо програш
      if (curr === "coins") {
        setCurrentUser({ ...currentUser, coins: Math.max(0, currentUser.coins - stake) });
      } else {
        setCurrentUser({ ...currentUser, hohlyantsi: Math.max(0, currentUser.hohlyantsi - stake) });
      }
    }

    setActiveDuel({
      challenger_name: currentUser.username,
      opponent_name: bot.username,
      game_type: game,
      stake,
      currency: curr,
      challenger_score: pScore,
      opponent_score: bScore,
      challenger_roll: pRoll,
      opponent_roll: bRoll,
      winner_id: winnerId,
      winner_name: winnerName,
      pot: stake * 2,
    });
  }

  // Прийняти або відхилити вхідний виклик
  async function handleRespondInvite(invite: DuelInvite, action: "accept" | "decline") {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client.rpc("respond_duel_invite", {
        p_duel_id: invite.id,
        p_action: action,
      });

      if (error) throw error;

      // Прибираємо зі списку
      setIncomingInvites((prev) => prev.filter((i) => i.id !== invite.id));

      if (action === "accept" && data) {
        setActiveDuel({
          challenger_name: invite.challenger_name,
          opponent_name: currentUser?.username || "Ви",
          game_type: invite.game_type,
          stake: invite.stake,
          currency: invite.currency,
          challenger_score: data.challenger_score,
          opponent_score: data.opponent_score,
          challenger_roll: data.challenger_roll,
          opponent_roll: data.opponent_roll,
          winner_id: data.winner_id,
          winner_name:
            data.winner_id === invite.challenger_id
              ? invite.challenger_name
              : data.winner_id === currentUser?.id
              ? currentUser.username
              : null,
          pot: data.pot,
        });
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      }
    } catch (err) {
      console.error("Помилка обробки виклику:", err);
      setErrorMsg("Не вдалося відповісти на виклик.");
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-[#07090d] px-4 py-8 font-mono text-slate-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Navigation */}
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
              href="/dice"
              className="rounded-lg border border-red-800 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-900/40 transition"
            >
              🎲 Кості
            </Link>
            <Link
              href="/cases"
              className="rounded-lg border border-purple-800 bg-purple-950/30 px-3 py-1 text-xs font-bold text-purple-300 hover:bg-purple-900/40 transition"
            >
              🎁 Кейси
            </Link>
            <div className="font-mono text-xs text-amber-400 font-semibold">
              🪙 {currentUser ? currentUser.coins.toLocaleString() : "—"} монет
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-200">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 text-[10px] font-black text-slate-950">
                Х
              </span>
              <span>{currentUser ? currentUser.hohlyantsi : 25} Хохлянців</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-block rounded-full border border-indigo-500/40 bg-indigo-950/30 px-4 py-1 text-xs text-indigo-300 font-bold mb-3">
            ⚔️ ОНЛАЙН ДУЕЛІ ТА ПВП ІГРИ
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            ОНЛАЙН АРЕНА (PVP)
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-400 sm:text-sm">
            Кидай виклик іншим гравцям у Блекджек або Кості на Золоті Монети чи сірі Хохлянці. Приймай приглоси та перемагай!
          </p>
        </header>

        {/* Messages */}
        {message && (
          <div className="mb-6 rounded-xl border border-emerald-600 bg-emerald-950/40 p-4 text-center text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 rounded-xl border border-rose-600 bg-rose-950/40 p-4 text-center text-sm font-bold text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* ВХІДНІ ВИКЛИКИ НА ДУЕЛЬ (INVITATIONS) */}
        {incomingInvites.length > 0 && (
          <section className="mb-10 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
              <span className="animate-ping inline-block h-2 w-2 rounded-full bg-amber-400" />
              🔔 ВХІДНІ ВИКЛИКИ НА ГРУ ({incomingInvites.length})
            </h2>
            {incomingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-amber-950/50 via-slate-900 to-black p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-pulse"
              >
                <div>
                  <span className="text-xs font-black uppercase text-amber-300">
                    {inv.game_type === "blackjack" ? "🃏 БЛЕКДЖЕК ДУЕЛЬ" : "🎲 ДУЕЛЬ В КОСТІ"}
                  </span>
                  <div className="text-base font-bold text-white mt-1">
                    Гравець <span className="text-amber-400 font-black">{inv.challenger_name}</span> кинув вам виклик!
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Ставка:{" "}
                    <span className="font-black text-white">
                      {inv.stake} {inv.currency === "coins" ? "🪙 Монет" : "🔘 Хохлянців"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRespondInvite(inv, "accept")}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 font-sans text-xs font-black uppercase tracking-wider text-white shadow-lg hover:from-emerald-500 hover:to-teal-400 transition"
                  >
                    ⚔️ ПРИЙНЯТИ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondInvite(inv, "decline")}
                    className="rounded-xl bg-slate-800 px-4 py-2.5 font-sans text-xs font-bold uppercase text-slate-300 hover:bg-rose-950 hover:text-rose-300 transition"
                  >
                    ВІДХИЛИТИ
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* АРЕНА ДУЕЛІ (РЕЗУЛЬТАТ МАТЧУ) */}
        {activeDuel && (
          <section className="mb-10 rounded-3xl border-4 border-amber-500 bg-gradient-to-b from-[#1c1523] via-[#100d14] to-black p-6 sm:p-10 shadow-[0_0_60px_rgba(245,158,11,0.3)] text-center animate-in zoom-in-95">
            <div className="inline-block rounded-full bg-amber-500/20 border border-amber-500/60 px-4 py-1 text-xs font-black text-amber-300 uppercase tracking-widest mb-4">
              ⚔️ РЕЗУЛЬТАТ ДУЕЛІ ({activeDuel.game_type === "dice" ? "🎲 КОСТІ" : "🃏 БЛЕКДЖЕК"})
            </div>

            <div className="grid grid-cols-2 gap-4 my-6">
              {/* Гравець 1 */}
              <div className="rounded-2xl border-2 border-slate-700 bg-black/60 p-5">
                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">
                  Ініціатор
                </span>
                <div className="text-lg font-black text-white">{activeDuel.challenger_name}</div>
                <div className="mt-4 text-4xl font-black text-cyan-400">
                  {activeDuel.challenger_score}
                </div>
                {activeDuel.challenger_roll && activeDuel.challenger_roll.length > 1 && (
                  <div className="mt-1 text-xs text-slate-400">
                    Кубики: {activeDuel.challenger_roll[0]} + {activeDuel.challenger_roll[1]}
                  </div>
                )}
              </div>

              {/* Гравець 2 */}
              <div className="rounded-2xl border-2 border-slate-700 bg-black/60 p-5">
                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">
                  Опонент
                </span>
                <div className="text-lg font-black text-white">{activeDuel.opponent_name}</div>
                <div className="mt-4 text-4xl font-black text-purple-400">
                  {activeDuel.opponent_score}
                </div>
                {activeDuel.opponent_roll && activeDuel.opponent_roll.length > 1 && (
                  <div className="mt-1 text-xs text-slate-400">
                    Кубики: {activeDuel.opponent_roll[0]} + {activeDuel.opponent_roll[1]}
                  </div>
                )}
              </div>
            </div>

            {/* Банер переможця */}
            <div className="my-6">
              {activeDuel.winner_id ? (
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-950/40 p-4 text-xl font-black text-emerald-300 uppercase shadow-lg">
                  🏆 ПЕРЕМОЖЕЦЬ: {activeDuel.winner_name}! БАНК: +{activeDuel.pot}{" "}
                  {activeDuel.currency === "coins" ? "🪙 Монет" : "🔘 Хохлянців"}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-slate-600 bg-slate-900/60 p-4 text-xl font-black text-slate-200 uppercase">
                  🤝 НІЧИЯ! Ставки повернено обом учасникам.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveDuel(null)}
              className="rounded-xl bg-amber-500 px-8 py-3 font-sans text-xs font-black uppercase text-slate-950 hover:bg-amber-400 transition"
            >
              Закрити дуель
            </button>
          </section>
        )}

        {/* СПИСОК ГРАВЦІВ В ОНЛАЙНІ */}
        <section className="rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-[#0d1016] to-[#07090d] p-6 shadow-2xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                ГРАВЦІ В ОНЛАЙНІ ({onlinePlayers.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Обери суперника і натисни «Викликати на дуель»
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {onlinePlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-xl font-bold">
                    {player.isBot ? "🤖" : "👤"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{player.username}</span>
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-amber-400 font-bold">🪙 {player.coins.toLocaleString()}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-300 font-bold">🔘 {player.hohlyantsi} Х</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChallenging(player)}
                  className="rounded-xl border border-indigo-500/60 bg-indigo-950/40 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-900/70 hover:text-white transition active:scale-95"
                >
                  ⚔️ Виклик
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* МОДАЛЬНЕ ВІКНО СТВОРЕННЯ ВИКЛИКУ (CHALLENGE MODAL) */}
        {isChallenging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border-2 border-indigo-500/80 bg-[#0e121a] p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  ⚔️ ВИКЛИКАТИ: <span className="text-indigo-400">{isChallenging.username}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsChallenging(null)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Вибір гри */}
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Оберіть гру для дуелі:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDuelGame("dice")}
                    className={`rounded-xl border-2 p-3 text-center transition ${
                      duelGame === "dice"
                        ? "border-red-500 bg-red-950/60 text-white font-bold"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    🎲 Кості
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuelGame("blackjack")}
                    className={`rounded-xl border-2 p-3 text-center transition ${
                      duelGame === "blackjack"
                        ? "border-cyan-500 bg-cyan-950/60 text-white font-bold"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    🃏 Блекджек
                  </button>
                </div>
              </div>

              {/* Вибір валюти */}
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Оберіть валюту ставки:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDuelCurrency("coins");
                      setDuelStake("100");
                    }}
                    className={`rounded-xl border-2 p-3 text-center transition ${
                      duelCurrency === "coins"
                        ? "border-amber-500 bg-amber-950/60 text-amber-300 font-bold"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    🪙 Золоті Монети
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDuelCurrency("hohlyantsi");
                      setDuelStake("5");
                    }}
                    className={`rounded-xl border-2 p-3 text-center transition ${
                      duelCurrency === "hohlyantsi"
                        ? "border-slate-400 bg-slate-800 text-white font-bold"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    🔘 Хохлянці
                  </button>
                </div>
              </div>

              {/* Сума ставки */}
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Розмір ставки:
                </label>
                <input
                  type="number"
                  min="1"
                  value={duelStake}
                  onChange={(e) => setDuelStake(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-black px-4 font-mono text-lg font-bold text-white outline-none focus:border-indigo-500"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(duelCurrency === "coins" ? [100, 500, 1000, 5000] : [2, 5, 10, 25]).map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDuelStake(preset.toString())}
                        className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:border-slate-600"
                      >
                        +{preset}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsChallenging(null)}
                  className="w-1/3 rounded-xl border border-slate-700 py-3 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={handleSendChallenge}
                  disabled={isSubmitting}
                  className="w-2/3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-sans text-xs font-black uppercase text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Надсилаємо..." : "🚀 Відправити приглос"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
