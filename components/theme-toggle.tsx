"use client";

import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("matchday_theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("dark");
    }
  }, []);

  function applyTheme(newTheme: "dark" | "light") {
    const root = document.documentElement;
    if (newTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    }
    window.dispatchEvent(
      new CustomEvent("matchday:theme_change", { detail: { theme: newTheme } }),
    );
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("matchday_theme", nextTheme);
    applyTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Перемкнути на світлу тему" : "Перемкнути на темну тему"}
      aria-label="Перемикач теми день/ніч"
      className="group relative h-[34px] w-[76px] cursor-pointer rounded-full p-[2px] shadow-[0_4px_14px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
      style={{
        background: isDark
          ? "linear-gradient(180deg, #1b1e28 0%, #0d1017 100%)"
          : "linear-gradient(180deg, #372836 0%, #1e131d 100%)",
        boxShadow: isDark
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
            {/* Задня дюна */}
            <path d="M 0 45 Q 40 16 100 24 L 100 45 Z" fill="#382e66" />
            {/* Середня дюна */}
            <path d="M 12 45 Q 55 18 100 32 L 100 45 Z" fill="#2b2354" />
            {/* Передня дюна */}
            <path d="M 28 45 Q 70 28 100 40 L 100 45 Z" fill="#1e183e" />
          </svg>
        </div>

        {/* ============================================================== */}
        {/* 2. ДЕННА / ЗАХІДНА СЦЕНА (LIGHT MODE)                          */}
        {/* ============================================================== */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            !isDark ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "linear-gradient(135deg, #fca5a5 0%, #f47285 45%, #fb7185 100%)",
          }}
        >
          {/* Ранкові хмаринки */}
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

          {/* Силуети теплих теракотових пустельних дюн */}
          <svg
            className="absolute bottom-0 left-0 h-[24px] w-[54px]"
            viewBox="0 0 100 45"
            preserveAspectRatio="none"
          >
            {/* Задня дюна */}
            <path d="M 0 45 Q 45 15 100 35 L 100 45 Z" fill="#e14d6e" />
            {/* Середня дюна */}
            <path d="M 0 45 Q 52 18 100 42 L 100 45 Z" fill="#b9244f" />
            {/* Передня дюна */}
            <path d="M 0 45 Q 40 28 85 45 Z" fill="#8c1236" />
          </svg>
        </div>

        {/* ============================================================== */}
        {/* 3. КНОПКА-ПОВЗУНОК (THUMB KNOB) З КОНЦЕНТРИЧНИМИ КІЛЬЦЯМИ      */}
        {/* ============================================================== */}
        <div
          className="absolute top-[2px] h-[26px] w-[26px] transition-transform duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)]"
          style={{
            transform: isDark ? "translateX(2px)" : "translateX(44px)",
          }}
        >
          {/* Концентричні ореоли/кільця затемнення навколо кнопки */}
          <span
            className="pointer-events-none absolute -inset-[6px] rounded-full border transition-colors duration-500"
            style={{
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(255, 255, 255, 0.22)",
            }}
          />
          <span
            className="pointer-events-none absolute -inset-[12px] rounded-full border transition-colors duration-500"
            style={{
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.12)",
            }}
          />
          <span
            className="pointer-events-none absolute -inset-[18px] rounded-full border transition-colors duration-500"
            style={{
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.02)"
                : "rgba(255, 255, 255, 0.06)",
            }}
          />

          {/* Головне темне коло повзунка */}
          <div
            className="relative h-full w-full rounded-full border transition-all duration-300 shadow-md"
            style={{
              background: isDark
                ? "radial-gradient(circle at 35% 35%, #2a2e3d 0%, #151821 100%)"
                : "radial-gradient(circle at 35% 35%, #322b3b 0%, #191420 100%)",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(255, 255, 255, 0.28)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
            }}
          />
        </div>
      </div>
    </button>
  );
}
