"use client";
import { useActionState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
type Action = (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {pending ? <p className="text-sm text-gray-500">Виконується…</p> : null}
      {result && result.status === 429 ? (
        <div role="status" className="rounded border border-amber-400 bg-amber-50 p-2 text-sm text-amber-900">
          <p className="font-semibold">Ліміт вичерпано</p>
          {result.message ? <p>{result.message}</p> : null}
        </div>
      ) : null}
      {result && result.status >= 400 && result.status !== 429 ? (
        <div role="alert" className="text-sm text-red-600">
          {result.message ? <p>{result.message}</p> : null}
          {result.fieldErrors
            ? Object.entries(result.fieldErrors).map(([field, text]) => <p key={field}>{text}</p>)
            : null}
        </div>
      ) : null}
      {result && result.status < 400 && result.message ? (
        <p role="status" className="text-sm text-green-700">
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
