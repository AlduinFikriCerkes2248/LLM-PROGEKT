"use client";

import React from "react";

interface AiChipIconProps {
  size?: number;
  className?: string;
  active?: boolean;
  glowColor?: string;
}

export default function AiChipIcon({
  size = 28,
  className = "",
  active = false,
  glowColor = "#08bfea",
}: AiChipIconProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          filter: active
            ? `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})`
            : `drop-shadow(0 0 4px ${glowColor}66)`,
          transition: "filter 0.3s ease",
        }}
      >
        <defs>
          {/* Градієнт для чіпа */}
          <linearGradient id="chipBodyGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Градієнт для доріжок живлення */}
          <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor={glowColor} />
          </linearGradient>

          {/* Анімований біжучий імпульс струму */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ========================================================= */}
        {/* 1. ЗОВНІШНІ КОНТАКТИ / НІЖКИ ЧІПА (PINS)                   */}
        {/* ========================================================= */}
        {/* Верхні ніжки (4 шт.) */}
        <g stroke={glowColor} strokeWidth="3" strokeLinecap="round" opacity="0.85">
          <line x1="36" y1="6" x2="36" y2="24" className="animate-pulse" style={{ animationDelay: "0.1s" }} />
          <line x1="45" y1="6" x2="45" y2="24" className="animate-pulse" style={{ animationDelay: "0.3s" }} />
          <line x1="55" y1="6" x2="55" y2="24" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
          <line x1="64" y1="6" x2="64" y2="24" className="animate-pulse" style={{ animationDelay: "0.4s" }} />

          {/* Нижні ніжки (4 шт.) */}
          <line x1="36" y1="76" x2="36" y2="94" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
          <line x1="45" y1="76" x2="45" y2="94" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
          <line x1="55" y1="76" x2="55" y2="94" className="animate-pulse" style={{ animationDelay: "0.1s" }} />
          <line x1="64" y1="76" x2="64" y2="94" className="animate-pulse" style={{ animationDelay: "0.3s" }} />

          {/* Ліві ніжки (4 шт.) */}
          <line x1="6" y1="36" x2="24" y2="36" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
          <line x1="6" y1="45" x2="24" y2="45" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
          <line x1="6" y1="55" x2="24" y2="55" className="animate-pulse" style={{ animationDelay: "0.3s" }} />
          <line x1="6" y1="64" x2="24" y2="64" className="animate-pulse" style={{ animationDelay: "0.1s" }} />

          {/* Праві ніжки (4 шт.) */}
          <line x1="76" y1="36" x2="94" y2="36" className="animate-pulse" style={{ animationDelay: "0.1s" }} />
          <line x1="76" y1="45" x2="94" y2="45" className="animate-pulse" style={{ animationDelay: "0.3s" }} />
          <line x1="76" y1="55" x2="94" y2="55" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
          <line x1="76" y1="64" x2="94" y2="64" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
        </g>

        {/* ========================================================= */}
        {/* 2. КОРПУС МІКРОСХЕМИ / ЧІПА                                */}
        {/* ========================================================= */}
        <rect
          x="24"
          y="24"
          width="52"
          height="52"
          rx="7"
          ry="7"
          fill="url(#chipBodyGrad)"
          stroke={glowColor}
          strokeWidth="2.5"
          className="transition-colors"
        />

        {/* Маркер першої ніжки (Pin 1 dot в лівому нижньому куті як на референсі) */}
        <circle cx="31" cy="69" r="2" fill={glowColor} opacity="0.9" />

        {/* ========================================================= */}
        {/* 3. ДОРІЖКИ ПЛАТИ ТА КРУГЛІ КОНТАКТНІ ТОЧКИ (ДЕТАЛІ З ФОТО) */}
        {/* ========================================================= */}
        {/* Доріжка 1: Верхньо-права доріжка */}
        <g filter="url(#neonGlow)">
          <path
            d="M 64 24 L 64 36 L 55 45"
            stroke="url(#traceGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={active ? "8 3" : "none"}
            className={active ? "animate-[dash_1s_linear_infinite]" : ""}
          />
          <circle cx="55" cy="45" r="4.5" fill="#0f172a" stroke={glowColor} strokeWidth="2.5" />
          <circle cx="55" cy="45" r="2" fill={glowColor} className="animate-ping" style={{ animationDuration: "2.5s" }} />

          {/* Доріжка 2: Ліво-верхня доріжка */}
          <path
            d="M 24 38 L 40 38 L 48 46"
            stroke="url(#traceGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={active ? "8 3" : "none"}
            className={active ? "animate-[dash_1s_linear_infinite]" : ""}
          />
          <circle cx="48" cy="46" r="4.5" fill="#0f172a" stroke={glowColor} strokeWidth="2.5" />
          <circle cx="48" cy="46" r="2" fill={glowColor} className="animate-ping" style={{ animationDuration: "2s" }} />

          {/* Доріжка 3: Ліво-нижня доріжка */}
          <path
            d="M 37 76 L 37 62 L 44 55"
            stroke="url(#traceGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={active ? "8 3" : "none"}
            className={active ? "animate-[dash_1s_linear_infinite]" : ""}
          />
          <circle cx="44" cy="55" r="4.5" fill="#0f172a" stroke={glowColor} strokeWidth="2.5" />
          <circle cx="44" cy="55" r="2" fill={glowColor} className="animate-ping" style={{ animationDuration: "3s" }} />

          {/* Доріжка 4: Право-нижня доріжка з вигином */}
          <path
            d="M 54 76 L 54 66 L 66 66 L 66 54"
            stroke="url(#traceGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={active ? "8 3" : "none"}
            className={active ? "animate-[dash_1s_linear_infinite]" : ""}
          />
          <circle cx="66" cy="54" r="4.5" fill="#0f172a" stroke={glowColor} strokeWidth="2.5" />
          <circle cx="66" cy="54" r="2" fill={glowColor} className="animate-ping" style={{ animationDuration: "1.8s" }} />
        </g>
      </svg>
    </div>
  );
}
