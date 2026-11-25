"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AppTheme, getStoredTheme, THEME_CHANGE_EVENT } from "@/lib/theme";

export default function SideWaves() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname?.startsWith("/login");
  const [theme, setTheme] = useState<AppTheme>("dark");
  const themeRef = useRef<AppTheme>("dark");

  useEffect(() => {
    const initial = getStoredTheme();
    setTheme(initial);
    themeRef.current = initial;

    const handleTheme = (e: Event) => {
      const custom = e as CustomEvent<{ theme?: AppTheme }>;
      const next = custom.detail?.theme || getStoredTheme();
      setTheme(next);
      themeRef.current = next;
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleTheme);
  }, []);

  useEffect(() => {
    if (isLoginPage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let time = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Параметри 3D-сітки океанських хвиль
    const ROWS = 42; // лінії вглиб (від горизонту до переднього плану)
    const COLS = 76; // стовпці по ширині (зліва направо)

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);
      const isWinter = themeRef.current === "winter";

      // 1. М'яке фонове дифузне сяйво
      const blueGlow = ctx.createRadialGradient(
        width * 0.12,
        height * 0.72,
        30,
        width * 0.12,
        height * 0.72,
        width * 0.45,
      );
      blueGlow.addColorStop(0, isWinter ? "rgba(56, 189, 248, 0.22)" : "rgba(8, 191, 234, 0.18)");
      blueGlow.addColorStop(0.5, isWinter ? "rgba(125, 211, 252, 0.08)" : "rgba(2, 132, 199, 0.07)");
      blueGlow.addColorStop(1, "transparent");
      ctx.fillStyle = blueGlow;
      ctx.fillRect(0, 0, width, height);

      const rightGlow = ctx.createRadialGradient(
        width * 0.85,
        height * 0.62,
        40,
        width * 0.85,
        height * 0.62,
        width * 0.52,
      );
      rightGlow.addColorStop(0, isWinter ? "rgba(186, 230, 253, 0.16)" : "rgba(255, 122, 36, 0.22)");
      rightGlow.addColorStop(0.45, isWinter ? "rgba(56, 189, 248, 0.08)" : "rgba(234, 88, 12, 0.09)");
      rightGlow.addColorStop(1, "transparent");
      ctx.fillStyle = rightGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Розрахунок точок 3D хвильового полотна моря
      const points: {
        x: number;
        y: number;
        size: number;
        r: number;
        g: number;
        b: number;
        alpha: number;
      }[][] = [];

      for (let r = 0; r < ROWS; r++) {
        const rowPoints: typeof points[0] = [];
        const v = r / (ROWS - 1); // 0 = горизонт, 1 = передній план
        const depth = Math.pow(v, 1.45); // нелінійний розподіл глибини

        for (let c = 0; c < COLS; c++) {
          const u = c / (COLS - 1); // 0 = лівий край, 1 = правий край

          // Формула ландшафту згідно з референс-зображенням:
          // Лівий блакитний гребінь хвилі
          const leftCrest = Math.exp(-Math.pow((u - 0.12) * 4.2, 2)) * 65;

          // Правий високий помаранчевий гребінь хвилі
          const rightCrest = Math.exp(-Math.pow((u - 0.88) * 3.4, 2)) * 115;

          // Центральна западина
          const valley = Math.sin(u * Math.PI) * 22;

          // Океанське коливання (хвилі морського прибою)
          const wave1 = Math.sin(u * 6.5 + time * 1.35 + v * 4.2) * 22;
          const wave2 = Math.cos(u * 4.4 - time * 0.85 + v * 5.0) * 16;
          const wave3 = Math.sin((u + v) * 5.2 + time * 1.7) * 10;
          const swell = wave1 + wave2 + wave3;

          // Повна висота точки
          const elevation = (leftCrest + rightCrest - valley + swell) * (0.35 + 0.65 * depth);

          // 3D проекція на площину екрана
          const horizonY = height * 0.44;
          const foregroundY = height * 0.98;
          const baseY = horizonY + (foregroundY - horizonY) * depth;
          const screenX = width * (0.02 + u * 0.96);
          const screenY = baseY - elevation;

          // Градієнт кольорів
          let red = isWinter ? 56 : 8;
          let green = isWinter ? 189 : 191;
          let blue = isWinter ? 248 : 234;

          const colorMix = Math.max(0, Math.min(1, (u - 0.32) / 0.38));
          if (colorMix > 0) {
            if (isWinter) {
              red = Math.round(56 + (224 - 56) * colorMix);
              green = Math.round(189 + (242 - 189) * colorMix);
              blue = Math.round(248 + (254 - 248) * colorMix);
            } else {
              red = Math.round(8 + (255 - 8) * colorMix);
              green = Math.round(191 + (122 - 191) * colorMix);
              blue = Math.round(234 + (36 - 234) * colorMix);
            }
          }

          // Яскравість і прозорість залежно від гребеня хвилі
          const crestFactor = Math.max(0, elevation / 90);
          const baseAlpha = 0.12 + depth * 0.48 + crestFactor * 0.4;
          const alpha = Math.min(0.95, Math.max(0.08, baseAlpha));

          // Розмір частинки (ефект боке глибини)
          const size = Math.max(
            0.65,
            (0.75 + depth * 2.5 + crestFactor * 1.2) * (width > 768 ? 1 : 0.8),
          );

          rowPoints.push({
            x: screenX,
            y: screenY,
            size,
            r: red,
            g: green,
            b: blue,
            alpha,
          });
        }
        points.push(rowPoints);
      }

      // 3. Малювання тонких з'єднувальних ниток хвилі (ефект сітки/тканини світла)
      ctx.lineWidth = 0.6;
      for (let r = 0; r < ROWS; r += 2) {
        ctx.beginPath();
        const row = points[r];
        for (let c = 0; c < COLS; c++) {
          const pt = row[c];
          if (c === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        const v = r / (ROWS - 1);
        ctx.strokeStyle = `rgba(100, 180, 240, ${0.03 + v * 0.07})`;
        ctx.stroke();
      }

      // 4. Малювання сяючих частинок (чарунок) моря
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const pt = points[r][c];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${pt.r}, ${pt.g}, ${pt.b}, ${pt.alpha})`;
          ctx.fill();

          // Сяйво для великих частинок на гребенях (Bloom effect)
          if (pt.size > 2.0 && pt.alpha > 0.6) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${pt.r}, ${pt.g}, ${pt.b}, ${pt.alpha * 0.22})`;
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [isLoginPage]);

  if (isLoginPage) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
      />
    </div>
  );
}
