-- TAGSENSE — Migración inicial (Etapa 1: piloto single-tenant)
-- Sigue /tagsense-docs/docs/DATABASE_SCHEMA.md y /tagsense-docs/skills/multi-tenant-auth/SKILL.md.
--
-- Aunque la Etapa 1 opera con un solo tenant activo, toda tabla de negocio nace con
-- tenant_id y RLS activado desde el día 1 (regla no negociable del skill de multi-tenancy),
-- para no tener que rearquitecturar en la Etapa 2.
--
-- Diferencia respecto al DATABASE_SCHEMA.md original: se agregó tenant_id a checklist_items
-- e intervention_photos (el doc no lo listaba en esas dos tablas hijas), porque el propio
-- skill dice "si no está claro si una tabla nueva necesita tenant_id, la respuesta por
-- defecto es sí" — y sin esa columna, aplicar RLS directo sobre esas tablas requeriría un
-- subquery contra la tabla padre en cada policy, más frágil que tener la columna.

create extension if not exists "pgcrypto";   -- para gen_random_uuid()
create extension if not exists vector;        -- ya estaba habilitado, se deja explícito

-- ============================================================================
-- tenants
-- ============================================================================
create table tenants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  plan         text not null default 'starter' check (plan in ('starter', 'professional', 'enterprise')),
  data_region  text,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- users
-- ============================================================================
create table users (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('technician', 'maintainer', 'admin')),
  full_name   text,
  created_at  timestamptz not null default now(),
  unique (tenant_id, email)
);

-- ============================================================================
-- assets
-- ============================================================================
create table assets (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  tag_code              text not null,
  name                  text not null,
  model                 text,
  serial_number         text,
  status                text not null default 'operativo' check (status in ('operativo', 'fuera_de_servicio', 'mantenimiento')),
  location              text,
  hour_meter            numeric,
  last_intervention_at  timestamptz,
  created_at            timestamptz not null default now(),
  unique (tenant_id, tag_code)
);

-- ============================================================================
-- asset_documents (manuales OEM)
-- ============================================================================
create table asset_documents (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  asset_id       uuid references assets(id) on delete cascade,
  asset_model    text,
  title          text not null,
  document_type  text check (document_type in ('operacion', 'servicio', 'reparacion', 'partes')),
  file_url       text not null,
  uploaded_by    uuid references users(id),
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- document_chunks (RAG — requiere pgvector)
-- Dimensión 1536 por defecto (ajustar según el modelo de embeddings que se use — ver skill rag-assistant).
-- ============================================================================
create table document_chunks (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  document_id  uuid not null references asset_documents(id) on delete cascade,
  content      text not null,
  embedding    vector(1536),
  chunk_index  int not null,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- checklists
-- ============================================================================
create table checklists (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  asset_model text,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- checklist_items
-- ============================================================================
create table checklist_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  checklist_id  uuid not null references checklists(id) on delete cascade,
  label         text not null,
  order_index   int not null default 0
);

-- ============================================================================
-- interventions (historial técnico)
-- ============================================================================
create table interventions (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  asset_id         uuid not null references assets(id) on delete cascade,
  technician_id    uuid not null references users(id),
  diagnosis        text,
  work_performed   text,
  parts_used       jsonb not null default '[]'::jsonb,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  synced_at        timestamptz,
  created_offline  boolean not null default false
);

-- ============================================================================
-- intervention_photos
-- ============================================================================
create table intervention_photos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  intervention_id uuid not null references interventions(id) on delete cascade,
  file_url        text not null,
  caption         text,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- reports (informes PDF generados)
-- ============================================================================
create table reports (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  intervention_id  uuid not null references interventions(id) on delete cascade,
  file_url         text,
  generated_at     timestamptz
);

-- ============================================================================
-- ai_conversations (historial del asistente, para auditoría)
-- ============================================================================
create table ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references users(id),
  asset_id    uuid references assets(id),
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- tag_events (IoT-ready — sin funcionalidad activa en el MVP, no se llena todavía)
-- ============================================================================
create table tag_events (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  tag_code       text not null,
  latitude       numeric,
  longitude      numeric,
  battery_level  numeric,
  recorded_at    timestamptz not null default now()
);

-- ============================================================================
-- Índices recomendados (ver DATABASE_SCHEMA.md)
-- ============================================================================
create index idx_users_tenant on users(tenant_id);
create index idx_asset_documents_tenant on asset_documents(tenant_id);
create index idx_document_chunks_tenant on document_chunks(tenant_id);
create index idx_checklists_tenant on checklists(tenant_id);
create index idx_checklist_items_tenant on checklist_items(tenant_id);
create index idx_checklist_items_checklist on checklist_items(checklist_id);
create index idx_interventions_tenant_asset_started on interventions(tenant_id, asset_id, started_at);
create index idx_intervention_photos_tenant on intervention_photos(tenant_id);
create index idx_reports_tenant on reports(tenant_id);
create index idx_ai_conversations_tenant on ai_conversations(tenant_id);
create index idx_tag_events_tenant on tag_events(tenant_id);

-- Índice vectorial para la búsqueda semántica del asistente RAG.
create index idx_document_chunks_embedding on document_chunks
  using hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- Row Level Security — activado en TODA tabla de negocio desde el día 1
-- (no negociable, ver /tagsense-docs/skills/multi-tenant-auth/SKILL.md).
-- app.current_tenant se setea por conexión/request desde el backend, nunca desde el cliente.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'tenants', 'users', 'assets', 'asset_documents', 'document_chunks',
    'checklists', 'checklist_items', 'interventions', 'intervention_photos',
    'reports', 'ai_conversations', 'tag_events'
  ])
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- tenants es la excepción de forma: se filtra por su propio id, no por una columna tenant_id.
create policy tenant_isolation on tenants
  using (id = current_setting('app.current_tenant', true)::uuid);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'users', 'assets', 'asset_documents', 'document_chunks',
    'checklists', 'checklist_items', 'interventions', 'intervention_photos',
    'reports', 'ai_conversations', 'tag_events'
  ])
  loop
    execute format(
      'create policy tenant_isolation on %I using (tenant_id = current_setting(''app.current_tenant'', true)::uuid)',
      t
    );
  end loop;
end $$;
