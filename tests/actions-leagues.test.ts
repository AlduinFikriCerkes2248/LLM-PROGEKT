import { describe, expect, it } from "vitest";
import { addLeagueAction, deleteLeagueAction } from "@/app/leagues/actions";
import { getLeague } from "@/lib/data/db/leagues";
import { submit } from "./helpers/submit";
import { signInAs } from "./helpers/users";

describe("точки доступу: ліги", () => {
  it("успішний виклик: організатор створює лігу, і вона є в базі", async () => {
    const title = `тест-ліга-${Date.now()}`;
    const result = await submit(addLeagueAction, { title });
    expect(result.status).toBe(201);
    expect(result.id).toBeTruthy();

    const found = await getLeague(result.id ?? "");
    expect(found).not.toBeNull();
    expect(found?.title).toBe(title);

    await submit(deleteLeagueAction, { id: result.id ?? "" });
  });

  it("невалідні дані: порожня назва повз форму відхиляється з кодом 400", async () => {
    const result = await submit(addLeagueAction, { title: "" });
    expect(result.status).toBe(400);
    expect(result.fieldErrors?.title).toBeTruthy();
  });

  it("чужий запис: акаунт Б не бачить і не видаляє лігу акаунта А", async () => {
    const title = `тест-чужа-${Date.now()}`;
    const created = await submit(addLeagueAction, { title });
    expect(created.status).toBe(201);

    await signInAs("B");
    // Under account B, RLS policies prevent seeing or deleting A's league
    expect(await getLeague(created.id ?? "")).toBeNull();

    const deleteRes = await submit(deleteLeagueAction, { id: created.id ?? "" });
    expect(deleteRes.status).toBe(404);

    await signInAs("A");
    await submit(deleteLeagueAction, { id: created.id ?? "" });
  });
});
