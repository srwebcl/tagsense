"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { indexDocument } from "@/lib/indexing";
import { detectImageKind, isPdf } from "@/lib/file-validation";

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

  // specs es jsonb freeform (ver 0005_asset_fields.sql) — solo se guardan las
  // claves que el técnico realmente completó, para no mostrar filas vacías
  // en "Información General" (ver setFilaOpcional en app.js).
  const specsFields: Record<string, string> = {
    country_of_origin: "specs_country_of_origin",
    operating_weight: "specs_operating_weight",
    load_capacity: "specs_load_capacity",
    engine_type: "specs_engine_type",
    power: "specs_power",
  };
  const specs: Record<string, string> = {};
  for (const [key, field] of Object.entries(specsFields)) {
    const val = String(formData.get(field) || "").trim();
    if (val) specs[key] = val;
  }

  let result;
  try {
    result = await pool.query(
      `insert into assets
         (tenant_id, tag_code, name, model, serial_number, status, location,
          asset_type, manufacturer, manufacture_year, specs)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        JSON.stringify(specs),
      ]
    );
  } catch (err) {
    // Código 23505 = unique_violation en Postgres — acá siempre es
    // unique(tenant_id, tag_code) (ver 0001_init_schema.sql), el único unique
    // constraint de esta tabla alcanzable desde este formulario.
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      throw new Error(`Ya existe un activo con el código "${tagCode}".`);
    }
    console.error("[crearActivo] error al insertar el activo:", err);
    throw new Error("No se pudo crear el activo. Intenta de nuevo.");
  }
  const assetId = result.rows[0].id;

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    await guardarFotoActivo(appUser.tenant_id, assetId, photo);
  }

  redirect(`/admin/assets/${assetId}`);
}

const IMAGE_CONTENT_TYPE: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

async function guardarFotoActivo(tenantId: string, assetId: string, photo: File) {
  const bytes = new Uint8Array(await photo.arrayBuffer());
  // `photo.type` lo arma el navegador según la extensión del archivo elegido —
  // no protege de un archivo con otro contenido real. Se valida la firma de
  // bytes en vez de confiar en el content-type declarado por el cliente.
  const kind = detectImageKind(bytes);
  if (!kind) {
    throw new Error("El archivo debe ser una imagen JPEG, PNG o WEBP válida.");
  }

  const key = `asset-photos/${tenantId}/${assetId}/${randomUUID()}-${photo.name}`;
  await uploads.upload(key, bytes, { contentType: IMAGE_CONTENT_TYPE[kind] });
  await pool.query(`update assets set photo_url = $1 where tenant_id = $2 and id = $3`, [key, tenantId, assetId]);
}

export async function subirFotoActivo(assetId: string, formData: FormData) {
  const appUser = await requireAdmin();

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("Falta la foto.");
  }

  const assetResult = await pool.query(
    `select id from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, assetId]
  );
  if (!assetResult.rows[0]) {
    throw new Error("Activo no encontrado.");
  }

  await guardarFotoActivo(appUser.tenant_id, assetId, photo);
  redirect(`/admin/assets/${assetId}`);
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

  // Borra los archivos del bucket (documentos y foto) antes de la fila — si se
  // hiciera al revés y fallara el borrado del bucket, quedaría un activo
  // "fantasma" sin archivos.
  const prefixes = [`documents/${appUser.tenant_id}/${assetId}/`, `asset-photos/${appUser.tenant_id}/${assetId}/`];
  for (const prefix of prefixes) {
    const listed = await uploads.list({ prefix });
    await Promise.all(listed.items.map((f) => uploads.delete(f.key)));
  }

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

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) {
    throw new Error("El documento debe ser un PDF válido.");
  }

  const key = `documents/${appUser.tenant_id}/${assetId}/${randomUUID()}-${file.name}`;
  await uploads.upload(key, bytes, { contentType: "application/pdf" });

  const docResult = await pool.query(
    `insert into asset_documents (tenant_id, asset_id, title, document_type, file_url, uploaded_by)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [appUser.tenant_id, assetId, title, documentType, key, appUser.id]
  );

  // Indexado (extraer texto, generar embeddings) corre después de responder —
  // subir un manual grande no debe bloquear la UI (ver skill rag-assistant).
  const documentId = docResult.rows[0].id;
  after(() => indexDocument(documentId, appUser.tenant_id));

  redirect(`/admin/assets/${assetId}`);
}

export async function reindexarDocumento(assetId: string, documentId: string) {
  const appUser = await requireAdmin();

  // documentId llega como argumento vinculado de un Server Action — eso lo manda
  // de vuelta en el POST, no lo protege de manipulación. Se confirma que el
  // documento sea de este tenant (y de este activo) antes de disparar un
  // reindexado costoso o tocar su estado.
  const docResult = await pool.query(
    `select id from asset_documents where tenant_id = $1 and asset_id = $2 and id = $3 limit 1`,
    [appUser.tenant_id, assetId, documentId]
  );
  if (!docResult.rows[0]) {
    throw new Error("Documento no encontrado.");
  }

  after(() => indexDocument(documentId, appUser.tenant_id));
  redirect(`/admin/assets/${assetId}`);
}

export async function resolverSolicitudAdmin(assetId: string, requestId: string) {
  const appUser = await requireAdmin();
  await pool.query(
    `update maintenance_requests
     set estado = 'Resuelta', resolved_by = $1, resolved_at = now()
     where tenant_id = $2 and id = $3 and estado = 'Abierta'`,
    [appUser.id, appUser.tenant_id, requestId]
  );
  redirect(`/admin/assets/${assetId}`);
}
