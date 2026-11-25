"use client";

export type AppTheme = "dark" | "light" | "winter";

export const THEME_STORAGE_KEY = "matchday_theme";
export const WINTER_SNOW_KEY = "matchday_winter_snow";
export const WINTER_MUSIC_KEY = "matchday_winter_music";
export const WINTER_DECOR_KEY = "matchday_winter_decor";

export const THEME_CHANGE_EVENT = "matchday:theme_change";
export const WINTER_PREFS_EVENT = "matchday:winter_prefs";

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "winter" || saved === "dark") {
      return saved;
    }
  } catch {}
  return "dark";
}

export function applyAppTheme(newTheme: AppTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (newTheme === "light") {
    root.classList.add("light");
    root.classList.remove("dark", "winter");
    root.setAttribute("data-theme", "light");
  } else if (newTheme === "winter") {
    // Winter базується на темній схемі + додає клас .winter для морозного дизайну
    root.classList.add("dark", "winter");
    root.classList.remove("light");
    root.setAttribute("data-theme", "winter");
  } else {
    root.classList.add("dark");
    root.classList.remove("light", "winter");
    root.setAttribute("data-theme", "dark");
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  } catch {}

  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: newTheme } })
  );
}

export interface WinterPrefs {
  snowEnabled: boolean;
  musicEnabled: boolean;
  avatarDecor: boolean;
}

export function getWinterPrefs(): WinterPrefs {
  if (typeof window === "undefined") {
    return { snowEnabled: true, musicEnabled: false, avatarDecor: true };
  }
  try {
    const snow = localStorage.getItem(WINTER_SNOW_KEY);
    const music = localStorage.getItem(WINTER_MUSIC_KEY);
    const decor = localStorage.getItem(WINTER_DECOR_KEY);
    return {
      snowEnabled: snow === null ? true : snow === "true",
      musicEnabled: music === null ? false : music === "true",
      avatarDecor: decor === null ? true : decor === "true",
    };
  } catch {
    return { snowEnabled: true, musicEnabled: false, avatarDecor: true };
  }
}

export function saveWinterPrefs(partial: Partial<WinterPrefs>) {
  if (typeof window === "undefined") return;
  const current = getWinterPrefs();
  const next: WinterPrefs = { ...current, ...partial };
  try {
    localStorage.setItem(WINTER_SNOW_KEY, String(next.snowEnabled));
    localStorage.setItem(WINTER_MUSIC_KEY, String(next.musicEnabled));
    localStorage.setItem(WINTER_DECOR_KEY, String(next.avatarDecor));
  } catch {}
  window.dispatchEvent(new CustomEvent(WINTER_PREFS_EVENT, { detail: next }));
}
