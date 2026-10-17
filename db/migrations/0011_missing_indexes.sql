-- TAGSENSE — índices que faltaban para los patrones de consulta reales:
--
-- - asset_documents: toda consulta real filtra (tenant_id, asset_id) juntos
--   (ej. app/admin/assets/[id]/page.tsx), pero solo existía índice por
--   tenant_id solo — a volumen de documentos ya no alcanza con ese.
-- - reports.intervention_id: el historial de intervenciones hace
--   left join reports on reports.intervention_id = interventions.id en cada
--   consulta (app/api/assets/[tag_code]/interventions/route.ts) sin índice
--   del lado de reports.
-- - document_chunks.document_id: el RAG hace join document_chunks ->
--   asset_documents por document_id (app/api/assistant/chat/route.ts), sin
--   índice plano (solo existe el índice vectorial HNSW y el de tenant_id).
create index idx_asset_documents_tenant_asset on asset_documents(tenant_id, asset_id);
create index idx_reports_intervention on reports(intervention_id);
create index idx_document_chunks_document on document_chunks(document_id);
