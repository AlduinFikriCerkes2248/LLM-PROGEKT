"use client";

import React, { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { CaseTier } from "./case-box-graphic";

interface CaseRouletteProps {
  winningCoins: number;
  winningXp: number;
  caseTitle: string;
  tier: CaseTier;
  isWinter?: boolean;
  onFinish: () => void;
}

interface SlotItem {
  id: number;
  coins: number;
  label: string;
  rarityColor: string;
  bgGrad: string;
  icon: string;
}

function getSlotMeta(coins: number, isWinter?: boolean): Omit<SlotItem, "id"> {
  if (coins >= 500000) {
    return {
      coins,
      label: "JACKPOT!",
      rarityColor: "border-amber-400 text-amber-300",
      bgGrad: "from-amber-500/30 via-amber-900/40 to-slate-950",
      icon: isWinter ? "🔔" : "👑",
    };
  }
  if (coins >= 20000) {
    return {
      coins,
      label: "ЕПІК",
      rarityColor: "border-sky-400 text-sky-300",
      bgGrad: "from-sky-500/30 via-sky-900/40 to-slate-950",
      icon: isWinter ? "❄️" : "💎",
    };
  }
  return {
    coins,
    label: "БРОНЗА",
    rarityColor: "border-emerald-400 text-emerald-300",
    bgGrad: "from-emerald-500/25 via-emerald-950/40 to-slate-950",
    icon: isWinter ? "🎁" : "🪙",
  };
}

export default function CaseRoulette({
  winningCoins,
  caseTitle,
  tier,
  isWinter = false,
  onFinish,
}: CaseRouletteProps) {
  const WINNING_INDEX = 34;
  const CARD_WIDTH = 136; // px
  const CARD_GAP = 10; // px
  const STEP = CARD_WIDTH + CARD_GAP;

  const items: SlotItem[] = useMemo(() => {
    const decoyPool =
      tier === "legendary"
        ? [25000, 50000, 100000, 250000, 500000, 1000000, 75000]
        : tier === "pro"
          ? [10000, 15000, 20000, 22500, 25000, 50000]
          : [400, 500, 650, 750, 800, 1500];

    return Array.from({ length: 42 }, (_, idx) => {
      const c =
        idx === WINNING_INDEX
          ? winningCoins
          : decoyPool[Math.floor(Math.random() * decoyPool.length)];
      return {
        id: idx,
        ...getSlotMeta(c, isWinter),
      };
    });
  }, [winningCoins, tier, isWinter]);

  // Обчислюємо точну позицію X для центрування WINNING_INDEX під голкою (з легким мікро-зміщенням)
  const microOffset = useMemo(() => Math.round((Math.random() - 0.5) * 32), []);
  const targetX = -(WINNING_INDEX * STEP + CARD_WIDTH / 2 + microOffset);

  // Звукові кліки під час обертання
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AudioContextClass();
    } catch {}

    const playTick = (pitch = 680) => {
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } catch {}
    };

    const tickTimers: NodeJS.Timeout[] = [];
    // Імітуємо прискорення і сповільнення кліків синхронно до кривої cubic-bezier
    const totalMs = 4400;
    const totalTicks = 28;
    for (let i = 0; i < totalTicks; i++) {
      const progress = i / totalTicks;
      // Чим ближче до кінця, тим рідші тіки
      const delay = Math.pow(progress, 1.85) * totalMs;
      tickTimers.push(setTimeout(() => playTick(620 + (i % 3) * 45), delay));
    }

    const doneTimer = setTimeout(() => {
      playTick(980);
      onFinish();
    }, 4700);

    return () => {
      tickTimers.forEach(clearTimeout);
      clearTimeout(doneTimer);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div
        className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl ${
          isWinter
            ? "border-sky-300/50 bg-[#061326]/95 shadow-[0_0_50px_rgba(56,189,248,0.28)]"
            : "border-[#08bfea]/45 bg-[#0c1422]/95 shadow-[0_0_50px_rgba(8,191,234,0.25)]"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
              {isWinter ? "❄️ ВІДКРИТТЯ ЗИМОВОГО КЕЙСУ" : "🎰 РУЛЕТКА КЕЙСУ"}
            </span>
            <h3 className="text-lg font-black text-white">{caseTitle}</h3>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300 animate-pulse">
            Прокрутка...
          </span>
        </div>

        {/* Вікно рулетки */}
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-white/15 bg-[#050912] shadow-inner">
          {/* Горизонтальні краї затемнення */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-20 bg-gradient-to-r from-[#050912] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-20 bg-gradient-to-l from-[#050912] to-transparent" />

          {/* Центральна золота голка-покажчик */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center justify-between py-1">
            <span className="text-amber-400 text-xs drop-shadow">▼</span>
            <div className="w-[2.5px] flex-1 bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-400 shadow-[0_0_12px_#fbbf24]" />
            <span className="text-amber-400 text-xs drop-shadow">▲</span>
          </div>

          {/* Рухома стрічка слотів (від центру 50%) */}
          <div className="absolute top-1/2 left-1/2 -translate-y-1/2">
            <motion.div
              className="flex items-center"
              style={{ gap: `${CARD_GAP}px` }}
              initial={{ x: 0 }}
              animate={{ x: targetX }}
              transition={{
                duration: 4.5,
                ease: [0.12, 0.85, 0.14, 1],
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{ width: `${CARD_WIDTH}px` }}
                  className={`h-28 shrink-0 rounded-xl border-b-4 bg-gradient-to-b p-3 flex flex-col items-center justify-center text-center shadow-lg ${item.bgGrad} ${item.rarityColor}`}
                >
                  <span className="text-2xl mb-1">{item.icon}</span>
                  <div className="font-mono text-sm font-black text-white">
                    {item.coins.toLocaleString()}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-wider opacity-85">
                    {item.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
