"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, PROFILE_UPDATED_EVENT } from "@/lib/supabase/client";
import { triggerSteamAchievement } from "@/components/steam-achievement-notification";
import { fireWinterFrostConfetti } from "@/lib/confetti";

interface WinterEventCurtainProps {
  externalOpenSignal?: number;
}

const DAILY_WINTER_GIFT_KEY = "matchday:winter_curtain_gift_date";

export function NewYearCountdown() {
  const [timeLeft, setTimeLeft] = useState("37 днів 08:39:15");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 1, 0, 1);
      const diff = Math.max(0, nextYear.getTime() - now.getTime());

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const pad = (n: number) => (n < 10 ? "0" + n : String(n));
      setTimeLeft(`${days} днів ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-sky-200">
      <span>⏳ До Нового Року:</span>
      <span className="font-mono font-bold text-[#38bdf8] tabular-nums">
        {timeLeft}
      </span>
    </div>
  );
}

export function PineBranchSvg({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none select-none ${className}`}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wood-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3d2817" />
          <stop offset="100%" stopColor="#1f140a" />
        </linearGradient>
        <linearGradient id="snow-pillow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#edf4fc" />
          <stop offset="100%" stopColor="#c8ddf4" />
        </linearGradient>
      </defs>

      <path
        d="M200 0C170 25 130 45 80 55C40 63 10 75 0 95"
        stroke="url(#wood-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M135 43C110 65 75 80 40 92"
        stroke="url(#wood-grad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M165 28C145 48 120 60 90 68"
        stroke="url(#wood-grad)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <g stroke="#123826" strokeWidth="2" strokeLinecap="round">
        <line x1="180" y1="15" x2="160" y2="35" />
        <line x1="185" y1="18" x2="168" y2="40" />
        <line x1="175" y1="10" x2="155" y2="30" />
        <line x1="170" y1="8" x2="148" y2="28" />
        <line x1="150" y1="32" x2="125" y2="52" />
        <line x1="155" y1="36" x2="132" y2="58" />
        <line x1="142" y1="28" x2="118" y2="48" />
        <line x1="135" y1="24" x2="110" y2="44" />
        <line x1="110" y1="48" x2="85" y2="70" />
        <line x1="115" y1="52" x2="92" y2="76" />
        <line x1="102" y1="44" x2="78" y2="66" />
        <line x1="95" y1="40" x2="70" y2="62" />
        <line x1="75" y1="62" x2="48" y2="88" />
        <line x1="80" y1="66" x2="55" y2="94" />
        <line x1="68" y1="58" x2="42" y2="82" />
        <line x1="45" y1="78" x2="18" y2="105" />
        <line x1="38" y1="74" x2="12" y2="98" />
        <line x1="30" y1="82" x2="5" y2="108" />
      </g>

      <g stroke="#235e40" strokeWidth="1.8" strokeLinecap="round">
        <line x1="178" y1="16" x2="162" y2="33" />
        <line x1="148" y1="34" x2="128" y2="50" />
        <line x1="108" y1="50" x2="88" y2="68" />
        <line x1="72" y1="64" x2="50" y2="86" />
        <line x1="42" y1="80" x2="20" y2="102" />
      </g>

      <g>
        <path
          d="M200 0C188 8 175 14 162 20C155 16 142 16 135 22C145 26 158 26 168 28C182 20 192 10 200 0Z"
          fill="url(#snow-pillow-grad)"
        />
        <path
          d="M152 24C140 32 125 38 112 45C104 40 92 42 85 48C95 52 108 52 118 53C132 46 144 36 152 24Z"
          fill="url(#snow-pillow-grad)"
        />
        <path
          d="M110 46C96 56 82 63 68 70C60 65 48 68 42 74C52 78 64 78 74 78C88 72 100 60 110 46Z"
          fill="url(#snow-pillow-grad)"
        />
        <path
          d="M62 72C50 82 36 90 22 98C15 94 6 97 0 104C10 107 20 106 30 104C42 98 52 86 62 72Z"
          fill="url(#snow-pillow-grad)"
        />
      </g>
    </svg>
  );
}

