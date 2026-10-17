-- TAGSENSE — Solicitudes de Mantenimiento como registro real.
--
-- Hasta ahora "¿Aplica una solicitud de mantenimiento?" en el informe solo
-- quedaba enterrado dentro de interventions.details (jsonb) — se podía crear
-- una solicitud, pero no existía forma de verla como un registro con estado
-- propio, ni de cerrarla. Esta tabla le da esa identidad: una fila por
-- solicitud, con su propio estado y quién/cuándo la resolvió.
--
-- intervention_id es la intervención que la originó; resolved_by referencia
-- la intervención (si la hay) que la resolvió — puede ser null si se marca
-- "Resuelta" a mano sin generar un informe nuevo.
create table maintenance_requests (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  asset_id              uuid not null references assets(id) on delete cascade,
  intervention_id       uuid references interventions(id) on delete set null,
  folio                 text not null,
  tipo                  text not null,
  prioridad             text not null check (prioridad in ('Baja', 'Media', 'Alta', 'Urgente')),
  componente            text,
  descripcion           text,
  estado                text not null default 'Abierta' check (estado in ('Abierta', 'Resuelta')),
  created_by            uuid references users(id),
  resolved_by           uuid references users(id),
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  unique (tenant_id, folio)
);

create index maintenance_requests_asset_idx on maintenance_requests(tenant_id, asset_id);
