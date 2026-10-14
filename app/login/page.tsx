"use client";

import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
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
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f4f5f1] px-5 py-10 text-[#202722] sm:px-8">
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
    </main>
  );
}