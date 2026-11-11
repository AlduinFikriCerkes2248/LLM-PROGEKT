export type LeagueInput = {
  title: string;
};

export type Checked<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: Record<string, string> };

export function checkLeague(formData: FormData): Checked<LeagueInput> {
  const title = String(formData.get("title") ?? "").trim();
  const fieldErrors: Record<string, string> = {};

  if (!title) {
    fieldErrors.title = "Назва ліги обов'язкова.";
  } else if (title.length < 3) {
    fieldErrors.title = "Назва ліги має містити щонайменше 3 символи.";
  } else if (title.length > 60) {
    fieldErrors.title = "Назва ліги не може бути довшою за 60 символів.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { title } };
}
