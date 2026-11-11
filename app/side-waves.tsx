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

  // Крім логіна ("крім логіна" - за запитом користувача)
  const isLoginPage = pathname === "/login" || pathname?.startsWith("/login");

  // Кількість колонок з кожного боку (великі, широкі, помітні)
  const columnsCount = 14;

  // Висота одного символьного рядка (px)
  const rowHeightPx = 15;
  const maxRows = Math.max(45, Math.ceil(viewportHeight / rowHeightPx));

  const columns = useMemo(() => {
    return Array.from({ length: columnsCount }).map((_, i) => {
      // i = 0 - це крайній стовпчик впритик до самого краю екрана
      const edgeWeight = 1 - (i / (columnsCount - 1)) * 0.45;
      return {
        index: i,
        basePeak: Math.floor(maxRows * edgeWeight),
      };
    });
  }, [columnsCount, maxRows]);

  if (isLoginPage) return null;

  const t = frame * 0.045;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none"
    >
      {/* ============================================================== */}
      {/* 1. ЛІВА ХВИЛЯ: ВПРИТИК ДО ЛІВОГО КРАЮ, З САМОГО НИЗУ ДО ВЕРХУ  */}
      {/*    Колір: Electric Blue (#0297DE)                              */}
      {/* ============================================================== */}
      <div className="absolute left-0 inset-y-0 flex items-end gap-[3px] sm:gap-1.5 md:gap-2 pl-0 sm:pl-1 pb-0 opacity-85 sm:opacity-95">
        {columns.map((col) => {
          const wave1 = Math.sin(t + col.index * 0.32);
          const wave2 = Math.cos(t * 0.7 - col.index * 0.22);
          const noise = (wave1 + wave2) * 0.5;

          // Динамічна висота піку основної хвилі
          const peakHeight = Math.max(15, Math.min(Math.floor(col.basePeak + noise * 7), maxRows));

          // Генеруємо символи для кожного рядка ВІД САМОГО НИЗУ (row = 0) ДО САМОГО ВЕРХУ (row = maxRows - 1)
          const rows: { char: string; opacity: number }[] = [];
          for (let row = 0; row < maxRows; row++) {
            if (row < peakHeight) {
              // Основна потужна хвиля від низу
              const ratio = row / peakHeight;
              let charIndex = Math.floor(ratio * ASCII_PALETTE.length);
              if (charIndex >= ASCII_PALETTE.length) charIndex = ASCII_PALETTE.length - 1;
              const char = ASCII_PALETTE[charIndex];
              const opacity = Math.max(0.3, 1 - ratio * 0.65);
              rows.push({ char, opacity });
            } else {
              // Верхня продовжена хвиля до самої стелі монітора (без прогалин)
              const topRatio = (row - peakHeight) / Math.max(1, maxRows - peakHeight);
              const charIdx = (col.index + row + Math.floor(frame * 0.3)) % ASCII_PALETTE.length;
              const char = ASCII_PALETTE[charIdx];
              const opacity = Math.max(0.12, 0.35 - topRatio * 0.2);
              rows.push({ char, opacity });
            }
          }

          return (
            <div
              key={col.index}
              className="flex h-full flex-col-reverse items-center justify-start font-mono text-[11px] sm:text-[13px] md:text-[15px] font-bold leading-[11px] sm:leading-[13px] md:leading-[15px] text-[#0297DE] transition-all duration-75"
              style={{
                filter: "drop-shadow(0 0 8px rgba(2,151,222,0.85)) drop-shadow(0 0 16px rgba(2,151,222,0.4))",
              }}
            >
              {rows.map((r, rowIdx) => (
                <span
                  key={rowIdx}
                  className="inline-block"
                  style={{ opacity: r.opacity }}
                >
                  {r.char}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 2. ПРАВА ХВИЛЯ: ВПРИТИК ДО ПРАВОГО КРАЮ, З САМОГО НИЗУ ДО ВЕРХУ*/}
      {/*    Колір: Coral Orange (#FC7340) та Electric Blue              */}
      {/* ============================================================== */}
      <div className="absolute right-0 inset-y-0 flex flex-row-reverse items-end gap-[3px] sm:gap-1.5 md:gap-2 pr-0 sm:pr-1 pb-0 opacity-85 sm:opacity-95">
        {columns.map((col) => {
          const wave1 = Math.sin(t * 0.95 + col.index * 0.35);
          const wave2 = Math.cos(t * 0.65 - col.index * 0.25);
          const noise = (wave1 + wave2) * 0.5;

          const peakHeight = Math.max(15, Math.min(Math.floor(col.basePeak + noise * 7), maxRows));

          const isCoral = col.index < 8;
          const colorClass = isCoral ? "text-[#FC7340]" : "text-[#0297DE]";
          const shadowColor = isCoral
            ? "drop-shadow(0 0 8px rgba(252,115,64,0.9)) drop-shadow(0 0 16px rgba(252,115,64,0.45))"
            : "drop-shadow(0 0 8px rgba(2,151,222,0.85)) drop-shadow(0 0 16px rgba(2,151,222,0.4))";

          // Генеруємо символи для кожного рядка ВІД САМОГО НИЗУ ДО САМОГО ВЕРХУ
          const rows: { char: string; opacity: number }[] = [];
          for (let row = 0; row < maxRows; row++) {
            if (row < peakHeight) {
              const ratio = row / peakHeight;
              let charIndex = Math.floor(ratio * ASCII_PALETTE.length);
              if (charIndex >= ASCII_PALETTE.length) charIndex = ASCII_PALETTE.length - 1;
              const char = ASCII_PALETTE[charIndex];
              const opacity = Math.max(0.3, 1 - ratio * 0.65);
              rows.push({ char, opacity });
            } else {
              const topRatio = (row - peakHeight) / Math.max(1, maxRows - peakHeight);
              const charIdx = (col.index + row + Math.floor(frame * 0.3)) % ASCII_PALETTE.length;
              const char = ASCII_PALETTE[charIdx];
              const opacity = Math.max(0.12, 0.35 - topRatio * 0.2);
              rows.push({ char, opacity });
            }
          }

          return (
            <div
              key={col.index}
              className={`flex h-full flex-col-reverse items-center justify-start font-mono text-[11px] sm:text-[13px] md:text-[15px] font-bold leading-[11px] sm:leading-[13px] md:leading-[15px] ${colorClass} transition-all duration-75`}
              style={{
                filter: shadowColor,
              }}
            >
              {rows.map((r, rowIdx) => (
                <span
                  key={rowIdx}
                  className="inline-block"
                  style={{ opacity: r.opacity }}
                >
                  {r.char}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
