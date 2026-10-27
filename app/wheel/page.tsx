"use client";

import Link from "next/link";
import { useEffect, useState, type TransitionEvent } from "react";
import {
  getSupabaseClient,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

const prizes = [10, 20, 50, 100, 500] as const;
const wheelColors = ["#047857", "#b45309", "#0284c7", "#be123c", "#7c3aed"];
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

const ASCII_WHEEL = `
██╗    ██╗██╗  ██╗███████╗███████╗██╗     
██║    ██║██║  ██║██╔════╝██╔════╝██║     
██║ █╗ ██║███████║█████╗  █████╗  ██║     
██║███╗██║██╔══██║██╔══╝  ██╔══╝  ██║     
╚███╔███╔╝██║  ██║███████╗███████╗███████╗
 ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝
`.trim();

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
          console.error("Не вдалося перевірити можливість обертання:", error);
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
        console.error("Не вдалося крутити колесо:", error);
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
    <main className="min-h-screen flex-1 bg-[#0a0a0a] px-4 py-8 font-mono text-gray-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/leagues"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          ← До ліг
        </Link>

        {/* ASCII Header */}
        <header className="mb-8 text-center">
          <pre className="mx-auto hidden overflow-x-auto text-[0.45rem] font-bold leading-tight text-yellow-400 sm:block sm:text-[0.55rem] md:text-xs" aria-hidden="true">
            {ASCII_WHEEL}
          </pre>
          <h1 className="text-3xl font-bold text-yellow-400 sm:hidden">
            КОЛЕСО ФОРТУНИ
          </h1>
          <p className="mt-3 text-sm text-cyan-300">
            ⚡ Щоденний бонус монет · 1 спроба на добу ⚡
          </p>
        </header>

        {/* Wheel Section */}
        <section className="rounded-xl border border-cyan-900/50 bg-gradient-to-b from-[#0f1a15] to-[#0a120e] p-6 text-center shadow-[0_0_30px_rgba(234,179,8,0.06)] sm:p-10">
          <div className="relative mx-auto mb-8 flex h-[340px] w-[340px] items-center justify-center">
            {/* Top Indicator Arrow */}
            <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 drop-shadow-[0_0_10px_#eab308]">
              <div className="h-0 w-0 border-x-8 border-x-transparent border-t-[18px] border-t-yellow-400" />
            </div>

            {/* Glowing Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.15)] pointer-events-none" />

            {/* SVG Wheel */}
            <svg
              viewBox="0 0 320 320"
              className="h-full w-full"
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
                      stroke="#0a0a0a"
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
              <circle cx="160" cy="160" r="26" fill="#0a0a0a" stroke="#eab308" strokeWidth="4" />
              <text
                x="160"
                y="160"
                fill="#eab308"
                fontSize="14"
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
              className="h-12 min-w-48 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-8 text-base font-bold text-black shadow-lg shadow-yellow-500/20 transition hover:from-yellow-400 hover:to-amber-500 hover:shadow-yellow-500/40 disabled:cursor-not-allowed disabled:opacity-40"
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
                className={`rounded-lg border px-4 py-2 font-mono text-sm ${
                  winningPrize !== null
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                    : "border-gray-800 bg-gray-900/50 text-gray-400"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </section>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-600">
          Matchday · Щоденне колесо · Монети віртуальні
        </p>
      </div>
    </main>
  );
}
