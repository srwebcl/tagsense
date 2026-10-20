"use client";

import { useState } from "react";

export function ResetPasswordButton({
  userId,
  userName,
  action,
}: {
  userId: string;
  userName: string;
  action: (userId: string) => Promise<string>;
}) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok = window.confirm(`¿Resetear la contraseña de ${userName}? La contraseña anterior deja de funcionar de inmediato.`);
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const nueva = await action(userId);
      setPassword(nueva);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resetear la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  if (password) {
    return (
      <div style={{ background: "var(--graphite)", border: "1px solid var(--graphite-line)", borderRadius: 10, padding: 12, marginTop: 6 }}>
        <p className="sub" style={{ margin: "0 0 6px" }}>
          Nueva contraseña para <b>{userName}</b>. Cópiala ahora, no se vuelve a mostrar:
        </p>
        <code style={{ display: "block", background: "var(--bg-1)", padding: "8px 10px", borderRadius: 8, fontSize: 13, marginBottom: 8, userSelect: "all" }}>
          {password}
        </code>
        <button type="button" className="btn-outline" onClick={() => setPassword(null)}>
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className="btn-outline" onClick={handleClick} disabled={loading}>
        {loading ? "Reseteando…" : "Resetear contraseña"}
      </button>
      {error ? <small style={{ display: "block", color: "var(--err)", marginTop: 4 }}>{error}</small> : null}
    </>
  );
}
