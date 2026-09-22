import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { subirDocumento } from "@/app/admin/assets/actions";

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
    return <div className="mx-auto max-w-lg px-6 py-10">Activo no encontrado.</div>;
  }

  const docsResult = await pool.query(
    `select id, title, document_type, created_at from asset_documents
     where tenant_id = $1 and asset_id = $2 order by created_at desc`,
    [appUser.tenant_id, id]
  );

  const subirDocumentoDeEsteActivo = subirDocumento.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-bold">{asset.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {asset.tag_code} · {asset.model || "sin modelo"} · {asset.status}
      </p>

      <h2 className="mb-2 font-semibold">Manuales y documentos</h2>
      {docsResult.rows.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">Todavía no hay documentos cargados para este activo.</p>
      ) : (
        <ul className="mb-4 divide-y rounded border">
          {docsResult.rows.map((doc) => (
            <li key={doc.id} className="px-4 py-2 text-sm">
              {doc.title} <span className="text-gray-400">({doc.document_type})</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mb-4 text-xs text-gray-400">
        Los documentos quedan guardados y listos para indexar en el asistente IA apenas esté conectada la
        integración con Anthropic/Voyage — hoy solo se almacenan.
      </p>

      <form action={subirDocumentoDeEsteActivo} className="flex flex-col gap-3 rounded border p-4">
        <label className="text-sm font-medium">
          Título del documento *
          <input name="title" required className="mt-1 w-full rounded border px-3 py-2" placeholder="Manual de operación MT65S" />
        </label>
        <label className="text-sm font-medium">
          Tipo
          <select name="document_type" defaultValue="operacion" className="mt-1 w-full rounded border px-3 py-2">
            <option value="operacion">Operación</option>
            <option value="servicio">Servicio</option>
            <option value="reparacion">Reparación</option>
            <option value="partes">Partes</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Archivo (PDF) *
          <input type="file" name="file" accept="application/pdf" required className="mt-1 w-full" />
        </label>
        <button type="submit" className="mt-2 rounded bg-black px-4 py-2 text-white">
          Subir documento
        </button>
      </form>
    </div>
  );
}
