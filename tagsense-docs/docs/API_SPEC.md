# TAGSENSE — Especificación de API (REST)

Todas las rutas van bajo `/api`. Toda petición autenticada resuelve `tenant_id` y `role` desde la sesión — nunca se recibe `tenant_id` como parámetro confiable del cliente.

## Auth
```
POST   /api/auth/login              { email, password } -> { token, user, tenant }
POST   /api/auth/logout
GET    /api/auth/me                 -> perfil + tenant + rol
```

## Activos (assets)
```
GET    /api/assets/:tag_code        -> resuelve un activo por el código leído del tag (QR/NFC)
GET    /api/assets/:id              -> ficha completa del activo
GET    /api/assets                  -> listado paginado (panel admin)
POST   /api/assets                  -> crear activo (admin)
PATCH  /api/assets/:id              -> actualizar activo (admin)
```

## Documentos (manuales OEM)
```
GET    /api/assets/:id/documents
POST   /api/assets/:id/documents    -> sube manual (multipart), dispara job de indexado (chunking + embeddings)
DELETE /api/documents/:id
```

## Checklists
```
GET    /api/checklists?asset_model=...
POST   /api/checklists              (admin)
```

## Intervenciones
```
POST   /api/interventions           -> crea intervención (puede llegar marcada created_offline=true en el sync)
PATCH  /api/interventions/:id       -> completar/editar
GET    /api/assets/:id/interventions -> historial del activo
POST   /api/interventions/:id/photos -> sube evidencia fotográfica
```

## Sincronización offline
```
POST   /api/sync                    -> recibe batch de cambios locales pendientes (intervenciones, checklists, fotos)
                                        respuesta incluye mapping de IDs temporales -> IDs definitivos y conflictos detectados
GET    /api/sync/pull?since=<timestamp> -> cambios del servidor desde la última sync (para refrescar cache local)
```
Ver `/skills/offline-sync/SKILL.md` para el contrato exacto de conflictos.

## Asistente IA
```
POST   /api/assistant/chat          { asset_id, message, conversation_id? }
                                     -> ejecuta RAG (recupera chunks del tenant), llama a Anthropic API, devuelve respuesta
                                     -> debe indicar explícitamente cuando no hay contexto suficiente en la documentación
GET    /api/assistant/conversations/:asset_id
```

## Informes
```
POST   /api/reports                 { intervention_id } -> genera PDF (job asíncrono), devuelve report_id
GET    /api/reports/:id             -> estado + URL de descarga cuando esté listo
```

## Administración (multi-tenant, solo rol admin)
```
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/tenant            -> configuración de la empresa
```

## Convenciones
- Respuestas de error consistentes: `{ error: { code, message } }`.
- Toda escritura desde el flujo offline lleva un `client_generated_id` (UUID generado en el dispositivo) para permitir idempotencia al sincronizar.
- Paginación con `?page=&limit=` en todos los listados.
