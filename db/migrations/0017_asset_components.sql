-- No todos los activos son iguales (camiones, bombas, palas...) — un camión
-- tiene tolva, una bomba no; una pala tiene balde, un camión no. Hasta acá
-- fault_categories era un catálogo único compartido por TODOS los activos del
-- tenant. Esta tabla agrega la dimensión que faltaba: qué componentes de ese
-- catálogo están activos para CADA activo en particular — el admin puede
-- agregar o quitar componentes por activo desde la ficha técnica (ver
-- app/admin/assets/[id]/ficha), sin afectar a los demás activos. El catálogo
-- de fault_categories sigue siendo la lista de opciones disponibles para
-- elegir/crear, ahora solo un menú, no una asignación automática a todos.
create table asset_components (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  asset_id     uuid not null references assets(id) on delete cascade,
  category_slug text not null,
  created_at   timestamptz not null default now(),
  unique (asset_id, category_slug)
);

alter table asset_components enable row level security;

create policy tenant_isolation on asset_components
  using (tenant_id = current_setting('app.current_tenant', true)::uuid);
