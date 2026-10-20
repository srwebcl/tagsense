"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";

type Categoria = { slug: string; name: string };

export function FichaEditor({
  sistemas,
  tipos,
  existente,
  acciones,
  sistemaInicial,
}: {
  sistemas: Categoria[];
  tipos: Categoria[];
  existente: Record<string, Record<string, string>>;
  acciones: Record<string, (formData: FormData) => Promise<void>>;
  sistemaInicial?: string;
}) {
  const [sistemaActivo, setSistemaActivo] = useState(
    sistemaInicial && sistemas.some((s) => s.slug === sistemaInicial) ? sistemaInicial : sistemas[0]?.slug
  );

  if (sistemas.length === 0) {
    return <div className="admin-empty">Todavía no hay sistemas definidos. Agrega uno desde Categorías.</div>;
  }

  const sistema = sistemas.find((s) => s.slug === sistemaActivo) || sistemas[0];
  const contenidoDelSistema = existente[sistema.slug] || {};

  return (
    <div className="ficha-layout">
      <nav className="ficha-sidebar">
        {sistemas.map((s) => {
          const tieneContenido = Object.values(existente[s.slug] || {}).some((v) => v.trim().length > 0);
          return (
            <button
              key={s.slug}
              type="button"
              className={`ficha-sidebar-item${s.slug === sistemaActivo ? " active" : ""}`}
              onClick={() => setSistemaActivo(s.slug)}
            >
              {s.name}
              {tieneContenido ? <span className="dot-lleno" title="Tiene información cargada" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="ficha-content">
        <div className="admin-panel">
          <p className="section-label" style={{ marginBottom: 18 }}>{sistema.name}</p>
          <form action={acciones[sistema.slug]} key={sistema.slug}>
            {tipos.map((tipo) => (
              <div key={tipo.slug} className="ficha-field-group">
                <label>{tipo.name}</label>
                <textarea
                  name={`campo_${tipo.slug}`}
                  rows={5}
                  defaultValue={contenidoDelSistema[tipo.slug] || ""}
                  placeholder={
                    tipo.slug === "equipamiento"
                      ? `Ej: Modelo de ${sistema.name}: AAXX TT. Marca: ... Capacidad: ...`
                      : tipo.slug === "fallas"
                        ? `Ej: Falla 1 — descripción. Falla 2 — descripción. Falla 3 — descripción.`
                        : `Procedimientos de ${sistema.name.toLowerCase()} para este activo…`
                  }
                  style={{
                    width: "100%",
                    background: "var(--graphite)",
                    border: "1.5px solid var(--graphite-line)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: "var(--text-hi)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
            ))}
            <SubmitButton>Guardar {sistema.name}</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
