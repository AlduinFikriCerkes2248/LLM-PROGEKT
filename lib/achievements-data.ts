"use client";

import { AchievementRarity } from "@/components/achievement-badge";

export type AchievementCategory = "all" | "predictions" | "casino" | "pvp" | "cases" | "secret";

export interface AchievementItem {
  id: string;
  title: string;
  desc: string;
  rarity: AchievementRarity;
  category: "predictions" | "casino" | "pvp" | "cases" | "secret";
  iconType: string;
  target: number;
  current: number;
  reward: {
    coins: number;
    bonuses: number;
    xp: number;
    title?: string;
  };
  completed: boolean;
  claimed: boolean;
}

export const INITIAL_ACHIEVEMENTS: AchievementItem[] = [
  // =========================================================================
  // 1. ЗВИЧАЙНІ (ОБИЧНІ / COMMON)
  // =========================================================================
  {
    id: "first_pred",
    title: "Перший удар",
    desc: "Зробити свій перший прогноз на футбольний матч у лізі.",
    rarity: "common",
    category: "predictions",
    iconType: "ball",
    target: 1,
    current: 1, // Стартовий приклад для демонстрації
    reward: { coins: 500, bonuses: 2, xp: 30 },
    completed: true,
    claimed: true,
  },
  {
    id: "profile_avatar",
    title: "Цифрова особа",
    desc: "Встановити персональний аватар або заповнити опис «Про себе».",
    rarity: "common",
    category: "secret",
    iconType: "profile",
    target: 1,
    current: 1,
    reward: { coins: 300, bonuses: 0, xp: 20 },
    completed: true,
    claimed: true,
  },
  {
    id: "spin_wheel",
    title: "Крути колесо",
    desc: "Зробити свій перший спін на Колесі Фортуни.",
    rarity: "common",
    category: "casino",
    iconType: "wheel",
    target: 1,
    current: 1,
    reward: { coins: 400, bonuses: 1, xp: 25 },
    completed: true,
    claimed: false,
  },
  {
    id: "roll_dice",
    title: "Кидок костей",
    desc: "Зіграти хоча б один раунд у Кості (Craps / Dice).",
    rarity: "common",
    category: "casino",
    iconType: "dice",
    target: 1,
    current: 0,
    reward: { coins: 400, bonuses: 1, xp: 25 },
    completed: false,
    claimed: false,
  },
  {
    id: "open_loot",
    title: "Перший лут",
    desc: "Забрати безкоштовний щоденний бонус або відкрити будь-який кейс.",
    rarity: "common",
    category: "cases",
    iconType: "crate",
    target: 1,
    current: 1,
    reward: { coins: 300, bonuses: 2, xp: 20 },
    completed: true,
    claimed: false,
  },

  // =========================================================================
  // 2. РІДКІСНІ (РІДКІ / RARE)
  // =========================================================================
  {
    id: "exact_score",
    title: "Снайпер рахунку",
    desc: "Вгадати точний рахунок матчу в лізі прогнозів (Full Hit).",
    rarity: "rare",
    category: "predictions",
    iconType: "target",
    target: 1,
    current: 0,
    reward: { coins: 2000, bonuses: 5, xp: 100 },
    completed: false,
    claimed: false,
  },
  {
    id: "blackjack_21",
    title: "Натуральний 21",
    desc: "Вибити Блекджек з перших двох карт у класичному блекджеку.",
    rarity: "rare",
    category: "casino",
    iconType: "cards",
    target: 1,
    current: 1,
    reward: { coins: 3000, bonuses: 8, xp: 150 },
    completed: true,
    claimed: false,
  },
  {
    id: "first_duel_win",
    title: "Гладіатор арени",
    desc: "Перемогти в онлайн-дуелі PvP проти реального суперника.",
    rarity: "rare",
    category: "pvp",
    iconType: "swords",
    target: 1,
    current: 0,
    reward: { coins: 2500, bonuses: 5, xp: 120 },
    completed: false,
    claimed: false,
  },
  {
    id: "gemini_ai",
    title: "Нейро-Оракул",
    desc: "Згенерувати 3 тактичні ШІ-аналітики футбольних матчів через Gemini.",
    rarity: "rare",
    category: "predictions",
    iconType: "ai-chip",
    target: 3,
    current: 2,
    reward: { coins: 1500, bonuses: 4, xp: 80 },
    completed: false,
    claimed: false,
  },
  {
    id: "matrix_neo",
    title: "Хакер Матриці",
    desc: "Перемкнути темний і світлий режим 5 разів з Matrix-анімацією.",
    rarity: "rare",
    category: "secret",
    iconType: "matrix",
    target: 5,
    current: 0,
    reward: { coins: 1000, bonuses: 3, xp: 50 },
    completed: false,
    claimed: false,
  },

  // =========================================================================
  // 3. ЕПІЧНІ (ЕПІЧЕСЬКІ / EPIC)
  // =========================================================================
  {
    id: "great_marchenko",
    title: "Овеликий Марченко",
    desc: "Поставити легендарного Марченка як гравця в змаганнях або прев'ю 5 разів!",
    rarity: "epic",
    category: "predictions",
    iconType: "marchenko",
    target: 5,
    current: 0,
    reward: { coins: 50000, bonuses: 100, xp: 800, title: "Культ Марченка" },
    completed: false,
    claimed: false,
  },
  {
    id: "win_streak",
    title: "Вогняний стрік",
    desc: "Вгадати результати 5 футбольних матчів поспіль без жодної поразки.",
    rarity: "epic",
    category: "predictions",
    iconType: "fire",
    target: 5,
    current: 2,
    reward: { coins: 15000, bonuses: 20, xp: 400 },
    completed: false,
    claimed: false,
  },
  {
    id: "dice_double_six",
    title: "Щасливий дубль 6:6",
    desc: "Викинути комбінацію двох шісток у грі в Кості (Craps).",
    rarity: "epic",
    category: "casino",
    iconType: "dice",
    target: 1,
    current: 0,
    reward: { coins: 10000, bonuses: 15, xp: 350 },
    completed: false,
    claimed: false,
  },
  {
    id: "wheel_jackpot",
    title: "Джекпот Колеса",
    desc: "Виграти сектор Джекпот або мультиплікатор x10 на Колесі Фортуни.",
    rarity: "epic",
    category: "casino",
    iconType: "wheel",
    target: 1,
    current: 0,
    reward: { coins: 20000, bonuses: 25, xp: 500 },
    completed: false,
    claimed: false,
  },
  {
    id: "pro_cases_3",
    title: "Тактичний магнат",
    desc: "Придбати та відкрити 3 Професійні кейси (Tier II) або вище.",
    rarity: "epic",
    category: "cases",
    iconType: "crate",
    target: 3,
    current: 1,
    reward: { coins: 30000, bonuses: 50, xp: 600 },
    completed: false,
    claimed: false,
  },

  // =========================================================================
  // 4. МІФІЧНІ (МІФІЧЕСЬКІ / MYTHIC)
  // =========================================================================
  {
    id: "lucky_loss_200k",
    title: "Везунчик По Полній",
    desc: "Проєбати +200 000 валюти в азартних іграх (Блекджек, Кості або Дуелі). Отримай повний кешбек!",
    rarity: "mythic",
    category: "casino",
    iconType: "skull-loss",
    target: 200000,
    current: 75000,
    reward: { coins: 200000, bonuses: 300, xp: 2000, title: "Непохитний Хайролер" },
    completed: false,
    claimed: false,
  },
  {
    id: "highroller_bj",
    title: "Гроза дилерів",
    desc: "Виграти 100 000+ монет в одній роздачі Блекджеку.",
    rarity: "mythic",
    category: "casino",
    iconType: "cards",
    target: 100000,
    current: 45000,
    reward: { coins: 75000, bonuses: 150, xp: 1500 },
    completed: false,
    claimed: false,
  },
  {
    id: "duel_master_10",
    title: "Непереможний дуелянт",
    desc: "Здобути 10 перемог в онлайн PvP дуелях проти реальних гравців.",
    rarity: "mythic",
    category: "pvp",
    iconType: "swords",
    target: 10,
    current: 3,
    reward: { coins: 80000, bonuses: 180, xp: 1600 },
    completed: false,
    claimed: false,
  },

  // =========================================================================
  // 5. ЛЕГЕНДАРНІ (ЛЕГЕНДАРНІ / LEGENDARY)
  // =========================================================================
  {
    id: "millionaire",
    title: "Володар Мільйона",
    desc: "Накопичити на рахунку понад 1 000 000 монет одночасно.",
    rarity: "legendary",
    category: "secret",
    iconType: "crown",
    target: 1000000,
    current: 1088233, // Вже виконано на балансі Максима!
    reward: { coins: 250000, bonuses: 500, xp: 5000, title: "👑 Мільйонер MATCHDAY" },
    completed: true,
    claimed: false,
  },
  {
    id: "legendary_case",
    title: "Міфічний куш",
    desc: "Відкрити найдорожчий «Кейс 3 · Легендарний VIP» та забрати царський лут.",
    rarity: "legendary",
    category: "cases",
    iconType: "crate",
    target: 1,
    current: 0,
    reward: { coins: 500000, bonuses: 400, xp: 4000 },
    completed: false,
    claimed: false,
  },
  {
    id: "all_champion",
    title: "Абсолютний Чемпіон",
    desc: "Розблокувати 15 будь-яких досягнень на платформі MATCHDAY.",
    rarity: "legendary",
    category: "secret",
    iconType: "trophy",
    target: 15,
    current: 5,
    reward: { coins: 300000, bonuses: 600, xp: 10000, title: "LEGEND OF MATCHDAY" },
    completed: false,
    claimed: false,
  },
  // =========================================================================
  // 6. ЗИМОВА СЕРІЯ (WINTER 2026)
  // =========================================================================
  {
    id: "snow_storm_games",
    title: "❄️ Снігова Буря",
    desc: "Зіграти 5 раундів у Кості або Блекджек із ввімкненою Зимовою темою.",
    rarity: "rare",
    category: "casino",
    iconType: "fire",
    target: 5,
    current: 0,
    reward: { coins: 5000, bonuses: 20, xp: 250 },
    completed: false,
    claimed: false,
  },
  {
    id: "winter_curtain_explorer",
    title: "🧣 Дослідник Завірюхи",
    desc: "Потягнути за зимову завісу та відкрити Зимовий Адвент-календар.",
    rarity: "rare",
    category: "secret",
    iconType: "crate",
    target: 1,
    current: 0,
    reward: { coins: 3000, bonuses: 15, xp: 200, title: "❄️ Зимовий Мандрівник" },
    completed: false,
    claimed: false,
  },
  {
    id: "polar_highroller",
    title: "💎 Полярний Хайролер",
    desc: "Відкрити 3 зимові святкові кейси в розділі «Кейси».",
    rarity: "epic",
    category: "cases",
    iconType: "crown",
    target: 3,
    current: 0,
    reward: { coins: 25000, bonuses: 40, xp: 600, title: "❄️ Полярний Хайролер" },
    completed: false,
    claimed: false,
  },
];

export const ACHIEVEMENTS_STORAGE_KEY = "matchday:achievements_state";

export function loadAchievementsState(): AchievementItem[] {
  if (typeof window === "undefined") return INITIAL_ACHIEVEMENTS;
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return INITIAL_ACHIEVEMENTS;
    const parsed = JSON.parse(raw) as Partial<AchievementItem>[];
    return INITIAL_ACHIEVEMENTS.map((initial) => {
      const saved = parsed.find((p) => p.id === initial.id);
      if (!saved) return initial;
      return {
        ...initial,
        current: typeof saved.current === "number" ? saved.current : initial.current,
        completed: typeof saved.completed === "boolean" ? saved.completed : initial.completed,
        claimed: typeof saved.claimed === "boolean" ? saved.claimed : initial.claimed,
      };
    });
  } catch {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function saveAchievementsState(items: AchievementItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}
