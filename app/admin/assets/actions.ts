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
import { listarTiposFicha, listarSlugsDeTipoDeActivo, slugificar } from "@/lib/fault-categories";

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

  // Si el tipo elegido tiene una plantilla de sistemas definida (ver
  // /admin/categorias), el activo nuevo arranca con esos componentes ya
  // activos — no desde cero. Editable después igual desde su ficha técnica.
  if (assetType) {
    const slugsPlantilla = await listarSlugsDeTipoDeActivo(appUser.tenant_id, assetType);
    for (const slug of slugsPlantilla) {
      await pool.query(
        `insert into asset_components (tenant_id, asset_id, category_slug) values ($1, $2, $3) on conflict (asset_id, category_slug) do nothing`,
        [appUser.tenant_id, assetId, slug]
      );
    }
  }

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
  const returnTo = String(formData.get("return_to") || `/admin/assets/${assetId}`);
  revalidatePath(`/admin/assets/${assetId}`);
  revalidatePath(`/admin/assets/${assetId}/ficha`);
  redirect(returnTo);
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

  // Borra los archivos del bucket (documentos y foto) antes de la fila
  const prefixes = [`documents/${appUser.tenant_id}/${assetId}/`, `asset-photos/${appUser.tenant_id}/${assetId}/`];
  for (const prefix of prefixes) {
    try {
      const listed = await uploads.list({ prefix });
      await Promise.all(listed.items.map((f) => uploads.delete(f.key)));
    } catch (e) {
      console.warn(`[storage] Error al limpiar ${prefix}:`, e);
    }
  }

  // interventions, asset_documents, ai_conversations (on delete cascade) se borran solos
  await pool.query(`delete from assets where tenant_id = $1 and id = $2`, [appUser.tenant_id, assetId]);

  revalidatePath("/admin");
  revalidatePath(`/admin/assets/${assetId}`);
  return { success: true };
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

