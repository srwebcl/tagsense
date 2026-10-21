"use client";

import { useState, useMemo, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { PlantillaPorTipo } from "@/app/admin/_components/PlantillaPorTipo";

type ItemCatalogo = { key: string; label: string; count: number };

function BotonAgregar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline" disabled={pending} style={{ flexShrink: 0, height: 40, padding: "0 18px" }}>
      {pending ? "Agregando…" : "+ Agregar"}
    </button>
  );
}

function PaginatedCatalogTable({
  items,
  unidad,
  fieldName,
  placeholder,
  crearAction,
  editarAction,
  eliminarAction,
  pageSize = 7,
}: {
  items: ItemCatalogo[];
  unidad: string;
  fieldName: string;
  placeholder: string;
  crearAction: (formData: FormData) => Promise<void>;
  editarAction?: (key: string, nuevoNombre: string) => Promise<void>;
  eliminarAction: (key: string) => Promise<void>;
  pageSize?: number;
}) {
  const [lista, setLista] = useState(items);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Mantener sincronizado si items cambia
  useMemo(() => {
    setLista(items);
  }, [items]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
  }, [lista, search]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginados = filtrados.slice((activePage - 1) * pageSize, activePage * pageSize);

  const handleEliminar = (item: ItemCatalogo) => {
    const aviso =
      item.count > 0
        ? `"${item.label}" está en uso por ${item.count} ${unidad}${item.count === 1 ? "" : "s"}. Lo que ya existe no cambia, pero deja de estar disponible para futuros activos. ¿Eliminar igual?`
        : `¿Eliminar "${item.label}" del catálogo?`;
    if (!window.confirm(aviso)) return;

    setPendingKey(item.key);
    startTransition(async () => {
      setLista((prev) => prev.filter((i) => i.key !== item.key));
      try {
        await eliminarAction(item.key);
      } catch (err) {
        setLista((prev) => [...prev, item]);
        alert("Error al eliminar del catálogo: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setPendingKey(null);
      }
    });
  };

  const handleGuardarEdit = (item: ItemCatalogo) => {
    const nuevo = editValue.trim();
    if (!nuevo || !editarAction) return;
    if (nuevo === item.label) {
      setEditingKey(null);
      return;
    }

    setSavingKey(item.key);
    startTransition(async () => {
      // Optimistic update
      setLista((prev) =>
        prev.map((i) => (i.key === item.key ? { ...i, label: nuevo } : i))
      );
      setEditingKey(null);
      try {
        await editarAction(item.key, nuevo);
      } catch (err) {
        // Rollback on error
        setLista((prev) =>
          prev.map((i) => (i.key === item.key ? { ...i, label: item.label } : i))
        );
        alert("Error al actualizar: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setSavingKey(null);
      }
    });
  };

  return (
    <div className="admin-table-card">
      {/* Barra de creación rápida y búsqueda */}
      <div className="catalog-toolbar">
        <form action={crearAction} className="catalog-add-form">
          <input
            name={fieldName}
            required
            placeholder={placeholder}
            className="catalog-add-input"
          />
          <BotonAgregar />
        </form>

        <div className="catalog-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filtrar catálogo..."
            className="catalog-search-input"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="activos-search-clear">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tabla Listado */}
      <div className="admin-table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "42%" }}>Nombre del Elemento</th>
              <th style={{ width: "24%" }}>Identificador (Slug)</th>
              <th style={{ width: "16%" }}>Uso en Sistema</th>
              <th style={{ width: "18%", textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-table-empty">
                  No se encontraron elementos en este catálogo.
                </td>
              </tr>
            ) : (
              paginados.map((item) => {
                const isEditing = editingKey === item.key;
                return (
                  <tr key={item.key} className={`catalog-row ${isEditing ? "editing" : ""}`}>
                    <td>
                      {isEditing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleGuardarEdit(item);
                              } else if (e.key === "Escape") {
                                setEditingKey(null);
                              }
                            }}
                            className="catalog-edit-input"
                            autoFocus
                            placeholder="Nombre..."
                          />
                        </div>
                      ) : (
                        <span className="catalog-item-name">{item.label}</span>
                      )}
                    </td>
                    <td>
                      <code className="catalog-item-slug">{item.key}</code>
                    </td>
                    <td>
                      {item.count > 0 ? (
                        <span className="catalog-item-badge in-use">
                          {item.count} {unidad}{item.count === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="catalog-item-badge unused">Sin uso</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="catalog-row-actions">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="catalogo-guardar-btn"
                              disabled={savingKey === item.key || !editValue.trim()}
                              onClick={() => handleGuardarEdit(item)}
                            >
                              {savingKey === item.key ? "Guardando…" : "Guardar"}
                            </button>
                            <button
                              type="button"
                              className="catalogo-cancelar-btn"
                              onClick={() => setEditingKey(null)}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            {editarAction && (
                              <button
                                type="button"
                                className="catalogo-editar-btn"
                                onClick={() => {
                                  setEditingKey(item.key);
                                  setEditValue(item.label);
                                }}
                                title={`Editar nombre de "${item.label}"`}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                  <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>Editar</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="catalogo-eliminar-btn"
                              disabled={pendingKey === item.key || savingKey === item.key}
                              onClick={() => handleEliminar(item)}
                              title={`Eliminar "${item.label}"`}
                            >
                              {pendingKey === item.key ? "Borrando…" : "Eliminar"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {filtrados.length > 0 && (
        <div className="admin-pagination-bar">
          <div className="admin-pagination-info">
            Mostrando{" "}
            <b>
              {(activePage - 1) * pageSize + 1}–
              {Math.min(activePage * pageSize, filtrados.length)}
            </b>{" "}
            de <b>{filtrados.length}</b> elemento{filtrados.length === 1 ? "" : "s"}
          </div>

          <div className="admin-pagination-controls">
            <button
              type="button"
              className="admin-pagination-btn"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹ Anterior
            </button>
            <div className="admin-pagination-pages">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx + 1}
                  type="button"
                  className={`admin-pagination-num ${idx + 1 === activePage ? "active" : ""}`}
                  onClick={() => setCurrentPage(idx + 1)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="admin-pagination-btn"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CategoriasManager({
  tiposActivo,
  sistemas,
  tipos,
  plantillas,
  usoTipoActivo,
  usoSistema,
  usoTipoFicha,
  crearCategoriaFalla,
  editarCategoriaFalla,
  eliminarCategoriaFalla,
  crearTipoDeActivo,
  editarTipoDeActivo,
  eliminarTipoDeActivo,
  crearTipoFicha,
  editarTipoFicha,
  eliminarTipoFicha,
  alternarComponenteDeTipo,
}: {
  tiposActivo: string[];
  sistemas: { slug: string; name: string }[];
  tipos: { slug: string; name: string }[];
  plantillas: Record<string, string[]>;
  usoTipoActivo: Record<string, number>;
  usoSistema: Record<string, number>;
  usoTipoFicha: Record<string, number>;
  crearCategoriaFalla: (formData: FormData) => Promise<void>;
  editarCategoriaFalla: (slug: string, nuevoNombre: string) => Promise<void>;
  eliminarCategoriaFalla: (key: string) => Promise<void>;
  crearTipoDeActivo: (formData: FormData) => Promise<void>;
  editarTipoDeActivo: (nombreActual: string, nuevoNombre: string) => Promise<void>;
  eliminarTipoDeActivo: (key: string) => Promise<void>;
  crearTipoFicha: (formData: FormData) => Promise<void>;
  editarTipoFicha: (slug: string, nuevoNombre: string) => Promise<void>;
  eliminarTipoFicha: (key: string) => Promise<void>;
  alternarComponenteDeTipo: (assetType: string, categorySlug: string, activar: boolean) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"tiposActivo" | "sistemas" | "plantillas" | "seccionesFicha">("tiposActivo");

  return (
    <div className="categorias-manager">
      {/* Navegación por Pestañas */}
      <div className="admin-tabs-bar">
        {/* 1er lugar: Tipos de Activo */}
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "tiposActivo" ? "active" : ""}`}
          onClick={() => setActiveTab("tiposActivo")}
        >
          <span className="admin-tab-icon">🚜</span>
          <span>Tipos de Activo</span>
          <span className="admin-tab-badge">{tiposActivo.length}</span>
        </button>

        {/* 2do lugar: Componentes */}
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "sistemas" ? "active" : ""}`}
          onClick={() => setActiveTab("sistemas")}
        >
          <span className="admin-tab-icon">⚙️</span>
          <span>Componentes</span>
          <span className="admin-tab-badge">{sistemas.length}</span>
        </button>

        {/* 3er lugar: Plantillas por Activo */}
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "plantillas" ? "active" : ""}`}
          onClick={() => setActiveTab("plantillas")}
        >
          <span className="admin-tab-icon">🧩</span>
          <span>Plantillas por Activo</span>
        </button>

        {/* 4to lugar: Secciones por Ficha Técnica */}
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "seccionesFicha" ? "active" : ""}`}
          onClick={() => setActiveTab("seccionesFicha")}
        >
          <span className="admin-tab-icon">📋</span>
          <span>Secciones por Ficha Técnica</span>
          <span className="admin-tab-badge">{tipos.length}</span>
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="admin-tab-content">
        {activeTab === "tiposActivo" && (
          <div>
            <div className="tab-pane-header">
              <div>
                <h2>Tipos de Activo</h2>
                <p className="sub">
                  Clasificación de equipos mineros utilizada al crear nuevos activos y asignarles su plantilla de componentes. Puedes editar sus nombres para mantener el catálogo organizado.
                </p>
              </div>
            </div>
            <PaginatedCatalogTable
              items={tiposActivo.map((t) => ({ key: t, label: t, count: usoTipoActivo[t] || 0 }))}
              unidad="activo"
              fieldName="nombre_tipo_activo"
              placeholder="Nombre de nuevo tipo (ej: Perforadora subterránea)..."
              crearAction={crearTipoDeActivo}
              editarAction={editarTipoDeActivo}
              eliminarAction={eliminarTipoDeActivo}
              pageSize={8}
            />
          </div>
        )}

        {activeTab === "sistemas" && (
          <div>
            <div className="tab-pane-header">
              <div>
                <h2>Componentes</h2>
                <p className="sub">
                  Componentes del activo que conforman la Ficha Técnica y que el Asistente IA ofrece como opciones de diagnóstico en terreno. Puedes editar sus nombres o agregar nuevos.
                </p>
              </div>
            </div>
            <PaginatedCatalogTable
              items={sistemas.map((s) => ({ key: s.slug, label: s.name, count: usoSistema[s.slug] || 0 }))}
              unidad="activo"
              fieldName="nombre_categoria"
              placeholder="Nombre del nuevo componente (ej: Suspensión delantera)..."
              crearAction={crearCategoriaFalla}
              editarAction={editarCategoriaFalla}
              eliminarAction={eliminarCategoriaFalla}
              pageSize={8}
            />
          </div>
        )}

        {activeTab === "plantillas" && (
          <div>
            <div className="tab-pane-header">
              <div>
                <h2>Plantillas por Activo</h2>
                <p className="sub">
                  Define qué componentes trae por defecto un equipo nuevo al crearse según su tipo (ej: un camión tiene Tolva, una pala tiene Balde). Los cambios se guardan al instante.
                </p>
              </div>
            </div>
            <div className="admin-panel">
              <PlantillaPorTipo
                tiposActivo={tiposActivo}
                sistemas={sistemas}
                plantillas={plantillas}
                action={alternarComponenteDeTipo}
              />
            </div>
          </div>
        )}

        {activeTab === "seccionesFicha" && (
          <div>
            <div className="tab-pane-header">
              <div>
                <h2>Secciones por Ficha Técnica</h2>
                <p className="sub">
                  Dimensiones de información técnica por componente (Equipamiento, Fallas principales, Procedimientos) que alimentan la IA.
                </p>
              </div>
            </div>
            <PaginatedCatalogTable
              items={tipos.map((t) => ({ key: t.slug, label: t.name, count: usoTipoFicha[t.slug] || 0 }))}
              unidad="documento"
              fieldName="nombre_tipo"
              placeholder="Nueva sección de ficha..."
              crearAction={crearTipoFicha}
              editarAction={editarTipoFicha}
              eliminarAction={eliminarTipoFicha}
              pageSize={8}
            />
          </div>
        )}
      </div>
    </div>
  );
}
