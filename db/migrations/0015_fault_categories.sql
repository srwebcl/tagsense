-- Catálogo de categorías de falla por tenant (Frenos, Dirección, Tolva, etc.)
-- — mismo patrón que asset_types (0012): crece solo desde el punto de uso, sin
-- necesitar una pantalla de administración aparte. Alimenta tanto los tiles de
-- "Tengo una falla en..." de la app de campo como el constructor de fichas por
-- categoría del admin (ver app/admin/assets/actions.ts).
create table fault_categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  slug        text not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, slug)
);

alter table fault_categories enable row level security;

create policy tenant_isolation on fault_categories
  using (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Semilla con las 8 categorías que ya existían hardcodeadas en la app de
-- campo (public/index.html, antes de este cambio) — para cada tenant que ya
-- exista, así ningún tile desaparece al pasar a ser dinámico.
insert into fault_categories (tenant_id, slug, name)
select t.id, v.slug, v.name
from tenants t
cross join (values
  ('frenos', 'Frenos'),
  ('direccion', 'Dirección'),
  ('tolva', 'Tolva'),
  ('electrico', 'Eléctrico'),
  ('hidraulico', 'Hidráulico'),
  ('ejes', 'Ejes'),
  ('sensores', 'Sensores'),
  ('temperatura', 'Temperatura')
) as v(slug, name);

-- Etiqueta opcional en los documentos: permite que, cuando el técnico toca un
-- tile específico (no pregunta libre), el asistente priorice con certeza el
-- documento de ESA categoría para ESE activo por sobre cualquier otro —
-- más confiable que el re-ranking por palabras clave para este caso puntual.
alter table asset_documents add column category_slug text;
