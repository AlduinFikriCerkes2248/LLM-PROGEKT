"use client";

import React from "react";

export type CaseTier = "starter" | "pro" | "legendary";

interface CaseBoxGraphicProps {
  tier: CaseTier;
  size?: number;
  className?: string;
  isHovered?: boolean;
}

const TIER_CONFIG = {
  starter: {
    name: "Стартовий кейс",
    tierLabel: "TIER 01",
    subLabel: "RECRUIT CRATE",
    numeral: "I",
    primaryColor: "#10b981",    // Emerald
    secondaryColor: "#34d399",  // Mint
    accentColor: "#059669",     // Deep Emerald
    glowColor: "rgba(16, 185, 129, 0.45)",
    shadowColor: "rgba(16, 185, 129, 0.2)",
    bodyGradStart: "#132320",
    bodyGradEnd: "#091210",
    plateGradStart: "#1a352e",
    plateGradEnd: "#0f201b",
    rimColor: "#10b981",
  },
  pro: {
    name: "Професійний кейс",
    tierLabel: "TIER 02",
    subLabel: "TACTICAL CRATE",
    numeral: "II",
    primaryColor: "#08bfea",    // Neon Cyan
    secondaryColor: "#38bdf8",  // Sky Blue
    accentColor: "#0284c7",     // Deep Blue
    glowColor: "rgba(8, 191, 234, 0.5)",
    shadowColor: "rgba(8, 191, 234, 0.25)",
    bodyGradStart: "#0e2233",
    bodyGradEnd: "#07111c",
    plateGradStart: "#123049",
    plateGradEnd: "#0b1d2e",
    rimColor: "#08bfea",
  },
  legendary: {
    name: "Легендарний VIP кейс",
    tierLabel: "TIER 03",
    subLabel: "MYTHIC ELITE CRATE",
    numeral: "III",
    primaryColor: "#f59e0b",    // Royal Gold
    secondaryColor: "#fbbf24",  // Amber Gold
    accentColor: "#d97706",     // Deep Amber
    glowColor: "rgba(245, 158, 11, 0.55)",
    shadowColor: "rgba(245, 158, 11, 0.3)",
    bodyGradStart: "#281b0a",
    bodyGradEnd: "#140e05",
    plateGradStart: "#3b2810",
    plateGradEnd: "#231809",
    rimColor: "#f59e0b",
  },
};

