export type FaultMode = "none" | "slow" | "down";

export const FAULT_MODE: FaultMode = "none";

export async function applyFaultMode(): Promise<void> {
  if (FAULT_MODE === "slow") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } else if (FAULT_MODE === "down") {
    throw new Error("База даних тимчасово недоступна (FAULT_MODE=down)");
  }
}
