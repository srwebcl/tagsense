"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { indexDocument, indexSimulatedText } from "@/lib/indexing";
import { detectImageKind, isPdf } from "@/lib/file-validation";

function parseYear(raw: FormDataEntryValue | null): number | null {
  const n = parseInt(String(raw || "").trim(), 10);
  return Number.isFinite(n) && n > 1900 && n < 2100 ? n : null;
}

// specs es jsonb freeform (ver 0005_asset_fields.sql) — solo se guardan las
// claves que el técnico realmente completó, para no mostrar filas vacías
// en "Información General" (ver setFilaOpcional en app.js). Comparte el mapeo
// entre crearActivo y actualizarActivo porque ambos formularios usan los mismos
// nombres de campo (ver app/admin/assets/new/page.tsx y .../[id]/edit/page.tsx).
const SPECS_FIELDS: Record<string, string> = {
  country_of_origin: "specs_country_of_origin",
  operating_weight: "specs_operating_weight",
  load_capacity: "specs_load_capacity",
  engine_type: "specs_engine_type",
  power: "specs_power",
};

function construirSpecsDesdeFormData(formData: FormData): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const [key, field] of Object.entries(SPECS_FIELDS)) {
    const val = String(formData.get(field) || "").trim();
    if (val) specs[key] = val;
  }
  return specs;
}

// "Tipo de activo" es un select con catálogo real por tenant (ver
// 0012_asset_types.sql) que crece solo desde este mismo formulario: cualquier
// tipo que se use al crear o editar un activo queda disponible para la próxima
// vez, sin necesitar una pantalla de administración aparte.
async function registrarTipoDeActivo(tenantId: string, assetType: string | null) {
  if (!assetType) return;
  await pool.query(
    `insert into asset_types (tenant_id, name) values ($1, $2) on conflict (tenant_id, name) do nothing`,
    [tenantId, assetType]
  );
}

export async function crearActivo(formData: FormData) {
  const appUser = await requireAdmin();

  const tagCode = String(formData.get("tag_code") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!tagCode || !name) {
    throw new Error("tag_code y name son obligatorios.");
  }

  const specs = construirSpecsDesdeFormData(formData);
  const assetType = String(formData.get("asset_type") || "").trim() || null;

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
        assetType,
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
  await registrarTipoDeActivo(appUser.tenant_id, assetType);

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    await guardarFotoActivo(appUser.tenant_id, assetId, photo);
  }

  // Sin esto, volver al listado después de crear mostraba la versión cacheada
  // de antes del alta — había que recargar la página a mano para verlo (ver
  // "Place revalidation calls before redirect" en los docs de Server Actions).
  revalidatePath("/admin");
  redirect(`/admin/assets/${assetId}`);
}

// tag_code no se edita acá a propósito: es el código físico ya impreso/grabado
// en el QR/NFC pegado al equipo — cambiarlo en la base de datos sin reemplazar
// el tag físico dejaría el QR escaneado apuntando a un activo que ya no existe
// con ese código.
export async function actualizarActivo(assetId: string, formData: FormData) {
  const appUser = await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  const assetResult = await pool.query(
    `select id from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, assetId]
  );
  if (!assetResult.rows[0]) {
    throw new Error("Activo no encontrado.");
  }

  const specs = construirSpecsDesdeFormData(formData);
  const assetType = String(formData.get("asset_type") || "").trim() || null;

  await pool.query(
    `update assets set
       name = $1, model = $2, serial_number = $3, status = $4, location = $5,
       asset_type = $6, manufacturer = $7, manufacture_year = $8, specs = $9
     where tenant_id = $10 and id = $11`,
    [
      name,
      String(formData.get("model") || "").trim() || null,
      String(formData.get("serial_number") || "").trim() || null,
      String(formData.get("status") || "operativo"),
      String(formData.get("location") || "").trim() || null,
      assetType,
      String(formData.get("manufacturer") || "").trim() || null,
      parseYear(formData.get("manufacture_year")),
      JSON.stringify(specs),
      appUser.tenant_id,
      assetId,
    ]
  );
  await registrarTipoDeActivo(appUser.tenant_id, assetType);

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    await guardarFotoActivo(appUser.tenant_id, assetId, photo);
  }

  // La ficha del activo (destino del redirect) ya se visitó antes de llegar
  // acá (el botón "Editar" vive en esa misma página) — sin revalidar queda
  // la versión cacheada de antes del cambio.
  revalidatePath(`/admin/assets/${assetId}`);
  revalidatePath("/admin");
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
  // Sin esto, la foto recién subida no se veía hasta recargar la página a
  // mano — la ficha del activo ya estaba en la caché del router desde antes.
  revalidatePath(`/admin/assets/${assetId}`);
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

  // Sin esto, el activo borrado seguía apareciendo en el listado hasta
  // recargar la página a mano.
  revalidatePath("/admin");
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

  revalidatePath(`/admin/assets/${assetId}`);
  redirect(`/admin/assets/${assetId}`);
}

// Para un activo recién creado que todavía no tiene un manual PDF real: el
// admin escribe/pega la información técnica a mano y entra al MISMO pipeline
// de indexado (chunking + embeddings) que un PDF subido — así el asistente
// IA también "funciona" para este activo, sin mezclar su contexto con el de
// ningún otro (document_chunks sigue filtrando por asset_id, igual que con un
// documento real — ver app/api/assistant/chat/route.ts).
export async function crearInformacionSimulada(assetId: string, formData: FormData) {
  const appUser = await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!title || !content) {
    throw new Error("Falta el título o el contenido de la información simulada.");
  }

  const assetResult = await pool.query(
    `select id from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, assetId]
  );
  if (!assetResult.rows[0]) {
    throw new Error("Activo no encontrado.");
  }

  const docResult = await pool.query(
    `insert into asset_documents (tenant_id, asset_id, title, file_url, raw_text, source_type, uploaded_by)
     values ($1, $2, $3, null, $4, 'simulated', $5)
     returning id`,
    [appUser.tenant_id, assetId, title, content, appUser.id]
  );

  const documentId = docResult.rows[0].id;
  after(() => indexSimulatedText(documentId, appUser.tenant_id));

  revalidatePath(`/admin/assets/${assetId}`);
  redirect(`/admin/assets/${assetId}`);
}

export async function reindexarDocumento(assetId: string, documentId: string) {
  const appUser = await requireAdmin();

  // documentId llega como argumento vinculado de un Server Action — eso lo manda
  // de vuelta en el POST, no lo protege de manipulación. Se confirma que el
  // documento sea de este tenant (y de este activo) antes de disparar un
  // reindexado costoso o tocar su estado.
  const docResult = await pool.query(
    `select id, source_type from asset_documents where tenant_id = $1 and asset_id = $2 and id = $3 limit 1`,
    [appUser.tenant_id, assetId, documentId]
  );
  const doc = docResult.rows[0];
  if (!doc) {
    throw new Error("Documento no encontrado.");
  }

  if (doc.source_type === "simulated") {
    after(() => indexSimulatedText(documentId, appUser.tenant_id));
  } else {
    after(() => indexDocument(documentId, appUser.tenant_id));
  }
  revalidatePath(`/admin/assets/${assetId}`);
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
  revalidatePath(`/admin/assets/${assetId}`);
  redirect(`/admin/assets/${assetId}`);
}
