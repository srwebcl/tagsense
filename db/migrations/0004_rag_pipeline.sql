-- TAGSENSE — Prepara el esquema para el pipeline RAG real (Voyage + Anthropic).
--
-- 1) document_chunks.embedding quedó en vector(1536) como placeholder (ver
--    comentario original en 0001_init_schema.sql: "ajustar según el modelo
--    usado"). voyage-4 / voyage-4-lite devuelven 1024 dimensiones por defecto
--    (no soportan 1536 — las opciones son 2048/1024/512/256), así que se ajusta
--    acá. La tabla está vacía (nunca se indexó nada), así que no hay datos que
--    migrar — se recrea la columna y el índice vectorial directamente.
-- 2) asset_documents gana columnas de estado de indexado, para que el panel
--    admin pueda mostrar si un documento ya es buscable por el asistente.

drop index if exists idx_document_chunks_embedding;

alter table document_chunks
  alter column embedding type vector(1024);

create index idx_document_chunks_embedding on document_chunks
  using hnsw (embedding vector_cosine_ops);

alter table asset_documents
  add column index_status text not null default 'pending'
    check (index_status in ('pending', 'processing', 'indexed', 'failed')),
  add column indexed_at timestamptz,
  add column index_error text;
