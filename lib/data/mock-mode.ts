export type MockMode = "data" | "empty" | "slow" | "error";

export const MOCK_MODE: MockMode = "data";

export async function withMockMode<T>(data: T): Promise<T> {
  if (MOCK_MODE === "empty") {
    if (Array.isArray(data)) {
      return [] as unknown as T;
    }
    return null as unknown as T;
  }
  if (MOCK_MODE === "slow") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return data;
  }
  if (MOCK_MODE === "error") {
    throw new Error("Помилка завантаження даних (тестовий режим MOCK_MODE=error)");
  }
  return data;
}
