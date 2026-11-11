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
    <div className="min-h-screen w-full bg-[#060A17] text-white font-sans selection:bg-[#FC734D] selection:text-white flex flex-col items-center px-4 py-6 sm:py-10 overflow-x-hidden">
      {/* ========================================================= */}
      {/* 1. ВЕРХНІЙ БЛОК ПРЕЗЕНТАЦІЇ ПАЛІТРИ З ЕТАЛОНУ            */}
      {/* ========================================================= */}
      <section className="w-full max-w-4xl flex flex-col items-center mb-10 sm:mb-14">
        <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-lg">
          {/* Card 1: Тёмно-синий */}
          <div className="h-32 sm:h-40 rounded-2xl bg-[#0A1430] border border-slate-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-3 sm:p-4 flex flex-col justify-end transition-transform hover:-translate-y-1">
            <span className="text-xs sm:text-sm font-medium text-slate-200">
              Тёмно-синий
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5">
              #0A1430
            </span>
          </div>

          {/* Card 2: Electric Blue */}
          <div className="h-32 sm:h-40 rounded-2xl bg-[#0297DE] shadow-[0_10px_30px_rgba(2,151,222,0.35)] p-3 sm:p-4 flex flex-col justify-end transition-transform hover:-translate-y-1">
            <span className="text-xs sm:text-sm font-medium text-white">
              Electric Blue
            </span>
            <span className="text-[10px] sm:text-xs text-white/80 font-mono mt-0.5">
              #0297DE
            </span>
          </div>

          {/* Card 3: Оранжевый */}
          <div className="h-32 sm:h-40 rounded-2xl bg-[#FC734D] shadow-[0_10px_30px_rgba(252,115,77,0.35)] p-3 sm:p-4 flex flex-col justify-end transition-transform hover:-translate-y-1">
            <span className="text-xs sm:text-sm font-medium text-white">
              Оранжевый
            </span>
            <span className="text-[10px] sm:text-xs text-white/80 font-mono mt-0.5">
              #FC734D
            </span>
          </div>
        </div>

        <h2 className="mt-6 sm:mt-8 text-center text-xs sm:text-base tracking-wider text-slate-300 font-light drop-shadow-[0_0_15px_rgba(255,255,255,0.35)]">
          і це вже виглядає як дорогий продукт для футбольних фанатів
        </h2>
      </section>

      {/* ========================================================= */}
      {/* 2. ГОЛОВНИЙ ЕКРАН MATCHDAY У СТИЛІ ЕТАЛОНУ               */}
      {/* ========================================================= */}
      <section className="relative w-full max-w-5xl rounded-3xl bg-[#060A17] border border-slate-800/90 shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col justify-between p-6 sm:p-8 md:p-10">
        {/* Фонове дифузне світіння арени */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[650px] h-[360px] bg-gradient-to-b from-[#FC734D]/15 via-[#0297DE]/10 to-transparent blur-[110px] rounded-full" />
          <div className="absolute -bottom-10 left-0 w-[300px] h-[300px] bg-[#0297DE]/15 blur-[90px] rounded-full" />
          <div className="absolute -bottom-10 right-0 w-[300px] h-[300px] bg-[#FC734D]/15 blur-[90px] rounded-full" />
        </div>

        {/* НАВІГАЦІЯ САЙТУ */}
        <header className="relative z-20 w-full flex items-center justify-between pb-6">
          {/* Логотип: 3 пігулки + MATCHDAY */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="flex items-center gap-1">
              <span className="w-1 h-3.5 bg-[#FC734D] rounded-full group-hover:h-4 transition-all" />
              <span className="w-1 h-4 bg-[#0297DE] rounded-full group-hover:h-3 transition-all" />
              <span className="w-1 h-3 bg-[#0A1430] border border-[#0297DE]/70 rounded-full group-hover:h-4 transition-all" />
            </div>
            <span className="font-semibold text-xs sm:text-sm tracking-widest text-white uppercase">
              Matchday
            </span>
          </Link>

          {/* Пункти меню платформи */}
          <nav className="hidden md:flex items-center gap-7 text-xs text-slate-300">
            <Link href="/leagues" className="hover:text-white transition-colors">
              Ліги прогнозів
            </Link>
            <Link href="/online" className="hover:text-white transition-colors">
              Онлайн PvP
            </Link>
            <Link href="/cases" className="hover:text-white transition-colors">
              Кейси та квести
            </Link>
            <Link href="/wheel" className="hover:text-white transition-colors">
              Колесо фортуни
            </Link>
          </nav>

          {/* Головна дія */}
          <Link
            href="/login"
            className="bg-[#FC734D] hover:bg-[#ff8563] text-white text-[11px] sm:text-xs font-semibold px-4 py-2 rounded-full shadow-[0_0_20px_rgba(252,115,77,0.4)] transition-all hover:scale-105 active:scale-95 inline-block"
          >
            Почати безкоштовно
          </Link>
        </header>

        {/* СЕРЕДНЯ ЧАСТИНА HERO */}
        <div className="relative z-20 flex flex-col items-center text-center mt-6 mb-4">
          {/* Головний заголовок Serif */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-[1.2]">
            <span className="font-serif font-normal">Прогнози зі швидкістю </span>
            <span className="font-serif italic font-normal text-slate-100">
              думки.
            </span>
          </h1>

          {/* Підзаголовок адаптований під Matchday */}
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
            Змагайтеся у футбольних прогнозах з друзями без реальних ставок,
            <br />
            аналізуйте європейські матчі та завойовуйте кубки ліги.
          </p>

          {/* СТАТИСТИКА ПЛАТФОРМИ */}
          <div className="w-full flex justify-between items-center my-6 px-1 sm:px-4 pointer-events-none">
            {/* Ліва колонка */}
            <div className="space-y-4 text-left">
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                  3X
                </div>
                <div className="text-[9px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  більше емоцій у турі
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                  87%
                </div>
                <div className="text-[9px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  авто-розрахунок результатів
                </div>
              </div>
            </div>

            {/* Права колонка */}
            <div className="space-y-4 text-right">
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                  120K+
                </div>
                <div className="text-[9px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  зроблених прогнозів
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                  2.4M
                </div>
                <div className="text-[9px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  футбольних подій
                </div>
              </div>
            </div>
          </div>

          {/* ASCII СИМВОЛЬНИЙ ЕКВАЛАЙЗЕР ШУМУ СТАДІОНУ */}
          <div className="relative w-full max-w-3xl h-40 -mb-12 overflow-hidden flex items-end justify-between pointer-events-none select-none font-mono text-[9px] leading-[9px]">
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
                colorClass = "text-[#FC734D]";
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
                      ? "drop-shadow(0 0 6px rgba(252,115,77,0.7))"
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

          {/* ТРИ НИЖНІ КАРТКИ ДЛЯ ФУТБОЛЬНОЇ ПЛАТФОРМИ */}
          <div className="relative z-30 w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-end mt-4">
            {/* Card 1: Матч-центр (топові події туру) */}
            <div className="md:col-span-4 bg-[#0A1430]/95 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md hover:border-slate-700 transition-all text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-200">
                  Матч-центр
                </span>
                <span className="text-[9px] font-mono text-[#0297DE] bg-[#0297DE]/10 px-1.5 py-0.5 rounded">
                  LIVE
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="h-10 rounded-lg bg-[#0A1430] border border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                  АРС · ЧЕЛ
                </div>
                <div className="h-10 rounded-lg bg-gradient-to-br from-[#FC734D] to-[#E24A5E] shadow-sm flex items-center justify-center text-[11px] font-black text-white">
                  2 : 1
                </div>
                <div className="h-10 rounded-lg bg-[#0297DE] flex items-center justify-center text-[10px] font-bold text-white">
                  РЕАЛ · БАР
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-3/4 rounded-full bg-[#FC734D]/85" />
                <div className="h-2.5 w-1/2 rounded-full bg-slate-800" />
              </div>
            </div>

            {/* Card 2: Рейтинг та крива набору очок (виділена коралова картка) */}
            <div className="md:col-span-4 bg-gradient-to-b from-[#FC734D] via-[#E24A5E] to-[#B82E56] rounded-2xl p-4 text-white shadow-[0_10px_35px_rgba(252,115,77,0.35)] relative overflow-hidden transition-transform hover:-translate-y-1 text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-white/95">
                  Криві: Динаміка очок
                </span>
                <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                  Топ-1 Ліги
                </span>
              </div>
              <div className="relative h-14 w-full flex items-center justify-center">
                <svg
                  viewBox="0 0 200 60"
                  className="w-full h-full overflow-visible"
                  fill="none"
                >
                  <path
                    d="M 5 45 C 50 45, 70 15, 100 25 C 130 35, 160 15, 195 10"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="100"
                    cy="25"
                    r="5.5"
                    fill="#FFFFFF"
                    stroke="#FC734D"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                </svg>
              </div>
            </div>

            {/* Card 3: Таймлайн туру (розклад і хвилини) */}
            <div className="md:col-span-4 bg-[#0A1430]/95 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md hover:border-slate-700 transition-all text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-200">
                  Таймлайн туру
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  90&apos; + 4&apos;
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1 mb-2.5">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-3 rounded-sm bg-slate-800/90 border border-slate-700/60"
                  />
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-5/6 rounded-full bg-[#FC734D]" />
                <div className="h-3 w-2/3 ml-auto rounded-full bg-[#0297DE]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
