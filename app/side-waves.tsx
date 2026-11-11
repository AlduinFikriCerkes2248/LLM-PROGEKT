"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

// Набір фірмових символів хвилі: # № ! ; / " * ·
const ASCII_PALETTE = ["#", "№", "!", ";", "/", "\"", "*", "·"];

export default function SideWaves() {
  const pathname = usePathname();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      setFrame((prev) => (prev + 1) % 100000);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Крім логіна ("крім логіна" - за запитом користувача)
  const isLoginPage = pathname === "/login" || pathname?.startsWith("/login");

  const leftColumnsCount = 10;
  const rightColumnsCount = 10;

  const leftColumns = useMemo(() => {
    return Array.from({ length: leftColumnsCount }).map((_, i) => ({
      index: i,
      // i = 0 - це крайній лівий стовпчик впритик до краю екрана
      baseHeight: Math.floor(32 - i * 2.2),
    }));
  }, [leftColumnsCount]);

  const rightColumns = useMemo(() => {
    return Array.from({ length: rightColumnsCount }).map((_, i) => ({
      index: i,
      // i = 0 - це крайній правий стовпчик впритик до краю екрана
      baseHeight: Math.floor(32 - i * 2.2),
    }));
  }, [rightColumnsCount]);

  if (isLoginPage) return null;

  const t = frame * 0.045;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* ============================================================== */}
      {/* 1. ЛІВА ХВИЛЯ: ВПРИТИК ДО ЛІВОГО КРАЮ ЕКРАНА (Electric Blue)   */}
      {/* ============================================================== */}
      <div className="absolute left-0 bottom-0 flex items-end gap-[3px] sm:gap-1.5 pl-0 sm:pl-1 pb-1 opacity-70 sm:opacity-90">
        {leftColumns.map((col) => {
          const wave1 = Math.sin(t + col.index * 0.35);
          const wave2 = Math.cos(t * 0.7 - col.index * 0.25);
          const noise = (wave1 + wave2) * 0.5;

          const targetHeight = Math.floor(col.baseHeight + noise * 5.5);
          const clampedHeight = Math.max(4, Math.min(targetHeight, 36));

          const chars: string[] = [];
          for (let row = 0; row < clampedHeight; row++) {
            const ratio = row / clampedHeight;
            let charIndex = Math.floor(ratio * ASCII_PALETTE.length);
            if (charIndex >= ASCII_PALETTE.length) charIndex = ASCII_PALETTE.length - 1;
            chars.push(ASCII_PALETTE[charIndex]);
          }

          return (
            <div
              key={col.index}
              className="flex flex-col-reverse items-center font-mono text-[8px] sm:text-[10px] leading-[8px] sm:leading-[10px] text-[#0297DE] transition-all duration-75"
              style={{
                filter: "drop-shadow(0 0 6px rgba(2,151,222,0.75))",
              }}
            >
              {chars.map((char, charIdx) => (
                <span
                  key={charIdx}
                  className="inline-block"
                  style={{
                    opacity: Math.max(0.18, 1 - (charIdx / clampedHeight) * 0.78),
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* Тонкий вертикальний анімований ланцюг вздовж лівого краю догори */}
      <div className="absolute left-0.5 sm:left-1 top-0 bottom-36 hidden sm:flex flex-col justify-around font-mono text-[8px] text-[#0297DE]/25">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="animate-pulse"
            style={{ animationDelay: `${(i % 7) * 160}ms` }}
          >
            {ASCII_PALETTE[(i + frame) % ASCII_PALETTE.length]}
          </span>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 2. ПРАВА ХВИЛЯ: ВПРИТИК ДО ПРАВОГО КРАЮ ЕКРАНА (Coral / Blue)   */}
      {/* ============================================================== */}
      <div className="absolute right-0 bottom-0 flex flex-row-reverse items-end gap-[3px] sm:gap-1.5 pr-0 sm:pr-1 pb-1 opacity-70 sm:opacity-90">
        {rightColumns.map((col) => {
          const wave1 = Math.sin(t * 0.95 + col.index * 0.38);
          const wave2 = Math.cos(t * 0.65 - col.index * 0.28);
          const noise = (wave1 + wave2) * 0.5;

          const targetHeight = Math.floor(col.baseHeight + noise * 5.5);
          const clampedHeight = Math.max(4, Math.min(targetHeight, 36));

          // Градієнтне чергування відтінків: крайні стовпчики ближче до коралового, далі перехід
          const isCoral = col.index < 6;
          const colorClass = isCoral ? "text-[#FC7340]" : "text-[#0297DE]";
          const shadowColor = isCoral
            ? "drop-shadow(0 0 6px rgba(252,115,64,0.8))"
            : "drop-shadow(0 0 6px rgba(2,151,222,0.75))";

          const chars: string[] = [];
          for (let row = 0; row < clampedHeight; row++) {
            const ratio = row / clampedHeight;
            let charIndex = Math.floor(ratio * ASCII_PALETTE.length);
            if (charIndex >= ASCII_PALETTE.length) charIndex = ASCII_PALETTE.length - 1;
            chars.push(ASCII_PALETTE[charIndex]);
          }

          return (
            <div
              key={col.index}
              className={`flex flex-col-reverse items-center font-mono text-[8px] sm:text-[10px] leading-[8px] sm:leading-[10px] ${colorClass} transition-all duration-75`}
              style={{
                filter: shadowColor,
              }}
            >
              {chars.map((char, charIdx) => (
                <span
                  key={charIdx}
                  className="inline-block"
                  style={{
                    opacity: Math.max(0.18, 1 - (charIdx / clampedHeight) * 0.78),
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* Тонкий вертикальний анімований ланцюг вздовж правого краю догори */}
      <div className="absolute right-0.5 sm:right-1 top-0 bottom-36 hidden sm:flex flex-col justify-around font-mono text-[8px] text-[#FC7340]/25">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="animate-pulse"
            style={{ animationDelay: `${(i % 7) * 200}ms` }}
          >
            {ASCII_PALETTE[(i + frame * 2) % ASCII_PALETTE.length]}
          </span>
        ))}
      </div>
    </div>
  );
}
