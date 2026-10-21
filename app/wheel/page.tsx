"use client";

import Link from "next/link";
import { useEffect, useState, type TransitionEvent } from "react";
import {
  getSupabaseClient,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

const prizes = [10, 20, 50, 100, 500] as const;
const wheelColors = ["#166534", "#b45309", "#0369a1", "#be123c", "#6d28d9"];
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
          setMessage("Ви вже крутили колесо сьогодні. Приходьте завтра");
        }
      } catch (error) {
        if (!active) return;
        if (isNotAuthenticatedError(error)) {
          setMessage("Увійдіть, щоб крутити колесо");
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
    const client = getSupabaseClient();
    if (!client || canSpin !== true || isSpinning) return;

    setMessage(null);
    setWinningPrize(null);

    try {
      const { data, error } = await client.rpc("spin_wheel");
      if (error) throw error;
      if (!isPrize(data)) {
        throw new Error("spin_wheel повернув неочікувану кількість монет.");
      }

      const winningIndex = prizes.indexOf(data);
      const targetOffset = (360 - winningIndex * 72) % 360;
      const currentRotation = rotation % 360;
      const clockwiseOffset = (targetOffset - currentRotation + 360) % 360;

      setPendingPrize(data);
      setCanSpin(false);
      setRotation(rotation + 6 * 360 + clockwiseOffset);
      setIsSpinning(true);
    } catch (error) {
      console.error("Не вдалося крутити колесо:", error);
      if (getRpcErrorCode(error) === "23505") {
        setCanSpin(false);
        setMessage("Ви вже крутили колесо сьогодні. Приходьте завтра");
      } else if (isNotAuthenticatedError(error)) {
        setMessage("Увійдіть, щоб крутити колесо");
      } else {
        setMessage("Не вдалося крутити колесо. Спробуйте ще раз");
      }
    }
  }

  function handleWheelTransitionEnd(event: TransitionEvent<SVGSVGElement>) {
    if (event.propertyName !== "transform" || !isSpinning || pendingPrize === null) {
      return;
    }
    setIsSpinning(false);
    setWinningPrize(pendingPrize);
    setPendingPrize(null);
    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
  }

  return (
    <main className="min-h-screen flex-1 bg-[#f4f5f1] px-5 py-10 text-[#202722] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/leagues"
          className="mb-8 inline-flex text-sm font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 hover:text-emerald-950"
        >
          ← До ліг
        </Link>

        <header className="mb-8 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            Matchday · Щоденна нагорода
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Колесо фортуни
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[#626b64]">
            Крути колесо раз на день і вигравай монети для своїх прогнозів.
          </p>
        </header>

        <section className="flex flex-col items-center border border-[#e0e3dd] bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="relative w-full max-w-[340px]">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 border-x-[15px] border-t-[27px] border-x-transparent border-t-[#202722]"
            />
            <svg
              aria-label="Колесо з призами 10, 20, 50, 100 та 500 монет"
              className="block h-auto w-full"
              role="img"
              viewBox="0 0 320 320"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? `transform ${spinDuration}ms cubic-bezier(0.12, 0.75, 0.12, 1)`
                  : "none",
              }}
              onTransitionEnd={handleWheelTransitionEnd}
            >
              <circle cx="160" cy="160" r="157" fill="#202722" />
              {prizes.map((prize, index) => {
                const startAngle = -126 + index * 72;
                const endAngle = startAngle + 72;
                const start = getSectorPoint(startAngle, 148);
                const end = getSectorPoint(endAngle, 148);
                const label = getSectorPoint(-90 + index * 72, 91);

                return (
                  <g key={prize}>
                    <path
                      d={`M 160 160 L ${start.x} ${start.y} A 148 148 0 0 1 ${end.x} ${end.y} Z`}
                      fill={wheelColors[index]}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={label.x}
                      y={label.y}
                      fill="white"
                      fontSize="19"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {prize}
                    </text>
                  </g>
                );
              })}
              <circle cx="160" cy="160" r="23" fill="#fff" />
              <circle cx="160" cy="160" r="9" fill="#202722" />
            </svg>
          </div>

          <button
            type="button"
            onClick={handleSpin}
            disabled={isChecking || canSpin !== true || isSpinning}
            className="mt-8 min-h-12 bg-[#202722] px-8 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-[#a5ada6]"
          >
            {isChecking
              ? "Перевірка…"
              : isSpinning
                ? "Крутиться…"
                : "Крутити"}
          </button>

          {winningPrize !== null ? (
            <p role="status" className="mt-5 text-center text-lg font-semibold text-emerald-800">
              Ви виграли {winningPrize} монет!
            </p>
          ) : message ? (
            <p
              role={message.startsWith("Не вдалося") ? "alert" : "status"}
              className="mt-5 max-w-md text-center text-sm text-[#626b64]"
            >
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
