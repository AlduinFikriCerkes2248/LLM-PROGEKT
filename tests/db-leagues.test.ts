import { describe, expect, it } from "vitest";
import { createLeague, deleteLeague, getLeague } from "@/lib/data/db/leagues";

describe("ліги в базі даних", () => {
  it("створений запис читається назад: ліга", async () => {
    const title = `тест-${Date.now()}`;
    const created = await createLeague({ title });
    expect(created.id).toBeTruthy();
    const found = await getLeague(created.id);
    expect(found?.title).toBe(title);
    await deleteLeague(created.id);
  });

  it("видалений запис не знаходиться: ліга", async () => {
    const title = `тест-${Date.now()}`;
    const created = await createLeague({ title });
    expect(await getLeague(created.id)).not.toBeNull();
    await deleteLeague(created.id);
    expect(await getLeague(created.id)).toBeNull();
  });

  it("обов'язкове поле не приймає порожнє значення: назва ліги", async () => {
    await expect(createLeague({ title: "   " })).rejects.toThrow();
  });
});