export default function WinterEventCurtain({
  externalOpenSignal = 0,
}: WinterEventCurtainProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dragTranslate, setDragTranslate] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [giftClaimedToday, setGiftClaimedToday] = useState(false);

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      setGiftClaimedToday(localStorage.getItem(DAILY_WINTER_GIFT_KEY) === today);
    } catch {}
  }, []);

  useEffect(() => {
    if (externalOpenSignal > 0) {
      setDragTranslate(null);
      setIsOpen(true);
      showFeedback("❄️ Ласкаво просимо до Зимової Події!");
    }
  }, [externalOpenSignal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setDragTranslate(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const showFeedback = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3200);
  };

  const spawnSparkles = (x: number, y: number) => {
    const icons = ["✨", "⭐", "❄️", "🪙", "🎁"];
    for (let k = 0; k < 10; k++) {
      const el = document.createElement("span");
      el.textContent = icons[k % icons.length];
      el.style.position = "fixed";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.pointerEvents = "none";
      el.style.fontSize = "16px";
      el.style.zIndex = "2200";
      el.style.transition = "transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.75s ease";
      document.body.appendChild(el);

      const angle = Math.random() * Math.PI * 2;
      const radius = 55 + Math.random() * 80;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      requestAnimationFrame(() => {
        el.style.transform = `translate(${dx}px, ${dy}px) scale(1.4)`;
        el.style.opacity = "0";
      });
      setTimeout(() => el.remove(), 800);
    }
  };

  const claimDailyWinterGift = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (giftClaimedToday) {
      showFeedback("🎁 Ви вже забрали сьогоднішній зимовий подарунок! Повертайтеся завтра.");
      return;
    }

    setGiftClaimedToday(true);
    try {
      localStorage.setItem(DAILY_WINTER_GIFT_KEY, today);
      const c = parseInt(localStorage.getItem("matchday:coins") || localStorage.getItem("matchday_coins") || "1088233", 10);
      const h = parseInt(localStorage.getItem("matchday:hohlyantsi") || localStorage.getItem("matchday_hohlyantsi") || "45", 10);
      const nextCoins = c + 500;
      const nextBonuses = h + 10;
      localStorage.setItem("matchday:coins", nextCoins.toString());
      localStorage.setItem("matchday_coins", nextCoins.toString());
      localStorage.setItem("matchday:hohlyantsi", nextBonuses.toString());
      localStorage.setItem("matchday_hohlyantsi", nextBonuses.toString());

      const client = getSupabaseClient();
      if (client) {
        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          await client
            .from("profiles")
            .update({ coins: nextCoins, hohlyantsi: nextBonuses })
            .eq("id", authData.user.id);
        }
      }

      window.dispatchEvent(
        new CustomEvent(PROFILE_UPDATED_EVENT, {
          detail: { coins: nextCoins, hohlyantsi: nextBonuses },
        })
      );
      window.dispatchEvent(new Event("storage"));
    } catch {}

    fireWinterFrostConfetti();
    triggerSteamAchievement({
      id: "winter_daily_gift",
      title: "🎁 Різдвяна Скриня",
      desc: "Щоденний зимовий подарунок активовано!",
      rarity: "rare",
      iconType: "crate",
      coins: 500,
      bonuses: 10,
      xp: 100,
      soundType: "default",
    });
    showFeedback("🎁 Вітаємо! Ви забрали +500 🪙 та +10 Б зі святкової скрині!");
  };

  // Drag-down handlers on pull handle
  const THRESHOLD = 140;
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    currentYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    currentYRef.current = e.clientY;
    const dy = Math.max(0, e.clientY - startYRef.current);
    if (dy > 4) {
      const progress = Math.min(dy / THRESHOLD, 1.15);
      setDragTranslate(-100 + progress * 100);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const dy = currentYRef.current - startYRef.current;
    setDragTranslate(null);
    if (dy > THRESHOLD * 0.6) {
      setIsOpen(true);
      showFeedback("❄️ Ласкаво просимо до Зимової Події!");
    } else if (Math.abs(dy) < 6) {
      setIsOpen((prev) => {
        const next = !prev;
        if (next) showFeedback("❄️ Ласкаво просимо до Зимової Події!");
        return next;
      });
    }
  };

  return (
    <>
      {/* 1. PULL-DOWN HANDLE AT TOP */}
      <div className="sticky top-2 z-30 flex justify-center pb-3">
        <div
          role="button"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen((prev) => !prev);
            }
          }}
          aria-label="Потягніть униз для відкриття зимової події"
          className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[#0a193a]/80 backdrop-blur-xl border border-sky-400/40 border-t-white/40 cursor-grab active:cursor-grabbing select-none shadow-[0_8px_24px_-4px_rgba(0,5,20,0.75),0_0_18px_rgba(56,189,248,0.25)] hover:scale-105 transition-transform"
        >
          <span className="text-sm">❄️</span>
          <span className="text-[11px] font-black tracking-wider uppercase text-sky-100">
            ЗИМОВА ПОДІЯ <span className="text-[#38bdf8] hidden sm:inline">• ПОТЯГНІТЬ УНИЗ</span>
          </span>
          <span className="text-xs font-black text-sky-300 animate-bounce">↓</span>
        </div>
      </div>

      {/* 2. PULL-DOWN CHRISTMAS EVENT FULLSCREEN CURTAIN */}
      <div
        className={`fixed inset-0 z-[1000] flex flex-col overflow-hidden bg-[#020614] ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          transform:
            dragTranslate !== null
              ? `translateY(${dragTranslate}%)`
              : isOpen
                ? "translateY(0%)"
                : "translateY(-100%)",
          transition:
            dragTranslate !== null
              ? "none"
              : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Backdrop image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, rgba(3, 8, 22, 0.18) 0%, rgba(2, 6, 20, 0.88) 100%), url(/images/winter/cabin-bg.jpg)`,
            transform: isOpen ? "scale(1)" : "scale(1.08)",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-sky-500/20 border border-sky-300/40 text-sky-200 backdrop-blur-md">
                ❄️ Різдвяний Івент
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-white drop-shadow">
                Зимова Казка MATCHDAY
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/20 text-xs font-bold text-white backdrop-blur-md cursor-pointer transition"
            >
              <span>✕</span>
              <span>Закрити подію [Esc]</span>
            </button>
          </div>

          {/* Interactive Hotspots Layer */}
          <div className="relative flex-1 min-h-[260px] my-4">
            {/* Hotspot 1: Cozy Cabin */}
            <button
              type="button"
              onClick={(e) => {
                spawnSparkles(e.clientX, e.clientY);
                showFeedback("🔥 Щоденні святкові квести Затишної Хатини відкрито!");
              }}
              style={{ top: "32%", left: "44%" }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115 focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-xl shadow-[0_0_24px_rgba(245,158,11,0.75)] animate-pulse">
                🏡
              </div>
              <span className="mt-1.5 block whitespace-nowrap px-2.5 py-0.5 rounded-md bg-slate-950/90 border border-amber-400/30 text-[10px] font-bold text-amber-200 opacity-90 group-hover:opacity-100">
                Затишна Хатина (Квести)
              </span>
            </button>

            {/* Hotspot 2: Christmas Tree */}
            <button
              type="button"
              onClick={(e) => {
                spawnSparkles(e.clientX, e.clientY);
                showFeedback("🎄 Рівень Різдвяної Ялинки: Прокачуйте XP в іграх та прогнозах!");
              }}
              style={{ top: "48%", left: "22%" }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115 focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-sky-500/30 border-2 border-sky-300 flex items-center justify-center text-xl shadow-[0_0_24px_rgba(56,189,248,0.8)] animate-pulse">
                ⭐
              </div>
              <span className="mt-1.5 block whitespace-nowrap px-2.5 py-0.5 rounded-md bg-slate-950/90 border border-sky-400/30 text-[10px] font-bold text-sky-200 opacity-90 group-hover:opacity-100">
                Різдвяна Ялинка (Прогрес)
              </span>
            </button>

            {/* Hotspot 3: Gift Bag */}
            <button
              type="button"
              onClick={(e) => {
                spawnSparkles(e.clientX, e.clientY);
                void claimDailyWinterGift();
              }}
              style={{ top: "58%", left: "64%" }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115 focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center text-xl shadow-[0_0_24px_rgba(16,185,129,0.75)] animate-bounce">
                🎁
              </div>
              <span className="mt-1.5 block whitespace-nowrap px-2.5 py-0.5 rounded-md bg-slate-950/90 border border-emerald-400/30 text-[10px] font-bold text-emerald-200 opacity-90 group-hover:opacity-100">
                {giftClaimedToday ? "✓ Подарунок забрано" : "Подарунок (+500 🪙)"}
              </span>
            </button>

            {/* Hotspot 4: Snow Stadium */}
            <button
              type="button"
              onClick={(e) => {
                spawnSparkles(e.clientX, e.clientY);
                showFeedback("🏟️ Зимова Арена: Перехід до турнірних ліг з x2.5 бустом!");
              }}
              style={{ top: "24%", left: "78%" }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115 focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-sky-500/30 border-2 border-sky-300 flex items-center justify-center text-xl shadow-[0_0_24px_rgba(56,189,248,0.8)] animate-pulse">
                🏟️
              </div>
              <span className="mt-1.5 block whitespace-nowrap px-2.5 py-0.5 rounded-md bg-slate-950/90 border border-sky-400/30 text-[10px] font-bold text-sky-200 opacity-90 group-hover:opacity-100">
                Зимова Арена (Турніри)
              </span>
            </button>
          </div>

          {/* 4 Structured Event Activity Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div
              onClick={() => {
                setIsOpen(false);
                router.push("/achievements");
              }}
              className="rounded-2xl bg-[#0a1830]/85 hover:bg-[#0e2242]/95 border border-sky-300/25 hover:border-sky-300/60 p-4 backdrop-blur-xl cursor-pointer transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🏡</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  КВЕСТИ
                </span>
              </div>
              <h4 className="text-sm font-black text-white mb-1">Хатина Завдань</h4>
              <p className="text-[11px] text-slate-300">
                Виконуйте святкові місії та забирайте досягнення й промокоди.
              </p>
            </div>

            <div
              onClick={() => {
                setIsOpen(false);
                router.push("/cases");
              }}
              className="rounded-2xl bg-[#0a1830]/85 hover:bg-[#0e2242]/95 border border-sky-300/25 hover:border-sky-300/60 p-4 backdrop-blur-xl cursor-pointer transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎄</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  КЕЙСИ
                </span>
              </div>
              <h4 className="text-sm font-black text-white mb-1">Ялинка Нагород</h4>
              <p className="text-[11px] text-slate-300">
                Відкривайте щоденні безкоштовні кейси та забирайте джекпот.
              </p>
            </div>

            <div
              onClick={() => void claimDailyWinterGift()}
              className="rounded-2xl bg-[#0a1830]/85 hover:bg-[#0e2242]/95 border border-amber-400/35 hover:border-amber-300 p-4 backdrop-blur-xl cursor-pointer transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎁</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {giftClaimedToday ? "✓ ЗАБРАНО" : "ДОСТУПНО"}
                </span>
              </div>
              <h4 className="text-sm font-black text-white mb-1">Різдвяна Скриня</h4>
              <p className="text-[11px] text-slate-300">
                Щоденний безкоштовний подарунок (+500 🪙 +10 Б) для всіх гравців.
              </p>
            </div>

            <div
              onClick={() => {
                setIsOpen(false);
                router.push("/leagues");
              }}
              className="rounded-2xl bg-[#0a1830]/85 hover:bg-[#0e2242]/95 border border-sky-300/25 hover:border-sky-300/60 p-4 backdrop-blur-xl cursor-pointer transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🏟️</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  x2.5 БУСТ
                </span>
              </div>
              <h4 className="text-sm font-black text-white mb-1">Зимова Арена</h4>
              <p className="text-[11px] text-slate-300">
                Турніри прогнозистів на зимовому стадіоні та призовий фонд 2.5M 🪙.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2100] rounded-full border border-sky-400/60 bg-[#0a1a3e]/95 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.3)] backdrop-blur-md animate-fade-in">
          {toastMsg}
        </div>
      )}
    </>
  );
}
