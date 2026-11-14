"use client";

import React, { useActionState } from "react";
import type { ActionResult } from "@/lib/action-result";

type ActionFormProps = {
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
};

export function ActionForm({ action, children, className }: ActionFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.message && (
        <div
          className={`mt-2 text-sm ${
            state.status >= 400 ? "text-rose-400" : "text-emerald-400"
          }`}
        >
          {state.message}
        </div>
      )}
      {state?.fieldErrors && (
        <ul className="mt-1 text-xs text-rose-400">
          {Object.entries(state.fieldErrors).map(([field, err]) => (
            <li key={field}>{err}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
