"use client";

import { useEffect } from "react";

// Sin esto, un throw en un Server Action o un page.tsx del admin (ej. tag_code
// duplicado, activo no encontrado) caía en la pantalla de error genérica de
// Next.js — funcional pero fea y sin ningún botón para volver. Este boundary
// cubre /admin/** completo (error.tsx envuelve todo el segmento y sus hijos).
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[admin] error no manejado:", error);
  }, [error]);

  return (
    <div className="admin-container" style={{ maxWidth: 480, textAlign: "center", paddingTop: 80 }}>
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>Algo salió mal</h1>
      <p className="sub" style={{ marginBottom: 24 }}>
        {error.message || "Ocurrió un error inesperado."}
      </p>
      <button type="button" className="btn-outline" onClick={() => retry()}>
        Intentar de nuevo
      </button>
    </div>
  );
}
