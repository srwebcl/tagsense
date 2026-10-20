-- Plantilla de componentes por TIPO de activo (Camión Minero, Pala Cargadora,
-- Bomba...) — la pieza que faltaba: hasta ahora los componentes activos se
-- configuraban activo por activo (asset_components, 0017), sin relación con
-- su tipo. Esta tabla es la correlación Tipo de activo -> Sistemas que
-- corresponden, visible y editable en /admin/categorias. Al crear un activo
-- nuevo de un tipo con plantilla definida, sus sistemas se copian
-- automáticamente a asset_components de ese activo (ver crearActivo en
-- app/admin/assets/actions.ts) — así un camión nuevo no arranca en cero.
create table asset_type_components (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  asset_type    text not null,
  category_slug text not null,
  created_at    timestamptz not null default now(),
  unique (tenant_id, asset_type, category_slug)
);

alter table asset_type_components enable row level security;

create policy tenant_isolation on asset_type_components
  using (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Semilla con los 3 tipos que ya tienen activos reales, reflejando lo que
-- quedó configurado manualmente en esta sesión para cada uno.
insert into asset_type_components (tenant_id, asset_type, category_slug)
select t.id, v.asset_type, v.category_slug
from tenants t
cross join (values
  ('Camión Minero', 'frenos'), ('Camión Minero', 'direccion'), ('Camión Minero', 'tolva'),
  ('Camión Minero', 'electrico'), ('Camión Minero', 'hidraulico'), ('Camión Minero', 'ejes'),
  ('Camión Minero', 'sensores'), ('Camión Minero', 'temperatura'), ('Camión Minero', 'neumaticos'),
  ('Camión Minero', 'suspension'), ('Camión Minero', 'motor'),
  ('Camión de apoyo', 'frenos'), ('Camión de apoyo', 'direccion'), ('Camión de apoyo', 'tolva'),
  ('Camión de apoyo', 'electrico'), ('Camión de apoyo', 'hidraulico'), ('Camión de apoyo', 'ejes'),
  ('Camión de apoyo', 'sensores'), ('Camión de apoyo', 'temperatura'),
  ('Cargador frontal', 'frenos'), ('Cargador frontal', 'direccion'), ('Cargador frontal', 'hidraulico'),
  ('Cargador frontal', 'electrico'), ('Cargador frontal', 'ejes'), ('Cargador frontal', 'sensores'),
  ('Cargador frontal', 'temperatura'), ('Cargador frontal', 'balde'), ('Cargador frontal', 'motor')
) as v(asset_type, category_slug)
on conflict (tenant_id, asset_type, category_slug) do nothing;
