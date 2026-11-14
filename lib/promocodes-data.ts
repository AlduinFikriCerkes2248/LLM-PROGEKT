"use client";

export interface PromoEasterEgg {
  code: string;
  name: string;
  desc: string;
  gifUrl: string;
  soundType: "marchenko" | "standard";
  reward: {
    coins: number;
    bonuses: number;
    xp: number;
    title?: string;
  };
  secretHint: string;
  badgeTag: string;
}

export const PROMO_EASTER_EGGS: PromoEasterEgg[] = [
  {
    code: "MARCHENKO",
    name: "👑 Секрет Овеликого Марченка",
    desc: "Легендарна котяча пасхалка! Ви активували прихований мем Марченка зі звуком «Мяу» та золотим котячим кубком.",
    gifUrl: "/gifs/marchenko.gif",
    soundType: "marchenko",
    reward: {
      coins: 77777,
      bonuses: 77,
      xp: 777,
      title: "👑 Адепт Марченка",
    },
    secretHint: "Прізвище легендарного гравця матчів, що любить нявкати...",
    badgeTag: "🐱 МАРЧЕНКО",
  },
  {
    code: "GOYDA",
    name: "🔥 Супер-Гойда Бонус",
    desc: "Вибухова великодка з святковими салютами та золотим трофеєм! Патріотичний заряд енергії на платформі MATCHDAY.",
    gifUrl: "/gifs/goyda.gif",
    soundType: "standard",
    reward: {
      coins: 50000,
      bonuses: 30,
      xp: 500,
      title: "🔥 Гойда-Майстер",
    },
    secretHint: "Слово-вигук, на честь якого названо робочу папку проекту...",
    badgeTag: "🔥 ГОЙДА",
  },
  {
    code: "MATRIX",
    name: "🕶️ Злам Матриці",
    desc: "Цифровий зелений дощ та окуляри Нео. Ви успішно зламали цифровий код платформи та підключились до Матриці!",
    gifUrl: "/gifs/matrix.gif",
    soundType: "standard",
    reward: {
      coins: 100000,
      bonuses: 100,
      xp: 1000,
      title: "🕶️ Обраний Нео",
    },
    secretHint: "Культовий фільм про синю/червону пігулку та бінарний код...",
    badgeTag: "🕶️ MATRIX",
  },
  {
    code: "MATCHDAY2026",
    name: "⚽ Футбольний Буст Matchday",
    desc: "ГОООООЛ! Вітальний чемпіонський набір для справжніх фанатів футболу та лідерів турнірних таблиць.",
    gifUrl: "/gifs/football.gif",
    soundType: "standard",
    reward: {
      coins: 35000,
      bonuses: 25,
      xp: 400,
      title: "⚽ Снайпер Ліги",
    },
    secretHint: "Назва нашої платформи та поточний футбольний сезон...",
    badgeTag: "⚽ MATCHDAY",
  },
  {
    code: "LUCKY",
    name: "💰 Скарбниця Хайролера",
    desc: "Золотий дощ із монет та комбінація трьох сімок 777! Удача посміхається сміливим хайролерам.",
    gifUrl: "/gifs/jackpot.gif",
    soundType: "standard",
    reward: {
      coins: 60000,
      bonuses: 50,
      xp: 600,
      title: "💰 Золотий Магнат",
    },
    secretHint: "Англійське слово, що означає 'везунчик'...",
    badgeTag: "💰 LUCKY",
  },
];

export const REDEEMED_PROMOS_KEY = "matchday:redeemed_promos";

export function loadRedeemedPromos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REDEEMED_PROMOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRedeemedPromos(codes: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REDEEMED_PROMOS_KEY, JSON.stringify(codes));
  } catch {}
}

export function findPromoEasterEgg(input: string): PromoEasterEgg | null {
  const clean = input.trim().toUpperCase();
  if (!clean) return null;

  // Прямий пошук або аліаси (наприклад кирилицею)
  if (clean === "MARCHENKO" || clean === "МАРЧЕНКО" || clean === "МЯУ") {
    return PROMO_EASTER_EGGS[0];
  }
  if (clean === "GOYDA" || clean === "ГОЙДА" || clean === "ГОЙДАФФ") {
    return PROMO_EASTER_EGGS[1];
  }
  if (clean === "MATRIX" || clean === "МАТРИЦЯ" || clean === "НЕО" || clean === "NEO") {
    return PROMO_EASTER_EGGS[2];
  }
  if (clean === "MATCHDAY2026" || clean === "MATCHDAY" || clean === "МАТЧДЕЙ") {
    return PROMO_EASTER_EGGS[3];
  }
  if (clean === "LUCKY" || clean === "ВЕЗУНЧИК" || clean === "ДЖЕКПОТ" || clean === "JACKPOT") {
    return PROMO_EASTER_EGGS[4];
  }

  return PROMO_EASTER_EGGS.find((p) => p.code === clean) || null;
}
