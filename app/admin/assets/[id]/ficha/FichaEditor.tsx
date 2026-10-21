"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { FileDropzone } from "@/app/admin/_components/FileDropzone";
import { FichaTagsField } from "./FichaTagsField";

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

function QuitarComponenteBoton({ nombre, onQuitar }: { nombre: string; onQuitar: () => Promise<any> | void }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="ficha-sidebar-quitar"
      title={`Quitar ${nombre} de este activo`}
      disabled={pending}
      onClick={async (e) => {
        e.stopPropagation();
        const ok = window.confirm(
          `¿Quitar "${nombre}" de este activo? Se borra también la información técnica cargada para este componente.`
        );
        if (!ok) return;

        setPending(true);
        try {
          await onQuitar();
        } catch (err) {
          alert("Error al quitar componente: " + ((err as Error)?.message || String(err)));
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "…" : "×"}
    </button>
  );
}

export function FichaEditor({
  assetId,
  photoUrl,
  subirFotoAction,
  componentes,
  catalogoDisponible,
  tipos,
  existente,
  acciones,
  agregarComponente,
  quitarComponente,
  sistemaInicial,
}: {
  assetId: string;
  photoUrl: string | null;
  subirFotoAction: (formData: FormData) => Promise<void>;
  componentes: Categoria[];
  catalogoDisponible: Categoria[];
  tipos: Categoria[];
  existente: Record<string, Record<string, string>>;
  acciones: Record<string, (formData: FormData) => Promise<void>>;
  agregarComponente: (formData: FormData) => Promise<void>;
  quitarComponente: (categorySlug: string) => Promise<any>;
  sistemaInicial?: string;
}) {
  const [sistemaActivo, setSistemaActivo] = useState(
    sistemaInicial === "__foto__"
      ? "__foto__"
      : sistemaInicial && componentes.some((c) => c.slug === sistemaInicial)
      ? sistemaInicial
      : componentes[0]?.slug || "__foto__"
  );

  const sistema = componentes.find((c) => c.slug === sistemaActivo) || componentes[0];
  const contenidoDelSistema = sistema ? existente[sistema.slug] || {} : {};

  return (
    <div className="ficha-layout">
      <nav className="ficha-sidebar">
        <div className={`ficha-sidebar-item${sistemaActivo === "__foto__" ? " active" : ""}`}>
          <button
            type="button"
            className="ficha-sidebar-item-btn"
            onClick={() => setSistemaActivo("__foto__")}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="m21 15-5-5L5 21" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            Foto del equipo
            {photoUrl ? <span className="dot-lleno" title="Tiene foto cargada" /> : null}
          </button>
        </div>

        <div style={{ height: 1, background: "var(--graphite-line)", margin: "4px 0 8px" }} />

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
        {sistemaActivo === "__foto__" ? (
          <div className="admin-panel">
            <p className="section-label" style={{ marginBottom: 6 }}>Foto principal del activo</p>
            <p className="sub" style={{ marginBottom: 20 }}>
              Esta imagen se muestra en la cabecera de la ficha y en la aplicación de los técnicos en terreno.
            </p>

            {photoUrl ? (
              <div style={{ marginBottom: 20 }}>
                <img
                  src={photoUrl}
                  alt="Foto del activo"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    borderRadius: 12,
                    border: "1.5px solid var(--graphite-line)",
                    display: "block",
                    background: "#17191A",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  height: 140,
                  maxWidth: 320,
                  borderRadius: 12,
                  border: "1.5px dashed var(--graphite-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 8,
                  color: "var(--text-mid)",
                  marginBottom: 20,
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="m21 15-5-5L5 21" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 12 }}>Sin foto asignada todavía</span>
              </div>
            )}

            <form action={subirFotoAction}>
              <input type="hidden" name="return_to" value={`/admin/assets/${assetId}/ficha?sistema=__foto__`} />
              <div className="field">
                <FileDropzone
                  name="photo"
                  accept="image/*"
                  label={photoUrl ? "Elegir nueva foto para reemplazar" : "Elegir foto del activo"}
                  hint="Formatos admitidos: JPG, PNG o WEBP."
                />
              </div>
              <SubmitButton>{photoUrl ? "Reemplazar foto" : "Guardar foto"}</SubmitButton>
            </form>
          </div>
        ) : sistema ? (
          <div className="admin-panel">
            <p className="section-label" style={{ marginBottom: 18 }}>{sistema.name}</p>
            <form action={acciones[sistema.slug]} key={sistema.slug}>
              {tipos.map((tipo) => (
                <FichaTagsField
                  key={tipo.slug}
                  tipo={tipo}
                  sistemaName={sistema.name}
                  initialValue={contenidoDelSistema[tipo.slug] || ""}
                />
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
