"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  PROFILE_UPDATED_EVENT,
} from "../../lib/supabase/client";

type CaseType = "khokhlov" | "marchenko" | "admin";

type CaseItem = {
  id: CaseType;
  title: string;
  tagline: string;
  coinsDisplay: string;
  xpDisplay: string;
  badge: string;
  badgeColor: string;
  boxColor: string;
  glowColor: string;
  icon: string;
};

const CASES: CaseItem[] = [
  {
    id: "khokhlov",
    title: "Хохловська заначка",
    tagline: "Класична народна схованка під подушкою на чорний день.",
    coinsDisplay: "500 - 700 монет",
    xpDisplay: "+60 XP",
    badge: "СТАРТОВИЙ КЕЙС",
    badgeColor: "border-emerald-600/50 bg-emerald-950/40 text-emerald-300",
    boxColor: "from-emerald-950 via-slate-900 to-black border-emerald-700/60",
    glowColor: "rgba(16,185,129,0.15)",
    icon: "📦",
  },
  {
    id: "marchenko",
    title: "Світ Марченка",
    tagline: "Солідний дипломат із цінними паперами та готівкою.",
    coinsDisplay: "20 000 - 25 000 монет",
    xpDisplay: "+400 XP",
    badge: "РІДКІСНИЙ КЕЙС",
    badgeColor: "border-cyan-600/50 bg-cyan-950/40 text-cyan-300",
    boxColor: "from-cyan-950 via-slate-900 to-black border-cyan-500/60",
    glowColor: "rgba(6,182,212,0.25)",
    icon: "💼",
  },
  {
    id: "admin",
    title: "Адміновська долина",
    tagline: "Справжній джекпот сервера. Доступ до скарбниці адміністратора.",
    coinsDisplay: "1 000 000 МОНЕТ",
    xpDisplay: "+5 000 XP",
    badge: "ЛЕГЕНДАРНИЙ ДЖЕКПОТ",
    badgeColor: "border-amber-500 bg-amber-950/50 text-amber-300 animate-pulse",
    boxColor: "from-amber-950 via-yellow-950/40 to-black border-yellow-500",
    glowColor: "rgba(245,158,11,0.35)",
    icon: "👑",
  },
];

