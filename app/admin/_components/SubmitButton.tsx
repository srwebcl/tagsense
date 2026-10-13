"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? <span className="btn-spin" /> : null}
      {pending ? "Guardando…" : children}
    </button>
  );
}
