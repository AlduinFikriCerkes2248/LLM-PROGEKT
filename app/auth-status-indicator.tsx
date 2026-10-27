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
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          .select("username, coins")
          .eq("id", userId)
          .maybeSingle();

        if (!active || requestId !== profileRequest) return;

        if (error) {
          console.error("Не вдалося завантажити профіль користувача:", error);
          setErrorMessage("Не вдалося завантажити профіль; показано email.");
        }

        setUsername(data?.username || null);
        setCoins(typeof data?.coins === "number" ? data.coins : null);
      } catch (error) {
        if (!active || requestId !== profileRequest) return;
        console.error("Не вдалося завантажити профіль користувача:", error);
        setErrorMessage("Не вдалося завантажити профіль; показано email.");
        setUsername(null);
        setCoins(null);
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
      setUsername(null);
      setCoins(null);
      setErrorMessage(null);

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
      .then(({ data, error }) => {
        if (!active) return;
        if (authEventVersion !== initialAuthEventVersion) return;
        if (error) {
          console.error("Не вдалося перевірити сесію Supabase:", error);
          setErrorMessage("Не вдалося перевірити сесію.");
          setIsLoading(false);
          return;
        }
        void updateUser(data.session);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (authEventVersion !== initialAuthEventVersion) return;
        console.error("Не вдалося перевірити сесію Supabase:", error);
        setErrorMessage("Не вдалося перевірити сесію.");
        setIsLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    };
  }, []);

  async function handleSignOut() {
    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage("Не вдалося підключитися до Supabase.");
      return;
    }

    setErrorMessage(null);
    setIsSigningOut(true);
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Не вдалося вийти з акаунту:", error);
      setErrorMessage("Не вдалося вийти з акаунту. Спробуйте ще раз.");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (pathname === "/login") return null;

  return (
    <>
      <div aria-hidden="true" className="h-14" />
      <aside className="fixed right-3 top-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-lg border border-cyan-900/60 bg-[#0d1411]/90 px-3.5 py-2 font-mono text-xs text-gray-200 shadow-[0_0_20px_rgba(0,255,200,0.06)] backdrop-blur-md sm:right-5 sm:top-4">
        {isLoading ? (
          <span role="status" className="animate-pulse text-cyan-400">⚡ синхронізація...</span>
        ) : user ? (
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 max-w-40 truncate font-bold text-cyan-300" title={username ?? user.email ?? undefined}>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              {username || user.email || "Користувач"}
            </span>
            <span className="whitespace-nowrap font-bold text-yellow-400" aria-label="Баланс монет">
              🪙 {coins === null ? "—" : coins.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded border border-red-900/50 bg-red-950/30 px-2 py-0.5 font-bold text-red-400 transition hover:border-red-700 hover:bg-red-900/40 hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningOut ? "..." : "ВИХІД"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">[ОФЛАЙН]</span>
            <Link
              href="/login"
              className="rounded border border-cyan-800 bg-cyan-950/40 px-2.5 py-0.5 font-bold text-cyan-300 transition hover:bg-cyan-900/60"
            >
              УВІЙТИ
            </Link>
          </div>
        )}
        {errorMessage && (
          <p role="alert" className="mt-1 max-w-64 text-[11px] text-red-400">
            {errorMessage}
          </p>
        )}
      </aside>
    </>
  );
}
