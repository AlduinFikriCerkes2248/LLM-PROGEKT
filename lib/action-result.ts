export type ActionResult = {
  status: 200 | 201 | 400 | 401 | 403 | 404 | 429 | 503;
  message?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
};
export function isAccessDenied(error: unknown): boolean {
  return error instanceof Error && /row-level security|permission denied/i.test(error.message);
}
