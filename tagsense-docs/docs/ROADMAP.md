# TAGSENSE — Roadmap de Desarrollo

Este roadmap refleja el plan escalonado acordado: no se construye el producto SaaS completo de una vez, se valida por etapas con el cliente/mercado.

## Etapa 0 — Demo de venta (no en este repo de desarrollo real)
Prototipo clickeable con datos de ejemplo, sin backend real. Se usa para conseguir el primer cliente piloto. No sigue necesariamente esta arquitectura — puede construirse como mockup rápido.

## Etapa 1 — Piloto real con un solo cliente (single-tenant funcional)
**Objetivo:** validar el producto en terreno con datos reales de una empresa.

Incluye:
- [ ] Auth simple (un solo tenant, sin multi-tenant activo todavía — pero el modelo de datos ya nace con `tenant_id` para no migrar después)
- [ ] Escaneo QR (prioridad) — NFC Android como plus si el tiempo lo permite
- [ ] Ficha de activo con datos reales
- [ ] Checklist + fotos
- [ ] Asistente IA (RAG) sobre los manuales reales que el cliente cargue
- [ ] Generación de informe PDF real
- [ ] Modo offline básico (puede no cubrir todos los edge cases de conflicto todavía)
- [ ] Una sola plataforma (Android vía PWA, sin empaquetado Capacitor todavía)

Explícitamente fuera: multi-tenant activo, iOS/Capacitor, panel admin avanzado, LoRa/GPS.

## Etapa 2 — MVP completo (multi-tenant, listo para vender a varias empresas)
**Objetivo:** convertir el piloto en producto SaaS.

Incluye (se construye sobre el código de la Etapa 1, no desde cero):
- [ ] Multi-tenancy activo con Row Level Security
- [ ] Capacitor — empaquetado Android + iOS, NFC nativo en ambas plataformas
- [ ] Panel de administración completo (gestión de usuarios, activos, documentos, reportes por tenant)
- [ ] Sincronización offline robusta con resolución de conflictos
- [ ] Gestión documental multi-cliente (aislamiento estricto de manuales por tenant)
- [ ] Planes de suscripción (Starter / Professional / Enterprise)

## Fase futura — Telemetría LoRa/GPS (cotización aparte, depende de infraestructura del cliente)
- [ ] Integración con proveedor LoRaWAN (TTN / ChirpStack / proveedor comercial)
- [ ] Ingesta de eventos de tag (la tabla `tag_events` ya existe desde la Etapa 1, solo se activa el pipeline)
- [ ] Mapa de tracking en tiempo real, geocercas, alertas

## Regla de oro para cualquier agente trabajando en este repo
No implementar funcionalidad de una etapa posterior mientras el proyecto está en una etapa anterior, salvo que el propio `/docs/DATABASE_SCHEMA.md` lo pida explícitamente como "IoT-ready" (diseño preparado, sin funcionalidad activa). Si hay duda sobre en qué etapa está el proyecto, preguntar antes de asumir.
