"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../lib/supabase/client";

export default function FluxHero() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  const primaryActionUrl = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen w-full bg-transparent text-white font-sans selection:bg-[#FC7340] selection:text-white flex flex-col justify-between px-4 sm:px-8 py-5 sm:py-7 overflow-x-hidden relative select-none">
      {/* М'яке фонове дифузне світіння */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-b from-[#FC7340]/20 via-[#0297DE]/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-[-40px] left-[-40px] w-[350px] h-[350px] bg-[#0297DE]/15 blur-[110px] rounded-full" />
        <div className="absolute bottom-[-40px] right-[-40px] w-[350px] h-[350px] bg-[#FC7340]/15 blur-[110px] rounded-full" />
      </div>



      {/* ========================================================= */}
      {/* 1. ВЕРХНЯ НАВІГАЦІЯ: ||| MATCHDAY  +  МЕНЮ  +  КНОПКА     */}
      {/* ========================================================= */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-between pb-4 sm:pb-6 border-b border-[#162544]/80">
        {/* Логотип: 3 фірмові вертикальні маркери + MATCHDAY */}
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="flex items-center gap-1">
            <span className="w-1 h-3.5 bg-[#0297DE] rounded-full group-hover:h-4 transition-all" />
            <span className="w-1 h-4.5 bg-[#0297DE] rounded-full group-hover:h-5 transition-all" />
            <span className="w-1 h-3.5 bg-[#0297DE] rounded-full group-hover:h-4 transition-all" />
          </div>
          <span className="font-bold text-sm sm:text-base tracking-[0.18em] text-white uppercase ml-1">
            MATCHDAY
          </span>
        </Link>

        {/* Навігаційне меню точно як на референсі */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Головна панель
          </Link>
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

        {/* Кнопка "Почати безкоштовно" */}
        <div className="flex items-center">
          <Link
            href={primaryActionUrl}
            className="btn-interactive min-h-[38px] bg-gradient-to-r from-[#FC7340] to-[#FF5E3A] hover:from-[#ff8153] hover:to-[#ff6f4c] text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(252,115,64,0.45)] transition-all hover:scale-105 active:scale-95"
          >
            Почати безкоштовно
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. ГОЛОВНИЙ ЦЕНТРАЛЬНИЙ БЛОК: Заголовок + Опис             */}
      {/* ========================================================= */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center max-w-6xl w-full mx-auto my-4 sm:my-8 text-center">
        {/* Головний заголовок Serif */}
        <h1 className="text-3xl sm:text-5xl md:text-[54px] text-white tracking-tight leading-[1.12] max-w-3xl mx-auto">
          <span className="font-serif font-normal">Прогнози зі швидкістю </span>
          <span className="font-serif italic font-normal text-slate-100">
            думки.
          </span>
        </h1>

        {/* Підзаголовок дослівно зі скріншота */}
        <p className="mt-3.5 text-xs sm:text-sm text-slate-300/90 max-w-xl mx-auto leading-relaxed">
          Змагайтеся у футбольних прогнозах з друзями без реальних ставок,
          <br className="hidden sm:inline" />
          {" "}аналізуйте європейські матчі та завойовуйте кубки ліги.
        </p>

        {/* ========================================================= */}
        {/* 3. СТАТИСТИКА (ЗЛІВА / СПРАВА) + СИМВОЛЬНІ ХВИЛІ ASCII    */}
        {/* ========================================================= */}
        <div className="relative w-full max-w-6xl mt-6 sm:mt-8 min-h-[190px] sm:min-h-[220px] flex items-center justify-between">
          {/* ЛІВА КОЛОНКА СТАТИСТИКИ */}
          <div className="relative z-20 flex flex-col items-start gap-5 sm:gap-7 text-left w-36 sm:w-48 pl-2 sm:pl-4">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                3X
              </div>
              <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400 mt-0.5 uppercase">
                БІЛЬШЕ ЕМОЦІЙ У ТУРІ
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                87%
              </div>
              <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400 mt-0.5 uppercase">
                АВТО-РОЗРАХУНОК РЕЗУЛЬТАТІВ
              </div>
            </div>
          </div>

          {/* Центральний простір над анімованим океаном */}
          <div className="flex-1" />

          {/* ПРАВА КОЛОНКА СТАТИСТИКИ */}
          <div className="relative z-20 flex flex-col items-end gap-5 sm:gap-7 text-right w-36 sm:w-48 pr-2 sm:pr-4">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                120K+
              </div>
              <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400 mt-0.5 uppercase">
                ЗРОБЛЕНИХ ПРОГНОЗІВ
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                2.4M
              </div>
              <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400 mt-0.5 uppercase">
                ФУТБОЛЬНИХ ПОДІЙ
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. ТРИ КАРТКИ ВНИЗУ (Матч-центр, Криві, Таймлайн)          */}
        {/* ========================================================= */}
        <div className="relative z-30 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-end mt-5 sm:mt-6">
          {/* Card 1: Матч-центр */}
          <Link
            href="/leagues"
            className="bg-[#0A1430]/95 hover:bg-[#0e1b3d] border border-[#162544] hover:border-[#0297DE]/60 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md transition-all text-left group block"
          >
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#0297DE] transition-colors">
                Матч-центр
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0297DE]/15 text-[#0297DE] border border-[#0297DE]/40 animate-pulse">
                LIVE
              </span>
            </div>

            {/* Рядок матчів */}
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#060A17] border border-[#1E2E4A] text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-xl truncate">
                АРС - ЧЕЛ
              </span>
              <span className="bg-[#FC7340] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-[0_0_12px_rgba(252,115,64,0.5)] whitespace-nowrap">
                2 : 1
              </span>
              <span className="bg-[#0297DE] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-[0_0_12px_rgba(2,151,222,0.4)] truncate">
                РЕАЛ - БАР
              </span>
            </div>

            {/* Прогрес-бар матчу */}
            <div className="w-full bg-[#060A17] rounded-full h-2.5 overflow-hidden">
              <div className="bg-[#FC7340] h-full w-[72%] rounded-full shadow-[0_0_10px_rgba(252,115,64,0.5)]" />
            </div>
          </Link>

          {/* Card 2: Криві: Динаміка очок (акцентна оранжева картка) */}
          <Link
            href="/leagues"
            className="bg-gradient-to-br from-[#FC7340] via-[#FF5E3A] to-[#E24A5E] hover:from-[#fd8055] rounded-2xl p-4 sm:p-5 text-white shadow-[0_12px_35px_rgba(252,115,64,0.4)] hover:shadow-[0_16px_45px_rgba(252,115,64,0.55)] hover:-translate-y-1 transition-all text-left block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-bold text-white">
                Криві: Динаміка очок
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
                Топ-4 Ліги
              </span>
            </div>

            {/* SVG крива з пульсуючою точкою */}
            <div className="relative h-12 sm:h-14 w-full flex items-center justify-center my-1.5">
              <svg
                viewBox="0 0 240 50"
                className="w-full h-full overflow-visible"
                fill="none"
              >
                <path
                  d="M 5 42 C 60 42, 90 20, 140 22 C 180 24, 205 10, 235 6"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="140"
                  cy="22"
                  r="5"
                  fill="#FFFFFF"
                  stroke="#FC7340"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-white/95 mt-1">
              <span>Динаміка турнірної таблиці</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          {/* Card 3: Таймлайн туру */}
          <Link
            href="/leagues"
            className="bg-[#0A1430]/95 hover:bg-[#0e1b3d] border border-[#162544] hover:border-[#0297DE]/60 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md transition-all text-left group block"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#0297DE] transition-colors">
                Таймлайн туру
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                90&apos; + 4&apos;
              </span>
            </div>

            {/* Сегменти таймлайну */}
            <div className="grid grid-cols-10 gap-1.5 my-3">
              {Array.from({ length: 10 }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-3 rounded-[3px] border ${
                    idx === 2 || idx === 6
                      ? "bg-[#FC7340] border-[#FC7340]"
                      : idx === 8
                      ? "bg-[#0297DE] border-[#0297DE]"
                      : "bg-[#060A17] border-[#1E2E4A]"
                  }`}
                />
              ))}
            </div>

            {/* Подвійні прогрес-бари (оранжевий і синій) */}
            <div className="space-y-1.5">
              <div className="w-full bg-[#060A17] rounded-full h-2 overflow-hidden">
                <div className="bg-[#FC7340] h-full w-[88%] rounded-full shadow-[0_0_8px_rgba(252,115,64,0.4)]" />
              </div>
              <div className="w-full bg-[#060A17] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#0297DE] h-full w-[62%] rounded-full shadow-[0_0_8px_rgba(2,151,222,0.4)]" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 5. ФУТЕР ПЛАТФОРМИ                                        */}
      {/* ========================================================= */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto pt-4 sm:pt-6 border-t border-[#162544]/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div>Matchday © 2026. Платформа футбольних ліг без ставок на гроші.</div>
        <div className="flex items-center gap-4 text-xs">
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
