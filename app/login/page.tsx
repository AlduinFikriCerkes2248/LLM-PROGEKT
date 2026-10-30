"use client";

import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!showSplash) return;
    const timerFade = setTimeout(() => {
      setIsFading(true);
    }, 1600);

    const timerDone = setTimeout(() => {
      setShowSplash(false);
    }, 2100);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerDone);
    };
  }, [showSplash]);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage(
        "Додайте URL проєкту Supabase та анонімний ключ у змінні середовища.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        mode === "login"
          ? await client.auth.signInWithPassword({ email, password })
          : await client.auth.signUp({ email, password });

      if (result.error) {
        setErrorMessage(
          mode === "login"
            ? "Не вдалося увійти. Перевірте email і пароль."
            : "Не вдалося створити акаунт. Перевірте введені дані.",
        );
        return;
      }

      if (result.data.session) {
        router.replace("/leagues");
        return;
      }

      setStatusMessage(
        "Акаунт створено. Перевірте пошту та підтвердьте email, щоб увійти.",
      );
    } catch {
      setErrorMessage("Не вдалося з’єднатися із Supabase. Спробуйте ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  return (
    <main>
      {showSplash && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Пропустити заставку"
          onClick={() => setShowSplash(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setShowSplash(false);
          }}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e] px-4 text-center cursor-pointer select-none transition-all duration-500 ${
            isFading ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
          }`}
        >
          <style>{`
            @keyframes drawTrident {
              0% {
                stroke-dashoffset: 1400;
                opacity: 0.1;
              }
              60% {
                opacity: 1;
              }
              100% {
                stroke-dashoffset: 0;
                opacity: 1;
              }
            }
            @keyframes drawBorder {
              0% {
                stroke-dashoffset: 800;
                opacity: 0.2;
              }
              100% {
                stroke-dashoffset: 0;
                opacity: 0.8;
              }
            }
            .tryzub-anim {
              stroke-dasharray: 1400;
              stroke-dashoffset: 1400;
              animation: drawTrident 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            .border-anim {
              stroke-dasharray: 800;
              stroke-dashoffset: 800;
              animation: drawBorder 1.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
            }
          `}</style>

          <div className="relative mb-6">
            <svg
              viewBox="0 0 200 240"
              className="h-44 w-36 sm:h-52 sm:w-44 drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="ukrGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="45%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>

              {/* Геометричний орнаментальний щит */}
              <rect
                x="12"
                y="12"
                width="176"
                height="216"
                rx="20"
                stroke="url(#ukrGold)"
                strokeWidth="2"
                strokeOpacity="0.4"
                className="border-anim"
              />
              {/* Кутові традиційні ромби-обереги */}
              <path
                d="M 12 36 L 36 12 M 188 36 L 164 12 M 12 204 L 36 228 M 188 204 L 164 228"
                stroke="url(#ukrGold)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="border-anim"
              />

              {/* Стилізований княжий Тризуб Володимира Великого */}
              <path
                d="M 100 28 
                   L 100 168
                   M 100 38 L 90 56 L 100 52 L 110 56 Z
                   M 100 168 
                   C 80 168 64 154 64 130
                   L 64 86
                   C 64 74 54 66 44 66
                   C 34 66 28 74 28 84
                   C 28 116 48 160 84 186
                   L 100 198
                   L 116 186
                   C 152 160 172 116 172 84
                   C 172 74 166 66 156 66
                   C 146 66 136 74 136 86
                   L 136 130
                   C 136 154 120 168 100 168
                   M 68 96 L 100 118 L 132 96
                   M 100 198 L 100 216"
                stroke="url(#ukrGold)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="tryzub-anim"
              />
            </svg>
          </div>

          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-amber-400/90 sm:text-sm">
            MATCHDAY
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-400">
            Українська платформа спортивних прогнозів
          </p>

          <span className="mt-8 font-mono text-[10px] text-slate-600 transition hover:text-slate-400">
            (клікніть будь-де, щоб пропустити)
          </span>
        </div>
      )}
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#f4f5f1] px-5 py-10 text-[#202722] sm:px-8">
      <section className="w-full max-w-md border border-[#e0e3dd] bg-white p-6 shadow-sm sm:p-9">
        <header className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            Matchday · Ліги прогнозів
          </p>
          <h1 className="text-3xl font-semibold leading-tight">
            {mode === "login" ? "Вхід до акаунту" : "Створення акаунту"}
          </h1>
        </header>

        <div
          aria-label="Режим автентифікації"
          className="mb-6 grid grid-cols-2 border border-[#d9ddd6] p-1"
        >
          <button
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => changeMode("login")}
            className={`h-10 text-sm font-medium transition ${mode === "login" ? "bg-[#202722] text-white" : "text-[#626b64] hover:bg-[#f4f5f1]"}`}
          >
            Увійти
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => changeMode("signup")}
            className={`h-10 text-sm font-medium transition ${mode === "signup" ? "bg-[#202722] text-white" : "text-[#626b64] hover:bg-[#f4f5f1]"}`}
          >
            Зареєструватися
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full border border-[#c8cec7] bg-[#fbfcfa] px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
            >
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full border border-[#c8cec7] bg-[#fbfcfa] px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
          </div>

          {!isSupabaseConfigured && (
            <p role="alert" className="text-sm leading-6 text-rose-700">
              Supabase не налаштовано. Додайте URL проєкту й анонімний ключ у
              змінні середовища.
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="text-sm leading-6 text-rose-700">
              {errorMessage}
            </p>
          )}
          {statusMessage && (
            <p role="status" className="text-sm leading-6 text-emerald-800">
              {statusMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isSupabaseConfigured}
            className="h-11 w-full bg-[#202722] px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-[#a5ada6]"
          >
            {isSubmitting
              ? "Зачекайте…"
              : mode === "login"
                ? "Увійти"
                : "Створити акаунт"}
          </button>
        </form>
      </section>
    </div>
    </main>
  );
}