"use client";

import {
  AchievementItem,
  INITIAL_ACHIEVEMENTS,
  ACHIEVEMENTS_STORAGE_KEY,
  loadAchievementsState,
  saveAchievementsState,
} from "./achievements-data";
import { triggerSteamAchievement } from "@/components/steam-achievement-notification";

export interface ProgressNotificationPayload {
  id: string;
  title: string;
  current: number;
  target: number;
  rarity?: string;
  iconType?: string;
}

export function triggerProgressToast(payload: ProgressNotificationPayload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("matchday:achievement_progress", { detail: payload })
    );
  }
}

let lastNextThemeToggleTime = 0;
let lastNextMarchenkoTrackTime = 0;

/**
 * Головна функція для трекінгу прогресу будь-якого досягнення.
 * Зберігає стан у localStorage, сповіщає всі сторінки та викликає Steam-попап при виконанні.
 */
export function trackAchievement(
  id: string,
  amount: number = 1,
  mode: "increment" | "set" | "max" = "increment"
): AchievementItem | null {
  if (typeof window === "undefined") return null;

  try {
    const now = Date.now();
    if (id === "matrix_neo") {
      if (now - lastNextThemeToggleTime < 350) return null;
      lastNextThemeToggleTime = now;
    }
    if (id === "great_marchenko") {
      if (now - lastNextMarchenkoTrackTime < 600) return null;
      lastNextMarchenkoTrackTime = now;
    }
    const list = loadAchievementsState();
    const itemIndex = list.findIndex((a) => a.id === id);
    if (itemIndex === -1) return null;

    const item = list[itemIndex];
    if (item.completed) return item; // Вже виконано

    const oldCurrent = item.current || 0;
    let newCurrent = oldCurrent;

    if (mode === "increment") {
      newCurrent = oldCurrent + amount;
    } else if (mode === "set") {
      newCurrent = amount;
    } else if (mode === "max") {
      newCurrent = Math.max(oldCurrent, amount);
    }

    const isNewlyCompleted = newCurrent >= item.target;
    item.current = Math.min(newCurrent, item.target);

    if (isNewlyCompleted) {
      item.completed = true;
    }

    // Зберігаємо оновлений стан
    saveAchievementsState(list);

    // Сповіщаємо всі компоненти на сторінці про оновлення
    window.dispatchEvent(
      new CustomEvent("matchday:achievements_updated", { detail: { achievements: list } })
    );

    if (isNewlyCompleted) {
      // Викликаємо фірмовий Steam-попап зі звуком!
      triggerSteamAchievement({
        id: item.id,
        title: item.title,
        desc: item.desc,
        rarity: item.rarity,
        iconType: item.iconType,
        coins: item.reward.coins,
        bonuses: item.reward.bonuses,
        xp: item.reward.xp,
        soundType:
          item.id === "great_marchenko" || item.title.toLowerCase().includes("марченк")
            ? "marchenko"
            : "default",
      });

      // Перевіряємо ачівку "Абсолютний Чемпіон" (15 виконаних ачівок)
      const completedCount = list.filter((a) => a.completed).length;
      const champ = list.find((a) => a.id === "all_champion");
      if (champ && !champ.completed && completedCount >= 15) {
        champ.completed = true;
        champ.current = completedCount;
        saveAchievementsState(list);
        window.dispatchEvent(
          new CustomEvent("matchday:achievements_updated", { detail: { achievements: list } })
        );
        triggerSteamAchievement({
          id: champ.id,
          title: champ.title,
          desc: champ.desc,
          rarity: champ.rarity,
          iconType: champ.iconType,
          coins: champ.reward.coins,
          bonuses: champ.reward.bonuses,
          xp: champ.reward.xp,
          soundType: "default",
        });
      }
    } else if (newCurrent > oldCurrent) {
      // Показуємо плавне підтвердження прогресу користувачеві
      triggerProgressToast({
        id: item.id,
        title: item.title,
        current: item.current,
        target: item.target,
        rarity: item.rarity,
        iconType: item.iconType,
      });
    }

    return item;
  } catch (err) {
    console.error("trackAchievement error:", err);
    return null;
  }
}

/**
 * Перевірка досягнень, пов'язаних з балансом (наприклад, Мільйонер)
 */
