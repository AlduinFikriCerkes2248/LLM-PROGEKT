export type ActionResult = {
  status: 200 | 201 | 400 | 401 | 403 | 404;
  message?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
};

export function isAccessDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = (error as { message?: string }).message ?? "";
  const code = (error as { code?: string }).code ?? "";
  return (
    code === "42501" ||
    msg.toLowerCase().includes("row-level security") ||
    msg.toLowerCase().includes("permission denied") ||
    msg.toLowerCase().includes("access denied")
  );
}
