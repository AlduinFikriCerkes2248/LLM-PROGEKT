"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  getSupabaseClient,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type DuelCurrency = "coins" | "hohlyantsi";
type DuelGame = "blackjack" | "dice";

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function calculateHandValue(cards: number[]) {
  let score = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = card % 13;
    if (rank >= 8 && rank <= 11) {
      score += 10;
    } else if (rank === 12) {
      aces += 1;
      score += 11;
    } else {
      score += rank + 2;
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

function renderPvpCard(card: number, key: string) {
  const suit = suits[Math.floor(card / 13)] || "♠";
  const isRed = suit === "♥" || suit === "♦";
  const rank = ranks[card % 13] || "?";

  return (
    <div
      key={key}
      className={`relative flex h-24 w-18 shrink-0 flex-col justify-between rounded-xl border-2 border-slate-700 bg-gradient-to-b from-white to-slate-200 p-2 shadow-2xl transition-all sm:h-28 sm:w-20 ${
        isRed ? "text-red-600" : "text-slate-900"
      }`}
    >
      <div className="flex justify-between items-start font-mono text-sm font-black leading-none">
        <span>{rank}</span>
        <span className="text-xs">{suit}</span>
      </div>
      <div className="self-center text-3xl select-none">{suit}</div>
      <div className="flex justify-between items-end font-mono text-sm font-black leading-none rotate-180">
        <span>{rank}</span>
        <span className="text-xs">{suit}</span>
      </div>
    </div>
  );
}

function renderPvpCardBack(key: string) {
  return (
    <div
      key={key}
      className="relative flex h-24 w-18 shrink-0 items-center justify-center rounded-xl border-2 border-amber-600/70 bg-gradient-to-br from-red-950 via-[#180a0a] to-slate-950 p-2 shadow-2xl transition-all sm:h-28 sm:w-20"
      title="Карта суперника закрита сорочкою"
    >
      <div className="h-full w-full rounded-lg border border-amber-500/30 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:6px_6px] flex flex-col items-center justify-center text-center shadow-inner">
        <span className="font-mono text-xl text-amber-400 select-none font-black">🂠</span>
        <span className="text-[8px] text-amber-500/80 uppercase font-black tracking-widest mt-0.5">ТАЄМНИЦЯ</span>
      </div>
    </div>
  );
}

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
  status: "pending" | "accepted" | "playing" | "declined" | "completed";
  created_at: string;
};

type SupabaseDuelRecord = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  game_type: DuelGame;
  stake: number;
  currency: DuelCurrency;
  status: "pending" | "accepted" | "playing" | "declined" | "completed";
  created_at: string;
  challenger?: { username?: string } | null;
  opponent?: { username?: string } | null;
};

type LiveBjMatch = {
  duel_id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_name: string;
  opponent_name: string;
  stake: number;
  currency: DuelCurrency;
  deck: number[];
  challenger_cards: number[];
  opponent_cards: number[];
  challenger_score: number;
  opponent_score: number;
  current_turn: string;
  challenger_finished: boolean;
  opponent_finished: boolean;
  status: "playing" | "completed";
  winner_id: string | null;
  winner_name: string | null;
  pot: number;
  isBotMatch?: boolean;
  last_move_at?: string;
};

