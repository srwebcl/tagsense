import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import {
  subirDocumento,
  reindexarDocumento,
  eliminarActivo,
  resolverSolicitudAdmin,
} from "@/app/admin/assets/actions";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { DeleteAssetButton } from "@/app/admin/_components/DeleteAssetButton";
import { CopyTagLinkButton } from "@/app/admin/_components/CopyTagLinkButton";
import { UploadDocumentCard } from "./UploadDocumentCard";

const STATUS_LABEL: Record<string, string> = {
  operativo: "Operativo",
  mantenimiento: "Mantención",
  fuera_de_servicio: "Fuera de servicio",
};
const STATUS_CLASS: Record<string, string> = {
  operativo: "ok",
  mantenimiento: "warn",
  fuera_de_servicio: "err",
};
const DOC_TYPE_LABEL: Record<string, string> = {
  operacion: "Operación",
  servicio: "Servicio",
  reparacion: "Reparación",
  partes: "Partes",
};
const INDEX_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "warn" },
  processing: { label: "Indexando…", cls: "warn" },
  indexed: { label: "Indexado", cls: "ok" },
  failed: { label: "Falló", cls: "err" },
};
const PRIORIDAD_CLASS: Record<string, string> = {
  Baja: "ok",
  Media: "warn",
  Alta: "err",
  Urgente: "err",
};

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const appUser = await requireAdmin();
  const { id } = await params;

  const assetResult = await pool.query(
    `select id, tag_code, name, model, serial_number, status, location, hour_meter,
            asset_type, manufacturer, manufacture_year, photo_url
     from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, id]
  );
  const asset = assetResult.rows[0];

  if (!asset) {
    return (
      <AdminShell userName={appUser.full_name || appUser.email} userRole={appUser.role}>
        <div className="admin-container">
          <div className="admin-empty">Activo no encontrado.</div>
        </div>
      </AdminShell>
    );
  }

  const docsResult = await pool.query(
    `select id, title, document_type, source_type, created_at, index_status, index_error from asset_documents
     where tenant_id = $1 and asset_id = $2 order by created_at desc`,
    [appUser.tenant_id, id]
  );

  const solicitudesResult = await pool.query(
    `select id, folio, tipo, prioridad, componente, descripcion, estado, created_at, resolved_at
     from maintenance_requests where tenant_id = $1 and asset_id = $2 order by created_at desc`,
    [appUser.tenant_id, id]
  );

  const subirDocumentoDeEsteActivo = subirDocumento.bind(null, id);
  const reindexarDeEsteActivo = reindexarDocumento.bind(null, id);
  const eliminarEsteActivo = eliminarActivo.bind(null, id);
  const resolverSolicitudDeEsteActivo = resolverSolicitudAdmin.bind(null, id);
  const photoUrl = asset.photo_url
    ? `/api/assets/${id}/photo?v=${encodeURIComponent(asset.photo_url)}`
    : null;

  return (
    <AdminShell userName={appUser.full_name || appUser.email} userRole={appUser.role}>
      <div className="admin-container admin-container-wide">
        <Link href="/admin" className="link-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Activos
        </Link>

        <div className="asset-head">
          <div className="asset-head-id">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={asset.name}
                className="asset-photo"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div>
              <h1>{asset.name}</h1>
              <p className="meta">
                <b>{asset.tag_code}</b>
                {asset.asset_type ? ` · ${asset.asset_type}` : ""}
                {asset.manufacturer ? ` · ${asset.manufacturer}` : ""}
                {asset.model ? ` · ${asset.model}` : ""}
                {asset.manufacture_year ? ` · ${asset.manufacture_year}` : ""}
              </p>
              <p className="meta">
                {asset.serial_number ? `N° serie: ${asset.serial_number} · ` : ""}
                {asset.location || "sin ubicación"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
            <span className={`status-pill ${STATUS_CLASS[asset.status] || "warn"}`}>
              <span className="dot" />
              {STATUS_LABEL[asset.status] || asset.status}
            </span>
            <Link href={`/admin/assets/${id}/ficha`} className="btn-outline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 3v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              Ficha técnica
            </Link>
            <Link href={`/admin/assets/${id}/edit`} className="btn-outline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              Editar activo
            </Link>
          </div>
        </div>

        <div className="admin-section">
          <p className="section-label">Código QR del tag</p>
          <div className="admin-panel qr-panel">
            <img src={`/api/assets/${asset.tag_code}/qrcode`} alt={`QR de ${asset.tag_code}`} width={160} height={160} className="qr-preview" />
            <div className="qr-panel-info">
              <p className="qr-panel-code">{asset.tag_code}</p>
              <p className="qr-panel-hint">
                Código único asignado a este equipo. Escanea el código QR o vincula el enlace directo en el TAG físico para acceder a su ficha técnica en terreno.
              </p>
              <CopyTagLinkButton tagCode={asset.tag_code} />
              <div style={{ marginTop: 12 }}>
                <a href={`/api/assets/${asset.tag_code}/qrcode?download=1`} className="btn-outline" download={`qr-${asset.tag_code}.png`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Descargar QR (PNG)
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-section">
          <p className="section-label">Ficha técnica</p>
          <div className="admin-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 700, color: "var(--text-hi)" }}>
                Parámetros y sistemas del equipo
              </h3>
              <p className="sub" style={{ margin: 0, maxWidth: 520 }}>
                Información técnica, procedimientos y fallas por sistema que utiliza el asistente técnico en terreno.
              </p>
            </div>
            <Link href={`/admin/assets/${id}/ficha`} className="btn-outline">
              Abrir ficha técnica
            </Link>
          </div>
        </div>

        <div className="admin-section">
          <p className="section-label">Manuales y documentos</p>

          {docsResult.rows.length === 0 ? (
            <div className="admin-empty" style={{ marginBottom: 16 }}>
              Todavía no hay documentos cargados para este activo.
            </div>
          ) : (
            <div className="doc-list">
              {docsResult.rows.map((doc) => {
                const status = INDEX_STATUS[doc.index_status] || INDEX_STATUS.pending;
                return (
                  <div key={doc.id} className="doc-row">
                    <div className="ic">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 3h7l5 5v13H7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="txt">
                      <strong>{doc.title}</strong>
                      <small>
                        {new Date(doc.created_at).toLocaleDateString("es-CL")}
                        {doc.index_status === "failed" && doc.index_error ? ` · ${doc.index_error}` : ""}
                      </small>
                    </div>
                    <span className="badge">
                      {doc.source_type === "simulated" ? "Ficha técnica" : DOC_TYPE_LABEL[doc.document_type] || doc.document_type}
                    </span>
                    <span className={`status-pill ${status.cls}`}>
                      <span className="dot" />
                      {status.label}
                    </span>
                    {doc.index_status !== "indexed" && doc.index_status !== "processing" && (
                      <form action={reindexarDeEsteActivo.bind(null, doc.id)}>
                        <button type="submit" className="doc-reindex-btn" title="Reintentar indexado">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M21 12a9 9 0 1 1-3-6.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <UploadDocumentCard action={subirDocumentoDeEsteActivo} hasDocuments={docsResult.rows.length > 0} />
        </div>

        <div className="admin-section">
          <p className="section-label">Solicitudes de mantenimiento</p>

          {solicitudesResult.rows.length === 0 ? (
            <div className="admin-empty" style={{ marginBottom: 24 }}>
              Todavía no se han generado solicitudes desde los informes de campo.
            </div>
          ) : (
            <div className="doc-list" style={{ marginBottom: 24 }}>
              {solicitudesResult.rows.map((sm) => (
                <div key={sm.id} className="doc-row">
                  <div className="txt">
                    <strong>
                      {sm.folio} · {sm.tipo}
                    </strong>
                    <small>
                      {new Date(sm.created_at).toLocaleDateString("es-CL")}
                      {sm.descripcion ? ` · ${sm.descripcion}` : ""}
                    </small>
                  </div>
                  <span className={`status-pill ${PRIORIDAD_CLASS[sm.prioridad] || "warn"}`}>
                    <span className="dot" />
                    {sm.prioridad}
                  </span>
                  <span className={`status-pill ${sm.estado === "Resuelta" ? "ok" : "warn"}`}>
                    <span className="dot" />
                    {sm.estado}
                  </span>
                  {sm.estado === "Abierta" && (
                    <form action={resolverSolicitudDeEsteActivo.bind(null, sm.id)}>
                      <button type="submit" className="doc-reindex-btn" title="Marcar como resuelta">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="danger-zone">
          <p className="section-label">Zona de riesgo</p>
          <DeleteAssetButton assetName={asset.name} action={eliminarEsteActivo} />
        </div>
      </div>
    </AdminShell>
  );
}
