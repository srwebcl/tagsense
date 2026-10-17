-- TAGSENSE — maintenance_requests (migración 0007) quedó sin RLS, rompiendo la
-- regla "toda tabla de negocio nace con RLS" que sigue el resto del esquema
-- (ver 0001_init_schema.sql). La conexión real de la app (app_user) de todos
-- modos tiene BYPASSRLS a nivel de plataforma — ver el comentario en
-- lib/db.ts — así que esto no cambia el aislamiento real hoy (ese lo hace el
-- filtro explícito de tenant_id en cada query). Se agrega como respaldo para
-- cualquier otro camino de acceso (ej. Neon Data API) que no pase por app_user.
alter table maintenance_requests enable row level security;

create policy tenant_isolation on maintenance_requests
  using (tenant_id = current_setting('app.current_tenant', true)::uuid);
