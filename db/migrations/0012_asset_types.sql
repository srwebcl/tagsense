-- "Tipo de activo" era un input de texto libre con un datalist fijo en el código
-- (ver app/admin/assets/new/page.tsx antes de este cambio) — cualquier variación
-- de escritura ("Camión Minero" vs "camion minero") quedaba como un valor distinto
-- sin forma de reutilizarlo. Esta tabla guarda el catálogo real por tenant; se
-- hace crecer sola desde el admin (ver construirSpecsDesdeFormData/actualizarActivo
-- en app/admin/assets/actions.ts: cualquier tipo nuevo que se use al crear o
-- editar un activo se agrega acá con ON CONFLICT DO NOTHING), sin necesitar una
-- pantalla de administración aparte.
create table asset_types (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, name)
);

alter table asset_types enable row level security;

create policy tenant_isolation on asset_types
  using (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Semilla con el datalist que ya existía, para no perder las opciones conocidas
-- al migrar — se aplica a todos los tenants existentes, no solo al piloto.
insert into asset_types (tenant_id, name)
select t.id, v.name
from tenants t
cross join (values
  ('Camión minero'), ('Camión de apoyo'), ('Excavadora'), ('Cargador frontal'),
  ('Perforadora'), ('Planta de chancado'), ('Grúa'), ('Bomba'),
  ('Compresor'), ('Generador'), ('Vehículo liviano'), ('Equipo industrial'),
  ('Maquinaria')
) as v(name)
on conflict (tenant_id, name) do nothing;

-- Por si algún activo ya tiene un asset_type que no estaba en el datalist viejo
-- (escrito a mano) — así no desaparece de la lista al editar ese activo.
insert into asset_types (tenant_id, name)
select distinct tenant_id, asset_type
from assets
where asset_type is not null and asset_type <> ''
on conflict (tenant_id, name) do nothing;