export default function CasesPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openedReward, setOpenedReward] = useState<{
    box: string;
    coins: number;
    xp: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  useEffect(() => {
    // Перевірка щоденного безкоштовного кейсу
    const today = new Date().toISOString().slice(0, 10);
    const lastClaim = localStorage.getItem("matchday:last_daily_case");
    if (lastClaim === today) {
      setDailyClaimed(true);
    }

    async function loadBalance() {
      const client = getSupabaseClient();
      if (!client) return;
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;

      const { data } = await client
        .from("profiles")
        .select("coins")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (data && typeof data.coins === "number") {
        setBalance(data.coins);
      }
    }

    void loadBalance();
  }, []);

  async function handleOpenCase(caseType: CaseType, isDaily = false) {
    if (isOpening) return;
    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage("Підключення до Supabase відсутнє.");
      return;
    }

    setIsOpening(true);
    setErrorMessage(null);
    setOpenedReward(null);

    try {
      const { data, error } = await client.rpc("open_loot_box", {
        p_box_type: caseType,
      });

      if (error) throw error;

      if (data && data.success) {
        setOpenedReward({
          box: data.box,
          coins: data.coins,
          xp: data.xp,
        });

        // Нараховуємо XP у локальне сховище для блекджеку
        try {
          const currentXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
          localStorage.setItem("matchday:bj_xp", (currentXp + data.xp).toString());
        } catch {
          // ignore
        }

        // Оновлюємо статус щоденного кейсу, якщо це він
        if (isDaily || caseType === "khokhlov") {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem("matchday:last_daily_case", today);
          setDailyClaimed(true);
        }

        // Оновлюємо баланс скрізь
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          const { data: prof } = await client
            .from("profiles")
            .select("coins")
            .eq("id", authData.user.id)
            .maybeSingle();
          if (prof && typeof prof.coins === "number") setBalance(prof.coins);
        }
      }
    } catch (err: unknown) {
      console.error("Помилка відкриття кейсу:", err);
      setErrorMessage("Не вдалося відкрити кейс. Переконайтеся, що ви увійшли.");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <main className="min-h-screen flex-1 bg-[#090b0e] px-4 py-8 font-mono text-slate-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <Link
            href="/leagues"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition"
          >
            ← До ліг
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/blackjack"
              className="rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
            >
              🃏 Блекджек
            </Link>
            <div className="font-mono text-xs text-amber-400 font-semibold">
              Баланс: {balance === null ? "—" : `${balance.toLocaleString()} монет`}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-block rounded-full border border-amber-600/40 bg-amber-950/20 px-4 py-1 text-xs text-amber-300 font-bold mb-3">
            🎁 СЕКРЕТНІ КЕЙСИ ТА НАГОРОДИ
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            КЕЙСИ ТА КВЕСТИ
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-400 sm:text-sm">
            Отримуй щоденний безкоштовний кейс, вибивай до 1 000 000 монет та прокачуй свій рівень агента!
          </p>
        </header>

        {/* Щоденна нагорода Banner */}
        <div className="mb-10 rounded-2xl border border-emerald-600/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                ⚡ ЩОДЕННИЙ БОНУС (1 РАЗ НА ДОБУ)
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Безкоштовна «Хохловська заначка»
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Заходь щодня та забирай 500+ монет і досвід для збільшення лімітів ставок.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCase("khokhlov", true)}
              disabled={isOpening || dailyClaimed}
              className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isOpening
                ? "Відкриття..."
                : dailyClaimed
                  ? "Вже отримано сьогодні"
                  : "🎁 Забрати безкоштовно"}
            </button>
          </div>
        </div>

        {/* Modal-like Reward Alert */}
        {openedReward && (
          <div className="mb-10 animate-in fade-in zoom-in duration-300 rounded-2xl border-2 border-yellow-500 bg-gradient-to-b from-yellow-950/60 to-black p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)]">
            <span className="text-4xl">🎉</span>
            <h3 className="mt-2 text-lg font-bold text-amber-300 uppercase">
              КЕЙС «{openedReward.box}» ВІДКРИТО!
            </h3>
            <p className="mt-2 text-2xl font-black text-white">
              +{openedReward.coins.toLocaleString()} МОНЕТ
            </p>
            <p className="text-sm font-bold text-emerald-400 mt-1">
              +{openedReward.xp} XP ДОСВІДУ АГЕНТА
            </p>
            <button
              onClick={() => setOpenedReward(null)}
              className="mt-4 rounded-lg bg-yellow-500 px-6 py-1.5 text-xs font-bold text-black uppercase hover:bg-yellow-400 transition"
            >
              Чудово, забрати
            </button>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="mb-6 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-center text-xs text-rose-400">
            {errorMessage}
          </p>
        )}

        {/* Cases Grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          {CASES.map((c) => (
            <div
              key={c.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 bg-gradient-to-b ${c.boxColor} p-6 shadow-xl transition hover:-translate-y-1`}
              style={{ boxShadow: `0 10px 30px ${c.glowColor}` }}
            >
              <div>
                <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-4 ${c.badgeColor}`}>
                  {c.badge}
                </span>

                <div className="my-6 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-black/40 border border-slate-700/60 text-5xl shadow-inner">
                    {c.icon}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white text-center">{c.title}</h3>
                <p className="mt-2 text-xs text-slate-400 text-center leading-relaxed">
                  {c.tagline}
                </p>

                <div className="mt-6 rounded-xl border border-slate-800 bg-black/50 p-3 space-y-1.5 font-mono text-center">
                  <div className="text-sm font-bold text-amber-400">{c.coinsDisplay}</div>
                  <div className="text-xs font-semibold text-emerald-400">{c.xpDisplay}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCase(c.id)}
                disabled={isOpening}
                className="mt-6 w-full rounded-xl bg-slate-800 py-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
              >
                {isOpening ? "Відкриття..." : "Відкрити кейс"}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-slate-600">
          Matchday Lootbox System · Монети віртуальні · 2026
        </p>
      </div>
    </main>
  );
}
