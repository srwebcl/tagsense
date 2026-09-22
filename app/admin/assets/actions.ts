"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";

export async function crearActivo(formData: FormData) {
  const appUser = await requireAdmin();

  const tagCode = String(formData.get("tag_code") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!tagCode || !name) {
    throw new Error("tag_code y name son obligatorios.");
  }

  const result = await pool.query(
    `insert into assets (tenant_id, tag_code, name, model, serial_number, status, location)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [
      appUser.tenant_id,
      tagCode,
      name,
      String(formData.get("model") || "").trim() || null,
      String(formData.get("serial_number") || "").trim() || null,
      String(formData.get("status") || "operativo"),
      String(formData.get("location") || "").trim() || null,
    ]
  );

  redirect(`/admin/assets/${result.rows[0].id}`);
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

  await pool.query(
    `insert into asset_documents (tenant_id, asset_id, title, document_type, file_url, uploaded_by)
     values ($1, $2, $3, $4, $5, $6)`,
    [appUser.tenant_id, assetId, title, documentType, key, appUser.id]
  );

  redirect(`/admin/assets/${assetId}`);
}
