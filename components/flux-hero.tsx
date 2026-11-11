"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// Символи ASCII-хвиль: * / " № ; ! #
const ASCII_PALETTE = ["#", "№", "!", ";", "/", "\"", "*", "·"];

export default function FluxHero() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      setFrame((prev) => (prev + 1) % 10000);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const totalColumns = 54;

  const columnsData = useMemo(() => {
    return Array.from({ length: totalColumns }).map((_, i) => {
      const centerDist = Math.abs(i - 26.5) / 26.5;
      const isCenter = centerDist < 0.30;
      const isSide = centerDist > 0.68;
      return { index: i, centerDist, isCenter, isSide };
    });
  }, [totalColumns]);

  return (
    <div className="min-h-screen w-full bg-[#060A17] text-white font-sans selection:bg-[#FC7340] selection:text-white flex flex-col justify-between px-4 py-6 sm:py-8 overflow-x-hidden">
      {/* Фонове дифузне світіння арени (CSS) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-gradient-to-b from-[#FC7340]/15 via-[#0297DE]/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-[#0297DE]/15 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-[#FC7340]/15 blur-[100px] rounded-full" />
      </div>

      {/* ========================================================= */}
      {/* 1. ВЕРХНЯ НАВІГАЦІЯ                                      */}
      {/* ========================================================= */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-[#162544]">
        {/* Логотип: 3 фірмові кольорові маркери + MATCHDAY */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-3.5 bg-[#FC7340] rounded-full group-hover:h-4 transition-all" />
            <span className="w-1.5 h-4 bg-[#0297DE] rounded-full group-hover:h-3 transition-all" />
            <span className="w-1.5 h-3 bg-[#0A1430] border border-[#0297DE]/70 rounded-full group-hover:h-4 transition-all" />
          </div>
          <span className="font-semibold text-sm sm:text-base tracking-widest text-white uppercase">
            Matchday
          </span>
        </Link>

        {/* Навігація по дійсних маршрутах платформи */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-300">
          <Link href="/leagues" className="hover:text-white transition-colors">
            Мої ліги
          </Link>
          <Link href="/wheel" className="hover:text-white transition-colors">
            Колесо
          </Link>
          <Link href="/online" className="hover:text-white transition-colors">
            Онлайн дуелі
          </Link>
          <Link href="/cases" className="hover:text-white transition-colors">
            Кейси
          </Link>
          <Link href="/blackjack" className="hover:text-white transition-colors">
            Блекджек
          </Link>
          <Link href="/dice" className="hover:text-white transition-colors">
            Кості
          </Link>
        </nav>

        {/* Кнопка авторизації */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="btn-interactive min-h-[38px] bg-[#0A1430] hover:bg-[#121e3d] text-white border border-[#0297DE]/50 hover:border-[#0297DE] text-xs font-semibold px-4 py-2 rounded-full transition-all shadow-[0_0_15px_rgba(2,151,222,0.2)]"
          >
            Увійти
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. ГОЛОВНИЙ HERO-БЛОК                                     */}
      {/* ========================================================= */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto my-6 sm:my-10 text-center">
        {/* Бейдж статусу платформи */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0297DE]/40 bg-[#0A1430]/80 px-3.5 py-1 text-xs text-[#0297DE] shadow-[0_0_12px_rgba(2,151,222,0.15)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0297DE] animate-pulse" />
          <span className="font-mono tracking-wider uppercase text-[11px]">Футбольна ліга прогнозів</span>
        </div>

        {/* Головний заголовок Serif */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-[1.15] max-w-3xl">
          <span className="font-serif font-normal">Футбольні прогнози зі швидкістю </span>
          <span className="font-serif italic font-normal text-slate-100">
            думки.
          </span>
        </h1>

        {/* Реалістичний підзаголовок без вигаданих цифр */}
        <p className="mt-4 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
          Змагайтеся в точності футбольних прогнозів з друзями, аналізуйте матчі топових чемпіонатів, крутіть колесо фортуни та перемагайте в онлайн-дуелях.
        </p>

        {/* Головні кнопки дії з реальними маршрутами */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/leagues"
            className="btn-interactive min-h-[44px] bg-[#FC7340] hover:bg-[#fd855d] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-full shadow-[0_0_25px_rgba(252,115,64,0.45)] transition-all hover:scale-105 active:scale-95"
          >
            🏆 Мої ліги
          </Link>
          <Link
            href="/wheel"
            className="btn-interactive min-h-[44px] bg-[#0A1430] hover:bg-[#121e3d] text-[#0297DE] hover:text-white border border-[#0297DE]/70 hover:border-[#0297DE] text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(2,151,222,0.25)] transition-all hover:scale-105 active:scale-95"
          >
            🎡 Колесо
          </Link>
          <Link
            href="/online"
            className="btn-interactive min-h-[44px] bg-[#0A1430]/80 hover:bg-[#121e3d] text-slate-200 border border-slate-700 hover:border-slate-500 text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full transition-all"
          >
            🌐 Онлайн дуелі
          </Link>
        </div>

        {/* Швидкі переходи по міні-іграх */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-slate-500">Швидкий перехід:</span>
          <Link href="/cases" className="hover:text-[#FC7340] transition-colors underline-offset-4 hover:underline">
            🎁 Кейси
          </Link>
          <span>•</span>
          <Link href="/dice" className="hover:text-[#0297DE] transition-colors underline-offset-4 hover:underline">
            🎲 Кості
          </Link>
          <span>•</span>
          <Link href="/blackjack" className="hover:text-[#0297DE] transition-colors underline-offset-4 hover:underline">
            🃏 Блекджек
          </Link>
        </div>

        {/* ========================================================= */}
        {/* 3. ASCII СИМВОЛЬНИЙ ЕКВАЛАЙЗЕР ШУМУ СТАДІОНУ               */}
        {/* ========================================================= */}
        <div className="relative w-full max-w-3xl h-36 -mb-10 overflow-hidden flex items-end justify-between pointer-events-none select-none font-mono text-[9px] leading-[9px] opacity-90 mt-6">
          {columnsData.map((col) => {
            const t = frame * 0.045;
            const wave1 = Math.sin(t + col.index * 0.3);
            const wave2 = Math.cos(t * 0.7 - col.index * 0.2);
            const noise = (wave1 + wave2) * 0.5;

            let targetHeight = 0;
            let colorClass = "text-[#0297DE]";

            if (col.isCenter) {
              const centerWeight = 1 - Math.abs(col.index - 26.5) / 8.5;
              targetHeight = Math.floor(13 + centerWeight * 16 + noise * 5);
              colorClass = "text-[#FC7340]";
            } else if (col.isSide) {
              const sideWeight = (Math.abs(col.index - 26.5) - 17) / 10;
              targetHeight = Math.floor(9 + sideWeight * 14 + noise * 4);
              colorClass = "text-[#0297DE]";
            } else {
              targetHeight = Math.floor(3 + noise * 2.5);
              colorClass = "text-[#0297DE]/50";
            }

            const clampedHeight = Math.max(2, Math.min(targetHeight, 26));

            const chars = [];
            for (let row = 0; row < clampedHeight; row++) {
              const ratio = row / clampedHeight;
              let charIndex = Math.floor(ratio * ASCII_PALETTE.length);
              if (charIndex >= ASCII_PALETTE.length) charIndex = ASCII_PALETTE.length - 1;
              chars.push(ASCII_PALETTE[charIndex]);
            }

            return (
              <div
                key={col.index}
                className={`flex flex-col-reverse items-center justify-start ${colorClass} transition-all duration-75`}
                style={{
                  filter: col.isCenter
                    ? "drop-shadow(0 0 6px rgba(252,115,64,0.7))"
                    : "drop-shadow(0 0 6px rgba(2,151,222,0.5))",
                }}
              >
                {chars.map((char, charIdx) => (
                  <span
                    key={charIdx}
                    className="inline-block"
                    style={{
                      opacity: Math.max(0.2, 1 - (charIdx / clampedHeight) * 0.75),
                    }}
                  >
                    {char}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 4. ТРИ ІНТЕРАКТИВНІ КАРТКИ НА ДІЙСНІ РОЗДІЛИ             */}
        {/* ========================================================= */}
        <div className="relative z-30 w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-end mt-4">
          {/* Card 1: Мої ліги */}
          <Link
            href="/leagues"
            className="md:col-span-4 bg-[#0A1430]/95 hover:bg-[#101c3d] border border-[#162544] hover:border-[#0297DE]/60 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all text-left group block"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-[#0297DE] transition-colors">
                Мої ліги
              </span>
              <span className="text-[10px] font-mono text-[#0297DE] bg-[#0297DE]/10 px-2 py-0.5 rounded-full border border-[#0297DE]/30">
                /leagues
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Створюйте власні ліги прогнозів або приєднуйтесь до відкритих турнірів за інвайт-кодом.
            </p>
            <div className="flex items-center text-xs font-medium text-[#0297DE] group-hover:translate-x-1 transition-transform">
              Відкрити ліги →
            </div>
          </Link>

          {/* Card 2: Колесо (виділена картка оранжевого кольору #FC7340) */}
          <Link
            href="/wheel"
            className="md:col-span-4 bg-gradient-to-b from-[#FC7340] via-[#E24A5E] to-[#B82E56] hover:from-[#fd8055] rounded-2xl p-4 text-white shadow-[0_10px_35px_rgba(252,115,64,0.35)] relative overflow-hidden transition-all hover:-translate-y-1 text-left block group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white">
                Колесо фортуни
              </span>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                /wheel
              </span>
            </div>

            {/* SVG крива з пульсуючою точкою (CSS/SVG) */}
            <div className="relative h-12 w-full flex items-center justify-center my-1">
              <svg
                viewBox="0 0 200 50"
                className="w-full h-full overflow-visible"
                fill="none"
              >
                <path
                  d="M 5 40 C 45 40, 65 15, 100 20 C 135 25, 155 10, 195 8"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="100"
                  cy="20"
                  r="5"
                  fill="#FFFFFF"
                  stroke="#FC7340"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-white/95 mt-1">
              <span>Крутити колесо щодня</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          {/* Card 3: Онлайн дуелі */}
          <Link
            href="/online"
            className="md:col-span-4 bg-[#0A1430]/95 hover:bg-[#101c3d] border border-[#162544] hover:border-[#0297DE]/60 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all text-left group block"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-[#0297DE] transition-colors">
                Онлайн дуелі
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                /online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Змагайтеся у PvP-прогнозах проти реальних гравців наживо та ставте ігрові бали.
            </p>
            <div className="flex items-center text-xs font-medium text-[#0297DE] group-hover:translate-x-1 transition-transform">
              До PvP арени →
            </div>
          </Link>
        </div>
      </main>

      {/* Футер платформи */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto pt-6 border-t border-[#162544] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div>Matchday © 2026. Платформа футбольних ліг без ставок на гроші.</div>
        <div className="flex items-center gap-4">
          <Link href="/leagues" className="hover:text-slate-300 transition-colors">
            Ліги
          </Link>
          <Link href="/wheel" className="hover:text-slate-300 transition-colors">
            Колесо
          </Link>
          <Link href="/online" className="hover:text-slate-300 transition-colors">
            Онлайн
          </Link>
          <Link href="/login" className="hover:text-slate-300 transition-colors">
            Вхід
          </Link>
        </div>
      </footer>
    </div>
  );
}
