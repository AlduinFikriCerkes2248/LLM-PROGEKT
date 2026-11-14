"use client";

import React, { useEffect, useState, useRef } from "react";
import AchievementBadge, { AchievementRarity } from "./achievement-badge";

export interface SteamNotificationPayload {
  id: string;
  title: string;
  desc?: string;
  rarity?: AchievementRarity;
  iconType?: string;
  coins?: number;
  bonuses?: number;
  xp?: number;
  soundType?: "marchenko" | "default";
}

// Глобальна функція для виклику сповіщення з будь-якої частини застосунку
export function triggerSteamAchievement(payload: SteamNotificationPayload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("matchday:steam_achievement", { detail: payload })
    );
  }
}

// 1. Синтез класичного фірмового звуку досягнення Steam через Web Audio API
function playClassicSteamChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;

    // Перша нота: G5 (784Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Друга дзвінка нота: C6 (1046.5Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.72);

    // Додатковий теплий гармонійний дзвін
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(1318.51, now + 0.14); // E6
    gain3.gain.setValueAtTime(0, now + 0.14);
    gain3.gain.linearRampToValueAtTime(0.12, now + 0.16);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.14);
    osc3.stop(now + 0.62);
  } catch (err) {
    console.warn("Could not play Steam chime:", err);
  }
}

// 2. Відтворення особливого звуку для досягнення Марченка
function playMarchenkoAudio() {
  try {
    const audio = new Audio("/sounds/marchenko_achievement.mp3");
    audio.volume = 1.0;
    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch((e) => {
        console.warn("Autoplay audio blocked or file missing, falling back to chime:", e);
        playClassicSteamChime();
      });
    }
  } catch (err) {
    console.warn("Audio play error:", err);
    playClassicSteamChime();
  }
}

export default function SteamAchievementNotification() {
  const [notification, setNotification] = useState<SteamNotificationPayload | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleAchievementEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SteamNotificationPayload>;
      if (!customEvent.detail) return;

      const payload = customEvent.detail;
      setNotification(payload);
      setIsVisible(true);

      // Визначаємо звук: якщо пов'язано з Марченком — фірмовий звук користувача!
      const isMarchenko =
        payload.id === "great_marchenko" ||
        payload.soundType === "marchenko" ||
        payload.title.toLowerCase().includes("марченк");

      if (isMarchenko) {
        playMarchenkoAudio();
      } else {
        playClassicSteamChime();
      }

      // Скидання попереднього таймера
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Показ на 5.5 секунд
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setNotification(null), 400);
      }, 5500);
    };

    window.addEventListener("matchday:steam_achievement", handleAchievementEvent);
    return () => {
      window.removeEventListener("matchday:steam_achievement", handleAchievementEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!notification && !isVisible) return null;

  const isMarchenko =
    notification?.id === "great_marchenko" ||
    notification?.soundType === "marchenko" ||
    notification?.title.toLowerCase().includes("марченк");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[9999] transition-all duration-400 ease-out select-none ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div
        className="relative flex items-center gap-3.5 px-4 py-3.5 rounded-lg border text-white shadow-2xl backdrop-blur-md overflow-hidden"
        style={{
          width: "360px",
          background: "linear-gradient(135deg, #1b2838 0%, #171a21 100%)",
          borderColor: isMarchenko ? "#f59e0b" : "#3b5a75",
          boxShadow: isMarchenko
            ? "0 14px 40px rgba(0, 0, 0, 0.9), 0 0 25px rgba(245, 158, 11, 0.45)"
            : "0 14px 35px rgba(0, 0, 0, 0.85), 0 0 15px rgba(102, 192, 244, 0.25)",
        }}
      >
        {/* Фоновий відблиск у стилі Steam Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] to-transparent pointer-events-none" />

        {/* Ліва іконка / Значок досягнення */}
        <div
          className="relative shrink-0 flex items-center justify-center rounded-md border p-1"
          style={{
            width: "58px",
            height: "58px",
            background: "#0e141b",
            borderColor: isMarchenko ? "#fbbf24" : "#2a475e",
            boxShadow: "inset 0 0 8px rgba(0,0,0,0.8)",
          }}
        >
          <AchievementBadge
            rarity={notification?.rarity || "epic"}
            iconType={notification?.iconType || (isMarchenko ? "marchenko" : "trophy")}
            size={50}
            completed={true}
          />
        </div>

        {/* Права текстова частина у фірмовому стилі Steam */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Верхній рядок: STEAM / MATCHDAY + Текст розблокування */}
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em]"
              style={{ color: isMarchenko ? "#fbbf24" : "#66c0f4" }}
            >
              {isMarchenko ? "👑 ЛЕГЕНДАРНЕ ВІДКРИТТЯ" : "ДОСЯГНЕННЯ РОЗБЛОКОВАНО!"}
            </span>
          </div>

          {/* Назва досягнення */}
          <h4 className="text-[14px] font-black tracking-tight text-white truncate drop-shadow-sm">
            {notification?.title}
          </h4>

          {/* Нагорода або короткий опис */}
          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
            {notification?.coins !== undefined && notification.coins > 0 && (
              <span className="text-amber-300 font-extrabold flex items-center gap-1">
                <span>+{notification.coins.toLocaleString()}</span>
                <span>🪙</span>
              </span>
            )}
            {notification?.bonuses !== undefined && notification.bonuses > 0 && (
              <span className="text-cyan-300 font-bold">
                +{notification.bonuses} Б
              </span>
            )}
            {notification?.xp !== undefined && (
              <span className="text-emerald-400 font-bold">
                +{notification.xp} XP
              </span>
            )}
          </div>
        </div>

        {/* Кнопка закриття */}
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white transition text-xs p-1 -mr-1 self-start"
          title="Закрити"
        >
          ✕
        </button>

        {/* Нижня анімована смужка тривалості */}
        <div
          className="absolute bottom-0 left-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#66c0f4] to-transparent animate-[shrink_5.5s_linear_forwards]"
          style={{
            backgroundColor: isMarchenko ? "#f59e0b" : "#66c0f4",
          }}
        />
      </div>
    </div>
  );
}
