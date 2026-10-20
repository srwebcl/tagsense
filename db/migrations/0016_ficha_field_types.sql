-- Segundo catálogo del constructor de ficha técnica — fault_categories (0015)
-- representa el SISTEMA del equipo (Frenos, Dirección...); este representa el
-- TIPO de información dentro de cada sistema (Equipamiento, Fallas
-- principales, Procedimientos). Mismo patrón: tenant-scoped, extensible desde
-- /admin/categorias, sembrado con los 3 tipos pedidos.
create table ficha_field_types (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  slug        text not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, slug)
);

alter table ficha_field_types enable row level security;

create policy tenant_isolation on ficha_field_types
  using (tenant_id = current_setting('app.current_tenant', true)::uuid);

insert into ficha_field_types (tenant_id, slug, name)
select t.id, v.slug, v.name
from tenants t
cross join (values
  ('equipamiento', 'Equipamiento'),
  ('fallas', 'Fallas principales'),
  ('procedimientos', 'Procedimientos')
) as v(slug, name);

-- Una "celda" de la ficha técnica = un asset_document identificado por
-- (asset_id, category_slug, field_type_slug) — ej. Frenos × Fallas
-- principales es su propio documento, indexado aparte, para que el asistente
-- pueda apuntar con precisión a esa celda exacta en vez de todo el sistema.
alter table asset_documents add column field_type_slug text;
