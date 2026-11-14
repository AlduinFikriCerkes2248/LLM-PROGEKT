"use client";

import React, { useEffect, useRef, useState } from "react";

interface MatrixAvatarProps {
  theme?: "dark" | "light";
  size?: number;
  initial?: string;
  className?: string;
  onClick?: () => void;
}

const MATRIX_CHARS = [
  "0", "1", "日", "ﾊ", "ﾐ", "ﾋ", "ｰ", "ｳ", "ｼ", "ﾅ", "ﾓ", "ｸ", "7", "Z", "M", "D", "X", "8"
];

export default function MatrixAvatar({
  theme = "dark",
  size = 42,
  initial = "M",
  className = "",
  onClick,
}: MatrixAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentDisplayTheme, setCurrentDisplayTheme] = useState<"dark" | "light">(theme);
  const prevThemeRef = useRef(theme);

  // Слухаємо зміну теми для запуску Matrix-анімації
  useEffect(() => {
    if (prevThemeRef.current !== theme) {
      prevThemeRef.current = theme;
      playMatrixDissolve(theme);
    }
  }, [theme]);

  // Запуск Matrix розпаду та складання (dissolve -> reassemble piece by piece)
  function playMatrixDissolve(targetTheme: "dark" | "light") {
    const canvas = canvasRef.current;
    if (!canvas) {
      setCurrentDisplayTheme(targetTheme);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCurrentDisplayTheme(targetTheme);
      return;
    }

    setIsAnimating(true);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const GRID = 8; // Сітка 8x8 блоків
    const cellSize = size / GRID;

    // Створюємо матричні фрагменти (часточки по частях)
    type Fragment = {
      gx: number;
      gy: number;
      targetX: number;
      targetY: number;
      curX: number;
      curY: number;
      char: string;
      color: string;
      dissolveDelay: number;
      dissolveSpeed: number;
      reassembleDelay: number;
      locked: boolean;
      alpha: number;
    };

    const fragments: Fragment[] = [];

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        // Формуємо силует голови/аватара (круглий масив)
        const dx = c - GRID / 2 + 0.5;
        const dy = r - GRID / 2 + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > (GRID / 2)) continue; // відсікаємо за межами кола

        const posX = c * cellSize;
        const posY = r * cellSize;

        fragments.push({
          gx: c,
          gy: r,
          targetX: posX,
          targetY: posY,
          curX: posX,
          curY: posY,
          char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
          color: Math.random() > 0.3 ? "#22c55e" : "#eab308", // Неоновий зелений Матриці або золото
          dissolveDelay: Math.random() * 180, // затримка зникнення кожного шматочка
          dissolveSpeed: 1.5 + Math.random() * 2.5,
          reassembleDelay: 320 + Math.random() * 260, // затримка появи кожного шматочка
          locked: false,
          alpha: 1,
        });
      }
    }

    const startTime = performance.now();
    const DURATION = 850; // ms
    let hasSwitchedColor = false;
    const context = ctx;

    function render(time: number) {
      if (!context) return;
      const elapsed = time - startTime;
      context.clearRect(0, 0, size, size);

      // 1. На середині (350мс) перемикаємо базовий колір аватара
      if (elapsed >= 350 && !hasSwitchedColor) {
        hasSwitchedColor = true;
        setCurrentDisplayTheme(targetTheme);
      }

      // 2. Фаза розпаду (Dissolve: шматочки зникають дощем / глітчем)
      if (elapsed < 350) {
        fragments.forEach((frag) => {
          if (elapsed > frag.dissolveDelay) {
            frag.curY += frag.dissolveSpeed;
            frag.alpha = Math.max(0, 1 - (elapsed - frag.dissolveDelay) / 160);
            if (Math.random() < 0.25) {
              frag.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
            }
          }

          if (frag.alpha > 0.05) {
            context.fillStyle = frag.color;
            context.font = `bold ${Math.round(cellSize * 1.05)}px monospace`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.globalAlpha = frag.alpha;
            context.fillText(frag.char, frag.curX + cellSize / 2, frag.curY + cellSize / 2);
          }
        });
      } else {
        // 3. Фаза збирання (Reassemble: шматочки з'являються по частинах зверху донизу)
        const reassemblePhase = elapsed - 350;
        let allLocked = true;

        fragments.forEach((frag) => {
          if (reassemblePhase < frag.reassembleDelay - 350) {
            allLocked = false;
            // Падіння зеленого коду Матриці зверху
            if (Math.random() < 0.15) {
              context.fillStyle = "#4ade80";
              context.font = `bold ${Math.round(cellSize)}px monospace`;
              context.textAlign = "center";
              context.textBaseline = "middle";
              context.globalAlpha = 0.5;
              context.fillText(
                frag.char,
                frag.targetX + cellSize / 2,
                (frag.targetY - (350 - reassemblePhase) * 0.2) + cellSize / 2
              );
            }
            return;
          }

          // Фіксація шматочка на своєму місці (поява по частинах)
          frag.locked = true;
          const lockAge = reassemblePhase - (frag.reassembleDelay - 350);
          const flash = Math.max(0, 1 - lockAge / 140);

          context.fillStyle =
            flash > 0
              ? targetTheme === "dark"
                ? "#ffffff"
                : "#22c55e"
              : targetTheme === "dark"
                ? "#ffffff"
                : "#0f172a";
          context.font = `bold ${Math.round(cellSize * 0.95)}px monospace`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.globalAlpha = Math.min(1, 0.4 + lockAge / 100);
          context.fillText(frag.char, frag.targetX + cellSize / 2, frag.targetY + cellSize / 2);

          if (lockAge < 250) {
            allLocked = false;
          }
        });
      }

      // Скануючий горизонтальний промінь матриці
      const scanY = (elapsed / DURATION) * size;
      const grad = context.createLinearGradient(0, scanY - 3, 0, scanY + 3);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, "rgba(34, 197, 94, 0.8)");
      grad.addColorStop(1, "transparent");
      context.fillStyle = grad;
      context.fillRect(0, scanY - 3, size, 6);

      context.globalAlpha = 1;

      if (elapsed < DURATION) {
        requestAnimationFrame(render);
      } else {
        context.clearRect(0, 0, size, size);
        setIsAnimating(false);
        setCurrentDisplayTheme(targetTheme);
      }
    }

    requestAnimationFrame(render);
  }

  const isDark = currentDisplayTheme === "dark";

  return (
    <div
      onClick={() => {
        const nextTheme = currentDisplayTheme === "dark" ? "light" : "dark";
        playMatrixDissolve(nextTheme);
        if (onClick) onClick();
      }}
      title="Натисніть для Matrix-трансформації аватарки"
      className={`relative inline-flex items-center justify-center cursor-pointer select-none rounded-full overflow-hidden transition-all duration-300 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: isDark
          ? "radial-gradient(circle at 35% 35%, #1f2533 0%, #0d1118 100%)"
          : "radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 100%)",
        boxShadow: isDark
          ? "0 0 10px rgba(0, 255, 102, 0.25), inset 0 1px 2px rgba(255,255,255,0.2)"
          : "0 0 10px rgba(234, 179, 8, 0.3), inset 0 1px 2px rgba(0,0,0,0.1)",
        border: isDark
          ? "1.5px solid rgba(255, 255, 255, 0.3)"
          : "1.5px solid rgba(15, 23, 42, 0.3)",
      }}
    >
      {/* 1. БАЗОВА АВАТАРКА (ЧОРНА / БІЛА) */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isAnimating ? "opacity-20 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Векторний кібер-силует агента */}
        <svg
          width={Math.round(size * 0.65)}
          height={Math.round(size * 0.65)}
          viewBox="0 0 24 24"
          fill="none"
          className="transition-colors duration-300"
        >
          {/* Голова та плечі */}
          <path
            d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"
            fill={isDark ? "#ffffff" : "#0f172a"}
          />
          {/* Кібер-візор / лінза з відблиском */}
          <path
            d="M8.5 6.8h7a1.2 1.2 0 0 1 1.2 1.2v0.4a1.2 1.2 0 0 1-1.2 1.2h-7A1.2 1.2 0 0 1 7.3 8.4V8a1.2 1.2 0 0 1 1.2-1.2z"
            fill={isDark ? "#22c55e" : "#eab308"}
          />
          {/* Плечовий контур */}
          <path
            d="M3 20.5c0-3.6 4-6.5 9-6.5s9 2.9 9 6.5V22H3v-1.5z"
            fill={isDark ? "#ffffff" : "#0f172a"}
          />
        </svg>

        {/* Сяйво під візором */}
        <span
          className="absolute h-1.5 w-1.5 rounded-full pointer-events-none"
          style={{
            background: isDark ? "#22c55e" : "#eab308",
            boxShadow: isDark ? "0 0 8px #22c55e" : "0 0 8px #eab308",
            top: `${Math.round(size * 0.35)}px`,
          }}
        />
      </div>

      {/* 2. ПОЛОТНО МАТРИЧНОГО РОЗПАДУ / СКЛАДАННЯ (CANVAS) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${
          isAnimating ? "opacity-100 z-10" : "opacity-0"
        }`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}
