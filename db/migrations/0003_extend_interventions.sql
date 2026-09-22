-- TAGSENSE — Extiende `interventions` y `reports` para cubrir los campos que la
-- pantalla de informe ya recolecta (fallas/severidad, repuestos, instructivos
-- usados, firma, solicitud de mantenimiento) y que DATABASE_SCHEMA.md no
-- detallaba a ese nivel.
--
-- Se mantienen las columnas ya documentadas (diagnosis, work_performed, parts_used,
-- started_at, finished_at) para lo esencial y consultable; todo lo demás que ya
-- recolecta el formulario de campo va en `details` (jsonb) para no perder datos
-- sin tener que negociar una columna por cada campo del formulario ahora mismo.
--
-- `folio` (ej. "INF-H004") es del INFORME (reports), no de la intervención —
-- una intervención podría en teoría tener más de un informe generado.

alter table interventions
  add column operational_after boolean,
  add column details jsonb not null default '{}'::jsonb;

alter table reports
  add column folio text,
  add column details jsonb not null default '{}'::jsonb;

alter table reports
  add constraint reports_folio_tenant_unique unique (tenant_id, folio);
