-- Un activo recién creado desde el admin no tiene un manual PDF real todavía
-- (ver pedido del usuario: simular que el asistente IA funciona para activos
-- nuevos, sin mezclar su contexto con el de otros activos). Se permite cargar
-- "información simulada" como texto escrito directo por el admin, que entra
-- al mismo pipeline de indexado (chunking + embeddings) que un PDF real — ver
-- lib/indexing.ts. file_url pasa a ser opcional porque un documento simulado
-- no tiene ningún archivo real detrás, solo el texto en raw_text.
alter table asset_documents
  alter column file_url drop not null,
  add column raw_text text,
  add column source_type text not null default 'upload' check (source_type in ('upload', 'simulated')),
  add constraint asset_documents_content_check check (
    (source_type = 'upload' and file_url is not null) or
    (source_type = 'simulated' and raw_text is not null)
  );
