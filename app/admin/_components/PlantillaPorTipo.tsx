"use client";

import { useState } from "react";

type Categoria = { slug: string; name: string };
type Estado = "guardando" | "guardado" | "error";

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
  const [estados, setEstados] = useState<Record<string, Estado>>({});

  if (tiposActivo.length === 0) {
    return <p className="sub">Agrega primero un tipo de activo.</p>;
  }

  const activos = new Set(porTipo[tipo] || []);

  async function alternar(slug: string, nuevoValor: boolean) {
    const clave = `${tipo}:${slug}`;
    setPorTipo((prev) => {
      const lista = new Set(prev[tipo] || []);
      if (nuevoValor) lista.add(slug);
      else lista.delete(slug);
      return { ...prev, [tipo]: [...lista] };
    });
    setEstados((prev) => ({ ...prev, [clave]: "guardando" }));

    try {
      await action(tipo, slug, nuevoValor);
      setEstados((prev) => ({ ...prev, [clave]: "guardado" }));
      setTimeout(() => {
        setEstados((prev) => {
          const { [clave]: _quitado, ...resto } = prev;
          return resto;
        });
      }, 1500);
    } catch {
      setPorTipo((prev) => {
        const lista = new Set(prev[tipo] || []);
        if (nuevoValor) lista.delete(slug);
        else lista.add(slug);
        return { ...prev, [tipo]: [...lista] };
      });
      setEstados((prev) => ({ ...prev, [clave]: "error" }));
    }
  }

  return (
    <div className="plantilla-tipo-layout">
      <div className="plantilla-tipo-sidebar">
        {tiposActivo.map((t) => (
          <button
            key={t}
            type="button"
            className={`plantilla-tipo-item ${t === tipo ? "active" : ""}`}
            onClick={() => setTipo(t)}
          >
            <span>{t}</span>
            <span className="plantilla-tipo-item-count">{(porTipo[t] || []).length}</span>
          </button>
        ))}
      </div>

      <div className="plantilla-tipo-content">
        <div className="plantilla-checklist">
          {sistemas.map((s) => {
            const marcado = activos.has(s.slug);
            const estado = estados[`${tipo}:${s.slug}`];
            return (
              <label key={s.slug} className="plantilla-check-item">
                <span className="plantilla-check-main">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={(e) => alternar(s.slug, e.target.checked)}
                  />
                  {s.name}
                </span>
                {estado === "guardando" ? <span className="plantilla-check-estado guardando">Guardando…</span> : null}
                {estado === "guardado" ? <span className="plantilla-check-estado guardado">Guardado</span> : null}
                {estado === "error" ? <span className="plantilla-check-estado error">No se guardó</span> : null}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
