"use client";

export function DeleteAssetButton({
  assetName,
  action,
}: {
  assetName: string;
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = window.confirm(
          `¿Eliminar "${assetName}"? Esto borra también su historial de intervenciones, informes y manuales. No se puede deshacer.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <button type="submit" className="btn-danger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Eliminar activo
      </button>
    </form>
  );
}
