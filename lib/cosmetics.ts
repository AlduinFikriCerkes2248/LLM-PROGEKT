"use client";

import { PROFILE_UPDATED_EVENT } from "./supabase/client";

export type AvatarFrameId =
  | "none"
  | "frost_halo"
  | "neon_cyber"
  | "gold_crown"
  | "holiday_lights";

export type NameColorId =
  | "default"
  | "ice_gradient"
  | "gold_legend"
  | "cyber_flame";

export interface CosmeticItem {
  id: string;
  type: "frame" | "name_color";
  name: string;
  desc: string;
  price: number;
  badge: string;
  previewClass: string;
}

export const AVATAR_FRAMES: CosmeticItem[] = [
  {
    id: "none",
    type: "frame",
    name: "Стандартна",
    desc: "Класична чиста рамка профілю",
    price: 0,
    badge: "⚪",
    previewClass: "",
  },
  {
    id: "frost_halo",
    type: "frame",
    name: "Морозний Ореол",
    desc: "Крижане арктичне сяйво навколо аватара",
    price: 15,
    badge: "❄️",
    previewClass:
      "ring-2 ring-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.65)]",
  },
  {
    id: "neon_cyber",
    type: "frame",
    name: "Кібер-Неон",
    desc: "Електричне фіолетово-блакитне коло",
    price: 25,
    badge: "⚡",
    previewClass:
      "ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(8,191,234,0.75)]",
  },
  {
    id: "holiday_lights",
    type: "frame",
    name: "Святкова Гірлянда",
    desc: "Яскрава новорічна рамка з вогниками",
    price: 30,
    badge: "🎄",
    previewClass:
      "ring-2 ring-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.7),0_0_10px_rgba(244,63,94,0.5)]",
  },
  {
    id: "gold_crown",
    type: "frame",
    name: "Золота Корона VIP",
    desc: "Елітне золоте сяйво чемпіонів",
    price: 50,
    badge: "👑",
    previewClass:
      "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.8)]",
  },
];

export const NAME_COLORS: CosmeticItem[] = [
  {
    id: "default",
    type: "name_color",
    name: "Стандартний",
    desc: "Базовий колір нікнейму",
    price: 0,
    badge: "Aa",
    previewClass: "",
  },
  {
    id: "ice_gradient",
    type: "name_color",
    name: "Крижаний Градієнт",
    desc: "Арктичний перелив срібла і блакиті",
    price: 20,
    badge: "❄️",
    previewClass:
      "bg-gradient-to-r from-sky-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent",
  },
  {
    id: "cyber_flame",
    type: "name_color",
    name: "Вогняний Неон",
    desc: "Помаранчево-рожеве сяйво переможця",
    price: 35,
    badge: "🔥",
    previewClass:
      "bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent",
  },
  {
    id: "gold_legend",
    type: "name_color",
    name: "Золото Легенди",
    desc: "Чистий королівський золотий блиск",
    price: 40,
    badge: "👑",
    previewClass:
      "bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent",
  },
];

export interface UserCosmeticsState {
  unlockedFrames: string[];
  unlockedNameColors: string[];
  equippedFrame: AvatarFrameId;
  equippedNameColor: NameColorId;
}

const COSMETICS_KEY = "matchday:user_cosmetics";

export function loadCosmetics(): UserCosmeticsState {
  const defaults: UserCosmeticsState = {
    unlockedFrames: ["none"],
    unlockedNameColors: ["default"],
    equippedFrame: "none",
    equippedNameColor: "default",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(COSMETICS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<UserCosmeticsState>;
    return {
      unlockedFrames: Array.isArray(parsed.unlockedFrames)
        ? Array.from(new Set(["none", ...parsed.unlockedFrames]))
        : ["none"],
      unlockedNameColors: Array.isArray(parsed.unlockedNameColors)
        ? Array.from(new Set(["default", ...parsed.unlockedNameColors]))
        : ["default"],
      equippedFrame: (parsed.equippedFrame as AvatarFrameId) || "none",
      equippedNameColor: (parsed.equippedNameColor as NameColorId) || "default",
    };
  } catch {
    return defaults;
  }
}

export function saveCosmetics(state: UserCosmeticsState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COSMETICS_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATED_EVENT, {
        detail: { cosmetics: state },
      })
    );
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

export function getFrameClass(frameId: AvatarFrameId): string {
  return AVATAR_FRAMES.find((f) => f.id === frameId)?.previewClass || "";
}

export function getNameColorClass(colorId: NameColorId): string {
  return NAME_COLORS.find((c) => c.id === colorId)?.previewClass || "";
}
