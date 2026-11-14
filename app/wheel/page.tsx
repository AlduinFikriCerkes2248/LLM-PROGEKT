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
const wheelSectors = [
  { prize: 10, label: "10 🪙", color: "#08BFEA", bgGradient: "from-cyan-500/30 to-cyan-700/20", title: "Стандарт" },
  { prize: 20, label: "20 🪙", color: "#FF7A24", bgGradient: "from-orange-500/30 to-orange-700/20", title: "Подвійний" },
  { prize: 50, label: "50 🪙", color: "#10B981", bgGradient: "from-emerald-500/30 to-emerald-700/20", title: "Везунчик" },
  { prize: 100, label: "100 🪙", color: "#8B5CF6", bgGradient: "from-purple-500/30 to-purple-700/20", title: "Епічний" },
  { prize: 500, label: "500 🪙", color: "#F59E0B", bgGradient: "from-amber-500/30 to-amber-700/20", title: "ДЖЕКПОТ ★" },
] as const;

const wheelColors = ["#08BFEA", "#FF7A24", "#10B981", "#8B5CF6", "#F59E0B"];
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
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function checkSpinAvailabilityAndBalance() {
      const client = getSupabaseClient();
      if (!client) {
        setMessage("Спочатку налаштуйте підключення до Supabase.");
        setIsChecking(false);
        return;
      }

      try {
        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          const { data: profile } = await client
            .from("profiles")
            .select("coins")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (active && profile && typeof profile.coins === "number") {
            setBalance(profile.coins);
          }
        }

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

    void checkSpinAvailabilityAndBalance();
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
      const fullRotations = 360 * 6;
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
      setMessage(`🎉 Ви виграли +${pendingPrize} монет!`);
      if (balance !== null) {
        setBalance((prev) => (prev !== null ? prev + pendingPrize : pendingPrize));
      }
      setPendingPrize(null);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    }
  }

  const sectorAngle = 360 / prizes.length;

  return (
    <div className="relative min-h-screen text-[var(--text-main)] font-sans antialiased overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* М'яке фонове стадіонне світіння без артефактів */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-32 left-1/3 h-[500px] w-[500px] rounded-full bg-cyan-600/20 blur-[140px]" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-orange-600/20 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <DemoNoticeBadge />

        {/* НАВІГАЦІЯ MATCHDAY */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5 transition">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 font-black text-black shadow-md shadow-amber-500/30">
                🏆
              </div>
              <span className="font-black text-base tracking-[0.16em] uppercase text-white group-hover:text-amber-400 transition">
                MATCHDAY
              </span>
            </Link>
            <span className="text-[var(--text-secondary)]/50">/</span>
            <span className="text-xs font-semibold text-amber-300">
              🎡 Колесо фортуни
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🏠 Дашборд
            </Link>
            <Link href="/leagues" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              ⚽ Ліги
            </Link>
            <Link href="/online" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🌐 Онлайн PvP
            </Link>
            <Link href="/cases" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🎁 Кейси
            </Link>
            <Link href="/blackjack" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🃏 Блекджек
            </Link>
            <Link href="/dice" className="btn-ghost text-xs py-1.5 px-3 rounded-lg">
              🎲 Кості
            </Link>

            {balance !== null && (
              <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <span>🪙</span>
                <span>{balance.toLocaleString()} монет</span>
              </div>
            )}
          </div>
        </header>

        {/* ЗАГОЛОВОК */}
        <section className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/30 px-3.5 py-1 text-xs text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
              Щоденний бонус клубу
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Колесо Фортуни MATCHDAY
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Крутіть щоденне колесо фортуни безкоштовно та вигравайте до 500 монет!
          </p>
        </section>

        {/* ГОЛОВНА АРЕНА КОЛЕСА */}
        <section className="matchday-card mb-8 p-6 sm:p-10 text-center relative overflow-hidden">
          {/* Декоративне коло арени */}
          <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-72 rounded-full border border-amber-500/10 [border-dasharray:8_8]" />

          {/* КОЛЕСО ФОРТУНИ */}
          <div className="relative mx-auto mb-8 flex h-[330px] w-[330px] sm:h-[360px] sm:w-[360px] items-center justify-center">
            {/* ВЕРХНІЙ НЕОНОВИЙ ВКАЗІВНИК */}
            <div className="absolute -top-4 left-1/2 z-30 -translate-x-1/2 drop-shadow-[0_4px_12px_rgba(255,122,36,0.9)]">
              <div className="h-0 w-0 border-x-[14px] border-x-transparent border-t-[26px] border-t-orange-500" />
            </div>

            {/* ЗОВНІШНІЙ НЕОНОВИЙ ОБОДОК З ВОГНИКАМИ */}
            <div className="absolute -inset-3 rounded-full border-4 border-[#16354f] bg-gradient-to-b from-[#0e2133] to-[#08121c] shadow-[0_0_40px_rgba(8,191,234,0.18)] pointer-events-none" />

            {/* САМЕ КРУГЛЕ SVG КОЛЕСО */}
            <div className="relative h-full w-full rounded-full overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.6)]">
              <svg
                viewBox="0 0 320 320"
                className="h-full w-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? `transform ${spinDuration}ms cubic-bezier(0.15, 0.9, 0.2, 1)`
                    : "none",
                }}
                onTransitionEnd={handleTransitionEnd}
              >
                {prizes.map((prize, index) => {
                  const startAngle = index * sectorAngle;
                  const endAngle = startAngle + sectorAngle;
                  const p1 = getSectorPoint(startAngle, 160);
                  const p2 = getSectorPoint(endAngle, 160);
                  const midAngle = startAngle + sectorAngle / 2;
                  const textPos = getSectorPoint(midAngle, 105);

                  const isJackpot = prize === 500;

                  return (
                    <g key={prize}>
                      <path
                        d={`M 160 160 L ${p1.x} ${p1.y} A 160 160 0 0 1 ${p2.x} ${p2.y} Z`}
                        fill={wheelColors[index % wheelColors.length]}
                        stroke="#070b14"
                        strokeWidth="3.5"
                      />
                      {/* Текст призу */}
                      <text
                        x={textPos.x}
                        y={textPos.y}
                        fill={isJackpot ? "#000000" : "#ffffff"}
                        fontSize={isJackpot ? "18" : "16"}
                        fontWeight="900"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${midAngle + 90}, ${textPos.x}, ${textPos.y})`}
                      >
                        {prize} 🪙
                      </text>
                    </g>
                  );
                })}

                {/* ЦЕНТРАЛЬНА ВТУЛКА (HUB) */}
                <circle
                  cx="160"
                  cy="160"
                  r="30"
                  fill="#070b14"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  className="shadow-inner"
                />
                <circle cx="160" cy="160" r="24" fill="#0d1522" />
                <text
                  x="160"
                  y="160"
                  fontSize="18"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  ⚽
                </text>
              </svg>
            </div>
          </div>

          {/* ПОВІДОМЛЕННЯ ТА РЕЗУЛЬТАТ */}
          {winningPrize !== null && (
            <div className="mb-6 animate-fade-in inline-block rounded-2xl border-2 border-amber-400 bg-amber-950/80 px-8 py-3.5 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
              <span className="text-xl sm:text-2xl font-black uppercase text-amber-300 block">
                🎉 ВИТЯГНУТО {winningPrize} МОНЕТ!
              </span>
              <span className="text-xs font-bold text-amber-200">
                Бонус успішно нараховано на ваш баланс.
              </span>
            </div>
          )}

          {message && winningPrize === null && (
            <div className="mb-6 inline-block rounded-xl border border-slate-700/80 bg-slate-900/60 px-5 py-2 text-xs font-bold text-slate-300">
              {message}
            </div>
          )}

          {/* КНОПКА ЗАПУСКУ */}
          <div>
            <button
              type="button"
              onClick={handleSpin}
              disabled={isChecking || isSpinning || canSpin !== true}
              className="btn-orange text-base font-black uppercase tracking-wider py-4 px-12 rounded-full shadow-[0_8px_30px_rgba(255,122,36,0.5)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking
                ? "Перевірка доступу..."
                : isSpinning
                  ? "⚡ Колесо обертається..."
                  : canSpin
                    ? "⚡ КРУТИТИ КОЛЕСО (СПІН)"
                    : "Сьогодні вже крутили"}
            </button>
          </div>
        </section>

        {/* СІТКА СЕКТОРІВ ТА ПРИЗІВ */}
        <section className="matchday-card p-6">
          <h3 className="text-xs font-black uppercase text-amber-300 tracking-wider mb-4 flex items-center gap-2">
            <span>🎁</span> Сектори та винагороди колеса
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {wheelSectors.map((sec) => (
              <div
                key={sec.prize}
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[#070b14] p-3 text-center transition hover:border-slate-600"
              >
                <div
                  className="mb-1.5 h-3 w-3 rounded-full"
                  style={{ backgroundColor: sec.color, boxShadow: `0 0 8px ${sec.color}` }}
                />
                <span className="font-mono text-base font-black text-white">
                  +{sec.prize} 🪙
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold mt-0.5">
                  {sec.title}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
