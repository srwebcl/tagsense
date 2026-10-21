"use client";

import { useEffect, useState } from "react";

// Boundary para errores no manejados dentro de /admin/**.
// Si el router de Next.js se desincroniza (ej. 'enqueueModel is not a function' por un chunk RSC corrupto),
// esta pantalla se auto-recupera recargando limpiamente la navegación.
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [isRouterDesync, setIsRouterDesync] = useState(false);

  useEffect(() => {
    console.error("[admin] error no manejado:", error);
    const msg = error?.message || "";
    if (
      msg.includes("enqueueModel") ||
      msg.includes("Router action") ||
      msg.includes("Internal Next.js error")
    ) {
      setIsRouterDesync(true);
      // Auto-recuperar si el router de Next.js se desincronizó en navegación suave
      const timer = setTimeout(() => {
        window.location.reload();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [error]);

  function handleHardReload() {
    window.location.reload();
  }

  return (
    <div className="admin-container" style={{ maxWidth: 520, textAlign: "center", paddingTop: 80, margin: "0 auto" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
        {isRouterDesync ? "Sincronizando navegación…" : "Algo salió mal"}
      </h1>
      <p className="sub" style={{ marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
        {isRouterDesync
          ? "Sincronizando la sesión y la vista del módulo..."
          : error.message || "Ocurrió un error inesperado al cargar esta sección."}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn-outline" onClick={() => retry()}>
          Reintentar
        </button>
        <button
          type="button"
          className="btn-outline"
          style={{ background: "rgba(230, 81, 0, 0.08)", borderColor: "var(--primary, #e65100)" }}
          onClick={handleHardReload}
        >
          🔄 Recargar página
        </button>
      </div>
      <div style={{ marginTop: 24 }}>
        <a href="/admin" style={{ fontSize: 13, color: "var(--muted-foreground, #888)", textDecoration: "underline" }}>
          Volver a Activos
        </a>
      </div>
    </div>
  );
}
