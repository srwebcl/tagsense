---
name: offline-sync
description: Usar esta guía siempre que se implemente o modifique cualquier flujo de la app de campo (escaneo, ficha de activo, checklist, fotos, intervenciones) porque TODOS deben funcionar sin conexión. También usar al implementar el endpoint /api/sync o cualquier lógica de resolución de conflictos.
---

# Skill: Sincronización Offline-First

## Por qué existe esta guía
La conectividad en interior mina es intermitente o nula. Esto no es una optimización de UX, es un requisito funcional duro: si un flujo de campo depende de tener conexión activa en el momento, está mal implementado.

## Principios de diseño

1. **Local-first, no local-cache.** El dispositivo escribe primero en IndexedDB (vía Dexie.js), no espera respuesta del servidor para mostrar el cambio al usuario.
2. **Todo registro creado offline lleva un `client_generated_id` (UUID v4)** generado en el dispositivo. Esto permite que el servidor identifique duplicados si el mismo registro se reintenta sincronizar más de una vez.
3. **Cola de sincronización explícita**, no "reintentar todo cada vez". Cada cambio pendiente se guarda como un evento en una tabla local `pending_sync_queue` con: tipo de operación (`create_intervention`, `update_checklist`, `upload_photo`, etc.), payload, timestamp local, y estado (`pending`, `syncing`, `synced`, `conflict`).
4. **La sync se dispara automáticamente al detectar conexión** (evento `online` del navegador + polling de respaldo), y también permite forzarla manualmente desde la UI.
5. **Idempotencia obligatoria en el backend**: el endpoint `/api/sync` debe poder recibir el mismo batch dos veces (por un reintento de red) sin crear registros duplicados — usar `client_generated_id` como clave de deduplicación.

## Resolución de conflictos

Caso principal a resolver: dos técnicos offline editan la misma intervención o el mismo activo, y ambos sincronizan después.

- **Estrategia por defecto: last-write-wins a nivel de campo, no de registro completo.** Si dos técnicos modificaron campos distintos de la misma intervención, se combinan ambos cambios. Si modificaron el mismo campo, gana el timestamp más reciente, pero el cambio perdedor **no se descarta silenciosamente** — se guarda en un log de conflictos visible para el admin.
- Las intervenciones nunca se sobrescriben por completo: son casi siempre "agregar evidencia" (fotos, notas), no "editar un valor único" — diseñar el modelo de datos para que la mayoría de las operaciones sean adiciones (append), no reemplazos, porque eso elimina la mayoría de los conflictos reales.
- Fotos nunca generan conflicto — son siempre adiciones, con su propio `client_generated_id`.

## Qué se cachea localmente para consulta offline

- Ficha completa del activo una vez escaneado (para poder reconsultarla sin conexión).
- Manuales/documentos ya consultados (Service Worker cachea el PDF servido desde R2 la primera vez que se abre).
- Checklists activos del tenant (se descargan al hacer login, se actualizan cuando hay conexión).
- El asistente IA **no funciona offline** (requiere llamar a la API de Anthropic) — esto debe comunicarse claramente en la UI, no fallar silenciosamente.

## Anti-patrones a evitar
- No usar `localStorage`/`sessionStorage` para datos estructurados — usar IndexedDB (Dexie.js) desde el inicio.
- No bloquear la UI esperando confirmación del servidor en flujos de campo — actualizar UI optimistamente y reconciliar en background.
- No asumir que "guardar offline" y "guardar" son casos de código distintos — deben ser el mismo camino de datos, con la sync como un paso adicional, no una re-implementación paralela.
