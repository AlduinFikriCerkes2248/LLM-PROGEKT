import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "./client";

export async function recordAiCall(
  client: SupabaseClient,
  userId: string,
  cached = false
): Promise<void> {
  try {
    await client.from("ai_calls").insert({
      user_id: userId,
      cached,
    });
  } catch {
    // Не блокуємо роботу, якщо аудит тимчасово недоступний
  }
}

export async function getUserAiCallsCountPastHour(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await client
      .from("ai_calls")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getAppAiCallsCountToday(
  client: SupabaseClient
): Promise<number> {
  try {
    const { data, error } = await client.rpc("ai_app_calls_today");
    if (error) return 0;
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}