export function checkBalanceAchievements(balance?: number) {
  if (typeof window === "undefined") return;
  try {
    let currentBalance = balance;
    if (typeof currentBalance !== "number") {
      const saved = localStorage.getItem("matchday:coins");
      currentBalance = saved ? parseInt(saved, 10) : 1088233;
    }

    if (currentBalance >= 1000000) {
      trackAchievement("millionaire", currentBalance, "set");
    }
  } catch {
    // ignore
  }
}

/**
 * Ініціалізація глобальних слухачів для автоматичного відстеження дій користувача:
 * 1. Перемикання теми (matrix_neo)
 * 2. Введення "Марченко" в будь-яке поле введення чи вибір Марченка (great_marchenko)
 * 3. Втрати в азартних іграх (lucky_loss_200k)
 * 4. Баланс (millionaire)
 */
export function initGlobalAchievementListeners(): () => void {
  if (typeof window === "undefined") return () => {};

  // 1. Автоматична перевірка балансу на старті
  checkBalanceAchievements();

  // 2. Слухач перемикання теми день/ніч
  const handleThemeChange = () => {
    trackAchievement("matrix_neo", 1, "increment");
  };
  window.addEventListener("matchday:theme_change", handleThemeChange);

  // 3. Слухач для відстеження написання "Марченко" / "marchenko"
  const countMarchenkoMatches = (str: string) => {
    if (!str) return 0;
    const matches = str.match(/(марченк|marchenk)/gi);
    return matches ? matches.length : 0;
  };

  const handleInputEvent = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target || !("value" in target)) return;

    const val = target.value || "";
    const count = countMarchenkoMatches(val);
    const prev = parseInt(target.getAttribute("data-marchenko-count") || "0", 10);
    if (count > prev) {
      const diff = count - prev;
      target.setAttribute("data-marchenko-count", count.toString());
      trackAchievement("great_marchenko", diff, "increment");
    } else if (count < prev) {
      target.setAttribute("data-marchenko-count", count.toString());
    }
  };

  const handleChangeEvent = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target || !("value" in target)) return;
    const val = target.value || "";
    const count = countMarchenkoMatches(val);
    const prev = parseInt(target.getAttribute("data-marchenko-count") || "0", 10);
    if (count > prev) {
      target.setAttribute("data-marchenko-count", count.toString());
      trackAchievement("great_marchenko", count - prev, "increment");
    }
  };

  const handleKeydownEvent = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !("value" in target)) return;
      const count = countMarchenkoMatches(target.value || "");
      if (count > 0) {
        trackAchievement("great_marchenko", 1, "increment");
      }
    }
  };

  document.addEventListener("input", handleInputEvent, true);
  document.addEventListener("change", handleChangeEvent, true);
  document.addEventListener("keydown", handleKeydownEvent as EventListener, true);

  // 4. Слухач прямих користувацьких подій трекінгу
  const handleCustomTrack = (e: Event) => {
    const custom = e as CustomEvent<{
      id: string;
      amount?: number;
      mode?: "increment" | "set" | "max";
    }>;
    if (custom.detail?.id) {
      trackAchievement(
        custom.detail.id,
        custom.detail.amount ?? 1,
        custom.detail.mode ?? "increment"
      );
    }
  };
  window.addEventListener("matchday:track_achievement", handleCustomTrack);

  // 5. Слухач програшу в казино (lucky_loss_200k)
  const handleBetLoss = (e: Event) => {
    const custom = e as CustomEvent<{ amount: number }>;
    if (typeof custom.detail?.amount === "number" && custom.detail.amount > 0) {
      trackAchievement("lucky_loss_200k", custom.detail.amount, "increment");
    }
  };
  window.addEventListener("matchday:bet_loss", handleBetLoss);

  // Очищення при демонтуванні
  return () => {
    window.removeEventListener("matchday:theme_change", handleThemeChange);
    document.removeEventListener("input", handleInputEvent, true);
    document.removeEventListener("change", handleChangeEvent, true);
    document.removeEventListener("keydown", handleKeydownEvent as EventListener, true);
    window.removeEventListener("matchday:track_achievement", handleCustomTrack);
    window.removeEventListener("matchday:bet_loss", handleBetLoss);
  };
}
