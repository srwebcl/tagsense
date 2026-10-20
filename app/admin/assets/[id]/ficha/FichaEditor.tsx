"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";

type Categoria = { slug: string; name: string };

function BotonAgregarComponente() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Agregando…" : "Agregar componente"}
    </button>
  );
}

function AgregarComponente({
  catalogoDisponible,
  action,
}: {
  catalogoDisponible: Categoria[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [modo, setModo] = useState<"catalogo" | "nuevo">(catalogoDisponible.length > 0 ? "catalogo" : "nuevo");

  return (
    <form action={action} style={{ padding: "10px 4px" }}>
      {catalogoDisponible.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className={`field-inline-link${modo === "catalogo" ? "" : ""}`}
            style={{ fontWeight: modo === "catalogo" ? 700 : 400, opacity: modo === "catalogo" ? 1 : 0.6 }}
            onClick={() => setModo("catalogo")}
          >
            Del catálogo
          </button>
          <button
            type="button"
            style={{ fontWeight: modo === "nuevo" ? 700 : 400, opacity: modo === "nuevo" ? 1 : 0.6 }}
            className="field-inline-link"
            onClick={() => setModo("nuevo")}
          >
            Nuevo
          </button>
        </div>
      )}
      {modo === "catalogo" && catalogoDisponible.length > 0 ? (
        <div className="input-wrap" style={{ height: 40, marginBottom: 8 }}>
          <select name="componente_existente" required>
            {catalogoDisponible.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="input-wrap" style={{ height: 40, marginBottom: 8 }}>
          <input name="componente_nuevo" required placeholder="Ej: Balde, Sello mecánico..." />
        </div>
      )}
      <BotonAgregarComponente />
    </form>
  );
}

function QuitarComponenteBoton({ nombre, onQuitar }: { nombre: string; onQuitar: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="ficha-sidebar-quitar"
      title={`Quitar ${nombre} de este activo`}
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        if (!window.confirm(`¿Quitar "${nombre}" de este activo? Se borra también la información técnica cargada para este componente.`)) return;
        startTransition(onQuitar);
      }}
    >
      ×
    </button>
  );
}

export function FichaEditor({
  componentes,
  catalogoDisponible,
  tipos,
  existente,
  acciones,
  agregarComponente,
  quitarComponente,
  sistemaInicial,
}: {
  componentes: Categoria[];
  catalogoDisponible: Categoria[];
  tipos: Categoria[];
  existente: Record<string, Record<string, string>>;
  acciones: Record<string, (formData: FormData) => Promise<void>>;
  agregarComponente: (formData: FormData) => Promise<void>;
  quitarComponente: (categorySlug: string) => Promise<void>;
  sistemaInicial?: string;
}) {
  const [sistemaActivo, setSistemaActivo] = useState(
    sistemaInicial && componentes.some((c) => c.slug === sistemaInicial) ? sistemaInicial : componentes[0]?.slug
  );

  const sistema = componentes.find((c) => c.slug === sistemaActivo) || componentes[0];
  const contenidoDelSistema = sistema ? existente[sistema.slug] || {} : {};

  return (
    <div className="ficha-layout">
      <nav className="ficha-sidebar">
        {componentes.map((c) => {
          const tieneContenido = Object.values(existente[c.slug] || {}).some((v) => v.trim().length > 0);
          return (
            <div key={c.slug} className={`ficha-sidebar-item${c.slug === sistemaActivo ? " active" : ""}`}>
              <button type="button" className="ficha-sidebar-item-btn" onClick={() => setSistemaActivo(c.slug)}>
                {c.name}
                {tieneContenido ? <span className="dot-lleno" title="Tiene información cargada" /> : null}
              </button>
              <QuitarComponenteBoton nombre={c.name} onQuitar={() => quitarComponente(c.slug)} />
            </div>
          );
        })}

        {componentes.length === 0 ? (
          <p className="sub" style={{ padding: "6px 4px 10px" }}>
            Este activo todavía no tiene componentes. Agrega el primero abajo.
          </p>
        ) : null}

        <div style={{ borderTop: componentes.length > 0 ? "1px solid var(--graphite-line)" : "none", marginTop: componentes.length > 0 ? 8 : 0 }}>
          <AgregarComponente catalogoDisponible={catalogoDisponible} action={agregarComponente} />
        </div>
      </nav>

      <div className="ficha-content">
        {sistema ? (
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
                    placeholder={`${tipo.name} de ${sistema.name.toLowerCase()} para este activo…`}
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
        ) : (
          <div className="admin-empty">Agrega un componente para empezar a completar la ficha técnica.</div>
        )}
      </div>
    </div>
  );
}
