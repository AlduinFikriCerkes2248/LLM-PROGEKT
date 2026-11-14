import { askModel, ModelUnavailableError, type ModelRequest } from "./model";

export type MatchPreviewResult = {
  summary: string;
  predicted_home: number;
  predicted_away: number;
};

export const MATCH_PREVIEW_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Короткий аналітичний огляд матчу українською мовою (до 500 символів)",
    },
    predicted_home: {
      type: "integer",
      description: "Прогнозовані голи команди господарів (від 0 до 15)",
    },
    predicted_away: {
      type: "integer",
      description: "Прогнозовані голи команди гостей (від 0 до 15)",
    },
  },
  required: ["summary", "predicted_home", "predicted_away"],
  additionalProperties: false,
};

export function validateMatchPreview(raw: unknown): MatchPreviewResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Відповідь моделі не є об'єктом");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.summary !== "string" || !obj.summary.trim()) {
    throw new Error("Поле summary має бути непорожнім рядком");
  }

  const summary = obj.summary.trim();
  if (summary.length > 500) {
    throw new Error("Поле summary перевищує 500 символів");
  }

  const home = Number(obj.predicted_home);
  const away = Number(obj.predicted_away);

  if (!Number.isInteger(home) || home < 0 || home > 15) {
    throw new Error("predicted_home має бути цілим числом від 0 до 15");
  }

  if (!Number.isInteger(away) || away < 0 || away > 15) {
    throw new Error("predicted_away має бути цілим числом від 0 до 15");
  }

  return {
    summary,
    predicted_home: home,
    predicted_away: away,
  };
}

export function normalizeFocus(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildMatchPreviewCacheKey(matchId: string, focus: string): string {
  const norm = normalizeFocus(focus);
  return `preview:match:${matchId}:focus:${norm}`;
}

export async function askModelWithRetry(
  request: ModelRequest,
  maxAttempts = 2
): Promise<MatchPreviewResult> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const reply = await askModel(request);
      const parsed = JSON.parse(reply.text);
      return validateMatchPreview(parsed);
    } catch (err: unknown) {
      lastError = err;
      if (attempt < maxAttempts) {
        continue;
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : "Невалідна відповідь";
  throw new ModelUnavailableError(503, `Помилка валідації відповіді моделі: ${msg}`);
}
