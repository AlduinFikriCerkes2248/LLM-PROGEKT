// Спільне налаштування тестів (практична робота 6). Не змінюйте цей файл.
// Перед кожним тестом — вхід акаунтом А. Тест, якому потрібен акаунт Б, викликає signInAs("B").
// Нове в ПР 6: перед кожним тестом модель «вимкнена», а змінні, задані vi.stubEnv, скинуто.
// Ліміти викликів у тестах дуже великі, щоб результат не залежав від ваших викликів у браузері;
// тест ліміту задає своє значення сам (vi.stubEnv після цього налаштування).
// Тест сам задає відповіді моделі через modelReplies(...) з tests/helpers/model.ts.
// revalidatePath і revalidateTag працюють лише всередині Next.js, тому в тестах вони нічого не роблять.
import { beforeEach, vi } from "vitest";
import { modelDisabled } from "./helpers/model";
import { signInAs } from "./helpers/users";
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
beforeEach(async () => {
  vi.unstubAllEnvs();
  vi.stubEnv("AI_USER_LIMIT_PER_HOUR", "1000000");
  vi.stubEnv("AI_APP_LIMIT_PER_DAY", "1000000");
  modelDisabled();
  await signInAs("A");
});
