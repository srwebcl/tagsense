"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { indexDocument } from "@/lib/indexing";

function parseYear(raw: FormDataEntryValue | null): number | null {
  const n = parseInt(String(raw || "").trim(), 10);
  return Number.isFinite(n) && n > 1900 && n < 2100 ? n : null;
}

export async function crearActivo(formData: FormData) {
  const appUser = await requireAdmin();

  const tagCode = String(formData.get("tag_code") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!tagCode || !name) {
    throw new Error("tag_code y name son obligatorios.");
  }

  const result = await pool.query(
    `insert into assets
       (tenant_id, tag_code, name, model, serial_number, status, location,
        asset_type, manufacturer, manufacture_year)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id`,
    [
      appUser.tenant_id,
      tagCode,
      name,
      String(formData.get("model") || "").trim() || null,
      String(formData.get("serial_number") || "").trim() || null,
      String(formData.get("status") || "operativo"),
      String(formData.get("location") || "").trim() || null,
      String(formData.get("asset_type") || "").trim() || null,
      String(formData.get("manufacturer") || "").trim() || null,
      parseYear(formData.get("manufacture_year")),
    ]
  );

  redirect(`/admin/assets/${result.rows[0].id}`);
}

export async function eliminarActivo(assetId: string) {
  const appUser = await requireAdmin();

  const assetResult = await pool.query(
    `select id from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, assetId]
  );
  if (!assetResult.rows[0]) {
    throw new Error("Activo no encontrado.");
  }

  // Borra los PDFs del bucket antes de la fila — si se hiciera al revés y
  // fallara el borrado del bucket, quedaría un activo "fantasma" sin archivos.
  const prefix = `documents/${appUser.tenant_id}/${assetId}/`;
  const listed = await uploads.list({ prefix });
  await Promise.all(listed.items.map((f) => uploads.delete(f.key)));

  // interventions, asset_documents (y en cascada intervention_photos, reports,
  // document_chunks) se borran solos — ver "on delete cascade" en 0001_init_schema.sql.
  await pool.query(`delete from assets where tenant_id = $1 and id = $2`, [appUser.tenant_id, assetId]);

  redirect("/admin");
}

export async function subirDocumento(assetId: string, formData: FormData) {
  const appUser = await requireAdmin();

  const file = formData.get("file");
  const title = String(formData.get("title") || "").trim();
  const documentType = String(formData.get("document_type") || "operacion");
  if (!(file instanceof File) || !title) {
    throw new Error("Falta el archivo o el título del documento.");
  }

  // Confirma que el activo es de este tenant antes de asociarle un documento.
  const assetResult = await pool.query(
    `select id from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, assetId]
  );
  if (!assetResult.rows[0]) {
    throw new Error("Activo no encontrado.");
  }

  const key = `documents/${appUser.tenant_id}/${assetId}/${randomUUID()}-${file.name}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await uploads.upload(key, bytes, { contentType: file.type || "application/pdf" });

  const docResult = await pool.query(
    `insert into asset_documents (tenant_id, asset_id, title, document_type, file_url, uploaded_by)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [appUser.tenant_id, assetId, title, documentType, key, appUser.id]
  );

  // Indexado (extraer texto, generar embeddings) corre después de responder —
  // subir un manual grande no debe bloquear la UI (ver skill rag-assistant).
  const documentId = docResult.rows[0].id;
  after(() => indexDocument(documentId));

  redirect(`/admin/assets/${assetId}`);
}

export async function reindexarDocumento(assetId: string, documentId: string) {
  await requireAdmin();
  after(() => indexDocument(documentId));
  redirect(`/admin/assets/${assetId}`);
}
