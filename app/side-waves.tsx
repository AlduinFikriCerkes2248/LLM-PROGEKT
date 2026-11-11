"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

// Набір фірмових символів хвилі: # № ! ; / " * ·
const ASCII_PALETTE = ["#", "№", "!", ";", "/", "\"", "*", "·"];

export default function SideWaves() {
  const pathname = usePathname();
  const [frame, setFrame] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(1000);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      setFrame((prev) => (prev + 1) % 100000);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      if (typeof window !== "undefined") {
        setViewportHeight(window.innerHeight || 1000);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Крім логіна ("крім логіна" - за вимогами користувача)
  const isLoginPage = pathname === "/login" || pathname?.startsWith("/login");

  // Кількість колонок з кожного боку (великі, широкі, помітні)
  const columnsCount = 16;

  // Висота одного рядка шрифту в пікселях (~14-16px)
  const rowHeightPx = 15;
  const maxRows = Math.max(50, Math.ceil(viewportHeight / rowHeightPx));

  const columns = useMemo(() => {
    return Array.from({ length: columnsCount }).map((_, i) => {
      // i = 0 - стовпчик впритик до самого краю екрана
      // Стовпчики біля краю йдуть на повну висоту (з самого низу до самого верху)
      const ratio = i / (columnsCount - 1);
      const baseHeight = Math.floor(maxRows * (1 - ratio * 0.55));
      return {
        index: i,
        baseHeight,
      };
    });
  }, [columnsCount, maxRows]);

  if (isLoginPage) return null;

  const t = frame * 0.045;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* ============================================================== */}
      {/* 1. ЛІВА ХВИЛЯ: ВЕЛИКА, ВПРИТИК, З САМОГО НИЗУ ДО САМОГО ВЕРХУ */}
      {/*    Колір: Electric Blue (#0297DE)                              */}
      {/* ============================================================== */}
      <div className="absolute left-0 inset-y-0 flex items-end gap-1 sm:gap-1.5 md:gap-2 pl-0 sm:pl-1 pb-0 opacity-80 sm:opacity-95">
        {columns.map((col) => {
          const wave1 = Math.sin(t + col.index * 0.32);
          const wave2 = Math.cos(t * 0.7 - col.index * 0.22);
          const noise = (wave1 + wave2) * 0.5;

          const targetHeight = Math.floor(col.baseHeight + noise * 7);
          const clampedHeight = Math.max(12, Math.min(targetHeight, maxRows));

          // Символи знизу вгору
          const bottomChars: string[] = [];
          for (let row = 0; row < clampedHeight; row++) {
            const ratio = row / clampedHeight;
            let charIndex = Math.floor(ratio * ASCII_PALETTE.length);
            if (charIndex >= ASCII_PALETTE.length) charIndex = ASCII_PALETTE.length - 1;
            bottomChars.push(ASCII_PALETTE[charIndex]);
          }

          // Для повної висоти з самого низу по самий верх:
          // Рядки, що заповнюють верхню частину стовпчика до стелі екрана
          const topGap = Math.max(0, maxRows - clampedHeight);
          const topChars: string[] = [];
          for (let row = 0; row < topGap; row++) {
            const charIdx = (col.index + row + Math.floor(frame * 0.5)) % ASCII_PALETTE.length;
            topChars.push(ASCII_PALETTE[charIdx]);
          }

          return (
            <div
              key={col.index}
              className="flex h-full flex-col justify-between font-mono text-[11px] sm:text-[13px] md:text-[15px] font-bold leading-[11px] sm:leading-[13px] md:leading-[15px] text-[#0297DE] transition-all duration-75"
              style={{
                filter: "drop-shadow(0 0 8px rgba(2,151,222,0.85)) drop-shadow(0 0 16px rgba(2,151,222,0.4))",
              }}
            >
              {/* Верхня частина стовпчика (до самого верху) */}
              <div className="flex flex-col items-center">
                {topChars.map((char, charIdx) => {
                  const fade = 0.15 + (1 - charIdx / Math.max(1, topGap)) * 0.45;
                  return (
                    <span
                      key={`top-${charIdx}`}
                      className="inline-block"
                      style={{ opacity: Math.max(0.12, Math.min(0.65, fade)) }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

              {/* Нижня частина: потужна хвиля від самого низу */}
              <div className="flex flex-col-reverse items-center">
                {bottomChars.map((char, charIdx) => {
                  const ratio = charIdx / clampedHeight;
                  const opacity = Math.max(0.2, 1 - ratio * 0.7);
                  return (
                    <span
                      key={`bottom-${charIdx}`}
                      className="inline-block"
                      style={{ opacity }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 2. ПРАВА ХВИЛЯ: ВЕЛИКА, ВПРИТИК, З САМОГО НИЗУ ДО САМОГО ВЕРХУ*/}
      {/*    Колір: Coral Orange (#FC7340) та Electric Blue              */}
      {/* ============================================================== */}
      <div className="absolute right-0 inset-y-0 flex flex-row-reverse items-end gap-1 sm:gap-1.5 md:gap-2 pr-0 sm:pr-1 pb-0 opacity-80 sm:opacity-95">
        {columns.map((col) => {
          const wave1 = Math.sin(t * 0.95 + col.index * 0.35);
          const wave2 = Math.cos(t * 0.65 - col.index * 0.25);
          const noise = (wave1 + wave2) * 0.5;

          const targetHeight = Math.floor(col.baseHeight + noise * 7);
          const clampedHeight = Math.max(12, Math.min(targetHeight, maxRows));

          const isCoral = col.index < 9;
          const colorClass = isCoral ? "text-[#FC7340]" : "text-[#0297DE]";
          const shadowColor = isCoral
            ? "drop-shadow(0 0 8px rgba(252,115,64,0.9)) drop-shadow(0 0 16px rgba(252,115,64,0.45))"
            : "drop-shadow(0 0 8px rgba(2,151,222,0.85)) drop-shadow(0 0 16px rgba(2,151,222,0.4))";

          // Символи знизу вгору
          const bottomChars: string[] = [];
          for (let row = 0; row < clampedHeight; row++) {
            const ratio = row / clampedHeight;
            let charIndex = Math.floor(ratio * ASCII_PALETTE.length);
            if (charIndex >= ASCII_PALETTE.length) charIndex = ASCII_PALETTE.length - 1;
            bottomChars.push(ASCII_PALETTE[charIndex]);
          }

          // Рядки, що заповнюють верхню частину стовпчика до стелі екрана
          const topGap = Math.max(0, maxRows - clampedHeight);
          const topChars: string[] = [];
          for (let row = 0; row < topGap; row++) {
            const charIdx = (col.index + row + Math.floor(frame * 0.5)) % ASCII_PALETTE.length;
            topChars.push(ASCII_PALETTE[charIdx]);
          }

          return (
            <div
              key={col.index}
              className={`flex h-full flex-col justify-between font-mono text-[11px] sm:text-[13px] md:text-[15px] font-bold leading-[11px] sm:leading-[13px] md:leading-[15px] ${colorClass} transition-all duration-75`}
              style={{
                filter: shadowColor,
              }}
            >
              {/* Верхня частина стовпчика (до самого верху) */}
              <div className="flex flex-col items-center">
                {topChars.map((char, charIdx) => {
                  const fade = 0.15 + (1 - charIdx / Math.max(1, topGap)) * 0.45;
                  return (
                    <span
                      key={`top-${charIdx}`}
                      className="inline-block"
                      style={{ opacity: Math.max(0.12, Math.min(0.65, fade)) }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

              {/* Нижня частина: потужна хвиля від самого низу */}
              <div className="flex flex-col-reverse items-center">
                {bottomChars.map((char, charIdx) => {
                  const ratio = charIdx / clampedHeight;
                  const opacity = Math.max(0.2, 1 - ratio * 0.7);
                  return (
                    <span
                      key={`bottom-${charIdx}`}
                      className="inline-block"
                      style={{ opacity }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
