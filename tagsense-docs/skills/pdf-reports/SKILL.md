---
name: pdf-reports
description: Usar esta guía al implementar o modificar la generación automática de informes técnicos en PDF (endpoint /api/reports), incluyendo diseño del documento, datos requeridos y manejo del job asíncrono.
---

# Skill: Generación de Informes Técnicos PDF

## Estructura del informe (según el mockup de producto)

El informe generado debe incluir, como mínimo:
- Logo/identidad de la empresa cliente (branding del tenant, no de TAGSENSE — el informe lo firma la minera).
- Datos del activo: nombre, código, fecha, horómetro, ubicación.
- Resumen de la intervención: diagnóstico, trabajo realizado, repuestos utilizados.
- Evidencias fotográficas (grid de fotos, no solo enlaces).
- Técnico responsable y firma (puede ser firma digital simple: nombre + timestamp, no necesariamente firma manuscrita).
- Pie de página con "Informe generado automáticamente por TAGSENSE" + fecha/hora de generación.

## Implementación

- Generar el PDF en el **backend**, como job asíncrono (BullMQ) — nunca bloquear la request HTTP esperando la generación.
- Opciones de librería:
  - `@react-pdf/renderer` — si se quiere definir el layout como componentes React, más mantenible si el equipo ya piensa en React.
  - Puppeteer (renderizar un HTML/CSS a PDF) — más flexible para diseños complejos, más pesado en recursos.
- El PDF final se sube a Cloudflare R2 y se guarda la referencia en `reports.file_url` (ver `/docs/DATABASE_SCHEMA.md`).
- El endpoint `POST /api/reports` responde inmediatamente con un `report_id` en estado `processing`; el cliente hace polling o recibe notificación cuando el archivo está listo (`GET /api/reports/:id`).

## Reglas de negocio

- Un informe se genera a partir de una `intervention` ya marcada como completa (no de una intervención en curso).
- El informe es inmutable una vez generado — si hay que corregir algo, se genera una nueva versión, no se edita el PDF existente (mantiene la trazabilidad/auditoría).
- El informe respeta el `tenant_id` de la intervención — solo usuarios del mismo tenant pueden descargarlo.
