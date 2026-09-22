---
name: rag-assistant
description: Usar esta guía SIEMPRE que se implemente, modifique o depure el asistente técnico virtual (endpoint /api/assistant/chat, indexado de documentos, prompts al modelo). Define los guardrails obligatorios para que el asistente nunca responda fuera de la documentación cargada por el tenant.
---

# Skill: Asistente Técnico Virtual (RAG acotado)

## Qué es y qué NO es

El asistente es una **guía/buscador inteligente restringido a la documentación que cada empresa cliente cargó** — no un agente de diagnóstico con razonamiento abierto. Según el material de producto:

- ✅ Hace preguntas técnicas para entender síntoma y contexto.
- ✅ Guía el diagnóstico paso a paso (sistema → componente → verificación).
- ✅ Usa exclusivamente información oficial cargada por el tenant (manuales OEM).
- ✅ Reduce incertidumbre entregando criterios técnicos para validar posibles causas.
- ❌ No toma decisiones — la decisión final siempre es del técnico.
- ❌ No genera diagnósticos automáticos ni reemplaza la inspección en terreno.
- ❌ No reemplaza al mantenedor ni su criterio/juicio/responsabilidad.
- ❌ **No debe completar con conocimiento general del modelo** cuando la documentación cargada no cubre el caso — debe decir explícitamente que no tiene información suficiente en los documentos disponibles.

Este último punto es el guardrail más importante del sistema y debe verificarse con casos de prueba explícitos (ver sección de testing abajo).

## Pipeline de indexado (al subir un documento)

1. Extraer texto del PDF (usar librería de extracción de texto — considerar OCR si el PDF es escaneado/imagen, no texto real).
2. Dividir en chunks (~500-1000 tokens con solapamiento de ~100-150 tokens para no cortar contexto a mitad de un procedimiento).
3. Generar embeddings de cada chunk.
4. Guardar en `document_chunks` (ver `/docs/DATABASE_SCHEMA.md`) con `tenant_id`, `document_id`, `content`, `embedding`, `chunk_index`.
5. Este proceso debe ser asíncrono (job en cola) — subir un manual grande no puede bloquear la UI.

## Pipeline de respuesta (endpoint `/api/assistant/chat`)

1. Recibir `asset_id` + mensaje del técnico + historial de conversación (si existe).
2. Generar embedding de la consulta.
3. Buscar en `document_chunks` los N chunks más similares, **filtrados obligatoriamente por `tenant_id`** — nunca se debe poder recuperar contexto de otro tenant, ni por bug ni por optimización mal hecha.
4. Armar el prompt al modelo (Claude Sonnet por defecto) con:
   - Instrucción de sistema explícita: responder únicamente con base en el contexto entregado; si el contexto no es suficiente, decirlo y sugerir qué información adicional se necesita, en vez de inventar un procedimiento.
   - El contexto recuperado (los chunks).
   - El historial reciente de la conversación (para mantener el flujo guiado paso a paso del mockup: "¿en qué sistema?" → "¿qué componente?" → checklist de verificación).
5. Devolver la respuesta junto con referencia a qué documento(s) la sustentan (para trazabilidad — el técnico debe poder verificar la fuente).
6. Guardar el intercambio en `ai_conversations` para auditoría.

## Elección de modelo

- **Default: Claude Sonnet** — balance de calidad y costo adecuado para instrucciones técnicas.
- **Optimización de costo**: si el volumen de consultas crece mucho, evaluar enrutar consultas simples/rutinarias (ej. "¿dónde está el manual de X?") a **Claude Haiku**, reservando Sonnet para el flujo de diagnóstico guiado.
- **Prompt caching**: el contexto del manual de un activo específico se reutiliza entre consultas seguidas sobre el mismo activo — cachear ese bloque de contexto reduce el costo de input significativamente en conversaciones largas.
- La API key de Anthropic vive solo en el backend — nunca se expone al cliente/app.

## Casos de prueba obligatorios antes de dar por completo este módulo

- [ ] Pregunta sobre un procedimiento **que sí está** en la documentación cargada → responde correctamente citando la fuente.
- [ ] Pregunta sobre un procedimiento **que NO está** en la documentación cargada → responde explícitamente que no tiene información suficiente, **no inventa un procedimiento plausible**.
- [ ] Pregunta que intenta obtener información de otro tenant (ej. probar con IDs de otro cliente) → debe fallar/no encontrar nada, nunca filtrar datos cruzados.
- [ ] Conversación de varios turnos → mantiene el contexto del flujo guiado (sistema → componente → verificación) sin perder el hilo.
- [ ] Uso offline → la UI debe indicar claramente que el asistente requiere conexión, no fallar en silencio.
