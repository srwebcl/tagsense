"use client";

import { useState } from "react";

export function DeleteAssetButton({
  assetName,
  action,
}: {
  assetName: string;
  action: () => Promise<any>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const ok = window.confirm(
      `¿Eliminar "${assetName}"? Esto borra también su historial de intervenciones, informes, documentos y fotos asociadas. No se puede deshacer.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      await action();
      window.location.href = "/admin";
    } catch (err) {
      alert("Error al eliminar el activo: " + ((err as Error)?.message || String(err)));
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="btn-danger"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {loading ? "Eliminando…" : "Eliminar activo"}
    </button>
  );
}
