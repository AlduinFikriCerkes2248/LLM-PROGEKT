"use client";

import React, { useEffect, useState } from "react";
import {
  AppTheme,
  applyAppTheme,
  getStoredTheme,
  THEME_CHANGE_EVENT,
} from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>("dark");

  useEffect(() => {
    const initial = getStoredTheme();
    setTheme(initial);
    applyAppTheme(initial);

    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<{ theme?: AppTheme }>;
      if (custom.detail?.theme) {
        setTheme(custom.detail.theme);
      } else {
        setTheme(getStoredTheme());
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  function toggleTheme() {
    const nextTheme: AppTheme =
      theme === "dark" ? "light" : theme === "light" ? "winter" : "dark";
    setTheme(nextTheme);
    applyAppTheme(nextTheme);
  }

  const isDark = theme === "dark";
  const isLight = theme === "light";
  const isWinter = theme === "winter";

  const titleText = isDark
    ? "Темна тема (Натисніть для Світлої)"
    : isLight
      ? "Світла тема (Натисніть для Зимової Казки ❄️)"
      : "Зимова Казка ❄️ (Натисніть для Темної)";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={titleText}
      aria-label="Перемикач теми оформлення"
      className="group relative h-[34px] w-[76px] cursor-pointer rounded-full p-[2px] shadow-[0_4px_14px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
      style={{
        background: isWinter
          ? "linear-gradient(180deg, #0b243f 0%, #051324 100%)"
          : isDark
            ? "linear-gradient(180deg, #1b1e28 0%, #0d1017 100%)"
            : "linear-gradient(180deg, #372836 0%, #1e131d 100%)",
        boxShadow: isWinter
          ? "0 0 1px 1px rgba(125, 211, 252, 0.55), 0 0 12px rgba(56, 189, 248, 0.35)"
          : isDark
            ? "0 0 1px 1px rgba(65, 140, 190, 0.3), inset 0 2px 4px rgba(0,0,0,0.6)"
            : "0 0 1px 1px rgba(244, 114, 133, 0.35), inset 0 2px 4px rgba(0,0,0,0.5)",
      }}
    >
      {/* Внутрішній контейнер капсули з вирізаними краями */}
      <div className="relative h-full w-full overflow-hidden rounded-full">
        {/* ============================================================== */}
        {/* 1. НІЧНА СЦЕНА (DARK MODE)                                     */}
        {/* ============================================================== */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "linear-gradient(135deg, #241d45 0%, #362e63 45%, #4f4280 100%)",
          }}
        >
          {/* Зорі на нічному небі */}
          <span className="absolute top-[7px] right-[26px] h-[1.5px] w-[1.5px] rounded-full bg-white opacity-80 animate-pulse" />
          <span className="absolute top-[13px] right-[13px] h-[1.5px] w-[1.5px] rounded-full bg-white opacity-60" />
          <span className="absolute top-[18px] right-[24px] h-[1px] w-[1px] rounded-full bg-white opacity-90" />
          <span className="absolute top-[8px] right-[9px] h-[1px] w-[1px] rounded-full bg-white opacity-50" />

          {/* Місяць-півмісяць (Crescent Moon) */}
          <div className="absolute top-[5px] right-[16px] drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                fill="#ffffff"
              />
            </svg>
          </div>

          {/* Силуети нічних пустельних дюн */}
          <svg
            className="absolute bottom-0 right-0 h-[22px] w-[48px]"
            viewBox="0 0 100 45"
            preserveAspectRatio="none"
          >
            <path d="M 0 45 Q 40 16 100 24 L 100 45 Z" fill="#382e66" />
            <path d="M 12 45 Q 55 18 100 32 L 100 45 Z" fill="#2b2354" />
            <path d="M 28 45 Q 70 28 100 40 L 100 45 Z" fill="#1e183e" />
          </svg>
        </div>

        {/* ============================================================== */}
        {/* 2. ДЕННА / ЗАХІДНА СЦЕНА (LIGHT MODE)                          */}
        {/* ============================================================== */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            isLight ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "linear-gradient(135deg, #fca5a5 0%, #f47285 45%, #fb7185 100%)",
          }}
        >
          <div className="absolute top-[4px] left-[15px] opacity-60">
            <svg width="22" height="10" viewBox="0 0 24 14" fill="#ffffff">
              <path d="M19.35 6.04C18.67 3.59 16.44 2 13.78 2c-2.48 0-4.63 1.39-5.46 3.52C7.38 5.68 6.46 6.5 6.04 7.6 4.3 8.1 3 9.8 3 11.8 3 14.1 4.9 16 7.2 16h11.6c2.3 0 4.2-1.9 4.2-4.2 0-2.1-1.6-3.9-3.65-4.16z" />
            </svg>
          </div>
          <div className="absolute top-[8px] left-[32px] opacity-40">
            <svg width="16" height="8" viewBox="0 0 24 14" fill="#ffffff">
              <path d="M19.35 6.04C18.67 3.59 16.44 2 13.78 2c-2.48 0-4.63 1.39-5.46 3.52C7.38 5.68 6.46 6.5 6.04 7.6 4.3 8.1 3 9.8 3 11.8 3 14.1 4.9 16 7.2 16h11.6c2.3 0 4.2-1.9 4.2-4.2 0-2.1-1.6-3.9-3.65-4.16z" />
            </svg>
          </div>
          <svg
            className="absolute bottom-0 left-0 h-[24px] w-[54px]"
            viewBox="0 0 100 45"
            preserveAspectRatio="none"
          >
            <path d="M 0 45 Q 45 15 100 35 L 100 45 Z" fill="#e14d6e" />
            <path d="M 0 45 Q 52 18 100 42 L 100 45 Z" fill="#b9244f" />
            <path d="M 0 45 Q 40 28 85 45 Z" fill="#8c1236" />
          </svg>
        </div>

        {/* ============================================================== */}
        {/* 3. ЗИМОВА СЦЕНА (WINTER EDITION)                               */}
        {/* ============================================================== */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            isWinter ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "linear-gradient(135deg, #072240 0%, #0d3a68 50%, #1d6396 100%)",
          }}
        >
          {/* Сніжинки */}
          <span className="absolute top-[5px] left-[10px] text-[8px] text-sky-100 opacity-90 animate-pulse">❄</span>
          <span className="absolute top-[14px] left-[22px] text-[7px] text-white opacity-75">❄</span>
          <span className="absolute top-[6px] right-[12px] text-[7px] text-sky-200 opacity-85">✦</span>
          {/* Засніжені пагорби */}
          <svg
            className="absolute bottom-0 inset-x-0 h-[14px] w-full"
            viewBox="0 0 100 30"
            preserveAspectRatio="none"
          >
            <path d="M 0 30 Q 30 8 65 20 T 100 12 L 100 30 Z" fill="#bae6fd" opacity="0.4" />
            <path d="M 0 30 Q 45 14 100 22 L 100 30 Z" fill="#e0f2fe" opacity="0.7" />
          </svg>
        </div>

        {/* ============================================================== */}
        {/* 4. КНОПКА-ПОВЗУНОК (THUMB KNOB)                                */}
        {/* ============================================================== */}
        <div
          className="absolute top-[2px] h-[26px] w-[26px] transition-transform duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)]"
          style={{
            transform: isDark
              ? "translateX(2px)"
              : isWinter
                ? "translateX(23px)"
                : "translateX(44px)",
          }}
        >
          <span
            className="pointer-events-none absolute -inset-[6px] rounded-full border transition-colors duration-500"
            style={{
              borderColor: isWinter
                ? "rgba(186, 230, 253, 0.38)"
                : isDark
                  ? "rgba(255, 255, 255, 0.12)"
                  : "rgba(255, 255, 255, 0.22)",
            }}
          />
          <div
            className="relative h-full w-full rounded-full border transition-all duration-300 shadow-md flex items-center justify-center text-[11px]"
            style={{
              background: isWinter
                ? "radial-gradient(circle at 35% 35%, #e0f2fe 0%, #38bdf8 100%)"
                : isDark
                  ? "radial-gradient(circle at 35% 35%, #2a2e3d 0%, #151821 100%)"
                  : "radial-gradient(circle at 35% 35%, #322b3b 0%, #191420 100%)",
              borderColor: isWinter
                ? "rgba(255, 255, 255, 0.7)"
                : isDark
                  ? "rgba(255, 255, 255, 0.18)"
                  : "rgba(255, 255, 255, 0.28)",
              boxShadow: isWinter
                ? "0 0 10px rgba(56, 189, 248, 0.8)"
                : "0 2px 8px rgba(0, 0, 0, 0.5)",
            }}
          >
            {isWinter && <span className="text-[#07192d] leading-none">❄</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
