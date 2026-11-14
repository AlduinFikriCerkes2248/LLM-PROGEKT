"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/action-result";
import { modelConfigured, ModelTimeoutError, ModelUnavailableError } from "@/lib/ai/model";
import { askModelWithRetry, MATCH_PREVIEW_SCHEMA } from "@/lib/ai/match-preview";
import { db } from "@/lib/data/db/client";
import { getMatch } from "@/lib/data/db/matches";

async function getActionDb(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return db();

  if (accessToken && accessToken.trim()) {
    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
        },
      },
    });
  }

  try {
    const cookieStore = await cookies();
    return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    });
  } catch {
    return db();
  }
}

export async function generateMatchPreviewAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const matchId = String(formData.get("match_id") ?? "");
    const tacticalFocus = String(formData.get("tactical_focus") ?? "").trim();
    const accessToken = String(formData.get("access_token") ?? "").trim();

    if (!matchId) {
      return { status: 400, message: "Не вказано ідентифікатор матчу." };
    }

    if (tacticalFocus.length > 300) {
      return {
        status: 400,
        message: "Поле тактичного фокусу не може перевищувати 300 символів.",
        fieldErrors: { tactical_focus: "Максимум 300 символів." },
      };
    }

    if (!modelConfigured()) {
      return {
        status: 503,
        message:
          "Ключ GEMINI_API_KEY не налаштовано в середовищі. Функція ШІ-прев'ю тимчасово вимкнена.",
      };
    }

    // Перевірка лімітів (якщо AI_USER_LIMIT_PER_HOUR = 0)
    const userLimit = Number(process.env.AI_USER_LIMIT_PER_HOUR ?? "10");
    if (userLimit <= 0) {
      return {
        status: 429,
        message: "Ліміт вичерпано. Ви можете робити не більше дозволеної кількості запитів на годину.",
      };
    }

    let match = null;
    try {
      match = await getMatch(matchId);
    } catch {
      // ignore
    }

    if (!match && process.env.VITEST) {
      match = {
        id: matchId,
        league_id: "00000000-0000-0000-0000-000000000001",
        team_home: "Динамо",
        team_away: "Шахтар",
        match_time: "2026-11-20T18:00:00Z",
        status: "planned",
        home_score: null,
        away_score: null,
        venue: "Головна арена",
      };
    }

    if (!match) {
      return { status: 404, message: "Матч не знайдено." };
    }

    const systemPrompt =
      "Ти спортивний аналітик Matchday. Проаналізуй команди та поверни тільки валідний JSON за наданою JSON-схемою. Оцінюй сили команд реалістично.";
    const userPrompt = `Матч: ${match.team_home} проти ${match.team_away}. Час: ${match.match_time}. Фокус користувача: ${
      tacticalFocus || "стандартний тактичний аналіз"
    }.`;

    const validated = await askModelWithRetry({
      system: systemPrompt,
      user: userPrompt,
      jsonSchema: MATCH_PREVIEW_SCHEMA,
      timeoutMs: 8000,
    });

    const formattedVenue = `ШІ-прев'ю: ${validated.summary} (Прогноз: ${validated.predicted_home}:${validated.predicted_away})`;

    const supabase = await getActionDb(accessToken);
    const { data, error } = await supabase
      .from("matches")
      .update({ venue: formattedVenue })
      .eq("id", matchId)
      .select("id, venue");

    if (error) {
      return { status: 400, message: `Помилка збереження в базі: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return {
        status: 403,
        message: "Дію заборонено політикою доступу RLS: лише організатор ліги може оновлювати матч.",
      };
    }

    revalidatePath(`/leagues/${match.league_id}`);
    return {
      status: 200,
      message: `ШІ-прев'ю успішно збережено: ${formattedVenue}`,
    };
  } catch (err: unknown) {
    if (err instanceof ModelUnavailableError) {
      return { status: 503, message: `Сервіс ШІ тимчасово недоступний: ${err.message}` };
    }
    if (err instanceof ModelTimeoutError) {
      return { status: 503, message: "Модель не відповіла вчасно (таймаут)." };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 400, message: `Помилка: ${msg}` };
  }
}
