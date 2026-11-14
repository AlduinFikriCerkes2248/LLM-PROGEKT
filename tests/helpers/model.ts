import { ModelTimeoutError, ModelUnavailableError, setTestModel, type ModelRequest } from "@/lib/ai/model";
export type FakeReply = string | "timeout" | "down";
export const sentToModel: ModelRequest[] = [];
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
export function modelDisabled(): void {
  sentToModel.length = 0;
  setTestModel(undefined);
}
