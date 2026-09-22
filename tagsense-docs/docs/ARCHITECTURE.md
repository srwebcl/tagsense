# TAGSENSE — Arquitectura Técnica

## 1. Diagrama de componentes (textual)

```
┌─────────────────────────┐        ┌─────────────────────────┐
│   App de campo (PWA)    │        │  Panel Admin (Web)       │
│   Next.js + Capacitor   │        │  Next.js (SSR)           │
│   - Dexie.js (offline)  │        │                          │
│   - Web NFC / QR scan   │        └──────────────┬───────────┘
└──────────────┬───────────┘                       │
               │  HTTPS / REST                      │
               ▼                                     ▼
        ┌───────────────────────────────────────────────┐
        │        Backend (Next.js Route Handlers)         │
        │  - Auth middleware (tenant + rol)                │
        │  - Endpoints REST (ver API_SPEC.md)              │
        │  - Orquestación RAG (llamadas a Anthropic API)   │
        └───────────────┬───────────────┬──────────────────┘
                         │               │
             ┌───────────▼───┐   ┌───────▼────────────┐
             │  PostgreSQL     │   │  Cloudflare R2      │
             │  (Supabase)     │   │  (manuales, fotos)   │
             │  + pgvector     │   └─────────────────────┘
             └────────┬────────┘
                       │
             ┌─────────▼─────────┐      ┌────────────────────┐
             │  Upstash Redis      │      │  Anthropic API       │
             │  + BullMQ (jobs:    │◄─────┤  (Claude Sonnet/     │
             │  PDF, sync masivo)  │      │   Haiku)             │
             └─────────────────────┘      └────────────────────┘
```

## 2. Decisión de empaquetado: PWA + Capacitor

Confirmado: el proyecto necesita **Android e iOS**. Web NFC API solo existe en Chrome/Android — Safari/iOS no la soporta. Por eso:

- Se construye **una sola base de código Next.js** (PWA).
- Se empaqueta con **Capacitor** para generar builds nativos Android/iOS.
- En Android, se puede usar Web NFC directo en el navegador *o* el plugin nativo de Capacitor (preferir el plugin nativo para consistencia entre plataformas).
- En iOS, NFC solo funciona a través de Core NFC vía el plugin nativo de Capacitor — **no hay alternativa en navegador**.
- **QR queda como método universal de respaldo** en ambas plataformas, vía cámara (librería `html5-qrcode` o `zxing`), y debe implementarse primero porque no depende de plugins nativos ni de permisos especiales.

Ver `/skills/nfc-qr-scanning/SKILL.md` para el detalle de implementación.

## 3. Estrategia offline-first

La conectividad en interior mina es intermitente o nula — esto es un requisito duro, no una optimización.

- Todo el flujo de campo (escaneo, ficha de activo, checklist, fotos) debe leer/escribir primero en **IndexedDB (Dexie.js)** local.
- Un proceso de sincronización sube los cambios pendientes cuando detecta conexión.
- Se debe definir una estrategia de **resolución de conflictos** (ver skill dedicado) para el caso de dos técnicos editando el mismo activo mientras ambos están offline.
- Los manuales/documentos consultados recientemente se cachean localmente para consulta sin conexión (Service Worker + storage).

Ver `/skills/offline-sync/SKILL.md`.

## 4. Multi-tenancy

Modelo elegido: **multi-tenant compartido** (una sola base de datos, aislamiento por `tenant_id`), no instancias separadas por cliente — más económico de operar y de mantener actualizado. Si en el futuro un cliente Enterprise exige aislamiento físico, se evalúa como excepción, no como default.

Ver `/skills/multi-tenant-auth/SKILL.md` para el patrón de Row Level Security (RLS) en Supabase/Postgres.

## 5. Asistente IA (RAG acotado)

El asistente **no es un agente de razonamiento libre**: es una guía tipo "manual inteligente" que responde exclusivamente en base a los documentos que la empresa cliente cargó. Arquitectura:

1. Al cargar un manual (PDF), se extrae texto, se divide en chunks, se generan embeddings y se guardan en `pgvector` junto con metadata (`tenant_id`, `asset_model_id`, `document_id`).
2. Ante una consulta del técnico, se recuperan los chunks más relevantes **filtrados por `tenant_id`** (nunca cruzar documentación entre empresas).
3. Se arma el prompt con ese contexto + la pregunta y se llama a la API de Anthropic (Claude Sonnet por defecto).
4. La respuesta debe citar o anclarse en el documento fuente; si no hay contexto suficiente, el asistente debe decirlo explícitamente en vez de completar con conocimiento general del modelo.

Ver `/skills/rag-assistant/SKILL.md` para el detalle de implementación y guardrails.

## 6. Modelo de datos IoT-ready (sin funcionalidad activa)

Aunque LoRa/GPS no está en el alcance del MVP, la tabla de eventos de tag se diseña desde ahora para no tener que rearquitecturar después (ver `/docs/DATABASE_SCHEMA.md`, tabla `tag_events`). No se construye gateway, ingesta ni mapa en esta fase.

## 7. Hosting e infraestructura

| Componente | Servicio | Notas |
|---|---|---|
| Frontend + Backend | Vercel (Pro) | Región configurable — dejar definida desde el despliegue inicial pensando en posibles requisitos de residencia de datos a futuro |
| Base de datos | Supabase (Postgres + pgvector) | Región AWS específica, elegible |
| Storage | Cloudflare R2 | Egress gratis — clave para servir fotos/manuales sin sorpresas de costo |
| Colas | Upstash Redis + BullMQ | Serverless, compatible con Vercel |
| IA | Anthropic API | Nunca exponer la key al cliente — todo pasa por el backend |

## 8. Seguridad y residencia de datos

- No hay requisito de on-premise/Chile por ahora, pero la elección de proveedores permite fijar región sin rediseño si un cliente futuro lo exige.
- Aislamiento de documentación por tenant es un requisito de seguridad, no solo funcional — un manual de un cliente jamás debe aparecer en una respuesta del asistente de otro cliente.
