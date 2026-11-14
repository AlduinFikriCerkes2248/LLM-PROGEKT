"use client";

import React, { useEffect, useState, useRef } from "react";
import { initGlobalAchievementListeners, ProgressNotificationPayload } from "@/lib/achievements-tracker";

export default function GlobalAchievementTracker() {
  const [progressToast, setProgressToast] = useState<ProgressNotificationPayload | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Ініціалізація всіх глобальних слухачів (теми, введення "Марченко", тощо)
    const cleanup = initGlobalAchievementListeners();

    // 2. Слухач для показу плавного міні-попапу прогресу
    const handleProgress = (e: Event) => {
      const customEvent = e as CustomEvent<ProgressNotificationPayload>;
      if (!customEvent.detail) return;

      const payload = customEvent.detail;
      setProgressToast(payload);
      setIsVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setProgressToast(null), 300);
      }, 3000);
    };

    window.addEventListener("matchday:achievement_progress", handleProgress);

    return () => {
      cleanup();
      window.removeEventListener("matchday:achievement_progress", handleProgress);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!progressToast && !isVisible) return null;

  const pct = Math.min(
    100,
    Math.round(((progressToast?.current || 0) / (progressToast?.target || 1)) * 100)
  );

  const isMarchenko =
    progressToast?.id === "great_marchenko" ||
    progressToast?.title?.toLowerCase().includes("марченк");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 right-6 z-[9998] transition-all duration-300 ease-out select-none ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-white shadow-xl backdrop-blur-md"
        style={{
          width: "310px",
          background: "linear-gradient(135deg, rgba(20, 27, 42, 0.95) 0%, rgba(13, 19, 31, 0.98) 100%)",
          borderColor: isMarchenko ? "rgba(245, 158, 11, 0.6)" : "rgba(8, 191, 234, 0.4)",
          boxShadow: isMarchenko
            ? "0 8px 24px rgba(0, 0, 0, 0.7), 0 0 15px rgba(245, 158, 11, 0.25)"
            : "0 8px 24px rgba(0, 0, 0, 0.7), 0 0 15px rgba(8, 191, 234, 0.2)",
        }}
      >
        <span className="text-xl shrink-0">
          {isMarchenko ? "👑" : progressToast?.id === "matrix_neo" ? "🕶️" : "⚡"}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span
              className="font-bold truncate"
              style={{ color: isMarchenko ? "#fbbf24" : "#38bdf8" }}
            >
              {progressToast?.title}
            </span>
            <span className="font-mono text-slate-300 text-[10px] ml-1 shrink-0">
              {progressToast?.current} / {progressToast?.target}
            </span>
          </div>

          {/* Міні прогрес-бар */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${pct}%`,
                background: isMarchenko
                  ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                  : "linear-gradient(90deg, #08bfea, #38bdf8)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
