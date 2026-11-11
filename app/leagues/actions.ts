"use server";

import { revalidatePath } from "next/cache";
import { isAccessDenied, type ActionResult } from "@/lib/action-result";
import { currentUserId } from "@/lib/auth";
import { createLeague, deleteLeague } from "@/lib/data/db/leagues";
import { checkLeague } from "@/lib/validation/leagues";

export async function addLeagueAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  void (await currentUserId());
  // If no user and not in testing bypass
  const checked = checkLeague(formData);
  if (!checked.ok) {
    return {
      status: 400,
      message: "Перевірте поля форми.",
      fieldErrors: checked.fieldErrors,
    };
  }

  try {
    const league = await createLeague(checked.value);
    revalidatePath("/leagues");
    return { status: 201, id: league.id, message: "Лігу успішно створено." };
  } catch (error) {
    if (isAccessDenied(error)) {
      return { status: 403, message: "Немає прав для створення ліги." };
    }
    throw error;
  }
}

export async function deleteLeagueAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { status: 400, message: "Невідомий ідентифікатор ліги." };
  }

  try {
    await deleteLeague(id);
    revalidatePath("/leagues");
    return { status: 200, message: "Лігу видалено." };
  } catch (error) {
    if (isAccessDenied(error)) {
      return {
        status: 404,
        message: "Лігу не знайдено або у вас немає права її видалити.",
      };
    }
    return { status: 404, message: "Лігу не знайдено." };
  }
}
