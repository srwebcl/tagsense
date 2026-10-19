"use client";

import { useState, useTransition } from "react";

const ROLE_LABELS: Record<string, string> = { admin: "Admin", technician: "Técnico", maintainer: "Mantenedor" };

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
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error ? <small style={{ display: "block", color: "var(--err)", marginTop: 4 }}>{error}</small> : null}
    </div>
  );
}
