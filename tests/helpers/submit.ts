import type { ActionResult } from "@/lib/action-result";

export async function submit(
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>,
  fields: Record<string, string | number>
): Promise<ActionResult> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, String(value));
  }
  return action(null, formData);
}
