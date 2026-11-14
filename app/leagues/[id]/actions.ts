"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { askModel, modelConfigured } from "@/lib/ai/model";
import { db } from "@/lib/data/db/client";
import { getMatch } from "@/lib/data/db/matches";

export async function generateMatchPreviewAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const matchId = String(formData.get("match_id") ?? "");
    const tacticalFocus = String(formData.get("tactical_focus") ?? "").trim();

    if (!matchId) {
      return { status: 400, message: "Не вказано ідентифікатор матчу." };
    }

    if (!modelConfigured()) {
      return {
        status: 503,
        message:
          "Ключ GEMINI_API_KEY не налаштовано в середовищі. Якщо тестуєте на Vercel — додайте GEMINI_API_KEY у Settings -> Environment Variables на vercel.com, або перевіряйте локально в Codespace.",
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

    const parsed = JSON.parse(response.text);
    const summary = String(parsed.summary ?? "Аналіз завершено.");
    const predHome = Number(parsed.predicted_home ?? 0);
    const predAway = Number(parsed.predicted_away ?? 0);
    const formattedVenue = `ШІ-прев'ю: ${summary} (Прогноз рахунку: ${predHome}:${predAway})`;

    const { error } = await db()
      .from("matches")
      .update({ venue: formattedVenue })
      .eq("id", matchId);

    if (error) {
      return { status: 400, message: `Помилка збереження в базі: ${error.message}` };
    }

    revalidatePath(`/leagues/${match.league_id}`);
    return { status: 200, message: "ШІ-прев'ю успішно згенеровано й збережено!" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 400, message: `Помилка: ${msg}` };
  }
}
