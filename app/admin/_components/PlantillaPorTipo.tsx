"use client";

import { useState, useTransition } from "react";

type Categoria = { slug: string; name: string };

export function PlantillaPorTipo({
  tiposActivo,
  sistemas,
  plantillas,
  action,
}: {
  tiposActivo: string[];
  sistemas: Categoria[];
  plantillas: Record<string, string[]>;
  action: (assetType: string, categorySlug: string, activar: boolean) => Promise<void>;
}) {
  const [tipo, setTipo] = useState(tiposActivo[0] || "");
  const [porTipo, setPorTipo] = useState(plantillas);
  const [, startTransition] = useTransition();

  if (tiposActivo.length === 0) {
    return <p className="sub">Agrega primero un tipo de activo.</p>;
  }

  const activos = new Set(porTipo[tipo] || []);

  return (
    <div>
      <div className="input-wrap" style={{ height: 40, marginBottom: 16, maxWidth: 320 }}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {tiposActivo.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="plantilla-checklist">
        {sistemas.map((s) => {
          const marcado = activos.has(s.slug);
          return (
            <label key={s.slug} className="plantilla-check-item">
              <input
                type="checkbox"
                checked={marcado}
                onChange={(e) => {
                  const nuevoValor = e.target.checked;
                  setPorTipo((prev) => {
                    const lista = new Set(prev[tipo] || []);
                    if (nuevoValor) lista.add(s.slug);
                    else lista.delete(s.slug);
                    return { ...prev, [tipo]: [...lista] };
                  });
                  startTransition(() => {
                    action(tipo, s.slug, nuevoValor);
                  });
                }}
              />
              {s.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}