export default function CaseBoxGraphic({
  tier = "starter",
  size = 140,
  className = "",
  isHovered = false,
}: CaseBoxGraphicProps) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.starter;
  const uniqueId = `case-${tier}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-300 ${
        isHovered ? "scale-105 -translate-y-1.5" : ""
      } ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        style={{
          filter: `drop-shadow(0 12px 24px ${cfg.shadowColor})`,
        }}
      >
        <defs>
          {/* Градієнт тіні на підлозі */}
          <radialGradient
            id={`${uniqueId}-groundGlow`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor={cfg.primaryColor} stopOpacity="0.4" />
            <stop offset="60%" stopColor={cfg.accentColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Градієнт корпусу кейса */}
          <linearGradient
            id={`${uniqueId}-bodyGrad`}
            x1="20"
            y1="36"
            x2="140"
            y2="136"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={cfg.bodyGradStart} />
            <stop offset="50%" stopColor="#0d1522" />
            <stop offset="100%" stopColor={cfg.bodyGradEnd} />
          </linearGradient>

          {/* Градієнт верхньої кришки */}
          <linearGradient
            id={`${uniqueId}-lidGrad`}
            x1="20"
            y1="32"
            x2="140"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={cfg.plateGradStart} />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor={cfg.plateGradEnd} />
          </linearGradient>

          {/* Металічний градієнт ручки та застібок */}
          <linearGradient
            id={`${uniqueId}-metalGrad`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Градієнт енергетичного реактора */}
          <radialGradient
            id={`${uniqueId}-coreGrad`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor={cfg.secondaryColor} />
            <stop offset="75%" stopColor={cfg.primaryColor} />
            <stop offset="100%" stopColor={cfg.accentColor} />
          </radialGradient>

          {/* Фільтр неземного неонового світіння */}
          <filter
            id={`${uniqueId}-neonFilter`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. М'ЯКА ОВАЛЬНА ТІНЬ З ПІДСВІЧУВАННЯМ ПІД КЕЙСОМ */}
        <ellipse
          cx="80"
          cy="146"
          rx="58"
          ry="10"
          fill={`url(#${uniqueId}-groundGlow)`}
        />
        <ellipse
          cx="80"
          cy="146"
          rx="42"
          ry="5"
          fill="#000000"
          opacity="0.6"
        />

        {/* 2. ВЕРХНЯ РУЧКА З МЕТАЛЕВИМ ХВАТОМ */}
        <g stroke={`url(#${uniqueId}-metalGrad)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Ліве та праве кріплення */}
          <path d="M 58 36 L 58 20 Q 80 14 102 20 L 102 36" />
        </g>
        {/* Рукоятка з гумовим/титановим ребристим хватом */}
        <rect
          x="68"
          y="15"
          width="24"
          height="7"
          rx="3.5"
          fill="#0f172a"
          stroke={cfg.primaryColor}
          strokeWidth="1.5"
        />
        <line x1="74" y1="16" x2="74" y2="21" stroke="#475569" strokeWidth="1" />
        <line x1="80" y1="16" x2="80" y2="21" stroke="#475569" strokeWidth="1" />
        <line x1="86" y1="16" x2="86" y2="21" stroke="#475569" strokeWidth="1" />

        {/* 3. ОСНОВНИЙ БРОНЬОВАНИЙ КОРПУС КЕЙСА */}
        <rect
          x="22"
          y="38"
          width="116"
          height="98"
          rx="12"
          fill={`url(#${uniqueId}-bodyGrad)`}
          stroke={cfg.primaryColor}
          strokeWidth="2"
        />

        {/* Рельєфні фаски та внутрішня рамка захисту */}
        <rect
          x="27"
          y="43"
          width="106"
          height="88"
          rx="8"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
        />

        {/* 4. ВЕРХНЯ КРИШКА (LID) ЗІ СКОШЕНИМИ КРАЯМИ */}
        <path
          d="M 20 40 Q 20 34 26 34 L 134 34 Q 140 34 140 40 L 138 52 Q 138 54 134 54 L 26 54 Q 22 54 22 52 Z"
          fill={`url(#${uniqueId}-lidGrad)`}
          stroke={cfg.primaryColor}
          strokeWidth="1.8"
        />

        {/* Неонова лінія розмикання кейсу між кришкою і базою */}
        <line
          x1="22"
          y1="54"
          x2="138"
          y2="54"
          stroke={cfg.primaryColor}
          strokeWidth="2"
          filter={`url(#${uniqueId}-neonFilter)`}
          opacity="0.9"
        />

        {/* 5. КУТОВІ ЗАХИСНІ БРОНЕПЛАСТИНИ З БОЛТАМИ */}
        {/* Верхній лівий кут */}
        <path d="M 22 46 L 36 46 L 36 60 L 22 60 Z" fill={cfg.plateGradEnd} stroke={cfg.primaryColor} strokeWidth="1.2" />
        <circle cx="28" cy="52" r="1.8" fill="#64748b" />

        {/* Верхній правий кут */}
        <path d="M 124 46 L 138 46 L 138 60 L 124 60 Z" fill={cfg.plateGradEnd} stroke={cfg.primaryColor} strokeWidth="1.2" />
        <circle cx="132" cy="52" r="1.8" fill="#64748b" />

        {/* Нижній лівий кут */}
        <path d="M 22 120 L 38 120 L 38 136 L 22 136 Z" fill={cfg.plateGradEnd} stroke={cfg.primaryColor} strokeWidth="1.2" />
        <circle cx="29" cy="127" r="1.8" fill="#64748b" />

        {/* Нижній правий кут */}
        <path d="M 122 120 L 138 120 L 138 136 L 122 136 Z" fill={cfg.plateGradEnd} stroke={cfg.primaryColor} strokeWidth="1.2" />
        <circle cx="131" cy="127" r="1.8" fill="#64748b" />

        {/* 6. БІЧНІ МЕХАНІЧНІ ЗАМКИ / ЗАТИСКАЧІ (HEAVY CLAMPS) */}
        {/* Лівий замок */}
        <rect x="36" y="46" width="12" height="18" rx="2" fill={`url(#${uniqueId}-metalGrad)`} stroke="#475569" strokeWidth="1" />
        <rect x="39" y="52" width="6" height="6" rx="1" fill="#0f172a" />
        <circle cx="42" cy="55" r="1.2" fill={cfg.secondaryColor} />

        {/* Правий замок */}
        <rect x="112" y="46" width="12" height="18" rx="2" fill={`url(#${uniqueId}-metalGrad)`} stroke="#475569" strokeWidth="1" />
        <rect x="115" y="52" width="6" height="6" rx="1" fill="#0f172a" />
        <circle cx="118" cy="55" r="1.2" fill={cfg.secondaryColor} />

        {/* 7. ФАСАДНА ВЕНТИЛЯЦІЯ ТА КІБЕР-ПАНЕЛІ */}
        {/* Ліва вентиляційна решітка */}
        <g stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="32" y1="78" x2="48" y2="78" />
          <line x1="32" y1="86" x2="48" y2="86" />
          <line x1="32" y1="94" x2="48" y2="94" />
        </g>
        {/* Права вентиляційна решітка */}
        <g stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="112" y1="78" x2="128" y2="78" />
          <line x1="112" y1="86" x2="128" y2="86" />
          <line x1="112" y1="94" x2="128" y2="94" />
        </g>

        {/* 8. ЦЕНТРАЛЬНИЙ ЕНЕРГЕТИЧНИЙ РЕАКТОР / БІОМЕТРИЧНИЙ ЗАМОК */}
        {/* Зовнішній металічний фланець реактора */}
        <circle
          cx="80"
          cy="90"
          r="26"
          fill="#090e17"
          stroke={cfg.primaryColor}
          strokeWidth="2.5"
          filter={`url(#${uniqueId}-neonFilter)`}
        />
        {/* Внутрішній темний екран */}
        <circle
          cx="80"
          cy="90"
          r="20"
          fill="#04070e"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />

        {/* Енергетичні концентричні орбіти залежно від рангу */}
        {tier === "starter" && (
          <g>
            {/* Одне енергетичне кільце */}
            <circle
              cx="80"
              cy="90"
              r="14"
              fill="none"
              stroke={cfg.secondaryColor}
              strokeWidth="2"
              strokeDasharray="14 6"
              className="animate-[spin_8s_linear_infinite]"
              style={{ transformOrigin: "80px 90px" }}
            />
            {/* Центральне ядро реактора */}
            <circle
              cx="80"
              cy="90"
              r="7"
              fill={`url(#${uniqueId}-coreGrad)`}
              className="animate-pulse"
            />
          </g>
        )}

        {tier === "pro" && (
          <g>
            {/* Два концентричні кільця */}
            <circle
              cx="80"
              cy="90"
              r="15"
              fill="none"
              stroke={cfg.secondaryColor}
              strokeWidth="2"
              strokeDasharray="10 4"
              className="animate-[spin_6s_linear_infinite]"
              style={{ transformOrigin: "80px 90px" }}
            />
            <circle
              cx="80"
              cy="90"
              r="10"
              fill="none"
              stroke={cfg.primaryColor}
              strokeWidth="1.5"
              strokeDasharray="6 3"
              className="animate-[spin_4s_linear_infinite_reverse]"
              style={{ transformOrigin: "80px 90px" }}
            />
            {/* Центральне ядро */}
            <circle
              cx="80"
              cy="90"
              r="6"
              fill={`url(#${uniqueId}-coreGrad)`}
              className="animate-pulse"
            />
          </g>
        )}

        {tier === "legendary" && (
          <g>
            {/* Три концентричні золоті кільця + ореол сонця */}
            <circle
              cx="80"
              cy="90"
              r="16"
              fill="none"
              stroke={cfg.secondaryColor}
              strokeWidth="2.5"
              strokeDasharray="8 4"
              className="animate-[spin_5s_linear_infinite]"
              style={{ transformOrigin: "80px 90px" }}
            />
            <circle
              cx="80"
              cy="90"
              r="11"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              className="animate-[spin_3s_linear_infinite_reverse]"
              style={{ transformOrigin: "80px 90px" }}
            />
            {/* Сяюча корона / кристал */}
            <path
              d="M 75 92 L 80 84 L 85 92 L 82 94 L 78 94 Z"
              fill="#ffffff"
              filter={`url(#${uniqueId}-neonFilter)`}
            />
            <circle
              cx="80"
              cy="90"
              r="7"
              fill={`url(#${uniqueId}-coreGrad)`}
              className="animate-pulse"
              opacity="0.9"
            />

            {/* Золоті частинки іскор */}
            <circle cx="58" cy="74" r="1.5" fill="#fde68a" className="animate-ping" style={{ animationDuration: "2s" }} />
            <circle cx="102" cy="74" r="1.5" fill="#fde68a" className="animate-ping" style={{ animationDuration: "2.4s" }} />
            <circle cx="64" cy="112" r="1.2" fill="#fbbf24" className="animate-ping" style={{ animationDuration: "1.8s" }} />
            <circle cx="96" cy="112" r="1.2" fill="#fbbf24" className="animate-ping" style={{ animationDuration: "2.2s" }} />
          </g>
        )}

        {/* 9. НИЖНІ ДЕТАЛІ: ТАКТИЧНИЙ ШТРИХ-КОД ТА ШТАМП РАНГУ */}
        <text
          x="80"
          y="126"
          fill={cfg.secondaryColor}
          fontSize="9"
          fontWeight="900"
          letterSpacing="0.2em"
          textAnchor="middle"
          fontFamily="monospace"
          opacity="0.95"
        >
          {cfg.tierLabel}
        </text>

        {/* Міні штрих-код у нижньому правому кутку */}
        <g stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1">
          <line x1="108" y1="126" x2="108" y2="132" />
          <line x1="110" y1="126" x2="110" y2="132" />
          <line x1="113" y1="126" x2="113" y2="132" />
          <line x1="115" y1="126" x2="115" y2="132" />
          <line x1="118" y1="126" x2="118" y2="132" />
        </g>

        {/* Міні індикатор живлення в лівому кутку */}
        <circle cx="44" cy="129" r="2" fill={cfg.primaryColor} className="animate-pulse" />
      </svg>
    </div>
  );
}
