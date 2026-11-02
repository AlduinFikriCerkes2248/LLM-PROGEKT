/**
 * Утиліта для форматування помилок українською мовою.
 * Запобігає виведенню порожнього об'єкта {} у консоль або в UI.
 */
export function formatErrorMessage(
  error: unknown,
  fallback = "Сталася непередбачена помилка. Спробуйте ще раз."
): string {
  if (!error) return fallback;

  if (typeof error === "string") {
    return error.trim().length > 0 ? error : fallback;
  }

  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    if (msg.length > 0 && msg !== "{}" && msg !== "[object Object]") {
      return msg;
    }
  }

  if (typeof error === "object") {
    const err = error as Record<string, unknown>;

    if (typeof err.message === "string" && err.message.trim().length > 0) {
      const m = err.message.trim();
      if (m.includes("invalid_box_type")) return "Невідомий тип кейсу.";
      if (m.includes("insufficient_hohlyantsi")) return "Недостатньо Бонусів на балансі!";
      if (m.includes("not_authenticated")) return "Будь ласка, увійдіть у свій акаунт.";
      if (m.includes("game_not_active")) return "Ця гра вже неактивна або завершена.";
      if (m.includes("not_your_turn")) return "Зараз хід вашого суперника.";
      if (m.includes("match_already_started")) return "Матч уже розпочався або завершений.";
      if (m !== "{}" && m !== "[object Object]") return m;
    }

    if (typeof err.details === "string" && err.details.trim().length > 0) {
      return err.details.trim();
    }

    if (typeof err.error_description === "string" && err.error_description.trim().length > 0) {
      return err.error_description.trim();
    }

    if (typeof err.hint === "string" && err.hint.trim().length > 0) {
      return err.hint.trim();
    }

    if (typeof err.code === "string") {
      switch (err.code) {
        case "23505":
          return "Такий запис уже існує (дублікат).";
        case "23503":
          return "Пов'язаний профіль або запис не знайдено.";
        case "42501":
          return "Дію заборонено політикою доступу (RLS). Перевірте права облікового запису.";
        case "PGRST116":
          return "Запитуваний запис не знайдено або він недоступний.";
        default:
          return `Помилка бази даних (код: ${err.code}).`;
      }
    }
  }

  return fallback;
}
