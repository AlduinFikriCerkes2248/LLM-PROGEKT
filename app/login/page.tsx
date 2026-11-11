"use client";

import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { formatErrorMessage } from "../../lib/error-utils";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    void client.auth.getSession().then(({ data }) => {
      if (data?.session) {
        router.replace("/leagues");
      }
    });
  }, [router]);

  function handleSkipSplash() {
    setShowSplash(false);
    router.replace("/leagues");
  }
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
        // Запуск анімації успішного входу
        setShowSplash(true);
        setTimeout(() => setIsFading(true), 1600);
        setTimeout(() => router.replace("/leagues"), 2100);
        return;
      }

      setStatusMessage(
        "Акаунт створено. Перевірте пошту та підтвердьте email, щоб увійти.",
      );
      setShowSplash(true);
      setTimeout(() => setIsFading(true), 1600);
      setTimeout(() => setShowSplash(false), 2100);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, "Не вдалося з’єднатися із Supabase. Спробуйте ще раз."));
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
          onClick={handleSkipSplash}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleSkipSplash();
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
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-[#060A17] px-5 py-10 text-white sm:px-8 overflow-hidden select-none">
      {/* М'яке фонове світіння та градієнти */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#FC734D]/15 via-[#0297DE]/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-[#0297DE]/15 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-[#FC734D]/15 blur-[100px] rounded-full" />
      </div>

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800/90 bg-[#0A1430]/90 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-1">
            <span className="w-1.5 h-4 bg-[#FC734D] rounded-full" />
            <span className="w-1.5 h-5 bg-[#0297DE] rounded-full" />
            <span className="w-1.5 h-3.5 bg-[#0A1430] border border-[#0297DE]/60 rounded-full" />
          </div>
          <p className="mb-2 text-xs font-mono font-medium uppercase tracking-[0.2em] text-[#0297DE]">
            Matchday · Ліги прогнозів
          </p>
          <h1 className="font-serif text-3xl font-normal leading-tight text-white">
            {mode === "login" ? "Вхід до акаунту" : "Створення акаунту"}
          </h1>
        </header>

        <div
          aria-label="Режим автентифікації"
          className="mb-6 grid grid-cols-2 rounded-xl border border-slate-800 bg-[#060A17]/80 p-1"
        >
          <button
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => changeMode("login")}
            className={`h-10 rounded-lg text-xs font-medium transition-all ${
              mode === "login"
                ? "bg-[#FC734D] text-white shadow-[0_0_15px_rgba(252,115,77,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Увійти
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => changeMode("signup")}
            className={`h-10 rounded-lg text-xs font-medium transition-all ${
              mode === "signup"
                ? "bg-[#FC734D] text-white shadow-[0_0_15px_rgba(252,115,77,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Зареєструватися
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-slate-300"
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
              placeholder="user@example.com"
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#060A17]/90 px-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#0297DE] focus:ring-1 focus:ring-[#0297DE]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-slate-300"
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
              placeholder="••••••••"
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#060A17]/90 px-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#0297DE] focus:ring-1 focus:ring-[#0297DE]"
            />
          </div>

          {!isSupabaseConfigured && (
            <p role="alert" className="text-xs leading-5 text-rose-400">
              Supabase не налаштовано. Додайте URL проєкту й анонімний ключ у
              змінні середовища.
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="text-xs leading-5 text-rose-400">
              {errorMessage}
            </p>
          )}
          {statusMessage && (
            <p role="status" className="text-xs leading-5 text-emerald-400">
              {statusMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isSupabaseConfigured}
            className="btn-interactive min-h-[44px] h-11 w-full rounded-full bg-[#FC734D] px-5 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(252,115,77,0.4)] transition-all hover:bg-[#ff8463] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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