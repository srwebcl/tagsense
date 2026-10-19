"use client";

import { useState, useTransition } from "react";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/roles";

export function RoleSelect({
  userId,
  rolActual,
  action,
}: {
  userId: string;
  rolActual: string;
  action: (userId: string, rol: string) => Promise<void>;
}) {
  const [rol, setRol] = useState(rolActual);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <select
        value={rol}
        disabled={pending}
        title={ROLE_DESCRIPTIONS[rol as keyof typeof ROLE_DESCRIPTIONS]}
        onChange={(e) => {
          const nuevo = e.target.value;
          const anterior = rol;
          setRol(nuevo);
          setError(null);
          startTransition(async () => {
            try {
              await action(userId, nuevo);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo cambiar el rol.");
              setRol(anterior);
            }
          });
        }}
      >
        {ROLES.map((value) => (
          <option key={value} value={value} title={ROLE_DESCRIPTIONS[value]}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>
      {error ? <small style={{ display: "block", color: "var(--err)", marginTop: 4 }}>{error}</small> : null}
    </div>
  );
}
