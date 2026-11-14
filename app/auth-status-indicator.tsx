"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  PROFILE_UPDATED_EVENT,
} from "../lib/supabase/client";
import MatrixAvatar from "../components/matrix-avatar";

type SignedInUser = {
  id: string;
  email: string | null;
};

export default function AuthStatusIndicator() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [hohlyantsi, setHohlyantsi] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. Ініціалізація поточної теми
    const saved = typeof window !== "undefined" ? localStorage.getItem("matchday_theme") : null;
    const isLight =
      (typeof document !== "undefined" && document.documentElement.classList.contains("light")) ||
      saved === "light";
    setTheme(isLight ? "light" : "dark");

    const savedAvatar =
      typeof window !== "undefined" ? localStorage.getItem("matchday_avatar_url") : null;
    if (savedAvatar) setCustomAvatarUrl(savedAvatar);

    // 2. Слухаємо подію перемикання теми (з theme-toggle)
    function handleThemeChange(e: Event) {
      const customEvent = e as CustomEvent<{ theme: "dark" | "light" }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      } else {
        const isNowLight = document.documentElement.classList.contains("light");
        setTheme(isNowLight ? "light" : "dark");
      }
    }

    function handleProfileUpdate(e: Event) {
      const custom = e as CustomEvent<{ avatar_url?: string; username?: string }>;
      if (custom.detail?.avatar_url !== undefined) {
        setCustomAvatarUrl(custom.detail.avatar_url);
      } else {
        const up = localStorage.getItem("matchday_avatar_url");
        setCustomAvatarUrl(up);
      }
    }

    window.addEventListener("matchday:theme_change", handleThemeChange);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    return () => {
      window.removeEventListener("matchday:theme_change", handleThemeChange);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    const supabase = client;

    let active = true;
    let profileRequest = 0;
    let authEventVersion = 0;
    let currentUserId: string | null = null;

    async function loadProfile(userId: string, requestId: number) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, coins, hohlyantsi")
          .eq("id", userId)
          .maybeSingle();

        if (!active || requestId !== profileRequest) return;

        if (error) {
          console.error("Не вдалося завантажити профіль користувача:", error);
        }

        setUsername(data?.username || null);
        setCoins(typeof data?.coins === "number" ? data.coins : null);
        setHohlyantsi(typeof data?.hohlyantsi === "number" ? data.hohlyantsi : 25);
      } catch (error) {
        if (!active || requestId !== profileRequest) return;
        console.error("Помилка профілю:", error);
      } finally {
        if (active && requestId === profileRequest) setIsLoading(false);
      }
    }

    async function updateUser(session: Session | null) {
      if (!active) return;
      const requestId = ++profileRequest;
      const signedInUser = session?.user;
      currentUserId = signedInUser?.id ?? null;
      const nextUser = signedInUser
        ? { id: signedInUser.id, email: signedInUser.email ?? null }
        : null;

      setUser(nextUser);
      if (!signedInUser) {
        if (active && requestId === profileRequest) setIsLoading(false);
        return;
      }

      await loadProfile(signedInUser.id, requestId);
    }

    function refreshProfile() {
      if (!currentUserId) return;
      const requestId = ++profileRequest;
      void loadProfile(currentUserId, requestId);
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventVersion += 1;
      window.setTimeout(() => {
        void updateUser(session);
      }, 0);
    });

    const initialAuthEventVersion = authEventVersion;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active || authEventVersion !== initialAuthEventVersion) return;
        void updateUser(data.session);
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    };
  }, []);

  async function handleSignOut() {
    const client = getSupabaseClient();
    if (!client) return;
    setIsSigningOut(true);
    try {
      await client.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  if (pathname === "/login" || pathname === "/") return null;

  const isDark = theme === "dark";
  const displayName = username || (user?.email ? user.email.split("@")[0] : "maksimarzubov491");

  return (
    <>
      <div aria-hidden="true" className="h-14" />
      {/* 
        Головний віджет профілю з 3D трикутною вкладкою з золотим вигином (референс Image 1) 
        та анімованою Matrix-аватаркою чорна/біла
      */}
      <aside
        className="fixed right-3 top-3 z-50 max-w-[calc(100vw-1.5rem)] select-none transition-all duration-300 sm:right-5 sm:top-4"
      >
        <div
          className="relative flex items-center rounded-2xl p-1 transition-all duration-300 shadow-2xl"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #1c2230 0%, #11151e 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f4f6fa 100%)",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.12)"
              : "1px solid rgba(0, 0, 0, 0.1)",
            boxShadow: isDark
              ? "0 10px 30px -5px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(245, 158, 11, 0.2)"
              : "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 0 1px 1px rgba(245, 158, 11, 0.25)",
          }}
        >
          {/* ================================================================= */}
          {/* 1. ЛІВА 3D ТРИКУТНА ВКЛАДКА З ЗОЛОТИМ ВИГИНОМ (ЯК НА РЕФЕРЕНСІ)    */}
          {/* ================================================================= */}
          <div className="relative flex items-center justify-center pl-1 pr-2 py-0.5">
            {/* Золотий вигин-підкладка під трикутником */}
            <div
              className="absolute -left-1 top-0 bottom-0 w-[54px] rounded-l-2xl pointer-events-none transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #facc15 0%, #eab308 50%, #b45309 100%)",
                boxShadow: isDark
                  ? "0 0 12px rgba(234, 179, 8, 0.4), inset 0 1px 2px rgba(255,255,255,0.4)"
                  : "0 0 10px rgba(234, 179, 8, 0.35), inset 0 1px 2px rgba(255,255,255,0.5)",
                clipPath: "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)",
              }}
            />

            {/* Основний корпус вигнутого трикутного язичка */}
            <div
              className="relative z-10 flex items-center justify-center p-1 rounded-full transition-colors duration-300"
              style={{
                background: isDark
                  ? "linear-gradient(135deg, #252c3d 0%, #151924 100%)"
                  : "linear-gradient(135deg, #ffffff 0%, #edf2f7 100%)",
                boxShadow: isDark
                  ? "inset 0 1px 2px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.5)"
                  : "inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              {/* АВАТАРКА ЧОРНА/БІЛА З АНІМАЦІЄЮ МАТРИЦІ ТА ПІДТРИМКОЮ КАСТОМНОГО ЛОГО */}
              <MatrixAvatar
                theme={theme}
                size={34}
                src={customAvatarUrl}
                initial={displayName.charAt(0).toUpperCase()}
              />
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. ДАНІ КОРИСТУВАЧА ТА БАЛАНС (ПРАВА ЧАСТИНА КАРТКИ)              */}
          {/* ================================================================= */}
          <div className="flex items-center gap-2.5 px-2 py-0.5">
            {isLoading ? (
              <span
                role="status"
                className="animate-pulse text-xs font-mono font-bold text-[#08bfea] px-2"
              >
                ⚡ синхронізація...
              </span>
            ) : user ? (
              <>
                {/* Нікнейм / Пошта з зеленим статусом */}
                <div
                  className="flex items-center gap-1.5 font-mono text-xs font-bold transition-colors"
                  style={{ color: isDark ? "#f1f5fa" : "#0f172a" }}
                  title={user.email || displayName}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </span>
                  <span className="max-w-[130px] sm:max-w-[170px] truncate">
                    {displayName}
                  </span>
                </div>

                {/* Золоті монети */}
                <div
                  className="flex items-center gap-1 rounded-xl px-2 py-1 font-mono text-xs font-black shadow-inner"
                  style={{
                    background: isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.16)",
                    border: isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(217, 119, 6, 0.4)",
                    color: isDark ? "#fbbf24" : "#b45309",
                  }}
                  title="Золоті монети"
                >
                  <span className="text-sm">🪙</span>
                  <span>{coins === null ? "1 088 233" : coins.toLocaleString()}</span>
                </div>

                {/* Друга валюта: Бонуси (Б) */}
                <div
                  className="flex items-center gap-1 rounded-xl px-2 py-1 font-mono text-xs font-black shadow-inner"
                  style={{
                    background: isDark ? "rgba(8, 191, 234, 0.12)" : "rgba(8, 191, 234, 0.15)",
                    border: isDark ? "1px solid rgba(8, 191, 234, 0.3)" : "1px solid rgba(8, 191, 234, 0.45)",
                    color: isDark ? "#38bdf8" : "#0369a1",
                  }}
                  title="Бонуси (валюта для кейсів та онлайн дуелей)"
                >
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 text-[9px] font-black text-slate-950 shadow-sm">
                    Б
                  </span>
                  <span>{hohlyantsi === null ? "45" : hohlyantsi.toLocaleString()}</span>
                </div>

                {/* Кнопка виходу (ВИХІД) */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="group relative flex items-center justify-center rounded-xl px-3 py-1 font-mono text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  style={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.28) 100%)"
                      : "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.2) 100%)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: isDark ? "#fca5a5" : "#b91c1c",
                  }}
                >
                  {isSigningOut ? "..." : "ВИХІД"}
                </button>
              </>
            ) : (
              /* Стан для гостя (Офлайн) */
              <div className="flex items-center gap-2 px-1">
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                >
                  [ОФЛАЙН]
                </span>
                <Link
                  href="/login"
                  className="rounded-xl px-3.5 py-1 text-xs font-mono font-black text-white shadow-md transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                    boxShadow: "0 0 12px rgba(245, 158, 11, 0.4)",
                  }}
                >
                  УВІЙТИ
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