// Constructor de ficha técnica — para un activo sin manual PDF real (o como
// complemento de uno), el admin completa la info técnica por SISTEMA (Frenos,
// Dirección...) Y por TIPO DE FICHA dentro de ese sistema (Equipamiento,
// Fallas principales, Procedimientos — ver fault_categories/ficha_field_types).
// Cada celda llena (sistema × tipo) se guarda como su propio documento, entra
// al MISMO pipeline de indexado que un PDF subido, y queda etiquetada con
// category_slug + field_type_slug — así el asistente puede apuntar con
// precisión a "las fallas de frenos" en vez de todo el bloque de frenos (ver
// app/api/assistant/chat/route.ts). Se guarda UN sistema a la vez (la UI es
// de pestañas, ver app/admin/assets/[id]/ficha) — más simple y predecible que
// mandar las ~24 celdas de todos los sistemas en cada submit.
export async function guardarFichaDeSistema(assetId: string, categorySlug: string, formData: FormData) {
  const appUser = await requireAdmin();

  const assetResult = await pool.query(
    `select id from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, assetId]
  );
  if (!assetResult.rows[0]) {
    throw new Error("Activo no encontrado.");
  }

  const categoriaResult = await pool.query(
    `select slug, name from fault_categories where tenant_id = $1 and slug = $2 limit 1`,
    [appUser.tenant_id, categorySlug]
  );
  const categoria = categoriaResult.rows[0];
  if (!categoria) {
    throw new Error("Sistema no encontrado.");
  }

  const tipos = await listarTiposFicha(appUser.tenant_id);

  const existentesResult = await pool.query(
    `select id, field_type_slug from asset_documents
     where tenant_id = $1 and asset_id = $2 and source_type = 'simulated' and category_slug = $3 and field_type_slug is not null`,
    [appUser.tenant_id, assetId, categorySlug]
  );
  const existentesPorSlug = new Map<string, string>(existentesResult.rows.map((r) => [r.field_type_slug, r.id]));

  const documentosAIndexar: string[] = [];

  for (const tipo of tipos) {
    const contenido = String(formData.get(`campo_${tipo.slug}`) || "").trim();
    const existenteId = existentesPorSlug.get(tipo.slug);

    if (!contenido) {
      if (existenteId) {
        await pool.query(`delete from asset_documents where tenant_id = $1 and id = $2`, [appUser.tenant_id, existenteId]);
      }
      continue;
    }

    const titulo = `${categoria.name} — ${tipo.name}`;

    if (existenteId) {
      await pool.query(`update asset_documents set raw_text = $1, title = $2 where tenant_id = $3 and id = $4`, [
        contenido,
        titulo,
        appUser.tenant_id,
        existenteId,
      ]);
      documentosAIndexar.push(existenteId);
    } else {
      const docResult = await pool.query(
        `insert into asset_documents (tenant_id, asset_id, title, file_url, raw_text, source_type, category_slug, field_type_slug, uploaded_by)
         values ($1, $2, $3, null, $4, 'simulated', $5, $6, $7)
         returning id`,
        [appUser.tenant_id, assetId, titulo, contenido, categorySlug, tipo.slug, appUser.id]
      );
      documentosAIndexar.push(docResult.rows[0].id);
    }
  }

  for (const documentId of documentosAIndexar) {
    after(() => indexSimulatedText(documentId, appUser.tenant_id));
  }

  revalidatePath(`/admin/assets/${assetId}/ficha`);
  revalidatePath(`/admin/assets/${assetId}`);
  redirect(`/admin/assets/${assetId}/ficha?sistema=${categorySlug}`);
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

// Activa un componente (sistema) para ESTE activo en particular — no todos
// los activos tienen los mismos: un camión tiene tolva, una bomba no. Si el
// admin elige uno existente del catálogo, se activa directo; si escribe uno
// nuevo, primero se agrega al catálogo compartido (fault_categories) y
// después se activa solo para este activo.
export async function agregarComponenteActivo(assetId: string, formData: FormData) {
  const appUser = await requireAdmin();

  const assetResult = await pool.query(`select id from assets where tenant_id = $1 and id = $2 limit 1`, [appUser.tenant_id, assetId]);
  if (!assetResult.rows[0]) {
    throw new Error("Activo no encontrado.");
  }

  const existente = String(formData.get("componente_existente") || "").trim();
  const nuevo = String(formData.get("componente_nuevo") || "").trim();

  let slug: string;
  if (nuevo) {
    slug = slugificar(nuevo);
    if (!slug) throw new Error("El nombre del componente no es válido.");
    await pool.query(
      `insert into fault_categories (tenant_id, slug, name) values ($1, $2, $3) on conflict (tenant_id, slug) do nothing`,
      [appUser.tenant_id, slug, nuevo]
    );
  } else if (existente) {
    slug = existente;
  } else {
    throw new Error("Elige un componente del catálogo o escribe uno nuevo.");
  }

  await pool.query(
    `insert into asset_components (tenant_id, asset_id, category_slug) values ($1, $2, $3) on conflict (asset_id, category_slug) do nothing`,
    [appUser.tenant_id, assetId, slug]
  );

  revalidatePath(`/admin/assets/${assetId}/ficha`);
  redirect(`/admin/assets/${assetId}/ficha?sistema=${slug}`);
}

// Quita un componente de ESTE activo (no lo borra del catálogo compartido,
// otros activos pueden seguir usándolo) y de paso borra la ficha técnica que
// tuviera cargada para ese componente en este activo — no tiene sentido
// dejarla guardada pero invisible.
export async function quitarComponenteActivo(assetId: string, categorySlug: string) {
  const appUser = await requireAdmin();

  await pool.query(`delete from asset_components where tenant_id = $1 and asset_id = $2 and category_slug = $3`, [
    appUser.tenant_id,
    assetId,
    categorySlug,
  ]);
  await pool.query(
    `delete from asset_documents where tenant_id = $1 and asset_id = $2 and category_slug = $3 and source_type = 'simulated'`,
    [appUser.tenant_id, assetId, categorySlug]
  );

  revalidatePath(`/admin/assets/${assetId}/ficha`);
  return { success: true };
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
