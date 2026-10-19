import { getPath } from "pdf-parse/worker"; // debe importarse antes que "pdf-parse"
import { PDFParse } from "pdf-parse";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { embedDocumentChunks } from "@/lib/voyage";

// Necesario en Next.js/serverless: sin esto, pdfjs-dist no encuentra su propio
// worker dentro del bundle y falla con "Setting up fake worker failed"
// (ver docs/troubleshooting.md del paquete pdf-parse).
PDFParse.setWorker(getPath());

// Pipeline de indexado — ver /tagsense-docs/skills/rag-assistant/SKILL.md:
// extraer texto -> dividir en chunks (~500-1000 tokens, ~100-150 de solape) ->
// generar embeddings -> guardar en document_chunks. Corre en background vía
// after() al subir el documento (ver app/admin/assets/actions.ts), para no
// bloquear la respuesta de subida.

const CHARS_PER_TOKEN_ESTIMATE = 4;
const CHUNK_CHARS = 3500; // ~875 tokens
const OVERLAP_CHARS = 500; // ~125 tokens
const EMBED_BATCH_SIZE = 100; // bajo el límite de 1000 textos/llamada de Voyage

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_CHARS, clean.length);
    // Corta en el último espacio dentro del rango para no partir una palabra a la mitad.
    const cut = end < clean.length ? clean.lastIndexOf(" ", end) : end;
    const sliceEnd = cut > start ? cut : end;
    chunks.push(clean.slice(start, sliceEnd).trim());
    if (sliceEnd >= clean.length) break;
    start = sliceEnd - OVERLAP_CHARS;
    if (start < 0) start = 0;
  }
  return chunks.filter(Boolean);
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// Cola compartida por indexDocument (PDF real) e indexSimulatedText (texto
// escrito por el admin): una vez que hay texto plano, el chunking + embeddings
// + guardado es idéntico sin importar de dónde salió ese texto.
async function chunkEmbedAndStore(documentId: string, tenantId: string, text: string, sinTextoError: string): Promise<void> {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    await pool.query(
      `update asset_documents set index_status = 'failed', index_error = $3 where id = $1 and tenant_id = $2`,
      [documentId, tenantId, sinTextoError]
    );
    return;
  }

  // Limpia chunks de una indexación anterior (reintentos no deben duplicar).
  await pool.query(`delete from document_chunks where document_id = $1 and tenant_id = $2`, [documentId, tenantId]);

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedDocumentChunks(batch);

    const values: string[] = [];
    const params: unknown[] = [];
    batch.forEach((content, j) => {
      const base = params.length;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector, $${base + 5})`);
      params.push(tenantId, documentId, content, toVectorLiteral(embeddings[j]), i + j);
    });

    await pool.query(
      `insert into document_chunks (tenant_id, document_id, content, embedding, chunk_index)
       values ${values.join(", ")}`,
      params
    );
  }

  await pool.query(
    `update asset_documents set index_status = 'indexed', indexed_at = now(), index_error = null where id = $1 and tenant_id = $2`,
    [documentId, tenantId]
  );
}

// tenantId es obligatorio y filtra la select Y los dos updates que siguen —
// sin él, un documentId adivinado/reutilizado (los Server Actions no protegen
// sus argumentos vinculados contra manipulación del lado del cliente) podría
// forzar un reindexado costoso o sobrescribir el estado de un documento de
// otro tenant. Ver reindexarDocumento en app/admin/assets/actions.ts, el único
// llamador que recibe un documentId no generado por el propio servidor.
export async function indexDocument(documentId: string, tenantId: string): Promise<void> {
  const docResult = await pool.query(
    `select id, tenant_id, file_url from asset_documents where id = $1 and tenant_id = $2 limit 1`,
    [documentId, tenantId]
  );
  const doc = docResult.rows[0];
  if (!doc || !doc.file_url) return;

  await pool.query(
    `update asset_documents set index_status = 'processing' where id = $1 and tenant_id = $2`,
    [documentId, tenantId]
  );

  try {
    const fileBytes = await uploads.download(doc.file_url);
    const buffer = new Uint8Array(await fileBytes.arrayBuffer());

    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    await parser.destroy();

    await chunkEmbedAndStore(documentId, tenantId, text, "El PDF no tiene texto extraíble (¿es un escaneo/imagen sin OCR?).");
  } catch (err) {
    console.error(`[indexDocument] falló el indexado de ${documentId} (tenant ${tenantId}):`, err);
    await pool.query(
      `update asset_documents set index_status = 'failed', index_error = $3 where id = $1 and tenant_id = $2`,
      [documentId, tenantId, err instanceof Error ? err.message : "Error desconocido al indexar."]
    );
  }
}

// Mismo pipeline que indexDocument, pero el texto ya está escrito a mano por
// el admin (raw_text) en vez de salir de un PDF subido — ver crearInformacionSimulada
// en app/admin/assets/actions.ts. Sirve para que un activo recién creado, sin
// manual real todavía, tenga igual con qué responder el asistente — siempre
// acotado a este mismo activo (document_chunks sigue filtrando por asset_id/
// asset_model en app/api/assistant/chat/route.ts, exactamente igual que un PDF real).
export async function indexSimulatedText(documentId: string, tenantId: string): Promise<void> {
  const docResult = await pool.query(
    `select id, tenant_id, raw_text from asset_documents where id = $1 and tenant_id = $2 limit 1`,
    [documentId, tenantId]
  );
  const doc = docResult.rows[0];
  if (!doc || !doc.raw_text) return;

  await pool.query(
    `update asset_documents set index_status = 'processing' where id = $1 and tenant_id = $2`,
    [documentId, tenantId]
  );

  try {
    await chunkEmbedAndStore(documentId, tenantId, doc.raw_text, "El texto escrito quedó vacío tras limpiarlo.");
  } catch (err) {
    console.error(`[indexSimulatedText] falló el indexado de ${documentId} (tenant ${tenantId}):`, err);
    await pool.query(
      `update asset_documents set index_status = 'failed', index_error = $3 where id = $1 and tenant_id = $2`,
      [documentId, tenantId, err instanceof Error ? err.message : "Error desconocido al indexar."]
    );
  }
}