type DiceDuelResult = {
  challenger_name: string;
  opponent_name: string;
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

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const BOT_PLAYERS: Player[] = [
  {
    id: "bot-marchenko-01",
    username: "PRO-бот",
    coins: 75400,
    hohlyantsi: 50,
    isBot: true,
    status: "online",
  },
  {
    id: "bot-admin-khohlov-02",
    username: "VIP-бот",
    coins: 1500000,
    hohlyantsi: 200,
    isBot: true,
    status: "online",
  },
  {
    id: "bot-syoma-03",
    username: "Бот 1",
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
  const [outgoingInvites, setOutgoingInvites] = useState<DuelInvite[]>([]);
  const [liveBjMatch, setLiveBjMatch] = useState<LiveBjMatch | null>(null);
  const [closedDuelIds, setClosedDuelIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("matchday:closed_duels");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const closedDuelIdsRef = useRef<string[]>([]);
  useEffect(() => {
    closedDuelIdsRef.current = closedDuelIds;
  }, [closedDuelIds]);
  const [activeDiceDuel, setActiveDiceDuel] = useState<DiceDuelResult | null>(null);
  const [isChallenging, setIsChallenging] = useState<Player | null>(null);
  const [acceptingDuelId, setAcceptingDuelId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [isClaimingTimeout, setIsClaimingTimeout] = useState(false);

  // Форма виклику
  const [duelGame, setDuelGame] = useState<DuelGame>("blackjack");
  const [duelCurrency, setDuelCurrency] = useState<DuelCurrency>("coins");
  const [duelStake, setDuelStake] = useState<string>("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) return;
    async function init() {
      const client = getSupabaseClient();
      if (!client) return;

      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;

      const uid = authData.user.id;

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
      } catch {
        setOnlinePlayers(BOT_PLAYERS);
      }
    }

    void init();
  }, []);

  // Опитування стану ігор у реальному часі (кожні 2 сек)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        // 1. Вхідні виклики
        const { data: incoming } = await client
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

        if (incoming) {
          const formatted: DuelInvite[] = (incoming as unknown as SupabaseDuelRecord[]).map((d) => ({
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

        // 2. Мої відправлені виклики
        const { data: sent } = await client
          .from("pvp_duels")
          .select(`
            id,
            challenger_id,
            opponent_id,
            game_type,
            stake,
            currency,
            status,
            opponent:opponent_id(username)
          `)
          .eq("challenger_id", currentUser.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(2);

        if (sent) {
          setOutgoingInvites(
            (sent as unknown as SupabaseDuelRecord[]).map((p) => ({
              id: p.id,
              challenger_id: currentUser.id,
              challenger_name: currentUser.username,
              opponent_id: p.opponent_id,
              opponent_name: p.opponent?.username || "Опонент",
              game_type: p.game_type,
              stake: p.stake,
              currency: p.currency,
              status: p.status,
              created_at: "",
            }))
          );
        }

        // 3. Активна покрокова сесія Блекджеку в базі через безпечний RPC pvp_view
        if (!liveBjMatch?.isBotMatch) {
          const { data: viewData, error: viewError } = await client.rpc("pvp_view");

          if (viewData && !viewError) {
            // Якщо користувач вже закрив цей матч, не показувати його знову
            if (closedDuelIdsRef.current.includes(viewData.duel_id)) {
              return;
            }
            // Якщо матч уже завершений і зараз не відкритий на екрані, не виринати
            if (viewData.status === "completed" && !liveBjMatch) {
              return;
            }

            const isChallenger = currentUser.id === viewData.challenger_id;
            const chCards = isChallenger ? (viewData.my_cards || []) : (viewData.opponent_cards || []);
            const oppCards = !isChallenger ? (viewData.my_cards || []) : (viewData.opponent_cards || []);

            setLiveBjMatch((prev) => {
              if (
                prev &&
                prev.duel_id === viewData.duel_id &&
                prev.status === viewData.status &&
                prev.current_turn === viewData.current_turn &&
                prev.challenger_cards.length === chCards.length &&
                prev.opponent_cards.length === oppCards.length
              ) {
                return prev;
              }
              return {
                duel_id: viewData.duel_id,
                challenger_id: viewData.challenger_id,
                opponent_id: viewData.opponent_id,
                challenger_name: viewData.challenger_name,
                opponent_name: viewData.opponent_name,
                stake: viewData.stake,
                currency: viewData.currency,
                deck: viewData.deck || [],
                challenger_cards: chCards,
                opponent_cards: oppCards,
                challenger_score: isChallenger ? (viewData.my_score || 0) : (viewData.opponent_score || 0),
                opponent_score: !isChallenger ? (viewData.my_score || 0) : (viewData.opponent_score || 0),
                current_turn: viewData.current_turn,
                challenger_finished: viewData.challenger_finished || false,
                opponent_finished: viewData.opponent_finished || false,
                status: viewData.status,
                winner_id: viewData.winner_id,
                winner_name: viewData.winner_name,
                pot: viewData.pot,
                last_move_at: viewData.last_move_at,
              };
            });
          }
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentUser, liveBjMatch]);

  // НАДСИЛАННЯ ПРИГЛОСУ
  async function handleSendChallenge() {
    if (isDemoMode) return;
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
      setErrorMsg(`Недостатньо Бонусів! Баланс: ${currentUser.hohlyantsi}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setMessage(null);

    // Гра проти бота
    if (isChallenging.isBot) {
      if (duelGame === "blackjack") {
        startBotBlackjackMatch(isChallenging, stake, duelCurrency);
      } else {
        simulateBotDiceMatch(isChallenging, stake, duelCurrency);
      }
      setIsSubmitting(false);
      setIsChallenging(null);
      return;
    }

    // Живий гравець
    const client = getSupabaseClient();
    if (!client) {
      setErrorMsg("Підключення відсутнє.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await client.rpc("send_duel_invite", {
        p_opponent: isChallenging.id,
        p_game: duelGame,
        p_stake: stake,
        p_currency: duelCurrency,
      });

      if (error) throw error;

      setMessage(`Приглос надіслано гравцю ${isChallenging.username}! Очікуйте його відповіді.`);
      setIsChallenging(null);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg((err as { message?: string })?.message || "Не вдалося надіслати виклик.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // СТАРТ ПОКРОКОВОЇ ГРИ ПРОТИ БОТА (БЛЕКДЖЕК)
  function startBotBlackjackMatch(bot: Player, stake: number, curr: DuelCurrency) {
    if (!currentUser) return;

    // Знімаємо ставку
    if (curr === "coins") {
      setCurrentUser({ ...currentUser, coins: currentUser.coins - stake });
    } else {
      setCurrentUser({ ...currentUser, hohlyantsi: currentUser.hohlyantsi - stake });
    }

    // Перемішуємо колоду 52 карти
    const deck = Array.from({ length: 52 }, (_, i) => i).sort(() => Math.random() - 0.5);

    const userCards = [deck[0], deck[2]];
    const botCards = [deck[1], deck[3]];
    const remaining = deck.slice(4);

    setLiveBjMatch({
      duel_id: `bot-duel-${Date.now()}`,
      challenger_id: currentUser.id,
      opponent_id: bot.id,
      challenger_name: currentUser.username,
      opponent_name: bot.username,
      stake,
      currency: curr,
      deck: remaining,
      challenger_cards: userCards,
      opponent_cards: botCards,
      challenger_score: calculateHandValue(userCards),
      opponent_score: calculateHandValue(botCards),
      current_turn: currentUser.id, // Гравець ходить першим!
      challenger_finished: false,
      opponent_finished: false,
      status: "playing",
      winner_id: null,
      winner_name: null,
      pot: stake * 2,
      isBotMatch: true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ДІЯ ГРАВЦЯ В БЛЕКДЖЕКУ: HIT (Взяти карту)
  async function handleBjHit() {
    if (isDemoMode) return;
    if (!liveBjMatch || isActing || !currentUser) return;
    setIsActing(true);

    // Гра проти бота
    if (liveBjMatch.isBotMatch) {
      if (liveBjMatch.deck.length === 0) return;
      const nextCard = liveBjMatch.deck[0];
      const nextDeck = liveBjMatch.deck.slice(1);
      const newHand = [...liveBjMatch.challenger_cards, nextCard];
      const newScore = calculateHandValue(newHand);

      if (newScore >= 21) {
        // Перебір або 21 -> хід переходить до бота!
        setLiveBjMatch({
          ...liveBjMatch,
          deck: nextDeck,
          challenger_cards: newHand,
          challenger_score: newScore,
          challenger_finished: true,
          current_turn: liveBjMatch.opponent_id,
        });
        setTimeout(() => runBotTurn(newScore, nextDeck, liveBjMatch.opponent_cards), 1000);
      } else {
        setLiveBjMatch({
          ...liveBjMatch,
          deck: nextDeck,
          challenger_cards: newHand,
          challenger_score: newScore,
        });
      }
      setIsActing(false);
      return;
    }

    // Жива гра через Supabase RPC
    const client = getSupabaseClient();
    if (!client) {
      setIsActing(false);
      return;
    }

    try {
      const { data, error } = await client.rpc("pvp_bj_action", {
        p_duel_id: liveBjMatch.duel_id,
        p_action: "hit",
      });
      if (error) throw error;
      if (data && currentUser) {
        const isChallenger = currentUser.id === data.challenger_id;
        setLiveBjMatch((prev) =>
          prev
            ? {
                ...prev,
                status: data.status,
                current_turn: data.current_turn,
                challenger_finished: data.challenger_finished,
                opponent_finished: data.opponent_finished,
                winner_id: data.winner_id,
                winner_name: data.winner_name,
                pot: data.pot,
                deck: data.deck || [],
                challenger_cards: isChallenger ? (data.my_cards || []) : (data.opponent_cards || []),
                opponent_cards: !isChallenger ? (data.my_cards || []) : (data.opponent_cards || []),
                challenger_score: isChallenger ? (data.my_score || 0) : (data.opponent_score || 0),
                opponent_score: !isChallenger ? (data.my_score || 0) : (data.opponent_score || 0),
                last_move_at: data.last_move_at,
              }
            : null
        );
        if (data.status === "completed") {
          window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        }
      }
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message || "Помилка ходу.");
    } finally {
      setIsActing(false);
    }
  }

  // ДІЯ ГРАВЦЯ В БЛЕКДЖЕКУ: STAND (Зупинитися)
  async function handleBjStand() {
    if (isDemoMode) return;
    if (!liveBjMatch || isActing || !currentUser) return;
    setIsActing(true);

    // Гра проти бота
    if (liveBjMatch.isBotMatch) {
      setLiveBjMatch({
        ...liveBjMatch,
        challenger_finished: true,
        current_turn: liveBjMatch.opponent_id,
      });
      setTimeout(
        () => runBotTurn(liveBjMatch.challenger_score, liveBjMatch.deck, liveBjMatch.opponent_cards),
        1000
      );
      setIsActing(false);
      return;
    }

    // Жива гра через Supabase RPC
    const client = getSupabaseClient();
    if (!client) {
      setIsActing(false);
      return;
    }

    try {
      const { data, error } = await client.rpc("pvp_bj_action", {
        p_duel_id: liveBjMatch.duel_id,
        p_action: "stand",
      });
      if (error) throw error;
      if (data && currentUser) {
        const isChallenger = currentUser.id === data.challenger_id;
        setLiveBjMatch((prev) =>
          prev
            ? {
                ...prev,
                status: data.status,
                current_turn: data.current_turn,
                challenger_finished: data.challenger_finished,
                opponent_finished: data.opponent_finished,
                winner_id: data.winner_id,
                winner_name: data.winner_name,
                pot: data.pot,
                deck: data.deck || [],
                challenger_cards: isChallenger ? (data.my_cards || []) : (data.opponent_cards || []),
                opponent_cards: !isChallenger ? (data.my_cards || []) : (data.opponent_cards || []),
                challenger_score: isChallenger ? (data.my_score || 0) : (data.opponent_score || 0),
                opponent_score: !isChallenger ? (data.my_score || 0) : (data.opponent_score || 0),
                last_move_at: data.last_move_at,
              }
            : null
        );
        if (data.status === "completed") {
          window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        }
      }
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message || "Помилка ходу.");
    } finally {
      setIsActing(false);
    }
  }

  // ПОКРОКОВИЙ ШІ-ХІД БОТА
  function runBotTurn(playerScore: number, currentDeck: number[], currentBotHand: number[]) {
    const botHand = [...currentBotHand];
    const deck = [...currentDeck];
    let botScore = calculateHandValue(botHand);

    // Бот добирає карти, поки менше 17
    while (botScore < 17 && deck.length > 0) {
      const card = deck.shift()!;
      botHand.push(card);
      botScore = calculateHandValue(botHand);
    }

    // Визначаємо переможця
    let winId: string | null = null;
    let winName: string | null = null;

    if (playerScore > 21 && botScore <= 21) {
      winId = liveBjMatch?.opponent_id || "bot";
      winName = liveBjMatch?.opponent_name || "Бот";
    } else if (botScore > 21 && playerScore <= 21) {
      winId = currentUser?.id || "player";
      winName = currentUser?.username || "Ви";
    } else if (playerScore > 21 && botScore > 21) {
      winId = null; // Нічия
    } else if (playerScore > botScore) {
      winId = currentUser?.id || "player";
      winName = currentUser?.username || "Ви";
    } else if (botScore > playerScore) {
      winId = liveBjMatch?.opponent_id || "bot";
      winName = liveBjMatch?.opponent_name || "Бот";
    } else {
      winId = null; // Рівно
    }

    // Виплата виграшу
    if (winId === currentUser?.id && currentUser && liveBjMatch) {
      if (liveBjMatch.currency === "coins") {
        setCurrentUser({ ...currentUser, coins: currentUser.coins + liveBjMatch.pot });
      } else {
        setCurrentUser({ ...currentUser, hohlyantsi: currentUser.hohlyantsi + liveBjMatch.pot });
      }
    } else if (winId === null && currentUser && liveBjMatch) {
      // Повернення при нічиїй
      if (liveBjMatch.currency === "coins") {
        setCurrentUser({ ...currentUser, coins: currentUser.coins + liveBjMatch.stake });
      } else {
        setCurrentUser({ ...currentUser, hohlyantsi: currentUser.hohlyantsi + liveBjMatch.stake });
      }
    }

    setLiveBjMatch((prev) =>
      prev
        ? {
            ...prev,
            deck,
            opponent_cards: botHand,
            opponent_score: botScore,
            opponent_finished: true,
            status: "completed",
            winner_id: winId,
            winner_name: winName,
          }
        : null
    );
  }

  // КОСТІ ПРОТИ БОТА
  function simulateBotDiceMatch(bot: Player, stake: number, curr: DuelCurrency) {
    if (!currentUser) return;
    const p1 = Math.floor(Math.random() * 6) + 1;
    const p2 = Math.floor(Math.random() * 6) + 1;
    const b1 = Math.floor(Math.random() * 6) + 1;
    const b2 = Math.floor(Math.random() * 6) + 1;

    const pScore = p1 + p2;
    const bScore = b1 + b2;

    let winId: string | null = null;
    let winName: string | null = null;

    if (pScore > bScore) {
      winId = currentUser.id;
      winName = currentUser.username;
      if (curr === "coins") {
        setCurrentUser({ ...currentUser, coins: currentUser.coins + stake });
      } else {
        setCurrentUser({ ...currentUser, hohlyantsi: currentUser.hohlyantsi + stake });
      }
    } else if (bScore > pScore) {
      winId = bot.id;
      winName = bot.username;
      if (curr === "coins") {
        setCurrentUser({ ...currentUser, coins: Math.max(0, currentUser.coins - stake) });
      } else {
        setCurrentUser({ ...currentUser, hohlyantsi: Math.max(0, currentUser.hohlyantsi - stake) });
      }
    }

    setActiveDiceDuel({
      challenger_name: currentUser.username,
      opponent_name: bot.username,
      stake,
      currency: curr,
      challenger_score: pScore,
      opponent_score: bScore,
      challenger_roll: [p1, p2],
      opponent_roll: [b1, b2],
      winner_id: winId,
      winner_name: winName,
      pot: stake * 2,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ПРИЙНЯТИ ВИКЛИК ЖИВОГО ГРАВЦЯ
  async function handleRespondInvite(invite: DuelInvite, action: "accept" | "decline") {
    if (isDemoMode) return;
    const client = getSupabaseClient();
    if (!client) return;

    setAcceptingDuelId(invite.id);
    setErrorMsg(null);
    setMessage(null);

    try {
      const { data, error } = await client.rpc("respond_duel_invite", {
        p_duel_id: invite.id,
        p_action: action,
      });

      if (error) throw error;

      setIncomingInvites((prev) => prev.filter((i) => i.id !== invite.id));

      if (action === "accept" && data) {
        if (invite.game_type === "blackjack") {
          // Заходимо в інтерактивну кімнату Блекджеку!
          const isCh = currentUser?.id === data.challenger_id;
          setLiveBjMatch({
            duel_id: data.duel_id || invite.id,
            challenger_id: data.challenger_id || invite.challenger_id,
            opponent_id: data.opponent_id || invite.opponent_id,
            challenger_name: data.challenger_name || invite.challenger_name,
            opponent_name: data.opponent_name || currentUser?.username || "Ви",
            stake: data.stake ?? invite.stake,
            currency: data.currency || invite.currency,
            deck: data.deck || [],
            challenger_cards: isCh ? (data.my_cards || data.challenger_cards || []) : (data.opponent_cards || []),
            opponent_cards: !isCh ? (data.my_cards || data.opponent_cards || []) : (data.opponent_cards || []),
            challenger_score: isCh ? (data.my_score ?? data.challenger_score ?? 0) : (data.opponent_score ?? 0),
            opponent_score: !isCh ? (data.my_score ?? data.opponent_score ?? 0) : (data.opponent_score ?? 0),
            current_turn: data.current_turn,
            challenger_finished: data.challenger_finished || false,
            opponent_finished: data.opponent_finished || false,
            status: data.status || "playing",
            winner_id: data.winner_id || null,
            winner_name: data.winner_name || null,
            pot: data.pot,
            last_move_at: data.last_move_at,
          });
        } else {
          // Кості
          setActiveDiceDuel({
            challenger_name: invite.challenger_name,
            opponent_name: currentUser?.username || "Ви",
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
                : currentUser?.username || null,
            pot: data.pot,
          });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      } else if (action === "decline") {
        setMessage("Виклик відхилено.");
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg((err as { message?: string })?.message || "Не вдалося прийняти виклик.");
    } finally {
      setAcceptingDuelId(null);
    }
  }

  async function handleClaimTimeout() {
    if (isDemoMode) return;
    if (!liveBjMatch || isClaimingTimeout || liveBjMatch.isBotMatch) return;
    const client = getSupabaseClient();
    if (!client) return;

    setIsClaimingTimeout(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const { error } = await client.rpc("claim_duel_timeout", {
        p_duel_id: liveBjMatch.duel_id,
      });

      if (error) throw error;
      setMessage("⚡ Суперник не зробив хід вчасно (60 сек). Зараховано технічну перемогу, банк виплачено!");
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

      const { data: viewData } = await client.rpc("pvp_view", { p_duel_id: liveBjMatch.duel_id });
      if (viewData && currentUser) {
        const isChallenger = currentUser.id === viewData.challenger_id;
        setLiveBjMatch({
          duel_id: viewData.duel_id,
          challenger_id: viewData.challenger_id,
          opponent_id: viewData.opponent_id,
          challenger_name: viewData.challenger_name,
          opponent_name: viewData.opponent_name,
          stake: viewData.stake,
          currency: viewData.currency,
          deck: viewData.deck || [],
          challenger_cards: isChallenger ? (viewData.my_cards || []) : (viewData.opponent_cards || []),
          opponent_cards: !isChallenger ? (viewData.my_cards || []) : (viewData.opponent_cards || []),
          challenger_score: isChallenger ? (viewData.my_score || 0) : (viewData.opponent_score || 0),
          opponent_score: !isChallenger ? (viewData.my_score || 0) : (viewData.opponent_score || 0),
          current_turn: viewData.current_turn,
          challenger_finished: viewData.challenger_finished || false,
          opponent_finished: viewData.opponent_finished || false,
          status: viewData.status,
          winner_id: viewData.winner_id,
          winner_name: viewData.winner_name,
          pot: viewData.pot,
          last_move_at: viewData.last_move_at,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg((err as { message?: string })?.message || "Таймаут ще не настав (потрібно 60 сек бездіяльності суперника).");
    } finally {
      setIsClaimingTimeout(false);
    }
  }

  if (isDemoMode) {
    return (
      <main className="min-h-screen flex-1 bg-[#07090d] px-4 py-8 font-mono text-slate-100 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <Link
              href="/leagues"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition"
            >
              ← Назад до списку ліг
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/blackjack"
                className="rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
              >
                🃏 Блекджек
              </Link>
              <Link
                href="/wheel"
                className="rounded-lg border border-purple-800 bg-purple-950/30 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-900/40 transition"
              >
                🎡 Колесо
              </Link>
            </div>
          </div>

          <div className="my-16 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-950/30 text-4xl shadow-xl shadow-indigo-950/50 mb-6">
              🌐
            </div>
            <div className="inline-block rounded-full border border-indigo-500/50 bg-indigo-950/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-300 mb-4">
              Демо-режим
            </div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
              Недоступно в демо-версії
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm text-slate-400 leading-relaxed">
              Мережеві PvP-дуелі між реальними гравцями вимкнено для показу освітнім партнерам. Ознайомтеся з одиночними режимами гри (Блекджек, Колесо фортуни) та лігами прогнозів.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/leagues"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-900/40 transition hover:from-indigo-500 hover:to-cyan-400"
              >
                Перейти до ліг
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

  function handleCloseLiveBj() {
    if (liveBjMatch) {
      const dId = liveBjMatch.duel_id;
      closedDuelIdsRef.current = [...closedDuelIdsRef.current, dId].slice(-50);
      setClosedDuelIds((prev) => {
        const next = [...new Set([...prev, dId])].slice(-50);
        try {
          localStorage.setItem("matchday:closed_duels", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    setLiveBjMatch(null);
  }

  const isMyTurn =
    liveBjMatch &&
    liveBjMatch.status === "playing" &&
    liveBjMatch.current_turn === currentUser?.id;

  const amIChallenger = liveBjMatch && currentUser?.id === liveBjMatch.challenger_id;
  const myCards = liveBjMatch ? (amIChallenger ? liveBjMatch.challenger_cards : liveBjMatch.opponent_cards) : [];
  const myScore = liveBjMatch ? (amIChallenger ? liveBjMatch.challenger_score : liveBjMatch.opponent_score) : 0;
  const oppCards = liveBjMatch ? (amIChallenger ? liveBjMatch.opponent_cards : liveBjMatch.challenger_cards) : [];
  const oppScore = liveBjMatch ? (amIChallenger ? liveBjMatch.opponent_score : liveBjMatch.challenger_score) : 0;
  const oppName = liveBjMatch ? (amIChallenger ? liveBjMatch.opponent_name : liveBjMatch.challenger_name) : "Опонент";

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
              🃏 Соло Блекджек
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
              <span>{currentUser ? currentUser.hohlyantsi : 25} Бонусів</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-block rounded-full border border-indigo-500/40 bg-indigo-950/30 px-4 py-1 text-xs text-indigo-300 font-bold mb-3">
            ⚔️ ІНТЕРАКТИВНІ ОНЛАЙН ДУЕЛІ (TURN-BASED PVP)
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            ОНЛАЙН АРЕНА
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-400 sm:text-sm">
            Живий стіл для двох у Блекджек (черга ходів, кнопки HIT та STAND) або швидкі дуелі в Кості!
          </p>
        </header>

        {/* Повідомлення */}
        {message && (
          <div className="mb-6 rounded-xl border border-emerald-600 bg-emerald-950/40 p-4 text-center text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 rounded-xl border border-rose-600 bg-rose-950/40 p-4 text-center text-sm font-bold text-rose-300">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ЖИВИЙ ПОКРОКОВИЙ СТІЛ БЛЕКДЖЕКУ (LIVE 3D PVP TABLE) */}
        {/* ========================================================================= */}
        {liveBjMatch && (
          <section className="mb-12 overflow-hidden rounded-[2.5rem] border-4 border-cyan-800/80 bg-gradient-to-b from-[#0e1624] via-[#091018] to-black p-4 sm:p-8 shadow-[0_0_80px_rgba(6,182,212,0.3)] animate-in zoom-in-95">
            {/* Верхня плашка матчу */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-900/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-widest text-cyan-300">
                  ЖИВИЙ СТІЛ БЛЕКДЖЕКУ НА ДВОХ
                </span>
              </div>
              <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 px-4 py-1.5 text-xs font-black text-amber-300">
                💰 БАНК ДУЕЛІ: {liveBjMatch.pot.toLocaleString()}{" "}
                {liveBjMatch.currency === "coins" ? "🪙 Монет" : "🔘 Бонусів"}
              </div>
            </div>

            {/* СУПЕРНИК (ВЕРХ СТОЛУ) */}
            <div className="my-6 rounded-3xl border border-slate-800 bg-[#0b0e14]/80 p-5 text-center">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1.5">
                  <span>👤 Опонент:</span>
                  <span className="text-white font-black">{oppName}</span>
                </span>
                <span className="text-purple-400 font-bold">
                  {liveBjMatch.status === "completed"
                    ? `Сума: ${oppScore}`
                    : liveBjMatch.current_turn === (amIChallenger ? liveBjMatch.opponent_id : liveBjMatch.challenger_id)
                    ? "⏳ Робить хід..."
                    : "✓ Чекає вашого ходу (карти закриті 🂠)"}
                </span>
              </div>

              {/* Карти суперника */}
              <div className="flex flex-wrap justify-center gap-3 min-h-28 items-center">
                {liveBjMatch.status === "completed" ? oppCards.map((c, i) => renderPvpCard(c, `opp-${i}`)) : oppCards.map((_, i) => renderPvpCardBack(`opp-back-${i}`))}
              </div>
            </div>

            {/* БАНЕР ЧЕРГИ ХОДУ В ЦЕНТРІ СТОЛУ */}
            <div className="my-6 text-center">
              {liveBjMatch.status === "playing" ? (
                isMyTurn ? (
                  <div className="inline-block rounded-2xl border-2 border-emerald-400 bg-emerald-950/70 px-6 py-2.5 text-base font-black text-emerald-300 uppercase shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-pulse">
                    ⚡ ВАШ ХІД! Оберіть: взяти ще карту чи зупинитися
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-block rounded-2xl border border-slate-700 bg-black/60 px-6 py-2.5 text-xs font-bold text-slate-400 uppercase">
                      ⏳ Хід опонента ({oppName}) · Очікуємо його рішення...
                    </div>
                    {!liveBjMatch.isBotMatch && (
                      <button
                        type="button"
                        disabled={isClaimingTimeout}
                        onClick={handleClaimTimeout}
                        className="rounded-xl border border-rose-600/70 bg-rose-950/50 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition shadow-lg cursor-pointer disabled:opacity-50"
                        title="Якщо опонент бездіє або закрив вкладку понад 60 секунд"
                      >
                        {isClaimingTimeout
                          ? "⏳ Перевірка таймауту..."
                          : "⏱️ Опонент не ходить? Зарахувати технічну перемогу (60с)"}
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* ФІНАЛЬНИЙ РЕЗУЛЬТАТ МАТЧУ */
                <div className="rounded-3xl border-2 border-amber-500 bg-gradient-to-r from-amber-950/80 via-black to-amber-950/80 p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.4)]">
                  <span className="text-4xl">🏆</span>
                  <h3 className="mt-2 text-2xl font-black uppercase text-white">
                    {liveBjMatch.winner_id === currentUser?.id
                      ? "🎉 ВИ ПЕРЕМОГЛИ В ДУЕЛІ!"
                      : liveBjMatch.winner_id === null
                      ? "🤝 НІЧИЯ! СТАВКИ ПОВЕРНЕНО"
                      : `💀 ПЕРЕМІГ ${liveBjMatch.winner_name}!`}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Ваші очки: <span className="text-cyan-400 font-bold">{myScore}</span> · Очки
                    суперника: <span className="text-purple-400 font-bold">{oppScore}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleCloseLiveBj}
                    className="mt-5 rounded-xl bg-amber-500 px-8 py-2.5 font-sans text-xs font-black uppercase text-black hover:bg-amber-400 transition"
                  >
                    Повернутися до лобі
                  </button>
                </div>
              )}
            </div>

            {/* ВИ (НИЗ СТОЛУ) */}
            <div className="my-6 rounded-3xl border-2 border-cyan-800/50 bg-[#0d121c]/90 p-5 text-center">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>🟢 Ви:</span>
                  <span className="text-white font-black">{currentUser?.username}</span>
                </span>
                <span className="rounded-lg bg-cyan-950/80 border border-cyan-500/50 px-3 py-1 font-black text-cyan-300 text-sm">
                  СУМА КАРТ: {myScore} {myScore > 21 ? "(💥 ПЕРЕБІР!)" : myScore === 21 ? "(🔥 21!)" : ""}
                </span>
              </div>

              {/* Ваші карти */}
              <div className="flex flex-wrap justify-center gap-3 min-h-28 items-center">
                {myCards.map((c, i) => renderPvpCard(c, `my-${i}`))}
              </div>
            </div>

            {/* КНОПКИ ДІЙ ГРАВЦЯ (HIT / STAND) */}
            {liveBjMatch.status === "playing" && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleBjHit}
                  disabled={!isMyTurn || isActing}
                  className="h-16 w-full sm:w-60 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 border-b-4 border-emerald-900 font-sans text-base font-black uppercase tracking-wider text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:brightness-110 active:translate-y-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isActing ? "..." : "🃏 ВЗЯТИ КАРТУ (HIT)"}
                </button>

                <button
                  type="button"
                  onClick={handleBjStand}
                  disabled={!isMyTurn || isActing}
                  className="h-16 w-full sm:w-60 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 border-b-4 border-amber-900 font-sans text-base font-black uppercase tracking-wider text-black shadow-[0_10px_25px_rgba(245,158,11,0.3)] hover:brightness-110 active:translate-y-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isActing ? "..." : "✋ ЗУПИНИТИСЯ (STAND)"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* РЕЗУЛЬТАТ ДУЕЛІ В КОСТІ */}
        {/* ========================================================================= */}
        {activeDiceDuel && (
          <section className="mb-10 rounded-3xl border-4 border-red-800 bg-[#120d14] p-6 text-center animate-in zoom-in-95">
            <span className="text-xs font-black uppercase tracking-widest text-red-400 block mb-3">
              🎲 РЕЗУЛЬТАТ ДУЕЛІ В КОСТІ
            </span>
            <div className="grid grid-cols-2 gap-4 my-4">
              <div className="rounded-2xl border border-slate-700 bg-black/60 p-4">
                <span className="text-xs text-slate-400 block mb-1">{activeDiceDuel.challenger_name}</span>
                <span className="text-3xl font-black text-cyan-400">{activeDiceDuel.challenger_score}</span>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-black/60 p-4">
                <span className="text-xs text-slate-400 block mb-1">{activeDiceDuel.opponent_name}</span>
                <span className="text-3xl font-black text-purple-400">{activeDiceDuel.opponent_score}</span>
              </div>
            </div>
            <div className="my-4 text-lg font-black text-amber-300">
              {activeDiceDuel.winner_id ? `🏆 Переможець: ${activeDiceDuel.winner_name}!` : "🤝 Нічия!"}
            </div>
            <button
              type="button"
              onClick={() => setActiveDiceDuel(null)}
              className="rounded-xl bg-slate-800 px-6 py-2 text-xs font-bold uppercase text-white hover:bg-slate-700"
            >
              Закрити
            </button>
          </section>
        )}

        {/* ========================================================================= */}
        {/* ВХІДНІ ВИКЛИКИ НА ГРУ */}
        {/* ========================================================================= */}
        {incomingInvites.length > 0 && (
          <section className="mb-10 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
              <span className="animate-ping inline-block h-2 w-2 rounded-full bg-amber-400" />
              🔔 ВАМ ПРИЙШОВ ВИКЛИК НА ГРУ ({incomingInvites.length})
            </h2>
            {incomingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-amber-950/50 via-slate-900 to-black p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              >
                <div>
                  <span className="text-xs font-black uppercase text-amber-300">
                    {inv.game_type === "blackjack" ? "🃏 БЛЕКДЖЕК (ЖИВИЙ СТІЛ)" : "🎲 ДУЕЛЬ В КОСТІ"}
                  </span>
                  <div className="text-base font-bold text-white mt-1">
                    Гравець <span className="text-amber-400 font-black">{inv.challenger_name}</span> кличе вас грати!
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Ставка: <span className="font-black text-white">{inv.stake} {inv.currency === "coins" ? "🪙 Монет" : "🔘 Бонусів"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRespondInvite(inv, "accept")}
                    disabled={acceptingDuelId === inv.id}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 font-sans text-xs font-black uppercase tracking-wider text-white shadow-lg hover:from-emerald-500 hover:to-teal-400 transition"
                  >
                    {acceptingDuelId === inv.id ? "Приймаємо..." : "⚔️ ПРИЙНЯТИ"}
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

        {/* ОЧІКУВАННЯ ВІДПРАВЛЕНИХ */}
        {outgoingInvites.length > 0 && (
          <section className="mb-10 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              ⏳ ОЧІКУВАННЯ ВІДПОВІДІ СУПЕРНИКА ({outgoingInvites.length})
            </h2>
            {outgoingInvites.map((out) => (
              <div
                key={out.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 text-xs"
              >
                <div>
                  Ви викликали гравця <span className="font-bold text-indigo-400">{out.opponent_name}</span> у{" "}
                  {out.game_type === "blackjack" ? "Блекджек" : "Кості"} на {out.stake}{" "}
                  {out.currency === "coins" ? "монет" : "бонусів"}.
                </div>
                <button
                  type="button"
                  onClick={() => handleRespondInvite(out, "decline")}
                  className="rounded-lg bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300 hover:bg-rose-900/40 hover:text-rose-300 transition"
                >
                  Скасувати
                </button>
              </div>
            ))}
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
                Обери суперника та натисни «Викликати на дуель»
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

        {/* МОДАЛЬНЕ ВІКНО СТВОРЕННЯ ВИКЛИКУ */}
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
                    onClick={() => setDuelGame("blackjack")}
                    className={`rounded-xl border-2 p-3 text-center transition ${
                      duelGame === "blackjack"
                        ? "border-cyan-500 bg-cyan-950/60 text-white font-bold"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    🃏 Блекджек (Стіл)
                  </button>
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
                    🔘 Бонуси
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
