"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AppTheme,
  getStoredTheme,
  getWinterPrefs,
  saveWinterPrefs,
  THEME_CHANGE_EVENT,
  WINTER_PREFS_EVENT,
  WinterPrefs,
} from "@/lib/theme";

export default function WinterAtmosphere() {
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [prefs, setPrefs] = useState<WinterPrefs>({
    snowEnabled: true,
    musicEnabled: false,
    avatarDecor: true,
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setTheme(getStoredTheme());
    setPrefs(getWinterPrefs());

    const handleTheme = (e: Event) => {
      const custom = e as CustomEvent<{ theme?: AppTheme }>;
      if (custom.detail?.theme) {
        setTheme(custom.detail.theme);
      } else {
        setTheme(getStoredTheme());
      }
    };

    const handlePrefs = (e: Event) => {
      const custom = e as CustomEvent<WinterPrefs>;
      if (custom.detail) {
        setPrefs(custom.detail);
      } else {
        setPrefs(getWinterPrefs());
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleTheme);
    window.addEventListener(WINTER_PREFS_EVENT, handlePrefs);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleTheme);
      window.removeEventListener(WINTER_PREFS_EVENT, handlePrefs);
    };
  }, []);

  // Управління аудіо "Let It Snow"
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.25;

    if (theme === "winter" && prefs.musicEnabled) {
      audio
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => setIsPlayingAudio(false));
    } else {
      audio.pause();
      setIsPlayingAudio(false);
    }
  }, [theme, prefs.musicEnabled]);

  // Авторозблокування звуку по першому кліку користувача, якщо музика увімкнена в зимовому режимі
  useEffect(() => {
    if (theme !== "winter" || !prefs.musicEnabled) return;

    const tryUnlock = () => {
      const audio = audioRef.current;
      if (audio && audio.paused && prefs.musicEnabled) {
        audio
          .play()
          .then(() => setIsPlayingAudio(true))
          .catch(() => {});
      }
    };

    window.addEventListener("pointerdown", tryUnlock, { once: true });
    return () => window.removeEventListener("pointerdown", tryUnlock);
  }, [theme, prefs.musicEnabled]);

  // Анімація снігопаду та теплих вогників
  useEffect(() => {
    if (theme !== "winter" || !prefs.snowEnabled) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animId = 0;

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

    const SNOW_COUNT = 65;
    const EMBER_COUNT = 16;

    const flakes = Array.from({ length: SNOW_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.4 + 0.8,
      speedY: Math.random() * 0.85 + 0.35,
      speedX: Math.random() * 0.5 - 0.25,
      opacity: Math.random() * 0.55 + 0.25,
      phase: Math.random() * Math.PI * 2,
    }));

    const embers = Array.from({ length: EMBER_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.35 + 0.15),
      opacity: Math.random() * 0.45 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Сніжинки
      for (const f of flakes) {
        f.phase += 0.015;
        f.y += f.speedY;
        f.x += f.speedX + Math.sin(f.phase) * 0.25;

        if (f.y > height + 8) {
          f.y = -8;
          f.x = Math.random() * width;
        }
        if (f.x > width + 8) f.x = -8;
        if (f.x < -8) f.x = width + 8;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${f.opacity})`;
        ctx.fill();
      }

      // Теплі золоті вогники
      for (const e of embers) {
        e.phase += 0.02;
        e.y += e.speedY;
        e.x += Math.cos(e.phase) * 0.2;

        if (e.y < -8) {
          e.y = height + 8;
          e.x = Math.random() * width;
        }

        const glowAlpha = e.opacity * (0.6 + 0.4 * Math.sin(e.phase * 2));
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${glowAlpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [theme, prefs.snowEnabled]);

  const toggleMusic = () => {
    const nextMusic = !prefs.musicEnabled;
    saveWinterPrefs({ musicEnabled: nextMusic });
    const audio = audioRef.current;
    if (audio) {
      if (nextMusic) {
        audio.volume = 0.25;
        audio.play().then(() => setIsPlayingAudio(true)).catch(() => {});
      } else {
        audio.pause();
        setIsPlayingAudio(false);
      }
    }
  };

  const toggleSnow = () => {
    saveWinterPrefs({ snowEnabled: !prefs.snowEnabled });
  };

  return (
    <>
      <audio ref={audioRef} loop preload="none" src="/sounds/let_it_snow.mp3" />

      {theme === "winter" && (
        <>
          {/* Крижаний градієнтний ореол зверху */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 h-44 z-[1] select-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(56, 189, 248, 0.1) 0%, transparent 100%)",
            }}
          />

          {/* Canvas зі снігом */}
          {prefs.snowEnabled && (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-[5] h-full w-full select-none"
            />
          )}

          {/* Компактна панель управління зимовим вайбом */}
          <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full border border-sky-300/35 bg-[#081526]/90 px-3 py-1.5 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_15px_rgba(56,189,248,0.2)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-300 mr-1 hidden sm:inline">
              ❄️ Зима
            </span>

            <button
              type="button"
              onClick={toggleMusic}
              title={
                prefs.musicEnabled
                  ? "Вимкнути святкову музику"
                  : "Увімкнути Let It Snow"
              }
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                prefs.musicEnabled
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:text-white"
              }`}
            >
              <span>{isPlayingAudio ? "🎵" : "🔇"}</span>
              <span>{prefs.musicEnabled ? "Музика" : "Тиша"}</span>
            </button>

            <button
              type="button"
              onClick={toggleSnow}
              title={prefs.snowEnabled ? "Призупинити сніг" : "Увімкнути сніг"}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                prefs.snowEnabled
                  ? "bg-sky-400/20 text-sky-200 border border-sky-300/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:text-white"
              }`}
            >
              <span>❄️</span>
              <span className="hidden xs:inline">
                {prefs.snowEnabled ? "Сніг" : "Без снігу"}
              </span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
