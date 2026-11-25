"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "../../components/theme-toggle";
import { trackAchievement } from "@/lib/achievements-tracker";
import MatrixAvatar from "../../components/matrix-avatar";
import { getSupabaseClient, PROFILE_UPDATED_EVENT } from "../../lib/supabase/client";
import {
  AppTheme,
  applyAppTheme,
  getStoredTheme,
  getWinterPrefs,
  saveWinterPrefs,
  THEME_CHANGE_EVENT,
  WINTER_PREFS_EVENT,
  WinterPrefs,
} from "@/lib/theme";

// Готові швидкі пресети аватарів
const AVATAR_PRESETS = [
  {
    name: "Кібер Чемпіон",
    url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80",
    badge: "🏆",
  },
  {
    name: "Футбольний м'яч Неон",
    url: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=200&auto=format&fit=crop&q=80",
    badge: "⚽",
  },
  {
    name: "Кіберспорт Агент",
    url: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80",
    badge: "🤖",
  },
  {
    name: "Нічний Стадіон",
    url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80",
    badge: "🏟️",
  },
  {
    name: "Золотий Кубок",
    url: "https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=200&auto=format&fit=crop&q=80",
    badge: "🥇",
  },
];

// Готові пресети банерів
const BANNER_PRESETS = [
  {
    name: "Matchday Ніч",
    style: "linear-gradient(135deg, #091322 0%, #0d223a 50%, #064057 100%)",
  },
  {
    name: "Золотий Тріумф",
    style: "linear-gradient(135deg, #2a1b07 0%, #4a320d 50%, #855811 100%)",
  },
  {
    name: "Неоновий Кіберпанк",
    style: "linear-gradient(135deg, #1b0a2a 0%, #351352 50%, #681f9c 100%)",
  },
  {
    name: "Західні Дюни",
    style: "linear-gradient(135deg, #2b0e14 0%, #541d27 50%, #9e3247 100%)",
  },
  {
    name: "❄️ Зимова Казка",
    style: "linear-gradient(135deg, #06182c 0%, #0d3b66 50%, #2b6cb0 100%)",
  },
];

