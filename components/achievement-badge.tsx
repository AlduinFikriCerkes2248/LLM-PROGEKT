"use client";

import React from "react";

export type AchievementRarity = "common" | "rare" | "epic" | "mythic" | "legendary";

interface AchievementBadgeProps {
  rarity: AchievementRarity;
  iconType?: string;
  size?: number;
  completed?: boolean;
  className?: string;
}

const RARITY_THEMES = {
  common: {
    label: "Обичне",
    borderColor: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.4)",
    badgeBg: "from-emerald-950/80 to-slate-950",
    ribbonColor: "#34d399",
    crestColor: "#059669",
  },
  rare: {
    label: "Рідкісне",
    borderColor: "#08bfea",
    glowColor: "rgba(8, 191, 234, 0.45)",
    badgeBg: "from-cyan-950/80 to-slate-950",
    ribbonColor: "#38bdf8",
    crestColor: "#0284c7",
  },
  epic: {
    label: "Епічне",
    borderColor: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.5)",
    badgeBg: "from-purple-950/80 to-slate-950",
    ribbonColor: "#c084fc",
    crestColor: "#7e22ce",
  },
  mythic: {
    label: "Міфічне",
    borderColor: "#f43f5e",
    glowColor: "rgba(244, 63, 94, 0.6)",
    badgeBg: "from-rose-950/80 to-slate-950",
    ribbonColor: "#fb7185",
    crestColor: "#be123c",
  },
  legendary: {
    label: "Легендарне",
    borderColor: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.65)",
    badgeBg: "from-amber-950/80 to-slate-950",
    ribbonColor: "#fbbf24",
    crestColor: "#b45309",
  },
};

