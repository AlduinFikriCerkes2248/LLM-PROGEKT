import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAppAiCallsCountToday,
  getUserAiCallsCountPastHour,
} from "@/lib/data/db/ai-guard";

export type LimitCheckResult = {
  ok: boolean;
  message?: string;
};

export async function checkAiLimits(
  client: SupabaseClient,
  userId: string
): Promise<LimitCheckResult> {
  const userPerHourStr = process.env.AI_USER_LIMIT_PER_HOUR;
  const appPerDayStr = process.env.AI_APP_LIMIT_PER_DAY;

  const userPerHour = Number(userPerHourStr ?? "10");
  const appPerDay = Number(appPerDayStr ?? "100");

  if (userPerHour <= 0) {
    return {
      ok: false,
      message: `Ліміт вичерпано. Дозволено не більше ${userPerHour} викликів на годину.`,
    };
  }

  const userCalls = await getUserAiCallsCountPastHour(client, userId);
  if (userCalls >= userPerHour) {
    return {
      ok: false,
      message: `Ліміт вичерпано. Ви зробили ${userCalls} викликів за годину (максимум: ${userPerHour}).`,
    };
  }

  const appCalls = await getAppAiCallsCountToday(client);
  if (appCalls >= appPerDay) {
    return {
      ok: false,
      message: `Загальний добовий бюджет застосунку вичерпано (${appCalls}/${appPerDay}). Спробуйте завтра.`,
    };
  }

  return { ok: true };
}
