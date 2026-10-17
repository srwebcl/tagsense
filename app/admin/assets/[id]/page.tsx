import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { subirDocumento, reindexarDocumento, eliminarActivo, subirFotoActivo, resolverSolicitudAdmin } from "@/app/admin/assets/actions";
import { uploads } from "@/lib/storage";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { FileDropzone } from "@/app/admin/_components/FileDropzone";
import { DeleteAssetButton } from "@/app/admin/_components/DeleteAssetButton";

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
      <>
        <AdminTopbar userName={appUser.full_name || appUser.email} />
        <div className="admin-container">
          <div className="admin-empty">Activo no encontrado.</div>
        </div>
      </>
    );
  }

  const docsResult = await pool.query(
    `select id, title, document_type, created_at, index_status, index_error from asset_documents
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
  const subirFotoDeEsteActivo = subirFotoActivo.bind(null, id);
  const resolverSolicitudDeEsteActivo = resolverSolicitudAdmin.bind(null, id);
  const photoUrl = asset.photo_url ? await uploads.url(asset.photo_url, { expiresIn: 3600 }) : null;

  return (
    <>
      <AdminTopbar userName={appUser.full_name || appUser.email} />
      <div className="admin-container" style={{ maxWidth: 640 }}>
        <Link href="/admin" className="link-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Activos
        </Link>

        <div className="asset-head">
          <div className="asset-head-id">
            {photoUrl ? (
              <img src={photoUrl} alt={asset.name} className="asset-photo" />
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
          <span className={`status-pill ${STATUS_CLASS[asset.status] || "warn"}`}>
            <span className="dot" />
            {STATUS_LABEL[asset.status] || asset.status}
          </span>
        </div>

        <p className="section-label">Código QR del tag</p>
        <div className="admin-panel qr-panel">
          <img src={`/api/assets/${asset.tag_code}/qrcode`} alt={`QR de ${asset.tag_code}`} width={160} height={160} className="qr-preview" />
          <div className="qr-panel-info">
            <p className="qr-panel-code">{asset.tag_code}</p>
            <p className="qr-panel-hint">
              Se genera solo a partir del código del tag — imprímelo y pégalo en el equipo. Cualquier cámara lo
              reconoce; si el celular no tiene la app, igual abre la ficha en el navegador.
            </p>
            <a href={`/api/assets/${asset.tag_code}/qrcode?download=1`} className="btn-outline" download={`qr-${asset.tag_code}.png`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Descargar QR
            </a>
          </div>
        </div>

        <p className="section-label">Manuales y documentos</p>

        {docsResult.rows.length === 0 ? (
          <div className="admin-empty" style={{ marginBottom: 24 }}>
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
                  <span className="badge">{DOC_TYPE_LABEL[doc.document_type] || doc.document_type}</span>
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

        <p className="index-note">
          Los documentos se indexan solos al subirlos (texto → embeddings con Voyage AI) para que el asistente
          pueda buscarlos. Puede tardar unos segundos; si queda en &quot;Falló&quot;, probablemente el PDF es un
          escaneo sin texto real (necesitaría OCR, no soportado todavía).
        </p>

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

        <div className="admin-panel">
          <p className="section-label" style={{ marginBottom: 18 }}>{photoUrl ? "Cambiar foto" : "Foto principal"}</p>
          <form action={subirFotoDeEsteActivo}>
            <div className="field">
              <FileDropzone
                name="photo"
                accept="image/*"
                label={photoUrl ? "Elegir nueva foto" : "Elegir foto del activo"}
                hint="Se muestra en la ficha de la app de campo."
              />
            </div>
            <SubmitButton>{photoUrl ? "Reemplazar foto" : "Subir foto"}</SubmitButton>
          </form>
        </div>

        <div className="admin-panel">
          <p className="section-label" style={{ marginBottom: 18 }}>Subir documento</p>
          <form action={subirDocumentoDeEsteActivo}>
            <div className="field">
              <label>Título <span className="req">*</span></label>
              <div className="input-wrap">
                <input name="title" required placeholder="Manual de operación MT65S" />
              </div>
            </div>

            <div className="field">
              <label>Tipo de documento</label>
              <div className="chip-group">
                <input type="radio" name="document_type" id="dt-op" value="operacion" defaultChecked />
                <label htmlFor="dt-op">Operación</label>
                <input type="radio" name="document_type" id="dt-sv" value="servicio" />
                <label htmlFor="dt-sv">Servicio</label>
                <input type="radio" name="document_type" id="dt-rp" value="reparacion" />
                <label htmlFor="dt-rp">Reparación</label>
                <input type="radio" name="document_type" id="dt-pt" value="partes" />
                <label htmlFor="dt-pt">Partes</label>
              </div>
            </div>

            <div className="field">
              <label>Archivo (PDF) <span className="req">*</span></label>
              <FileDropzone name="file" accept="application/pdf" />
            </div>

            <SubmitButton>Subir documento</SubmitButton>
          </form>
        </div>

        <div className="danger-zone">
          <p className="section-label">Zona de riesgo</p>
          <DeleteAssetButton assetName={asset.name} action={eliminarEsteActivo} />
        </div>
      </div>
    </>
  );
}
