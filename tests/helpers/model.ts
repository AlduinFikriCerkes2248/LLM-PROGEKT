// Підміна мовної моделі в тестах (практична робота 6). Не змінюйте цей файл.
// Тести не звертаються до справжнього провайдера: відповіді беруться із заздалегідь
// підготовлених зразків. Тому тести безкоштовні й працюють без ключа і без мережі до провайдера.
import { ModelTimeoutError, ModelUnavailableError, setTestModel, type ModelRequest } from "@/lib/ai/model";
// Що «відповідає модель» на черговий виклик:
//   рядок     — текст відповіді (зразок із роздаткового набору або ваш);
//   "timeout" — модель не відповіла вчасно (ModelTimeoutError);
//   "down"    — провайдер недоступний (ModelUnavailableError, код 503).
export type FakeReply = string | "timeout" | "down";
// Усі запити, які застосунок надіслав «моделі» в поточному тесті, — для перевірок.
export const sentToModel: ModelRequest[] = [];
// Задає відповіді моделі по черзі. Коли черга закінчилася, повторюється остання відповідь.
export function modelReplies(...replies: FakeReply[]): void {
  sentToModel.length = 0;
  const queue = [...replies];
  setTestModel(async (request) => {
    sentToModel.push(request);
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    if (reply === "timeout") throw new ModelTimeoutError(request.timeoutMs ?? 0);
    if (reply === "down") throw new ModelUnavailableError(503, "Провайдер недоступний (тест)");
    return reply ?? "";
  });
}
// Модель «вимкнена»: так, ніби ключа провайдера немає.
export function modelDisabled(): void {
  sentToModel.length = 0;
  setTestModel(undefined);
}
