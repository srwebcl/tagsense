-- TAGSENSE — Límite de tasa básico para endpoints sin autenticación o de costo
-- variable (el lookup público de activos, el asistente de IA).
--
-- No es multi-tenant (no tiene sentido serlo: una IP o un usuario puede golpear
-- el endpoint público ANTES de que exista noción de tenant), así que esta tabla
-- es la única excepción deliberada a "toda tabla nace con tenant_id".
--
-- bucket_key identifica a quién se le cuenta (ej. "public-asset:203.0.113.5" o
-- "assistant-chat:<user_id>"). Se limpia sola: cada chequeo borra sus propias
-- filas vencidas antes de contar, así la tabla no crece sin límite.
create table rate_limit_hits (
  id          bigserial primary key,
  bucket_key  text not null,
  created_at  timestamptz not null default now()
);

create index rate_limit_hits_bucket_idx on rate_limit_hits(bucket_key, created_at);
