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
      <aside className="fixed right-3 top-3 z-50 max-w-[calc(100vw-1.5rem)] border border-[#e0e3dd] bg-white px-3 py-2 text-sm text-[#202722] shadow-sm sm:right-5 sm:top-4">
        {isLoading ? (
          <span role="status">...</span>
        ) : user ? (
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <span className="max-w-40 truncate font-medium" title={username ?? user.email ?? undefined}>
              {username || user.email || "Користувач"}
            </span>
            <span className="whitespace-nowrap text-amber-700" aria-label="Баланс монет">
              🪙 {coins === null ? "—" : coins}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 hover:text-emerald-950 disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningOut ? "Вихід…" : "Вийти"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span>Не увійшли</span>
            <Link
              href="/login"
              className="font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 hover:text-emerald-950"
            >
              Увійти
            </Link>
          </div>
        )}
        {errorMessage && (
          <p role="alert" className="mt-1 max-w-64 text-xs text-rose-700">
            {errorMessage}
          </p>
        )}
      </aside>
    </>
  );
}
