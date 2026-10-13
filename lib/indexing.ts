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

export async function indexDocument(documentId: string): Promise<void> {
  const docResult = await pool.query(
    `select id, tenant_id, file_url from asset_documents where id = $1 limit 1`,
    [documentId]
  );
  const doc = docResult.rows[0];
  if (!doc) return;

  await pool.query(`update asset_documents set index_status = 'processing' where id = $1`, [documentId]);

  try {
    const fileBytes = await uploads.download(doc.file_url);
    const buffer = new Uint8Array(await fileBytes.arrayBuffer());

    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    await parser.destroy();

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await pool.query(
        `update asset_documents set index_status = 'failed', index_error = $2 where id = $1`,
        [documentId, "El PDF no tiene texto extraíble (¿es un escaneo/imagen sin OCR?)."]
      );
      return;
    }

    // Limpia chunks de una indexación anterior (reintentos no deben duplicar).
    await pool.query(`delete from document_chunks where document_id = $1`, [documentId]);

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedDocumentChunks(batch);

      const values: string[] = [];
      const params: unknown[] = [];
      batch.forEach((content, j) => {
        const base = params.length;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector, $${base + 5})`);
        params.push(doc.tenant_id, documentId, content, toVectorLiteral(embeddings[j]), i + j);
      });

      await pool.query(
        `insert into document_chunks (tenant_id, document_id, content, embedding, chunk_index)
         values ${values.join(", ")}`,
        params
      );
    }

    await pool.query(
      `update asset_documents set index_status = 'indexed', indexed_at = now(), index_error = null where id = $1`,
      [documentId]
    );
  } catch (err) {
    await pool.query(
      `update asset_documents set index_status = 'failed', index_error = $2 where id = $1`,
      [documentId, err instanceof Error ? err.message : "Error desconocido al indexar."]
    );
  }
}