export default function ProfilePage() {
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [winterPrefs, setWinterPrefs] = useState<WinterPrefs>({
    snowEnabled: true,
    musicEnabled: false,
    avatarDecor: true,
  });
  const [username, setUsername] = useState<string>("Максим");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [bannerStyle, setBannerStyle] = useState<string>(BANNER_PRESETS[0].style);
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [customStatus, setCustomStatus] = useState<string>("⚽ Чекаю на Ель Класіко | Реал vs Барселона");
  const [bio, setBio] = useState<string>(
    "Футбольний фанат з 2012 року. Вболіваю за красиву гру та точні прогнози. Непереможний у турнірах Matchday 🎯"
  );
  const [coins, setCoins] = useState<number>(1088233);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(50);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    // Ініціалізація теми та зимових налаштувань
    setTheme(getStoredTheme());
    setWinterPrefs(getWinterPrefs());

    function handleThemeChange(e: Event) {
      const customEvent = e as CustomEvent<{ theme?: AppTheme }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      } else {
        setTheme(getStoredTheme());
      }
    }

    function handleWinterPrefs(e: Event) {
      const custom = e as CustomEvent<WinterPrefs>;
      if (custom.detail) {
        setWinterPrefs(custom.detail);
      } else {
        setWinterPrefs(getWinterPrefs());
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener(WINTER_PREFS_EVENT, handleWinterPrefs);

    // Завантаження збережених налаштувань профілю
    const localAvatar = localStorage.getItem("matchday_avatar_url");
    const localBio = localStorage.getItem("matchday_bio");
    const localStatus = localStorage.getItem("matchday_custom_status");
    const localBanner = localStorage.getItem("matchday_banner_url");
    const localBannerStyle = localStorage.getItem("matchday_banner_style");
    const localUsername = localStorage.getItem("matchday_username");

    const syncLocalCoinsAndXp = () => {
      try {
        const c = localStorage.getItem("matchday:coins") || localStorage.getItem("matchday_coins");
        if (c) setCoins(parseInt(c, 10));
        const rawXp = localStorage.getItem("matchday:bj_xp");
        if (rawXp) {
          const totalXp = parseInt(rawXp, 10);
          if (!isNaN(totalXp)) {
            setLevel(Math.max(1, Math.floor(totalXp / 100) + 1));
            setXp(totalXp % 100);
          }
        }
      } catch {}
    };
    syncLocalCoinsAndXp();

    const handleProfileUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ coins?: number }>;
      if (custom.detail?.coins !== undefined) {
        setCoins(custom.detail.coins);
      } else {
        syncLocalCoinsAndXp();
      }
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    window.addEventListener("storage", syncLocalCoinsAndXp);

    if (localAvatar) setAvatarUrl(localAvatar);
    if (localBio) setBio(localBio);
    if (localStatus) setCustomStatus(localStatus);
    if (localBanner) setBannerUrl(localBanner);
    if (localBannerStyle) setBannerStyle(localBannerStyle);
    if (localUsername) setUsername(localUsername);

    // Спроба отримати з Supabase
    const client = getSupabaseClient();
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user) {
          if (data.user.user_metadata?.avatar_url && !localAvatar) {
            setAvatarUrl(data.user.user_metadata.avatar_url);
          }
          if (data.user.user_metadata?.bio && !localBio) {
            setBio(data.user.user_metadata.bio);
          }
          if (data.user.user_metadata?.custom_status && !localStatus) {
            setCustomStatus(data.user.user_metadata.custom_status);
          }
          client
            .from("profiles")
            .select("username, coins")
            .eq("id", data.user.id)
            .maybeSingle()
            .then(({ data: prof }) => {
              if (prof?.username && !localUsername) setUsername(prof.username);
              if (typeof prof?.coins === "number") {
                setCoins(prof.coins);
                try {
                  localStorage.setItem("matchday:coins", prof.coins.toString());
                  localStorage.setItem("matchday_coins", prof.coins.toString());
                } catch {}
              }
            });
        }
      });
    }

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener(WINTER_PREFS_EVENT, handleWinterPrefs);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.removeEventListener("storage", syncLocalCoinsAndXp);
    };
  }, []);

  function handleSelectTheme(newTheme: AppTheme) {
    setTheme(newTheme);
    applyAppTheme(newTheme);
    if (newTheme === "winter" && !bannerUrl && bannerStyle === BANNER_PRESETS[0].style) {
      setBannerStyle(BANNER_PRESETS[4].style);
    }
  }

  function handleSaveProfile() {
    // Збереження в LocalStorage
    localStorage.setItem("matchday_avatar_url", avatarUrl);
    localStorage.setItem("matchday_bio", bio);
    localStorage.setItem("matchday_custom_status", customStatus);
    localStorage.setItem("matchday_banner_url", bannerUrl);
    localStorage.setItem("matchday_banner_style", bannerStyle);
    localStorage.setItem("matchday_username", username);
    applyAppTheme(theme);
    saveWinterPrefs(winterPrefs);

    // Сповіщення інших компонентів
    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATED_EVENT, {
        detail: {
          avatar_url: avatarUrl,
          bio,
          custom_status: customStatus,
          username,
        },
      })
    );

    // Збереження в Supabase User Metadata (якщо авторизований)
    const client = getSupabaseClient();
    if (client) {
      client.auth.updateUser({
        data: {
          avatar_url: avatarUrl,
          bio,
          custom_status: customStatus,
          display_name: username,
        },
      });
      client.auth.getUser().then(({ data }) => {
        if (data?.user) {
          client
            .from("profiles")
            .update({ username })
            .eq("id", data.user.id)
            .then(() => {});
        }
      });
    }

    // Відстеження досягнень профілю
    trackAchievement("profile_avatar", 1, "set");

    // Відстеження Марченка в полях профілю
    const fullProfileText = `${username} ${bio} ${customStatus}`;
    const matches = fullProfileText.match(/(марченк|marchenk)/gi);
    if (matches && matches.length > 0) {
      trackAchievement("great_marchenko", matches.length, "increment");
    }

    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  }

  function handleCopyTag() {
    const cleanTag = username.toLowerCase().replace(/\s+/g, "");
    navigator.clipboard.writeText(`@${cleanTag}#2026`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const isDark = theme !== "light";
  const isWinter = theme === "winter";

  return (
    <div
      className={`relative min-h-screen bg-transparent font-sans antialiased overflow-x-hidden selection:bg-[#08bfea]/30 selection:text-[#2cd5fb] flex ${
        isDark ? "text-[#f1f5fa]" : "text-[#0f172a]"
      }`}
    >
      {/* 1. ЛІВИЙ САЙДБАР (ЗБЕРЕЖЕНО НАВІГАЦІЮ) */}
      <aside
        className={`w-[240px] h-screen fixed left-0 top-0 backdrop-blur-md border-r py-6 px-4 hidden md:flex flex-col justify-between z-30 select-none transition-colors ${
          isWinter
            ? "bg-[#061224]/95 border-sky-300/25"
            : isDark
              ? "bg-[#090e18]/95 border-[rgba(65,140,190,0.22)]"
              : "bg-white/95 border-slate-200"
        }`}
      >
        <div>
          {/* Бренд */}
          <Link href="/dashboard" className="flex items-center gap-3 pl-3 mb-8 group">
            <div className="text-[#08bfea] drop-shadow-[0_0_10px_rgba(8,191,234,0.5)]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c2.42-.36 4.3-2.31 4.61-4.96C20.08 10.63 22 8.55 22 6V5h-3zm-14 3V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </div>
            <div className="text-base font-black tracking-[0.14em] uppercase">
              <span className={isDark ? "text-white" : "text-slate-900"}>MATCH</span>
              <span className="text-[#08bfea]">DAY</span>
            </div>
          </Link>

          {/* Список посилань */}
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span>Головна</span>
              </Link>
            </li>
            <li>
              <Link
                href="/leagues"
                className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
                </svg>
                <span>Ліги прогнозів</span>
              </Link>
            </li>
            <li>
              <Link
                href="/online"
                className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#9aa9be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                  <line x1="13" y1="19" x2="19" y2="13" />
                  <line x1="16" y1="16" x2="20" y2="20" />
                  <line x1="19" y1="21" x2="21" y2="19" />
                </svg>
                <span>Онлайн PvP</span>
              </Link>
            </li>
            <li>
              <Link
                href="/achievements"
                className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#9aa9be] hover:text-white hover:bg-[rgba(13,21,34,0.8)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#f59e0b] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c2.42-.36 4.3-2.31 4.61-4.96C20.08 10.63 22 8.55 22 6V5h-3zm-14 3V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                </svg>
                <span>Досягнення</span>
              </Link>
            </li>

            {/* Активний пункт: ПРОФІЛЬ */}
            <li className="relative">
              <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#08bfea] rounded-r shadow-[0_0_10px_#08bfea]" />
              <Link
                href="/profile"
                className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[rgba(8,191,234,0.12)] border border-[rgba(8,191,234,0.35)] shadow-[0_0_15px_rgba(8,191,234,0.12)] transition-all ml-1.5"
              >
                <svg className="w-[18px] h-[18px] text-[#08bfea] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Профіль (Конфіг)</span>
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <Link
            href="/login"
            className="flex items-center gap-2.5 text-xs text-[#9aa9be] hover:text-white px-3 py-2 rounded-lg hover:bg-[rgba(13,21,34,0.6)] transition"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Безпека акаунта</span>
          </Link>
        </div>
      </aside>

      {/* 2. ГОЛОВНИЙ ВМІСТ СТОРІНКИ ПРОФІЛЮ */}
      <main className="md:ml-[240px] flex-1 px-4 sm:px-8 py-6 pb-20 relative z-10 max-w-[1350px] w-full">
        {/* Хедер швидкої навігації */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(65,140,190,0.22)] pb-4 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard"
              className="bg-[rgba(13,21,34,0.85)] border border-[rgba(65,140,190,0.22)] hover:border-[#08bfea] text-[#f1f5fa] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              ← До Дашборду
            </Link>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-bold text-[#08bfea]">Налаштування профілю</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Заголовок сторінки */}
        <div className="mb-8">
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight mb-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Профіль користувача {isWinter && <span className="text-sky-300">❄️</span>}
          </h1>
          <p
            className={`text-sm max-w-2xl ${
              isDark ? "text-[#9aa9be]" : "text-slate-600"
            }`}
          >
            Налаштуйте власне лого через URL-посилання, оберіть тему оформлення (включаючи нову Зимову Казку), 
            вкажіть статус та розкажіть про себе. Справа — живий попередній перегляд картки у стилі Discord!
          </p>
        </div>

        {/* ПОВІДОМЛЕННЯ ПРО ЗБЕРЕЖЕННЯ */}
        {isSavedNotice && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-fade-in">
            <span className="text-base">✓</span>
            <span>Профіль та тема успішно оновлені! Всі зміни синхронізовано по платформі.</span>
          </div>
        )}

        {/* СІТКА: ЛІВОРУЧ НАЛАШТУВАННЯ + ПРАВОРУЧ DISCORD-КАРТКА */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================================================================= */}
          {/* ЛІВА КОЛОНКА (7/12): ФОРМА КОНФІГУРАЦІЇ ПРОФІЛЮ                   */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 space-y-6">

            {/* БЛОК 0: ТЕМА ОФОРМЛЕННЯ ТА ЗИМОВИЙ ВАЙБ */}
            <section
              className={`backdrop-blur-md border rounded-2xl p-6 shadow-xl space-y-5 transition-colors ${
                isWinter
                  ? "bg-gradient-to-br from-[#0c233f]/90 to-[#071529]/95 border-sky-300/35 shadow-[0_0_25px_rgba(56,189,248,0.18)]"
                  : isDark
                    ? "bg-gradient-to-br from-[#101a29]/90 to-[#0d1522]/90 border-[rgba(65,140,190,0.25)]"
                    : "bg-white/95 border-slate-200 shadow-md"
              }`}
            >
              <div className="flex items-center justify-between border-b border-[rgba(65,140,190,0.2)] pb-3">
                <h2
                  className={`text-sm font-black uppercase flex items-center gap-2 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  <span className="text-[#08bfea]">✨</span> Тема оформлення та Зимовий Вайб
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
                  ❄️ Winter Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Темна тема */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme("dark")}
                  className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    theme === "dark"
                      ? "border-[#08bfea] bg-[rgba(8,191,234,0.14)] shadow-[0_0_15px_rgba(8,191,234,0.25)]"
                      : isDark
                        ? "border-white/10 bg-[#070b14]/70 hover:border-white/30"
                        : "border-slate-200 bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">🌙</span>
                    {theme === "dark" && (
                      <span className="text-[10px] font-black text-[#08bfea]">✓ АКТИВНА</span>
                    )}
                  </div>
                  <div>
                    <div className={`text-xs font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                      Кібер-Ніч
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Класична неонова тема
                    </div>
                  </div>
                </button>

                {/* Світла тема */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme("light")}
                  className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    theme === "light"
                      ? "border-rose-400 bg-rose-500/15 shadow-[0_0_15px_rgba(244,114,133,0.25)]"
                      : isDark
                        ? "border-white/10 bg-[#070b14]/70 hover:border-white/30"
                        : "border-slate-200 bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">☀️</span>
                    {theme === "light" && (
                      <span className="text-[10px] font-black text-rose-500">✓ АКТИВНА</span>
                    )}
                  </div>
                  <div>
                    <div className={`text-xs font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                      Денне Світло
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Чистий світлий інтерфейс
                    </div>
                  </div>
                </button>

                {/* Зимова тема */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme("winter")}
                  className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all cursor-pointer overflow-hidden ${
                    theme === "winter"
                      ? "border-sky-300 bg-gradient-to-br from-sky-500/25 to-blue-600/20 shadow-[0_0_20px_rgba(56,189,248,0.35)]"
                      : isDark
                        ? "border-sky-400/25 bg-[#071324]/80 hover:border-sky-300/60"
                        : "border-sky-200 bg-sky-50 hover:border-sky-400"
                  }`}
                >
                  <span className="absolute -top-1 -right-1 px-2 py-0.5 text-[9px] font-black uppercase bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 rounded-bl-lg">
                    NEW ❄️
                  </span>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">🎄</span>
                    {theme === "winter" && (
                      <span className="text-[10px] font-black text-sky-300">✓ АКТИВНА</span>
                    )}
                  </div>
                  <div>
                    <div className={`text-xs font-black ${isDark ? "text-sky-100" : "text-slate-900"}`}>
                      Зимова Казка
                    </div>
                    <div className="text-[11px] text-sky-300/80">
                      Сніг, вогники та Let It Snow
                    </div>
                  </div>
                </button>
              </div>

              {/* Тонке налаштування зимової атмосфери */}
              <div
                className={`rounded-xl p-4 border space-y-3 transition-all ${
                  isWinter
                    ? "bg-[#05101f]/80 border-sky-300/30"
                    : isDark
                      ? "bg-[#070b14]/60 border-white/10 opacity-75"
                      : "bg-slate-50 border-slate-200 opacity-85"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${isDark ? "text-sky-200" : "text-slate-700"}`}>
                    ⚙️ Ефекти Зимового Вайбу {theme !== "winter" && "(увімкніть Зимову тему для активації)"}
                  </span>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-300/40 px-2.5 py-1 text-[11px] font-bold text-sky-200 transition"
                  >
                    <span>🎄 Відкрити Зимовий Лендінг →</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => saveWinterPrefs({ snowEnabled: !winterPrefs.snowEnabled })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      winterPrefs.snowEnabled
                        ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
                        : isDark
                          ? "border-white/10 bg-white/5 text-slate-400"
                          : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    <span>❄️ Снігопад</span>
                    <span>{winterPrefs.snowEnabled ? "УВІМК" : "ВИМК"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveWinterPrefs({ musicEnabled: !winterPrefs.musicEnabled })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      winterPrefs.musicEnabled
                        ? "border-amber-400/50 bg-amber-500/15 text-amber-300"
                        : isDark
                          ? "border-white/10 bg-white/5 text-slate-400"
                          : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    <span>🎵 Let It Snow</span>
                    <span>{winterPrefs.musicEnabled ? "ГРАЄ" : "ТИША"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveWinterPrefs({ avatarDecor: !winterPrefs.avatarDecor })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      winterPrefs.avatarDecor
                        ? "border-rose-400/50 bg-rose-500/15 text-rose-200"
                        : isDark
                          ? "border-white/10 bg-white/5 text-slate-400"
                          : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    <span>🎅 Ковпак Санти</span>
                    <span>{winterPrefs.avatarDecor ? "УВІМК" : "ВИМК"}</span>
                  </button>
                </div>
              </div>
            </section>
            
            {/* БЛОК 1: АВАТАРКА / ЛОГОТИП */}
            <section
              className={`backdrop-blur-md border rounded-2xl p-6 shadow-xl space-y-5 transition-colors ${
                isWinter
                  ? "bg-gradient-to-br from-[#0c233f]/90 to-[#071529]/95 border-sky-300/30"
                  : isDark
                    ? "bg-gradient-to-br from-[#101a29]/90 to-[#0d1522]/90 border-[rgba(65,140,190,0.25)]"
                    : "bg-white/95 border-slate-200 shadow-md"
              }`}
            >
              <div className="flex items-center justify-between border-b border-[rgba(65,140,190,0.2)] pb-3">
                <h2
                  className={`text-sm font-black uppercase flex items-center gap-2 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  <span className="text-[#08bfea]">🖼️</span> Аватарка / Логотип користувача
                </h2>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold hover:underline cursor-pointer"
                  >
                    Скинути на Matrix-аватар
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Посилання на зображення (URL аватарки):
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png (або оберіть пресет нижче)"
                    className="w-full bg-[#070b14] border border-[rgba(65,140,190,0.3)] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#08bfea] focus:ring-1 focus:ring-[#08bfea] transition font-mono"
                  />
                  {avatarUrl && (
                    <span className="absolute right-3 top-2.5 text-xs text-emerald-400 font-bold">
                      ✓ активне
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Підтримуються прямі посилання на PNG, JPG, WebP або GIF (наприклад з Discord, Imgur, Pinterest, GitHub тощо).
                </p>
              </div>

              {/* Швидкі пресети аватарів */}
              <div>
                <span className="block text-xs font-bold text-slate-300 mb-2">
                  Швидкий вибір із пресетів:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        avatarUrl === preset.url
                          ? "border-[#08bfea] bg-[rgba(8,191,234,0.18)] shadow-[0_0_12px_rgba(8,191,234,0.3)]"
                          : "border-[rgba(65,140,190,0.2)] bg-[#070b14]/70 hover:border-slate-400 hover:bg-[#070b14]"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                      />
                      <span className="text-[10px] font-bold text-slate-200 line-clamp-1">
                        {preset.badge} {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* БЛОК 2: БАНЕР ТА ВІДОБРАЖЕННЯ */}
            <section
              className={`backdrop-blur-md border rounded-2xl p-6 shadow-xl space-y-5 transition-colors ${
                isWinter
                  ? "bg-gradient-to-br from-[#0c233f]/90 to-[#071529]/95 border-sky-300/30"
                  : isDark
                    ? "bg-gradient-to-br from-[#101a29]/90 to-[#0d1522]/90 border-[rgba(65,140,190,0.25)]"
                    : "bg-white/95 border-slate-200 shadow-md"
              }`}
            >
              <h2
                className={`text-sm font-black uppercase flex items-center gap-2 border-b border-[rgba(65,140,190,0.2)] pb-3 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                <span className="text-amber-400">🎨</span> Банер та статус
              </h2>

              {/* Банер */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Пресет або URL банера профілю:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  {BANNER_PRESETS.map((bp) => (
                    <button
                      key={bp.name}
                      type="button"
                      onClick={() => {
                        setBannerStyle(bp.style);
                        setBannerUrl("");
                      }}
                      className={`h-11 rounded-xl border text-xs font-bold transition-all p-1 flex items-center justify-center text-center cursor-pointer ${
                        bannerStyle === bp.style && !bannerUrl
                          ? "border-[#08bfea] ring-2 ring-[#08bfea]/40 scale-105"
                          : "border-white/10 opacity-80 hover:opacity-100"
                      }`}
                      style={{ background: bp.style }}
                    >
                      <span className="text-white drop-shadow text-[11px]">{bp.name}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="Або вставте своє посилання на картинку банера (URL)..."
                  className="w-full bg-[#070b14] border border-[rgba(65,140,190,0.3)] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#08bfea] transition font-mono"
                />
              </div>

              {/* Нікнейм */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Відображуване ім&apos;я (Нікнейм):
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full bg-[#070b14] border border-[rgba(65,140,190,0.3)] rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#08bfea] transition"
                />
              </div>

              {/* Кастомний статус */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Кастомний статус гравця:
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="Вкажіть свій статус (напр. '⚽ Вболіваю за Барсу')"
                  maxLength={60}
                  className="w-full bg-[#070b14] border border-[rgba(65,140,190,0.3)] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#08bfea] transition"
                />
              </div>

              {/* ПРО СЕБЕ (BIO) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Про себе (Опис вашого профілю):
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {bio.length} / 250 символів
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 250))}
                  placeholder="Розкажіть трохи про себе, ваші улюблені футбольні клуби, тактику прогнозів чи досягнення..."
                  className="w-full bg-[#070b14] border border-[rgba(65,140,190,0.3)] rounded-xl p-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-[#08bfea] transition resize-none"
                />
              </div>

              {/* Кнопка збереження */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="w-full sm:w-auto min-h-[44px] px-8 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(8,191,234,0.35)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #08bfea 0%, #0284c7 100%)",
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Зберегти зміни профілю</span>
                </button>
              </div>
            </section>
          </div>

          {/* ================================================================= */}
          {/* ПРАВА КОЛОНКА (5/12): ЖИВА DISCORD-КАРТКА ПРОФІЛЮ ("ЯК В ДС")     */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 sticky top-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#5865F2] animate-pulse" />
                Попередній перегляд (як в Discord)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Live Preview</span>
            </div>

            {/* ОСНОВНИЙ DISCORD-КОНТЕЙНЕР КАРТКИ */}
            <div
              className="w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border"
              style={{
                background: isDark ? "#232428" : "#ffffff",
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                boxShadow: isDark
                  ? "0 20px 40px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(88, 101, 242, 0.3)"
                  : "0 15px 35px rgba(0, 0, 0, 0.12), 0 0 1px 1px rgba(88, 101, 242, 0.2)",
              }}
            >
              {/* 1. ВЕРХНІЙ БАНЕР ПРОФІЛЮ */}
              <div
                className="relative h-28 sm:h-32 w-full transition-all overflow-hidden"
                style={{
                  background: bannerUrl ? `url(${bannerUrl}) center/cover no-repeat` : bannerStyle,
                }}
              >
                {/* Бейджі у верхньому правому кутку банера */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span
                    className="flex items-center gap-1 bg-[#111214]/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-black text-amber-300 border border-amber-400/30 shadow"
                    title="Засновник Matchday"
                  >
                    🏆 PRO
                  </span>
                  <span
                    className="flex items-center gap-1 bg-[#111214]/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-black text-[#5865F2] border border-[#5865F2]/40 shadow"
                    title="Влучний аналітик"
                  >
                    ⚡ VIP
                  </span>
                </div>
              </div>

              {/* 2. ТІЛО КАРТКИ: АВАТАРКА З DISCORD-СТАТУСОМ + ІНФОРМАЦІЯ */}
              <div className="relative px-5 pt-0 pb-6">
                
                {/* Аватарка (напливає на банер як в Discord) */}
                <div className="flex justify-between items-end -mt-12 mb-3">
                  <div className="relative">
                    {/* Новорічна шапка Санти поверх аватарки */}
                    {isWinter && winterPrefs.avatarDecor && (
                      <div
                        className="absolute -top-5 -left-2 z-20 pointer-events-none select-none text-3xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] -rotate-12"
                        title="Новорічний ковпак Санти"
                      >
                        🎅
                      </div>
                    )}

                    {/* Кругла підкладка під аватаркою з товстим бордером */}
                    <div
                      className={`w-[84px] h-[84px] rounded-full p-[5px] transition-all ${
                        isWinter && winterPrefs.avatarDecor
                          ? "ring-2 ring-sky-300/70 shadow-[0_0_18px_rgba(56,189,248,0.5)]"
                          : ""
                      }`}
                      style={{
                        background: isWinter
                          ? "#0c1d33"
                          : isDark
                            ? "#232428"
                            : "#ffffff",
                      }}
                    >
                      <div className="relative w-full h-full rounded-full overflow-hidden">
                        <MatrixAvatar
                          theme={theme}
                          size={74}
                          src={avatarUrl || null}
                          initial={username.charAt(0).toUpperCase()}
                        />
                      </div>
                    </div>

                    {/* Зелений Discord онлайн-індикатор */}
                    <div
                      className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: isWinter
                          ? "#0c1d33"
                          : isDark
                            ? "#232428"
                            : "#ffffff",
                      }}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-[#23a55a] shadow-[0_0_8px_#23a55a]" />
                    </div>
                  </div>

                  {/* Кнопка на картці */}
                  <div className="pb-1">
                    <span className="text-[11px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                      {isWinter ? "❄️ Зимовий Гравець" : "⚽ Matchday Гравець"}
                    </span>
                  </div>
                </div>

                {/* Блок імені та тегу */}
                <div
                  className="rounded-xl p-3.5 mb-3 transition-colors"
                  style={{ background: isDark ? "#111214" : "#f2f3f5" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className="text-lg font-black tracking-tight"
                        style={{ color: isDark ? "#ffffff" : "#060607" }}
                      >
                        {username || "Максим"}
                      </h3>
                      <button
                        type="button"
                        onClick={handleCopyTag}
                        className="text-xs font-mono text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                        title="Скопіювати тег"
                      >
                        <span>@{username.toLowerCase().replace(/\s+/g, "")}#2026</span>
                        <span className="text-[10px] text-[#08bfea]">
                          {isCopied ? "✓ скопійовано" : "📋"}
                        </span>
                      </button>
                    </div>

                    {/* Рівень */}
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                        РІВЕНЬ
                      </span>
                      <span className="text-sm font-black text-[#08bfea] font-mono">
                        {level} LVL
                      </span>
                    </div>
                  </div>

                  {/* Кастомний статус */}
                  {customStatus && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-slate-300">
                      <span className="truncate">{customStatus}</span>
                    </div>
                  )}
                </div>

                {/* РОЗДІЛ: ПРО СЕБЕ (ABOUT ME) */}
                <div
                  className="rounded-xl p-3.5 mb-3 transition-colors"
                  style={{ background: isDark ? "#111214" : "#f2f3f5" }}
                >
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    ПРО СЕБЕ
                  </h4>
                  <p
                    className="text-xs leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: isDark ? "#dbdee1" : "#2e3338" }}
                  >
                    {bio || "Користувач ще не додав опис про себе."}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Учасник з 20 жовтня 2026
                    </span>
                    <span className="text-emerald-400 font-bold">Онлайн</span>
                  </div>
                </div>

                {/* РОЗДІЛ: ІГРОВІ ПОКАЗНИКИ MATCHDAY */}
                <div
                  className="rounded-xl p-3.5 transition-colors"
                  style={{ background: isDark ? "#111214" : "#f2f3f5" }}
                >
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                    ІГРОВІ РЕЙТИНГИ MATCHDAY
                  </h4>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <span className="text-[10px] text-slate-400 block font-bold">МОНЕТИ</span>
                      <span className="text-xs font-black text-amber-400 font-mono">
                        🪙 {(coins / 1000000).toFixed(2)}M
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <span className="text-[10px] text-slate-400 block font-bold">ВЛУЧНІСТЬ</span>
                      <span className="text-xs font-black text-[#08bfea] font-mono">
                        12 точних
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <span className="text-[10px] text-slate-400 block font-bold">РЕЙТИНГ</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        #1 Топ
                      </span>
                    </div>
                  </div>

                  {/* Прогрес XP */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-bold mb-1 text-slate-400">
                      <span>Досвід (XP)</span>
                      <span className="text-[#08bfea] font-mono">{xp} / 100 XP</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#08bfea] to-[#5865F2] rounded-full"
                        style={{ width: `${(xp / 100) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <p className="text-[11px] text-center text-slate-500">
              💡 Підказка: Ви можете натиснути на аватарку всередині Discord-картки, щоб побачити Matrix-анімацію переходу!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
