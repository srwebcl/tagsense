"use client";

import { useEffect, useState } from "react";

export function CopyTagLinkButton({ tagCode }: { tagCode: string }) {
  const [copiado, setCopiado] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLink(`${window.location.origin}/index.html?activo=${encodeURIComponent(tagCode)}`);
    }
  }, [tagCode]);

  async function handleClick() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia el enlace manualmente:", link);
    }
  }

  return (
    <div className="tag-link-box">
      <div className="tag-link-input-group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="tag-link-icon">
          <path
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="text"
          readOnly
          value={link || `.../index.html?activo=${tagCode}`}
          className="tag-link-input"
          onClick={(e) => (e.target as HTMLInputElement).select()}
          title="Enlace directo del TAG para abrir la ficha del equipo"
        />
        <button
          type="button"
          className={`tag-link-copy-btn${copiado ? " copied" : ""}`}
          onClick={handleClick}
          title="Copiar enlace"
        >
          {copiado ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>¡Copiado!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Copiar enlace</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
