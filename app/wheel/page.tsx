"use client";
import { DemoNoticeBadge } from "../demo-banner";

import Link from "next/link";
import { formatErrorMessage } from "../../lib/error-utils";
import { useEffect, useState, type TransitionEvent } from "react";
import {
  getSupabaseClient,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

const prizes = [10, 20, 50, 100, 500] as const;
const wheelColors = ["#0297DE", "#FC7340", "#10B981", "#8B5CF6", "#F59E0B"];
const spinDuration = 5200;

type Prize = (typeof prizes)[number];

function getSectorPoint(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 160 + Math.cos(radians) * radius,
    y: 160 + Math.sin(radians) * radius,
  };
}

function isPrize(value: unknown): value is Prize {
  return typeof value === "number" && prizes.includes(value as Prize);
}

function getRpcErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

function isNotAuthenticatedError(error: unknown) {
  if (getRpcErrorCode(error) === "not_authenticated") return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("not_authenticated")
  );
}


export default function WheelPage() {
  const [canSpin, setCanSpin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pendingPrize, setPendingPrize] = useState<Prize | null>(null);
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkSpinAvailability() {
      const client = getSupabaseClient();
      if (!client) {
        setMessage("Спочатку налаштуйте підключення до Supabase.");
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await client.rpc("can_spin_today");
        if (error) throw error;
        if (typeof data !== "boolean") {
          throw new Error("can_spin_today повернув неочікувану відповідь.");
        }
        if (!active) return;
        setCanSpin(data);
        if (!data) {
          setMessage("Ви вже крутили колесо сьогодні. Приходьте завтра!");
        }
      } catch (error) {
        if (!active) return;
        if (isNotAuthenticatedError(error)) {
          setMessage("Увійдіть, щоб крутити колесо.");
        } else {
          console.error("Не вдалося перевірити можливість обертання:", formatErrorMessage(error));
          setMessage("Не вдалося перевірити колесо. Спробуйте ще раз.");
        }
      } finally {
        if (active) setIsChecking(false);
      }
    }

    void checkSpinAvailability();
    return () => {
      active = false;
    };
  }, []);

  async function handleSpin() {
    if (isSpinning || canSpin !== true) return;

    const client = getSupabaseClient();
    if (!client) {
      setMessage("Підключення до бази недоступне.");
      return;
    }

    setIsSpinning(true);
    setMessage(null);
    setWinningPrize(null);

    try {
      const { data, error } = await client.rpc("spin_wheel");
      if (error) throw error;
      if (!isPrize(data)) {
        throw new Error("spin_wheel повернув невідомий приз.");
      }

      const prizeIndex = prizes.indexOf(data);
      const sectorAngle = 360 / prizes.length;
      const targetSectorMiddle = prizeIndex * sectorAngle + sectorAngle / 2;
      const offset = (270 - targetSectorMiddle + 360) % 360;
      const fullRotations = 360 * 5;
      const currentFullBase = Math.floor(rotation / 360) * 360;
      const nextRotation = currentFullBase + fullRotations + offset;

      setPendingPrize(data);
      setRotation(nextRotation);
      setCanSpin(false);
    } catch (error) {
      setIsSpinning(false);
      setPendingPrize(null);

      if (getRpcErrorCode(error) === "23505") {
        setCanSpin(false);
        setMessage("Ви вже крутили колесо сьогодні. Приходьте завтра!");
      } else if (isNotAuthenticatedError(error)) {
        setMessage("Увійдіть, щоб крутити колесо.");
      } else {
        console.error("Не вдалося крутити колесо:", formatErrorMessage(error));
        setMessage("Не вдалося крутити колесо. Спробуйте ще раз.");
      }
    }
  }

  function handleTransitionEnd(event: TransitionEvent<SVGSVGElement>) {
    if (event.propertyName !== "transform") return;
    setIsSpinning(false);
    if (pendingPrize !== null) {
      setWinningPrize(pendingPrize);
      setMessage(`🎉 Ви виграли ${pendingPrize} монет!`);
      setPendingPrize(null);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    }
  }

  const sectorAngle = 360 / prizes.length;

  return (
    <main className="min-h-screen flex-1 bg-[#050813] px-4 py-6 font-sans text-slate-100 sm:px-8 sm:py-10 relative overflow-hidden select-none">
      {/* М'яке фонове дифузне світіння */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-[#FC7340]/20 via-[#0297DE]/10 to-transparent blur-[130px] rounded-full" />
        <div className="absolute bottom-[-50px] right-[-50px] w-[350px] h-[350px] bg-[#FC7340]/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Navigation Bar / Quick Links */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#162544]/80 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3.5 bg-[#0297DE] rounded-full group-hover:h-4 transition-all" />
                <span className="w-1 h-4.5 bg-[#0297DE] rounded-full group-hover:h-5 transition-all" />
                <span className="w-1 h-3.5 bg-[#0297DE] rounded-full group-hover:h-4 transition-all" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-[0.16em] text-white uppercase ml-1">
                MATCHDAY
              </span>
            </Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#FC7340] shadow-[0_0_8px_#FC7340]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#FC7340]">КОЛЕСО ФОРТУНИ</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/leagues"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🏆 Мої ліги
            </Link>
            <Link
              href="/online"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🌐 Онлайн PvP
            </Link>
            <Link
              href="/cases"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🎁 Кейси
            </Link>
            <Link
              href="/blackjack"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🃏 Блекджек
            </Link>
            <Link
              href="/dice"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#0297DE]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              🎲 Кості
            </Link>
          </div>
        </div>

        <DemoNoticeBadge />

        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FC7340]/40 bg-[#0A1430]/90 px-3.5 py-1 text-xs text-[#FC7340] shadow-[0_0_12px_rgba(252,115,64,0.15)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FC7340] animate-pulse" />
            <span className="font-mono tracking-wider uppercase text-[11px]">Щоденна фортуна</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-tight">
            Колесо Фортуни
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300">
            Отримуйте щоденний бонус монет для ставок у лігах та міні-іграх
          </p>
        </header>

        {/* Wheel Section */}
        <section className="rounded-3xl border border-[#162544] bg-[#0A1430]/95 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10 relative">
          <div className="relative mx-auto mb-8 flex h-[340px] w-[340px] items-center justify-center">
            {/* Top Indicator Arrow */}
            <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 drop-shadow-[0_0_12px_#FC7340]">
              <div className="h-0 w-0 border-x-8 border-x-transparent border-t-[18px] border-t-[#FC7340]" />
            </div>

            {/* Glowing Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-[#FC7340]/30 shadow-[0_0_40px_rgba(252,115,64,0.2)] pointer-events-none" />

            {/* SVG Wheel */}
            <svg
              viewBox="0 0 320 320"
              className="h-full w-full drop-shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? `transform ${spinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                  : "none",
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {prizes.map((prize, index) => {
                const startAngle = index * sectorAngle;
                const endAngle = startAngle + sectorAngle;
                const p1 = getSectorPoint(startAngle, 150);
                const p2 = getSectorPoint(endAngle, 150);
                const midAngle = startAngle + sectorAngle / 2;
                const textPos = getSectorPoint(midAngle, 100);

                return (
                  <g key={prize}>
                    <path
                      d={`M 160 160 L ${p1.x} ${p1.y} A 150 150 0 0 1 ${p2.x} ${p2.y} Z`}
                      fill={wheelColors[index % wheelColors.length]}
                      stroke="#050813"
                      strokeWidth="3"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill="#ffffff"
                      fontSize="20"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${midAngle + 90}, ${textPos.x}, ${textPos.y})`}
                    >
                      {prize}
                    </text>
                  </g>
                );
              })}
              {/* Center Pin */}
              <circle cx="160" cy="160" r="26" fill="#0A1430" stroke="#FC7340" strokeWidth="4" />
              <text
                x="160"
                y="160"
                fill="#FC7340"
                fontSize="15"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
              >
                ★
              </text>
            </svg>
          </div>

          {/* Action button */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleSpin}
              disabled={isChecking || isSpinning || canSpin !== true}
              className="btn-interactive min-h-[48px] min-w-56 rounded-full bg-gradient-to-r from-[#FC7340] to-[#FF5E3A] hover:from-[#ff8153] hover:to-[#ff6f4c] px-8 text-sm font-bold tracking-wider text-white shadow-[0_0_25px_rgba(252,115,64,0.45)] transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isChecking
                ? "Перевірка..."
                : isSpinning
                  ? "Обертання..."
                  : canSpin
                    ? "⚡ КРУТИТИ КОЛЕСО"
                    : "Сьогодні вже крутили"}
            </button>

            {message && (
              <p
                role="alert"
                className={`rounded-xl border px-4 py-2 text-xs font-mono font-medium ${
                  winningPrize !== null
                    ? "border-emerald-600/60 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    : "border-[#162544] bg-[#060A17] text-slate-300"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </section>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Matchday · Щоденне колесо фортуни · Монети віртуальні
        </p>
      </div>
    </main>
  );
}
