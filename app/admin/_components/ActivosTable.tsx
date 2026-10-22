"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import { eliminarActivo } from "../assets/actions";

export type AssetListItem = {
  id: string;
  tag_code: string;
  name: string;
  model: string | null;
  manufacturer: string | null;
  status: string;
  location: string | null;
  asset_type: string | null;
  photo_url?: string | null;
  hour_meter?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  operativo: { label: "Operativo", cls: "ok" },
  mantenimiento: { label: "Mantención", cls: "warn" },
  fuera_de_servicio: { label: "Fuera de servicio", cls: "err" },
};

export function ActivosTable({ assets }: { assets: AssetListItem[] }) {
  const [items, setItems] = useState<AssetListItem[]>(assets);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(assets);
  }, [assets]);

  const handleDelete = (asset: AssetListItem) => {
    const ok = window.confirm(
      `¿Eliminar el activo "${asset.name}" (${asset.tag_code})?\n\nEsta acción borrará permanentemente el equipo, su historial, intervenciones, fichas técnicas y documentos asociados. No se puede deshacer.`
    );
    if (!ok) return;

    setDeletingId(asset.id);
    startTransition(async () => {
      // Eliminación optimista en el cliente
      setItems((prev) => prev.filter((a) => a.id !== asset.id));
      try {
        await eliminarActivo(asset.id);
      } catch (err) {
        setItems(assets);
        alert("Error al eliminar el activo: " + ((err as Error)?.message || "Error desconocido"));
      } finally {
        setDeletingId(null);
      }
    });
  };

  // Lista única de tipos para el filtro
  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>();
    items.forEach((a) => {
      if (a.asset_type) set.add(a.asset_type);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtrado reactivo
  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((asset) => {
      if (selectedType !== "todos" && asset.asset_type !== selectedType) {
        return false;
      }
      if (selectedStatus !== "todos" && asset.status !== selectedStatus) {
        return false;
      }
      if (!q) return true;

      const matchName = asset.name.toLowerCase().includes(q);
      const matchTag = asset.tag_code.toLowerCase().includes(q);
      const matchModel = (asset.model || "").toLowerCase().includes(q);
      const matchManuf = (asset.manufacturer || "").toLowerCase().includes(q);
      const matchLoc = (asset.location || "").toLowerCase().includes(q);

      return matchName || matchTag || matchModel || matchManuf || matchLoc;
    });
  }, [items, search, selectedType, selectedStatus]);

  // Paginación
  const totalItems = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedAssets = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filtrados.slice(start, start + pageSize);
  }, [filtrados, activePage, pageSize]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedType("todos");
    setSelectedStatus("todos");
    setCurrentPage(1);
  };

  return (
    <div className="activos-list-wrapper">
      {/* Barra de Filtros y Búsqueda */}
      <div className="activos-filter-bar">
        <div className="activos-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="activos-search-icon">
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
            placeholder="Buscar por nombre, código tag (TS-CAEX...), modelo o faena..."
            className="activos-search-input"
          />
          {search && (
            <button
              type="button"
              className="activos-search-clear"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              title="Borrar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        <div className="activos-filter-selects">
          <div className="select-wrap">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="activos-select"
            >
              <option value="todos">Todos los tipos ({items.length})</option>
              {tiposDisponibles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="select-wrap">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="activos-select"
            >
              <option value="todos">Todos los estados</option>
              <option value="operativo">Operativo</option>
              <option value="mantenimiento">Mantención</option>
              <option value="fuera_de_servicio">Fuera de servicio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Listado de Activos */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table activos-table">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>Equipo / Modelo</th>
                <th style={{ width: "14%" }}>Código Tag</th>
                <th style={{ width: "14%" }}>Tipo de Activo</th>
                <th style={{ width: "12%" }}>Estado</th>
                <th style={{ width: "12%" }}>Ubicación</th>
                <th style={{ width: "22%", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    <p style={{ margin: "0 0 10px", color: "var(--text-mid)" }}>
                      No se encontraron activos que coincidan con la búsqueda.
                    </p>
                    <button type="button" className="btn-outline btn-sm" onClick={handleResetFilters}>
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset) => {
                  const statusInfo = STATUS_CONFIG[asset.status] || {
                    label: asset.status,
                    cls: "warn",
                  };
                  return (
                    <tr key={asset.id} className="activos-table-row">
                      {/* Columna Equipo */}
                      <td>
                        <Link href={`/admin/assets/${asset.id}`} className="activos-item-link">
                          <div className="activos-item-thumb">
                            {asset.photo_url ? (
                              <img
                                src={asset.photo_url}
                                alt={asset.name}
                                loading="lazy"
                                decoding="async"
                                width={44}
                                height={44}
                              />
                            ) : (
                              <span className="activos-thumb-placeholder">🚜</span>
                            )}
                          </div>
                          <div className="activos-item-names">
                            <span className="activos-item-title">{asset.name}</span>
                            <span className="activos-item-subtitle">
                              {asset.manufacturer ? `${asset.manufacturer} · ` : ""}
                              {asset.model || "Modelo estándar"}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Columna Código Tag */}
                      <td>
                        <span className="activos-tag-code-badge">
                          {asset.tag_code}
                        </span>
                      </td>

                      {/* Columna Tipo */}
                      <td>
                        <span className="activos-type-pill">
                          {asset.asset_type || "Sin clasificar"}
                        </span>
                      </td>

                      {/* Columna Estado */}
                      <td>
                        <span className={`status-pill ${statusInfo.cls}`}>
                          <span className="dot" />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Columna Ubicación */}
                      <td>
                        <span className="activos-location-text">
                          {asset.location || "No asignada"}
                        </span>
                      </td>

                      {/* Columna Acciones */}
                      <td style={{ textAlign: "right" }}>
                        <div className="activos-row-actions">
                          <Link
                            href={`/admin/assets/${asset.id}/edit`}
                            className="activos-action-btn"
                            title="Editar datos del activo (nombre, modelo, estado, faena)"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Editar</span>
                          </Link>
                          <Link
                            href={`/admin/assets/${asset.id}/ficha`}
                            className="activos-action-btn"
                            title="Editar ficha técnica y componentes"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Ficha</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(asset)}
                            disabled={deletingId === asset.id || isPending}
                            className="activos-action-btn danger"
                            title={`Eliminar activo ${asset.name}`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>{deletingId === asset.id ? "Borrando..." : "Eliminar"}</span>
                          </button>
                          <Link
                            href={`/admin/assets/${asset.id}`}
                            className="activos-action-btn primary"
                            title="Ver detalle del activo"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación */}
        {totalItems > 0 && (
          <div className="admin-pagination-bar">
            <div className="admin-pagination-info">
              Mostrando{" "}
              <b>
                {(activePage - 1) * pageSize + 1}–
                {Math.min(activePage * pageSize, totalItems)}
              </b>{" "}
              de <b>{totalItems}</b> activo{totalItems === 1 ? "" : "s"}
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
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const num = idx + 1;
                  // Si hay muchas páginas, mostrar sólo rango cercano
                  if (
                    totalPages > 7 &&
                    num !== 1 &&
                    num !== totalPages &&
                    Math.abs(num - activePage) > 1
                  ) {
                    if (num === 2 || num === totalPages - 1) {
                      return <span key={num} className="admin-pagination-ellipsis">…</span>;
                    }
                    return null;
                  }

                  return (
                    <button
                      key={num}
                      type="button"
                      className={`admin-pagination-num ${num === activePage ? "active" : ""}`}
                      onClick={() => setCurrentPage(num)}
                    >
                      {num}
                    </button>
                  );
                })}
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
    </div>
  );
}
