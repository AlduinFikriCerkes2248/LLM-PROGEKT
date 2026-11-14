"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import AchievementBadge, { AchievementRarity } from "@/components/achievement-badge";
import {
  AchievementItem,
  AchievementCategory,
  loadAchievementsState,
  saveAchievementsState,
} from "@/lib/achievements-data";
import { getSupabaseClient, PROFILE_UPDATED_EVENT } from "@/lib/supabase/client";
import { triggerSteamAchievement } from "@/components/steam-achievement-notification";
import {
  PROMO_EASTER_EGGS,
  PromoEasterEgg,
  loadRedeemedPromos,
  saveRedeemedPromos,
  findPromoEasterEgg,
} from "@/lib/promocodes-data";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [activeRarity, setActiveRarity] = useState<"all" | AchievementRarity>("all");
  const [activeCategory, setActiveCategory] = useState<AchievementCategory>("all");
  const [balance, setBalance] = useState<number | null>(null);
  const [hohlyantsi, setHohlyantsi] = useState<number | null>(null);
  const [claimedModal, setClaimedModal] = useState<AchievementItem | null>(null);

  // Стан для розділу промокодів та великодок
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [redeemedPromos, setRedeemedPromos] = useState<string[]>([]);
  const [promoFeedback, setPromoFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [activeEasterEgg, setActiveEasterEgg] = useState<PromoEasterEgg | null>(null);

  // 1. Завантаження балансу та стану досягнень
  useEffect(() => {
    const list = loadAchievementsState();
    setAchievements(list);
    setRedeemedPromos(loadRedeemedPromos());

    async function loadBalances() {
      const client = getSupabaseClient();
      if (!client) {
        // Fallback з локальних даних
        try {
          const c = localStorage.getItem("matchday:coins");
          if (c) setBalance(parseInt(c, 10));
          const h = localStorage.getItem("matchday:hohlyantsi");
          if (h) setHohlyantsi(parseInt(h, 10));
        } catch {
          // ignore
        }
        return;
      }

      const { data: authData } = await client.auth.getUser();
      if (authData?.user) {
        const { data } = await client
          .from("profiles")
          .select("coins, hohlyantsi")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (data) {
          if (typeof data.coins === "number") setBalance(data.coins);
          if (typeof data.hohlyantsi === "number") setHohlyantsi(data.hohlyantsi);
        }
      }
    }

    void loadBalances();

    const handleProfileUpdate = () => {
      void loadBalances();
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    const handleAchievementsUpdate = () => {
      setAchievements(loadAchievementsState());
    };
    window.addEventListener("matchday:achievements_updated", handleAchievementsUpdate);
    window.addEventListener("storage", handleAchievementsUpdate);

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.removeEventListener("matchday:achievements_updated", handleAchievementsUpdate);
      window.removeEventListener("storage", handleAchievementsUpdate);
    };
  }, []);

  // 2. Фільтрація досягнень
  const filteredAchievements = useMemo(() => {
    return achievements.filter((item) => {
      const matchesRarity = activeRarity === "all" || item.rarity === activeRarity;
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      return matchesRarity && matchesCategory;
    });
  }, [achievements, activeRarity, activeCategory]);

  // 3. Загальна статистика
  const totalCompleted = achievements.filter((a) => a.completed).length;
  const totalCount = achievements.length;
  const progressPercent = Math.round((totalCompleted / (totalCount || 1)) * 100);

  // 4. Отримання нагороди за досягнення
  const handleClaim = async (item: AchievementItem) => {
    if (!item.completed || item.claimed) return;

    // Оновлюємо стан досягнення
    const updated = achievements.map((a) =>
      a.id === item.id ? { ...a, claimed: true } : a
    );
    setAchievements(updated);
    saveAchievementsState(updated);

    // Нараховуємо монети та бонуси
    const addedCoins = item.reward.coins;
    const addedBonuses = item.reward.bonuses;

    const newCoins = (balance ?? 1088233) + addedCoins;
    const newBonuses = (hohlyantsi ?? 45) + addedBonuses;

    setBalance(newCoins);
    setHohlyantsi(newBonuses);

    // Зберігаємо локально
    try {
      localStorage.setItem("matchday:coins", newCoins.toString());
      localStorage.setItem("matchday:hohlyantsi", newBonuses.toString());
      const curXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
      localStorage.setItem("matchday:bj_xp", (curXp + item.reward.xp).toString());
    } catch {
      // ignore
    }

    // Оновлюємо Supabase якщо є сесія
    const client = getSupabaseClient();
    if (client) {
      const { data: authData } = await client.auth.getUser();
      if (authData?.user) {
        await client
          .from("profiles")
          .update({
            coins: newCoins,
            hohlyantsi: newBonuses,
          })
          .eq("id", authData.user.id);
      }
    }

    // Запускаємо спливаюче повідомлення у стилі Steam із фірмовим звуком!
    triggerSteamAchievement({
      id: item.id,
      title: item.title,
      desc: item.desc,
      rarity: item.rarity,
      iconType: item.iconType,
      coins: item.reward.coins,
      bonuses: item.reward.bonuses,
      xp: item.reward.xp,
      soundType: item.id === "great_marchenko" ? "marchenko" : "default",
    });

    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    setClaimedModal(item);
  };

  const testMarchenkoSound = () => {
    triggerSteamAchievement({
      id: "great_marchenko",
      title: "Овеликий Марченко",
      desc: "Поставити як гравця в змаганнях 5 разів!",
      rarity: "epic",
      iconType: "marchenko",
      coins: 50000,
      bonuses: 100,
      xp: 800,
      soundType: "marchenko",
    });
  };

  const testStandardSound = () => {
    triggerSteamAchievement({
      id: "lucky_loss_200k",
      title: "Везунчик По Полній",
      desc: "Проєбати +200 000 валюти в азартних іграх",
      rarity: "mythic",
      iconType: "skull-loss",
      coins: 200000,
      bonuses: 300,
      xp: 2000,
      soundType: "default",
    });
  };

  const handleActivatePromo = async (codeToActivate?: string) => {
    const code = (codeToActivate || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setPromoFeedback({ type: "error", text: "Будь ласка, введіть промокод або назву пасхалки!" });
      return;
    }

    const egg = findPromoEasterEgg(code);
    if (!egg) {
      setPromoFeedback({
        type: "error",
        text: `❌ Промокод «${code}» не знайдено! Спробуйте одну з підказок нижче.`,
      });
      return;
    }

    const alreadyClaimed = redeemedPromos.includes(egg.code);
    if (alreadyClaimed) {
      setPromoFeedback({
        type: "info",
        text: `ℹ️ Пасхалку «${egg.code}» вже було активовано раніше! Відкриваємо анімацію...`,
      });
      setActiveEasterEgg(egg);
      return;
    }

    // Додаємо до списку активованих
    const updatedRedeemed = [...redeemedPromos, egg.code];
    setRedeemedPromos(updatedRedeemed);
    saveRedeemedPromos(updatedRedeemed);

    // Нараховуємо монети та бонуси
    const addedCoins = egg.reward.coins;
    const addedBonuses = egg.reward.bonuses;
    const newCoins = (balance ?? 1088233) + addedCoins;
    const newBonuses = (hohlyantsi ?? 45) + addedBonuses;

    setBalance(newCoins);
    setHohlyantsi(newBonuses);

    try {
      localStorage.setItem("matchday:coins", newCoins.toString());
      localStorage.setItem("matchday:hohlyantsi", newBonuses.toString());
      localStorage.setItem("matchday_coins", newCoins.toString());
      localStorage.setItem("matchday_hohlyantsi", newBonuses.toString());
      const curXp = parseInt(localStorage.getItem("matchday:bj_xp") || "0", 10);
      localStorage.setItem("matchday:bj_xp", (curXp + egg.reward.xp).toString());
    } catch {}

    const client = getSupabaseClient();
    if (client) {
      const { data: authData } = await client.auth.getUser();
      if (authData?.user) {
        await client
          .from("profiles")
          .update({
            coins: newCoins,
            hohlyantsi: newBonuses,
          })
          .eq("id", authData.user.id);
      }
    }

    // Відтворюємо фірмовий звук пасхалки
    try {
      const audioPath =
        egg.soundType === "marchenko"
          ? "/sounds/marchenko_achievement.mp3"
          : "/sounds/steam_achievement.mp3";
      const audio = new Audio(audioPath);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch {}

    // Викликаємо Steam Toast
    triggerSteamAchievement({
      id: "promo_" + egg.code.toLowerCase(),
      title: egg.name,
      desc: `Активовано пасхалку «${egg.code}»!`,
      rarity: "legendary",
      iconType: egg.soundType === "marchenko" ? "marchenko" : "crate",
      coins: egg.reward.coins,
      bonuses: egg.reward.bonuses,
      xp: egg.reward.xp,
      soundType: egg.soundType === "marchenko" ? "marchenko" : "default",
    });

    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

    // Відкриваємо модалку святкування з GIF
    setActiveEasterEgg(egg);
    setPromoFeedback({
      type: "success",
      text: `🎉 ПАСХАЛКУ РОЗБЛОКОВАНО! Отримано +${egg.reward.coins.toLocaleString()} монет та подарунки!`,
    });
    setPromoCodeInput("");
  };

  const formattedBalance = balance !== null ? balance.toLocaleString() : "1,088,233";
  const formattedBonuses = hohlyantsi !== null ? hohlyantsi.toLocaleString() : "45";

  return (
    <main className="min-h-screen flex-1 bg-transparent px-4 py-6 font-sans text-slate-100 sm:px-8 sm:py-10 relative overflow-hidden select-none">
      {/* М'яке фонове світіння */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-gradient-to-b from-[#f59e0b]/15 via-[#08bfea]/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute bottom-[-60px] right-[-40px] w-[400px] h-[400px] bg-[#f43f5e]/15 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Navigation Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#162544]/80 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3.5 bg-[#08bfea] rounded-full group-hover:h-4 transition-all" />
                <span className="w-1 h-4.5 bg-[#08bfea] rounded-full group-hover:h-5 transition-all" />
                <span className="w-1 h-3.5 bg-[#08bfea] rounded-full group-hover:h-4 transition-all" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-[0.16em] text-white uppercase ml-1">
                MATCHDAY
              </span>
            </Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#f59e0b]">ДОСЯГНЕННЯ ТА ТИТУЛИ</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#08bfea]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Головна
            </Link>
            <Link
              href="/leagues"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#08bfea]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Ліги
            </Link>
            <Link
              href="/cases"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#08bfea]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Кейси
            </Link>
            <Link
              href="/online"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#08bfea]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Онлайн PvP
            </Link>
            <Link
              href="/profile"
              className="rounded-xl border border-[#162544] bg-[#0A1430] hover:border-[#08bfea]/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition"
            >
              Профіль
            </Link>

            {/* Баланс монет та бонусів */}
            <div className="flex items-center gap-2 rounded-xl bg-[#060A17] border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
              <span>🪙 {formattedBalance}</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300">{formattedBonuses} Б</span>
            </div>
          </div>
        </div>

        {/* Hero Header & Progress Overview */}
        <header className="mb-8 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#0d1624] to-[#070b14] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-tl from-amber-500/10 to-transparent rounded-full pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/30 px-3 py-0.5 text-xs text-amber-300 font-bold mb-3">
                <span>🏆</span> СИСТЕМА ДОСЯГНЕНЬ ТА НАГОРОД
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                ЗАЛА СЛАВИ <span className="text-[#f59e0b]">MATCHDAY</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Виконуйте завдання у прогнозах, міні-іграх та PvP дуелях. Отримуйте сотні тисяч монет, рідкісні бонуси та ексклюзивні титули!
              </p>

              {/* Кнопки тестування спливаючих сповіщень у стилі Steam */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={testMarchenkoSound}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span>👑</span>
                  <span>Тест Steam: Марченко (Мяу)</span>
                </button>
                <button
                  type="button"
                  onClick={testStandardSound}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 active:scale-95"
                >
                  <span>🔔</span>
                  <span>Тест Steam: Дзвін</span>
                </button>
              </div>
            </div>

            {/* Карточка загального прогресу */}
            <div className="shrink-0 bg-black/60 border border-slate-700/60 rounded-xl p-5 min-w-[280px] shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-400">Загальний прогрес:</span>
                <span className="text-amber-400 font-mono text-sm">{totalCompleted} / {totalCount} ({progressPercent}%)</span>
              </div>
              {/* Прогрес-бар */}
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700 overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Статус агента:</span>
                <span className="text-white font-extrabold font-mono">
                  {progressPercent >= 70 ? "ЕЛІТНИЙ МАЙСТЕР" : progressPercent >= 30 ? "ДОСВІДЧЕНИЙ" : "НОВАЧОК"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 1. Фільтр за Рідкістю (Rarity Tabs) */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Рідкість:</span>

          <button
            onClick={() => setActiveRarity("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeRarity === "all"
                ? "bg-white text-black shadow-md"
                : "bg-[#0d1624] text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            Усі ({achievements.length})
          </button>

          <button
            onClick={() => setActiveRarity("common")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeRarity === "common"
                ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-700/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Звичайні (5)
          </button>

          <button
            onClick={() => setActiveRarity("rare")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeRarity === "rare"
                ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(8,191,234,0.5)]"
                : "bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40 border border-cyan-700/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Рідкісні (5)
          </button>

          <button
            onClick={() => setActiveRarity("epic")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeRarity === "epic"
                ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                : "bg-purple-950/40 text-purple-300 hover:bg-purple-900/40 border border-purple-700/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Епічні (5)
          </button>

          <button
            onClick={() => setActiveRarity("mythic")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeRarity === "mythic"
                ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                : "bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border border-rose-700/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Міфічні (3)
          </button>

          <button
            onClick={() => setActiveRarity("legendary")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeRarity === "legendary"
                ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                : "bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 border border-amber-600/60"
            }`}
          >
            <span>👑</span>
            Легендарні (3)
          </button>
        </div>

        {/* 2. Фільтр за категорією */}
        <div className="mb-8 flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "Всі категорії" },
            { id: "predictions", label: "⚽ Прогнози" },
            { id: "casino", label: "🎰 Азартні ігри" },
            { id: "pvp", label: "⚔️ Онлайн PvP" },
            { id: "cases", label: "📦 Кейси" },
            { id: "secret", label: "🕶️ Секретні" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as AchievementCategory)}
              className={`px-3 py-1 rounded-lg transition ${
                activeCategory === cat.id
                  ? "bg-[#182338] text-cyan-300 font-bold border border-cyan-500/40"
                  : "bg-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 3. Список карток досягнень */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredAchievements.map((item) => {
            const isCompleted = item.completed;
            const isClaimed = item.claimed;
            const currentVal = Math.min(item.current, item.target);
            const itemPercent = Math.min(100, Math.round((currentVal / item.target) * 100));

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 p-5 transition-all duration-300 ${
                  item.rarity === "legendary"
                    ? "bg-gradient-to-b from-amber-950/50 via-[#120d06] to-[#070b14] border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400 hover:-translate-y-1.5"
                    : item.rarity === "mythic"
                    ? "bg-gradient-to-b from-rose-950/50 via-[#15070a] to-[#070b14] border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:border-rose-400 hover:-translate-y-1.5"
                    : item.rarity === "epic"
                    ? "bg-gradient-to-b from-purple-950/40 via-[#10081c] to-[#070b14] border-purple-500/40 hover:border-purple-400 hover:-translate-y-1"
                    : item.rarity === "rare"
                    ? "bg-gradient-to-b from-cyan-950/40 via-[#0a1420] to-[#070b14] border-cyan-500/40 hover:border-cyan-400 hover:-translate-y-1"
                    : "bg-gradient-to-b from-emerald-950/30 via-[#0a1618] to-[#070b14] border-emerald-500/30 hover:border-emerald-400 hover:-translate-y-1"
                }`}
              >
                <div>
                  {/* Шапка картки: Бейдж та Рідкість */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <AchievementBadge
                      rarity={item.rarity}
                      iconType={item.iconType}
                      size={54}
                      completed={isCompleted}
                    />
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          item.rarity === "legendary"
                            ? "bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                            : item.rarity === "mythic"
                            ? "bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                            : item.rarity === "epic"
                            ? "bg-purple-950/80 text-purple-300 border-purple-500/60"
                            : item.rarity === "rare"
                            ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/60"
                            : "bg-emerald-950/80 text-emerald-300 border-emerald-500/60"
                        }`}
                      >
                        {item.rarity === "legendary"
                          ? "👑 Легендарне"
                          : item.rarity === "mythic"
                          ? "🔥 Міфічне"
                          : item.rarity === "epic"
                          ? "⚡ Епічне"
                          : item.rarity === "rare"
                          ? "Рідкісне"
                          : "Звичайне"}
                      </span>
                      {item.reward.title && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-600/30">
                          Титул: {item.reward.title}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Заголовок і опис */}
                  <h3 className="text-base font-black text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {item.desc}
                  </p>

                  {/* Прогрес виконання */}
                  <div className="mt-4 rounded-xl bg-black/50 border border-slate-800 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-slate-400">Прогрес:</span>
                      <span className="font-bold text-white">
                        {currentVal.toLocaleString()} / {item.target.toLocaleString()} ({itemPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.rarity === "legendary"
                            ? "bg-amber-400"
                            : item.rarity === "mythic"
                            ? "bg-rose-500"
                            : item.rarity === "epic"
                            ? "bg-purple-400"
                            : item.rarity === "rare"
                            ? "bg-cyan-400"
                            : "bg-emerald-400"
                        }`}
                        style={{ width: `${itemPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Винагорода */}
                  <div className="mt-3 flex items-center justify-between text-xs font-mono font-bold bg-[#070b14]/80 border border-slate-800/80 px-3 py-1.5 rounded-lg">
                    <span className="text-slate-400">Нагорода:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-300">+{item.reward.coins.toLocaleString()} 🪙</span>
                      {item.reward.bonuses > 0 && (
                        <span className="text-cyan-300">+{item.reward.bonuses} Б</span>
                      )}
                      <span className="text-emerald-400">+{item.reward.xp} XP</span>
                    </div>
                  </div>
                </div>

                {/* Кнопка дії */}
                <div className="mt-5">
                  {isClaimed ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-default"
                    >
                      <span>✓</span> Нагороду отримано
                    </button>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaim(item)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-95 text-black text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] transition animate-pulse"
                    >
                      ✨ Забрати нагороду!
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    >
                      В процесі виконання
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 6. РОЗДІЛ: СЕКРЕТНІ ПРОМОКОДИ ТА ВЕЛИКОДКИ (EASTER EGGS)                  */}
        {/* ========================================================================= */}
        <div className="mt-14 rounded-3xl border border-[rgba(8,191,234,0.3)] bg-gradient-to-br from-[#0c1422] via-[#09101c] to-[#070b14] p-6 sm:p-8 shadow-[0_12px_45px_rgba(0,0,0,0.7)] relative overflow-hidden">
          {/* Декоративні кутові відблиски */}
          <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-gradient-to-br from-[#08bfea]/10 via-[#f59e0b]/10 to-transparent blur-[70px] pointer-events-none" />

          {/* Заголовок розділу */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-transparent border border-amber-500/40 text-3xl shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                🎁
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    СЕКРЕТНИЙ РОЗДІЛ
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    5 унікальних великодок
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  Промокоди та Великодки <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">(Easter Eggs)</span>
                </h3>
              </div>
            </div>

            <div className="text-xs text-slate-400 max-w-sm">
              Вводьте секретні коди або шукайте пасхалки, щоб отримати <strong className="text-amber-300">подарунки</strong>, <strong className="text-cyan-300">анімовані GIF-меми</strong> та ексклюзивні звуки!
            </div>
          </div>

          {/* Форма введення промокоду */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleActivatePromo();
            }}
            className="flex flex-col sm:flex-row gap-3 max-w-2xl mb-6"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value)}
                placeholder="Введіть промокод (напр. MARCHENKO, GOYDA, MATRIX...)"
                className="w-full px-5 py-3.5 rounded-xl bg-[#070b14] border border-slate-700/80 text-white font-mono placeholder:font-sans placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#08bfea] focus:ring-2 focus:ring-[#08bfea]/25 transition shadow-inner uppercase tracking-wider"
              />
              {promoCodeInput && (
                <button
                  type="button"
                  onClick={() => setPromoCodeInput("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#08bfea] via-[#2cd5fb] to-[#0284c7] hover:brightness-110 active:scale-95 text-[#070b14] font-black uppercase text-xs tracking-wider shadow-[0_0_20px_rgba(8,191,234,0.4)] transition shrink-0 flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>Активувати</span>
            </button>
          </form>

          {/* Повідомлення зворотного зв'язку */}
          {promoFeedback && (
            <div
              className={`mb-6 p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition animate-in fade-in duration-200 ${
                promoFeedback.type === "success"
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : promoFeedback.type === "error"
                  ? "bg-rose-950/40 border-rose-500/50 text-rose-300"
                  : "bg-cyan-950/40 border-cyan-500/50 text-cyan-300"
              }`}
            >
              <span>{promoFeedback.type === "success" ? "✓" : promoFeedback.type === "error" ? "✕" : "ℹ"}</span>
              <span>{promoFeedback.text}</span>
            </div>
          )}

          {/* Швидкі підказки до великодок */}
          <div className="mb-6">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              💡 Секретні підказки (натисніть, щоб підставити код):
            </span>
            <div className="flex flex-wrap gap-2">
              {PROMO_EASTER_EGGS.map((egg) => {
                const isClaimed = redeemedPromos.includes(egg.code);
                return (
                  <button
                    key={egg.code}
                    type="button"
                    onClick={() => {
                      setPromoCodeInput(egg.code);
                      handleActivatePromo(egg.code);
                    }}
                    title={egg.secretHint}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                      isClaimed
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-amber-500/60 hover:text-amber-300 active:scale-95"
                    }`}
                  >
                    <span>{egg.badgeTag}</span>
                    {isClaimed ? (
                      <span className="text-[10px] text-emerald-400 font-sans font-bold">✓ Розкрито</span>
                    ) : (
                      <span className="text-[10px] text-amber-400/80 font-sans font-bold">? Підказка</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Вітрина відкритих пасхалок */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider">
                Розблоковані Великодки:
              </span>
              <span className="text-amber-400 font-mono font-bold">
                {redeemedPromos.length} / {PROMO_EASTER_EGGS.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROMO_EASTER_EGGS.map((egg) => {
                const isClaimed = redeemedPromos.includes(egg.code);
                return (
                  <div
                    key={egg.code}
                    onClick={() => {
                      if (isClaimed) setActiveEasterEgg(egg);
                    }}
                    className={`p-3.5 rounded-xl border transition flex items-center gap-3 select-none ${
                      isClaimed
                        ? "bg-[#0a121e] border-amber-500/40 cursor-pointer hover:border-amber-400 hover:scale-[1.02] shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
                        : "bg-slate-900/40 border-slate-800/80 opacity-60 cursor-default"
                    }`}
                  >
                    {/* Прев'ю ГІФКИ або замка */}
                    <div className="w-12 h-12 rounded-lg bg-black/60 border border-slate-700/60 shrink-0 overflow-hidden flex items-center justify-center">
                      {isClaimed ? (
                        <img
                          src={egg.gifUrl}
                          alt={egg.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-slate-600 text-lg">🔒</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-white truncate">
                          {isClaimed ? egg.name : "Секретна пасхалка"}
                        </h4>
                        {isClaimed && (
                          <span className="text-[9px] text-amber-400 font-bold ml-1">▶ GIF</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {isClaimed ? `+${egg.reward.coins.toLocaleString()} 🪙` : egg.secretHint}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Футер */}
        <p className="mt-12 text-center text-xs text-slate-600">
          Matchday Achievements System · Рівні складності та винагороди оновлюються автоматично · 2026
        </p>
      </div>

      {/* ========================================================================= */}
      {/* МОДАЛЬНЕ ВІКНО СВЯТКУВАННЯ ПАСХАЛКИ (GIF + ЗВУК + ПОДАРУНКИ)              */}
      {/* ========================================================================= */}
      {activeEasterEgg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full rounded-2xl border-2 border-amber-500 bg-gradient-to-b from-[#181105] via-[#0d121c] to-[#070b14] p-6 text-center shadow-[0_0_70px_rgba(245,158,11,0.5)] animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Світловий спалах зверху */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[120px] bg-amber-400/20 blur-[60px] pointer-events-none" />

            <div className="inline-block rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300 border-amber-500/60 bg-amber-500/10 mb-3">
              🎉 ВЕЛИКОДКУ РОЗБЛОКОВАНО! 🎁
            </div>

            {/* АНІМОВАНА ГІФКА */}
            <div className="relative mx-auto my-3 w-full h-[210px] rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.35)] bg-black">
              <img
                src={activeEasterEgg.gifUrl}
                alt={activeEasterEgg.name}
                className="w-full h-full object-cover"
              />
            </div>

            <h3 className="text-2xl font-black text-white mt-3">
              {activeEasterEgg.name}
            </h3>
            <p className="mt-1 text-xs text-slate-300 max-w-md mx-auto">
              {activeEasterEgg.desc}
            </p>

            {/* Блок з подарунками */}
            <div className="my-4 rounded-xl bg-black/70 border border-amber-500/40 p-4 space-y-1.5 font-mono shadow-inner">
              <div className="text-2xl font-black text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                +{activeEasterEgg.reward.coins.toLocaleString()} МОНЕТ 🪙
              </div>
              {activeEasterEgg.reward.bonuses > 0 && (
                <div className="text-sm font-bold text-cyan-300">
                  +{activeEasterEgg.reward.bonuses} БОНУСІВ 🔷
                </div>
              )}
              <div className="text-xs font-bold text-emerald-400">
                +{activeEasterEgg.reward.xp} XP ДОСВІДУ ⚡
              </div>
              {activeEasterEgg.reward.title && (
                <div className="pt-2 border-t border-slate-800 text-xs font-extrabold text-amber-400">
                  👑 {activeEasterEgg.reward.title}
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveEasterEgg(null)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition"
            >
              🎁 Забрати всі подарунки ✓
            </button>
          </div>
        </div>
      )}

      {/* Модальне вікно при успішному заборі винагороди */}
      {claimedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-md w-full rounded-2xl border-2 border-amber-500 bg-gradient-to-b from-[#1c1305] via-[#0d1017] to-black p-6 text-center shadow-[0_0_60px_rgba(245,158,11,0.4)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-3">
              <AchievementBadge
                rarity={claimedModal.rarity}
                iconType={claimedModal.iconType}
                size={84}
                completed
              />
            </div>
            <div className="inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border-amber-500/50 mb-2">
              НАГОРОДУ РОЗБЛОКОВАНО
            </div>
            <h3 className="text-2xl font-black text-white">
              «{claimedModal.title}»
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              {claimedModal.desc}
            </p>

            <div className="my-5 rounded-xl bg-black/60 border border-amber-500/40 p-4 space-y-1.5 font-mono">
              <div className="text-2xl font-black text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                +{claimedModal.reward.coins.toLocaleString()} МОНЕТ
              </div>
              {claimedModal.reward.bonuses > 0 && (
                <div className="text-sm font-bold text-cyan-300">
                  +{claimedModal.reward.bonuses} БОНУСІВ
                </div>
              )}
              <div className="text-xs font-bold text-emerald-400">
                +{claimedModal.reward.xp} XP ДОСВІДУ
              </div>
              {claimedModal.reward.title && (
                <div className="pt-2 border-t border-slate-800 text-xs font-extrabold text-amber-400">
                  👑 Новий титул: «{claimedModal.reward.title}»
                </div>
              )}
            </div>

            <button
              onClick={() => setClaimedModal(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition"
            >
              Чудово, дякую!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
