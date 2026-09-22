# TAGSENSE — Guía para agentes de desarrollo (Antigravity / Claude Code)

Este archivo es el punto de entrada para cualquier agente de IA (Antigravity, Claude Code, u otro) que trabaje en este repositorio. Léelo completo antes de escribir código. Los documentos en `/docs` y las guías en `/skills` son extensiones de este archivo — consúltalos según el módulo en el que estés trabajando (la tabla de la sección 6 indica cuál corresponde a cada tarea).

## 1. Qué es TAGSENSE

Plataforma SaaS multi-tenant para gestión de activos industriales (minería). Un técnico escanea un tag físico (QR o NFC) adherido a una máquina, la app identifica el activo y muestra: manuales OEM, historial de mantenimiento, checklist de inspección, y un asistente que guía el diagnóstico usando *solo* la documentación que la empresa cliente cargó (no conocimiento general). Al terminar una intervención, se genera un informe técnico en PDF con evidencia fotográfica.

Debe funcionar **offline** (conectividad intermitente en interior mina) con sincronización posterior.

Lee `/docs/PRD.md` para el detalle funcional completo antes de implementar cualquier feature.

## 2. Stack técnico (decisiones ya tomadas — no renegociar sin confirmar con el equipo)

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend / PWA | Next.js 15 (App Router) + TypeScript | SSR para panel admin, CSR para app de campo |
| Empaquetado móvil | Capacitor | Necesario para NFC real en iOS (Web NFC no existe en Safari) |
| Offline storage | Dexie.js (IndexedDB) | Cola local de cambios pendientes de sincronizar |
| Server state | TanStack Query | Manejo de fetch/cache/retry y estrategia de sync |
| UI | TailwindCSS + shadcn/ui | — |
| Backend | Next.js Route Handlers (o NestJS si la complejidad de colas lo justifica — confirmar con `/docs/ARCHITECTURE.md`) | — |
| Base de datos | PostgreSQL (Supabase) con **pgvector** habilitado | Multi-tenant + búsqueda semántica en el mismo motor, sin sumar otra BD |
| Storage de archivos | Cloudflare R2 | Egress gratis, más barato que S3 para manuales/fotos |
| Auth | Supabase Auth o Auth.js | Roles: `technician`, `maintainer`, `admin`, por tenant |
| IA / Asistente | Anthropic API — Claude Sonnet (RAG), con opción de Claude Haiku para consultas simples | Ver `/skills/rag-assistant/SKILL.md` — **obligatorio leer antes de tocar el asistente** |
| Colas de trabajo | Upstash Redis + BullMQ | Generación de PDF, jobs de sync masivo |
| Hosting | Vercel | — |

## 3. Reglas no negociables

1. **Todo dato de negocio lleva `tenant_id`.** Ninguna tabla de activos, usuarios, documentos, checklists o eventos puede omitirlo. Ver `/skills/multi-tenant-auth/SKILL.md` antes de crear cualquier tabla o query.
2. **El asistente IA solo responde con base en documentos cargados por ese tenant.** Nunca debe "completar con conocimiento general" un procedimiento técnico. Ver `/skills/rag-assistant/SKILL.md`.
3. **Todo flujo de campo (escaneo, checklist, fotos) debe funcionar sin conexión** y sincronizar después sin perder datos ni duplicar. Ver `/skills/offline-sync/SKILL.md`.
4. **QR es el método de identificación primario y universal** (funciona en cualquier dispositivo/cámara). NFC es un método adicional, no el único — nunca bloquees un flujo asumiendo que NFC está disponible. Ver `/skills/nfc-qr-scanning/SKILL.md`.
5. No introducir una segunda base de datos (Mongo, otra Postgres, etc.) para "resolver" un problema puntual — casi todo (relacional, vectorial, series de tiempo básicas) cabe en el Postgres/pgvector ya definido.
6. No mandar tokens/API keys al cliente. Todas las llamadas a Anthropic API pasan por el backend, nunca desde el navegador/app.

## 4. Estructura de carpetas esperada

```
/app                    → Next.js App Router (rutas web + PWA)
/app/(admin)            → Panel de administración
/app/(field)            → App de campo (técnicos)
/app/api                → Route handlers / API
/lib/db                 → Cliente de base de datos, queries
/lib/offline            → Lógica Dexie.js, cola de sync
/lib/ai                 → Cliente Anthropic, pipeline RAG
/lib/pdf                → Generación de informes
/capacitor              → Config de empaquetado móvil
/docs                   → Documentación de producto y arquitectura (este set)
/skills                 → Guías técnicas por dominio complejo
```

## 5. Cómo trabajar en este repo

- Antes de implementar cualquier módulo, revisa si existe un `SKILL.md` correspondiente en `/skills` — contiene decisiones de diseño ya tomadas para evitar retrabajo.
- Sigue las fases de `/docs/ROADMAP.md` en orden — no implementes fases posteriores (ej. multi-tenant completo, LoRa/GPS) si el proyecto está en fase de Piloto, salvo que el modelo de datos lo pida explícitamente (ver nota "IoT-ready" en `/docs/DATABASE_SCHEMA.md`).
- Cualquier decisión de arquitectura que contradiga este archivo debe documentarse como excepción explicada, no simplemente implementarse.

## 6. Mapa de documentos — qué leer según la tarea

| Si vas a trabajar en... | Lee primero |
|---|---|
| Alcance funcional / qué construir | `/docs/PRD.md` |
| Diagrama general, decisiones de infraestructura | `/docs/ARCHITECTURE.md` |
| Cualquier tabla o migración | `/docs/DATABASE_SCHEMA.md` + `/skills/multi-tenant-auth/SKILL.md` |
| Cualquier endpoint | `/docs/API_SPEC.md` |
| Fases, qué va en el piloto vs el MVP completo | `/docs/ROADMAP.md` |
| Sincronización offline | `/skills/offline-sync/SKILL.md` |
| Escaneo NFC/QR | `/skills/nfc-qr-scanning/SKILL.md` |
| Asistente IA / RAG | `/skills/rag-assistant/SKILL.md` |
| Informes PDF | `/skills/pdf-reports/SKILL.md` |
| Auth y aislamiento multi-tenant | `/skills/multi-tenant-auth/SKILL.md` |