export default function AchievementBadge({
  rarity = "common",
  iconType = "star",
  size = 64,
  completed = false,
  className = "",
}: AchievementBadgeProps) {
  const theme = RARITY_THEMES[rarity] || RARITY_THEMES.common;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-300 ${
        completed ? "hover:scale-110" : "grayscale contrast-75 opacity-60 hover:grayscale-0 hover:opacity-100"
      } ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        filter: completed
          ? `drop-shadow(0 0 12px ${theme.glowColor}) drop-shadow(0 0 20px ${theme.glowColor})`
          : "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={`grad-${rarity}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.ribbonColor} />
            <stop offset="50%" stopColor={theme.borderColor} />
            <stop offset="100%" stopColor={theme.crestColor} />
          </linearGradient>

          <radialGradient id={`glow-${rarity}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="60%" stopColor={theme.borderColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. ФОНОВИЙ КОРПУС МЕДАЛІ (SHIELD / HEXAGON / CREST) */}
        {rarity === "common" && (
          <polygon
            points="50,6 88,24 88,76 50,94 12,76 12,24"
            fill="#091210"
            stroke={theme.borderColor}
            strokeWidth="3.5"
          />
        )}

        {rarity === "rare" && (
          <polygon
            points="50,4 92,26 92,74 50,96 8,74 8,26"
            fill="#07111c"
            stroke="url(#grad-rare)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        )}

        {rarity === "epic" && (
          <polygon
            points="50,2 96,24 78,82 50,98 22,82 4,24"
            fill="#12081f"
            stroke="url(#grad-epic)"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
        )}

        {rarity === "mythic" && (
          <polygon
            points="50,2 95,18 85,80 50,98 15,80 5,18"
            fill="#1a060b"
            stroke="url(#grad-mythic)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        )}

        {rarity === "legendary" && (
          <g>
            <polygon
              points="50,2 98,22 82,84 50,98 18,84 2,22"
              fill="#1c1305"
              stroke="url(#grad-legendary)"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Зовнішнє сяйво корони */}
            <circle cx="50" cy="50" r="42" fill="url(#glow-legendary)" />
          </g>
        )}

        {/* 2. ВНУТРІШНЯ РАМКА З ФАСКАМИ */}
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="#0a0f1d"
          stroke={theme.borderColor}
          strokeWidth="2"
          opacity="0.9"
        />

        {/* 3. ДЕТАЛЬНІ ВЕКТОРНІ ІКОНКИ ЗА ТИПОМ ЗАВДАННЯ */}
        {iconType === "ball" && (
          /* Футбольний м'яч */
          <g stroke={theme.ribbonColor} strokeWidth="1.8" fill="none">
            <circle cx="50" cy="50" r="16" fill="#0f172a" />
            <polygon points="50,42 58,47 55,56 45,56 42,47" fill={theme.ribbonColor} />
            <line x1="50" y1="42" x2="50" y2="34" />
            <line x1="58" y1="47" x2="65" y2="44" />
            <line x1="55" y1="56" x2="60" y2="63" />
            <line x1="45" y1="56" x2="40" y2="63" />
            <line x1="42" y1="47" x2="35" y2="44" />
          </g>
        )}

        {iconType === "profile" && (
          /* Аватар / профіль */
          <g fill={theme.ribbonColor}>
            <circle cx="50" cy="42" r="7" />
            <path d="M 36 60 Q 36 52 50 52 Q 64 52 64 60 Z" />
          </g>
        )}

        {iconType === "wheel" && (
          /* Колесо фортуни */
          <g stroke={theme.ribbonColor} strokeWidth="2">
            <circle cx="50" cy="50" r="16" fill="#0f172a" />
            <line x1="50" y1="34" x2="50" y2="66" />
            <line x1="34" y1="50" x2="66" y2="50" />
            <line x1="39" y1="39" x2="61" y2="61" />
            <line x1="39" y1="61" x2="61" y2="39" />
            <circle cx="50" cy="50" r="4" fill={theme.ribbonColor} />
          </g>
        )}

        {iconType === "dice" && (
          /* Гральні кості */
          <g fill="#0f172a" stroke={theme.ribbonColor} strokeWidth="2">
            <rect x="38" y="38" width="24" height="24" rx="4" />
            <circle cx="44" cy="44" r="2" fill={theme.ribbonColor} />
            <circle cx="56" cy="44" r="2" fill={theme.ribbonColor} />
            <circle cx="50" cy="50" r="2" fill={theme.ribbonColor} />
            <circle cx="44" cy="56" r="2" fill={theme.ribbonColor} />
            <circle cx="56" cy="56" r="2" fill={theme.ribbonColor} />
          </g>
        )}

        {iconType === "crate" && (
          /* Скриня з лутом */
          <g stroke={theme.ribbonColor} strokeWidth="2" fill="#0f172a">
            <rect x="36" y="42" width="28" height="20" rx="3" />
            <line x1="36" y1="48" x2="64" y2="48" />
            <circle cx="50" cy="53" r="2.5" fill={theme.ribbonColor} />
          </g>
        )}

        {iconType === "target" && (
          /* Приціл / Точний рахунок */
          <g stroke={theme.ribbonColor} strokeWidth="2" fill="none">
            <circle cx="50" cy="50" r="15" />
            <circle cx="50" cy="50" r="7" />
            <line x1="50" y1="31" x2="50" y2="37" />
            <line x1="50" y1="63" x2="50" y2="69" />
            <line x1="31" y1="50" x2="37" y2="50" />
            <line x1="63" y1="50" x2="69" y2="50" />
            <circle cx="50" cy="50" r="2" fill={theme.ribbonColor} />
          </g>
        )}

        {iconType === "cards" && (
          /* Блекджек карти */
          <g stroke={theme.ribbonColor} strokeWidth="1.8">
            <rect x="38" y="36" width="16" height="22" rx="2" fill="#0f172a" />
            <rect x="46" y="42" width="16" height="22" rx="2" fill="#1e293b" />
            <text x="49" y="54" fill={theme.ribbonColor} fontSize="9" fontWeight="900" fontFamily="sans-serif">A</text>
            <text x="56" y="60" fill={theme.ribbonColor} fontSize="8">♠</text>
          </g>
        )}

        {iconType === "swords" && (
          /* Схрещені мечі PvP */
          <g stroke={theme.ribbonColor} strokeWidth="2.5" strokeLinecap="round">
            <line x1="36" y1="36" x2="64" y2="64" />
            <line x1="64" y1="36" x2="36" y2="64" />
            <line x1="33" y1="39" x2="39" y2="33" />
            <line x1="61" y1="33" x2="67" y2="39" />
          </g>
        )}

        {iconType === "ai-chip" && (
          /* ШІ Мікрочіп */
          <g stroke={theme.ribbonColor} strokeWidth="2" fill="#0f172a">
            <rect x="40" y="40" width="20" height="20" rx="3" />
            <line x1="45" y1="35" x2="45" y2="40" />
            <line x1="55" y1="35" x2="55" y2="40" />
            <line x1="45" y1="60" x2="45" y2="65" />
            <line x1="55" y1="60" x2="55" y2="65" />
            <line x1="35" y1="45" x2="40" y2="45" />
            <line x1="35" y1="55" x2="40" y2="55" />
            <line x1="60" y1="45" x2="65" y2="45" />
            <line x1="60" y1="55" x2="65" y2="55" />
            <circle cx="50" cy="50" r="3" fill={theme.ribbonColor} />
          </g>
        )}

        {iconType === "matrix" && (
          /* Матриця / Окуляри */
          <g stroke={theme.ribbonColor} strokeWidth="2" fill="none">
            <rect x="36" y="46" width="11" height="8" rx="2" fill="#022c22" />
            <rect x="53" y="46" width="11" height="8" rx="2" fill="#022c22" />
            <line x1="47" y1="50" x2="53" y2="50" />
            <text x="39" y="42" fill={theme.ribbonColor} fontSize="7" fontFamily="monospace">01</text>
            <text x="55" y="42" fill={theme.ribbonColor} fontSize="7" fontFamily="monospace">10</text>
          </g>
        )}

        {iconType === "marchenko" && (
          /* «Овеликий Марченко» - Лавровий вінок + корона */
          <g fill={theme.ribbonColor}>
            {/* Лавровий вінок */}
            <path d="M 34 50 Q 34 38 48 36 Q 44 42 46 50 Z" />
            <path d="M 66 50 Q 66 38 52 36 Q 56 42 54 50 Z" />
            {/* Корона */}
            <polygon points="40,58 44,48 50,54 56,48 60,58" stroke={theme.ribbonColor} strokeWidth="1.5" />
            <circle cx="44" cy="46" r="1.5" />
            <circle cx="50" cy="52" r="1.5" />
            <circle cx="56" cy="46" r="1.5" />
          </g>
        )}

        {iconType === "fire" && (
          /* Вогняний стрік */
          <g fill={theme.ribbonColor}>
            <path d="M 50 34 Q 56 42 54 48 Q 58 44 60 48 Q 64 56 50 66 Q 36 56 40 48 Q 44 44 46 48 Q 44 40 50 34 Z" />
          </g>
        )}

        {iconType === "skull-loss" && (
          /* «Везунчик По Полній» (череп + палаючі монети) */
          <g stroke={theme.ribbonColor} strokeWidth="2" fill="#20050b">
            <circle cx="50" cy="46" r="11" />
            <rect x="45" y="55" width="10" height="7" rx="1" />
            {/* Очниці */}
            <circle cx="46" cy="46" r="2.5" fill={theme.ribbonColor} />
            <circle cx="54" cy="46" r="2.5" fill={theme.ribbonColor} />
            {/* Зуби */}
            <line x1="48" y1="57" x2="48" y2="61" />
            <line x1="52" y1="57" x2="52" y2="61" />
          </g>
        )}

        {iconType === "crown" && (
          /* Імперська корона мільйонера */
          <g fill={theme.ribbonColor} stroke="#ffffff" strokeWidth="1">
            <polygon points="34,60 38,40 46,50 50,36 54,50 62,40 66,60" />
            <circle cx="38" cy="38" r="2" fill="#ffffff" />
            <circle cx="50" cy="34" r="2.5" fill="#ffffff" />
            <circle cx="62" cy="38" r="2" fill="#ffffff" />
            <rect x="36" y="60" width="28" height="4" rx="1" fill="#78350f" />
          </g>
        )}

        {iconType === "trophy" && (
          /* Кубок абсолютного чемпіона */
          <g fill={theme.ribbonColor} stroke="#ffffff" strokeWidth="1.2">
            <path d="M 40 36 L 60 36 L 56 52 Q 54 58 50 58 Q 46 58 44 52 Z" />
            <line x1="50" y1="58" x2="50" y2="64" strokeWidth="2" />
            <rect x="42" y="64" width="16" height="4" rx="1" />
            <path d="M 40 40 Q 34 40 34 46 Q 34 52 42 50" fill="none" strokeWidth="1.5" />
            <path d="M 60 40 Q 66 40 66 46 Q 66 52 58 50" fill="none" strokeWidth="1.5" />
          </g>
        )}

        {/* 4. ЗІРОЧКИ АБО ДЕТАЛІ ДЛЯ ЛЕГЕНДАРНИХ */}
        {rarity === "legendary" && completed && (
          <g fill="#fbbf24">
            <polygon points="50,14 52,19 57,19 53,22 55,27 50,24 45,27 47,22 43,19 48,19" />
          </g>
        )}
      </svg>
    </div>
  );
}
