import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { subirDocumento } from "@/app/admin/assets/actions";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { FileDropzone } from "@/app/admin/_components/FileDropzone";

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

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const appUser = await requireAdmin();
  const { id } = await params;

  const assetResult = await pool.query(
    `select id, tag_code, name, model, serial_number, status, location, hour_meter
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
    `select id, title, document_type, created_at from asset_documents
     where tenant_id = $1 and asset_id = $2 order by created_at desc`,
    [appUser.tenant_id, id]
  );

  const subirDocumentoDeEsteActivo = subirDocumento.bind(null, id);

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
          <div>
            <h1>{asset.name}</h1>
            <p className="meta">
              <b>{asset.tag_code}</b> · {asset.model || "sin modelo"} · {asset.location || "sin ubicación"}
            </p>
          </div>
          <span className={`status-pill ${STATUS_CLASS[asset.status] || "warn"}`}>
            <span className="dot" />
            {STATUS_LABEL[asset.status] || asset.status}
          </span>
        </div>

        <p className="section-label">Manuales y documentos</p>

        {docsResult.rows.length === 0 ? (
          <div className="admin-empty" style={{ marginBottom: 24 }}>
            Todavía no hay documentos cargados para este activo.
          </div>
        ) : (
          <div className="doc-list">
            {docsResult.rows.map((doc) => (
              <div key={doc.id} className="doc-row">
                <div className="ic">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M7 3h7l5 5v13H7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="txt">
                  <strong>{doc.title}</strong>
                  <small>{new Date(doc.created_at).toLocaleDateString("es-CL")}</small>
                </div>
                <span className="badge">{DOC_TYPE_LABEL[doc.document_type] || doc.document_type}</span>
              </div>
            ))}
          </div>
        )}

        <p className="index-note">
          Los documentos quedan guardados y listos para indexar en el asistente IA apenas esté conectada la
          integración con Anthropic/Voyage — hoy solo se almacenan, todavía no son buscables por el asistente.
        </p>

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
      </div>
    </>
  );
}
