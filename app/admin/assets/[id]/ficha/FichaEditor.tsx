"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { FileDropzone } from "@/app/admin/_components/FileDropzone";
import { FichaTagsField } from "./FichaTagsField";
import { cargarPlantillaTipoActivo, copiarFichaDesdeActivo } from "@/app/admin/assets/actions";

type Categoria = { slug: string; name: string };
type OtroActivo = {
  id: string;
  name: string;
  tag_code: string;
  model: string | null;
  docs_count: string | number;
};

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
  assetType,
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
  otrosActivos = [],
}: {
  assetId: string;
  assetType?: string | null;
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
  otrosActivos?: OtroActivo[];
}) {
  const router = useRouter();
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);
  const [mostrarModalCopiar, setMostrarModalCopiar] = useState(false);
  const [activoOrigenId, setActivoOrigenId] = useState<string>(
    otrosActivos.find((a) => Number(a.docs_count) > 0)?.id || otrosActivos[0]?.id || ""
  );
  const [copiando, setCopiando] = useState(false);

  const [sistemaActivo, setSistemaActivo] = useState(
    sistemaInicial === "__foto__"
      ? "__foto__"
      : sistemaInicial && componentes.some((c) => c.slug === sistemaInicial)
      ? sistemaInicial
      : componentes[0]?.slug || "__foto__"
  );

  const sistema = componentes.find((c) => c.slug === sistemaActivo) || componentes[0];
  const contenidoDelSistema = sistema ? existente[sistema.slug] || {} : {};

  const [busquedaActivo, setBusquedaActivo] = useState("");

  const handleCargarPlantilla = async () => {
    const confirmMsg = `¿Cargar la plantilla base para este equipo (${assetType || "según su tipo"})?\nSe incorporarán los componentes principales y pautas técnicas recomendadas.`;
    if (!window.confirm(confirmMsg)) return;

    setCargandoPlantilla(true);
    try {
      const res = await cargarPlantillaTipoActivo(assetId);
      if (res?.success) {
        alert("¡Plantilla cargada con éxito! Se sincronizaron los componentes y fichas base.");
        router.refresh();
      }
    } catch (err) {
      alert("Error al cargar la plantilla: " + ((err as Error)?.message || String(err)));
    } finally {
      setCargandoPlantilla(false);
    }
  };

  const handleCopiarDesdeActivo = async () => {
    if (!activoOrigenId) return;
    const origen = otrosActivos.find((a) => a.id === activoOrigenId);
    const confirmMsg = `¿Copiar toda la ficha técnica de "${origen?.name || "este equipo"}" a este activo?`;
    if (!window.confirm(confirmMsg)) return;

    setCopiando(true);
    try {
      const res = await copiarFichaDesdeActivo(assetId, activoOrigenId);
      if (res?.success) {
        setMostrarModalCopiar(false);
        alert(`¡Ficha técnica copiada con éxito! Se sincronizaron ${res.count} documentos y especificaciones.`);
        router.refresh();
      }
    } catch (err) {
      alert("Error al copiar ficha: " + ((err as Error)?.message || String(err)));
    } finally {
      setCopiando(false);
    }
  };

  const otrosActivosConFicha = otrosActivos.filter((a) => Number(a.docs_count) > 0);

  const activosFiltrados = otrosActivos.filter((a) => {
    if (!busquedaActivo.trim()) return true;
    const term = busquedaActivo.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      a.tag_code.toLowerCase().includes(term) ||
      (a.model && a.model.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* Barra de productividad rápida aprobada */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          background: "var(--carbon-surface)",
          border: "1px solid var(--graphite-line)",
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-mid)" }}>Acciones rápidas de llenado:</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-outline"
            disabled={cargandoPlantilla}
            onClick={handleCargarPlantilla}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              height: 34,
              padding: "0 14px",
            }}
          >
            <span>⚡</span>
            {cargandoPlantilla ? "Cargando plantilla…" : `Cargar Plantilla Base ${assetType ? `(${assetType})` : ""}`}
          </button>

          {otrosActivos.length > 0 && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setBusquedaActivo("");
                setMostrarModalCopiar(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
                height: 34,
                padding: "0 14px",
              }}
            >
              <span>📋</span>
              Copiar Ficha desde otro Activo
            </button>
          )}
        </div>
      </div>

      {/* Modal para Copiar / Clonar Ficha con buscador integrado */}
      {mostrarModalCopiar && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !copiando) setMostrarModalCopiar(false);
          }}
        >
          <div className="admin-modal-card" style={{ maxWidth: 520 }}>
            <div className="admin-modal-head">
              <div>
                <h2>Copiar Ficha Técnica</h2>
                <p>Clona componentes, pautas y especificaciones desde otro equipo de tu flota.</p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setMostrarModalCopiar(false)}
                disabled={copiando}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-hi)" }}>
                Seleccionar activo origen:
              </label>

              {/* Barra de búsqueda interactiva */}
              <div style={{ position: "relative", marginBottom: 10 }}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-mid)",
                    pointerEvents: "none",
                  }}
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={busquedaActivo}
                  onChange={(e) => setBusquedaActivo(e.target.value)}
                  placeholder="Buscar por nombre, código o modelo (ej: MT65, A60, Toro...)"
                  style={{
                    width: "100%",
                    height: 40,
                    paddingLeft: 36,
                    paddingRight: busquedaActivo ? 34 : 12,
                    background: "#121415",
                    border: "1px solid var(--graphite-line)",
                    borderRadius: 10,
                    color: "var(--text-hi)",
                    fontSize: 12.5,
                    outline: "none",
                  }}
                />
                {busquedaActivo && (
                  <button
                    type="button"
                    onClick={() => setBusquedaActivo("")}
                    title="Limpiar búsqueda"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-mid)",
                      cursor: "pointer",
                      fontSize: 13,
                      padding: "2px 6px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Lista interactiva con scroll */}
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--graphite-line)",
                  borderRadius: 10,
                  background: "#121415",
                  marginBottom: 14,
                  padding: "4px",
                }}
              >
                {activosFiltrados.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-mid)", fontSize: 12.5 }}>
                    No se encontraron activos que coincidan con &quot;{busquedaActivo}&quot;.
                  </div>
                ) : (
                  activosFiltrados.map((a) => {
                    const seleccionado = a.id === activoOrigenId;
                    const tieneFichas = Number(a.docs_count) > 0;
                    return (
                      <div
                        key={a.id}
                        onClick={() => !copiando && setActivoOrigenId(a.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: 8,
                          cursor: copiando ? "not-allowed" : "pointer",
                          background: seleccionado ? "rgba(208, 120, 56, 0.12)" : "transparent",
                          border: seleccionado ? "1px solid var(--copper-1)" : "1px solid transparent",
                          marginBottom: 4,
                          transition: "background .12s ease, border-color .12s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              border: seleccionado ? "5px solid var(--copper-1)" : "1.5px solid var(--text-mid)",
                              background: seleccionado ? "#17191A" : "transparent",
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>
                              {a.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--text-mid)", marginTop: 2 }}>
                              {a.tag_code} {a.model ? `· ${a.model}` : ""}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {tieneFichas ? (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--copper-1)",
                                background: "rgba(208, 120, 56, 0.15)",
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: "1px solid rgba(208, 120, 56, 0.3)",
                              }}
                            >
                              {a.docs_count} fichas
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-mid)", opacity: 0.7 }}>
                              Sin fichas
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--graphite-line)",
                  fontSize: 12,
                  color: "var(--text-mid)",
                  lineHeight: 1.5,
                }}
              >
                ℹ️ Esta acción copiará todos los componentes activos, fichas de equipamiento, fallas y procedimientos del
                equipo seleccionado hacia este activo. Los datos previos se actualizarán manteniendo la estructura oficial.
              </div>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setMostrarModalCopiar(false)}
                disabled={copiando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleCopiarDesdeActivo}
                disabled={copiando || !activoOrigenId}
                style={{
                  width: "auto",
                  height: 42,
                  padding: "0 22px",
                  fontSize: 12.5,
                }}
              >
                {copiando ? "Copiando fichas…" : "Confirmar y Clonar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              Este activo todavía no tiene componentes. Agrega el primero abajo o pulsa &quot;Cargar Plantilla Base&quot;.
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
                    loading="lazy"
                    decoding="async"
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
    </div>
  );
}

