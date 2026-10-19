"use client";

import { useState } from "react";

// El mismo link que ya codifica el QR (ver app/api/assets/[tag_code]/qrcode/route.ts:
// `${origin}/index.html?activo=${tag_code}`) — se arma acá con window.location.origin
// porque es el mismo origen desde el que se está viendo este panel. Sirve para
// configurar el tag NFC físico de cada activo: al acercar el celular al NFC, el
// sistema operativo abre esta misma URL directo en la ficha del activo (ver
// idActivoDesdeUrl en public/assets/js/scan.js).
export function CopyTagLinkButton({ tagCode }: { tagCode: string }) {
  const [copiado, setCopiado] = useState(false);

  async function handleClick() {
    const link = `${window.location.origin}/index.html?activo=${encodeURIComponent(tagCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia el link manualmente:", link);
    }
  }

  return (
    <button type="button" className="btn-outline" onClick={handleClick}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="2" />
      </svg>
      {copiado ? "¡Copiado!" : "Copiar link para NFC/TAG"}
    </button>
  );
}
