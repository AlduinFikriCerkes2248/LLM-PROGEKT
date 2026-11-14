"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/action-result";
import { askModel, modelConfigured } from "@/lib/ai/model";
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

    if (!modelConfigured()) {
      return {
        status: 503,
        message:
          "Ключ GEMINI_API_KEY не налаштовано в середовищі. Якщо тестуєте на Vercel — додайте GEMINI_API_KEY у Settings -> Environment Variables на vercel.com.",
      };
    }

    const match = await getMatch(matchId);
    if (!match) {
      return { status: 404, message: "Матч не знайдено." };
    }

    const systemPrompt =
      'Ти спортивний аналітик Matchday. Проаналізуй команди та поверни ТІЛЬКИ валідний JSON у форматі: {"summary": "короткий огляд", "predicted_home": 2, "predicted_away": 1}. Не додавай жодного іншого тексту.';
    const userPrompt = `Матч: ${match.team_home} проти ${match.team_away}. Час початку: ${match.match_time}. Тактичний фокус від користувача: ${
      tacticalFocus || "стандартний тактичний аналіз"
    }.`;

    const response = await askModel({
      system: systemPrompt,
      user: userPrompt,
    });

    let summary = "Аналіз команд завершено.";
    let predHome = 1;
    let predAway = 0;

    try {
      const parsed = JSON.parse(response.text);
      summary = String(parsed.summary ?? summary);
      predHome = Number(parsed.predicted_home ?? predHome);
      predAway = Number(parsed.predicted_away ?? predAway);
    } catch {
      summary = response.text.slice(0, 150);
    }

    const formattedVenue = `ШІ-прев'ю: ${summary} (Прогноз: ${predHome}:${predAway})`;

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
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 400, message: `Помилка: ${msg}` };
  }
}
