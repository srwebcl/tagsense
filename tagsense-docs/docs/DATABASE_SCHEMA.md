# TAGSENSE — Esquema de Base de Datos (PostgreSQL / Supabase)

Regla general: **toda tabla de negocio incluye `tenant_id`** (FK a `tenants.id`), y toda query de aplicación debe filtrar por él (idealmente reforzado con Row Level Security — ver `/skills/multi-tenant-auth/SKILL.md`).

## Tablas principales

### `tenants`
Empresa cliente (ej. una minera).
```
id                  uuid PK
name                text
plan                text            -- starter | professional | enterprise
data_region         text            -- para requisitos futuros de residencia de datos
created_at          timestamptz
```

### `users`
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
email               text
role                text            -- technician | admin | maintainer
full_name           text
created_at          timestamptz
```

### `assets` (activos)
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
tag_code            text            -- ID grabado en el tag físico (ej. TS-CAEX-000125)
name                text            -- ej. "Camión Minero MT65S"
model               text
serial_number       text
status              text            -- operativo | fuera_de_servicio | mantenimiento
location            text
hour_meter          numeric
last_intervention_at timestamptz
created_at          timestamptz
```

### `asset_documents` (manuales OEM)
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
asset_id            uuid FK -> assets.id NULLABLE   -- null si aplica a un modelo, no a un activo puntual
asset_model         text NULLABLE
title               text
document_type       text            -- operacion | servicio | reparacion | partes
file_url            text            -- referencia a Cloudflare R2
uploaded_by         uuid FK -> users.id
created_at          timestamptz
```

### `document_chunks` (para RAG — requiere extensión pgvector)
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
document_id         uuid FK -> asset_documents.id
content             text
embedding           vector(1536)    -- ajustar dimensión según modelo de embeddings usado
chunk_index         int
created_at          timestamptz
```

### `checklists`
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
asset_model         text
name                text
created_at          timestamptz
```

### `checklist_items`
```
id                  uuid PK
checklist_id        uuid FK -> checklists.id
label                text
order_index          int
```

### `interventions` (historial técnico)
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
asset_id            uuid FK -> assets.id
technician_id       uuid FK -> users.id
diagnosis           text
work_performed       text
parts_used           jsonb
started_at           timestamptz
finished_at          timestamptz
synced_at            timestamptz NULLABLE  -- null mientras está pendiente de sync offline
created_offline      boolean default false
```

### `intervention_photos`
```
id                  uuid PK
intervention_id      uuid FK -> interventions.id
file_url             text          -- Cloudflare R2
caption               text NULLABLE
created_at            timestamptz
```

### `reports` (informes PDF generados)
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
intervention_id      uuid FK -> interventions.id
file_url             text          -- PDF en R2
generated_at          timestamptz
```

### `ai_conversations` (historial del asistente, opcional pero recomendado para auditoría)
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
user_id              uuid FK -> users.id
asset_id             uuid FK -> assets.id NULLABLE
messages              jsonb         -- historial de la conversación
created_at            timestamptz
```

### `tag_events` (IoT-ready — sin funcionalidad activa en el MVP)
Diseñada ahora para no rearquitecturar si se activa LoRa/GPS en una fase futura. No se llena en el MVP.
```
id                  uuid PK
tenant_id           uuid FK -> tenants.id
tag_code             text
latitude              numeric NULLABLE
longitude             numeric NULLABLE
battery_level         numeric NULLABLE
recorded_at            timestamptz
```

## Índices recomendados
- `assets(tenant_id, tag_code)` — único, es el lookup principal al escanear.
- `document_chunks(tenant_id)` + índice vectorial (ivfflat o hnsw según volumen) sobre `embedding`.
- `interventions(tenant_id, asset_id, started_at)`.

## Nota sobre Row Level Security
Se recomienda activar RLS en Supabase desde el día 1 en todas las tablas de negocio, con política base `tenant_id = current_setting('app.current_tenant')::uuid`. Ver `/skills/multi-tenant-auth/SKILL.md` para el patrón completo — no dejar el aislamiento solo a nivel de código de aplicación.
