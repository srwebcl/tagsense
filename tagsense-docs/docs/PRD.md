# TAGSENSE — Product Requirements Document (PRD)

## 1. Problema

Los equipos de mantenimiento industrial (foco inicial: minería) pierden tiempo y calidad de reparación porque:
- La información técnica de cada activo está dispersa en distintos formatos y lugares.
- Los manuales OEM son difíciles de encontrar o están desactualizados.
- El diagnóstico depende de la experiencia individual del técnico, no de un proceso estandarizado.
- Cada técnico registra la intervención de forma distinta → informes inconsistentes.
- No existe trazabilidad confiable de qué se hizo, cuándo, por quién y con qué componentes.

## 2. Usuarios

| Rol | Descripción | Necesidad principal |
|---|---|---|
| **Técnico / Mantenedor** | Ejecuta la intervención en terreno | Identificar el activo al instante, acceder a manuales, ser guiado en el diagnóstico, registrar evidencia rápido |
| **Administrador de la empresa cliente** | Gestiona activos, usuarios y documentación de su organización | Cargar/organizar manuales, ver historial y reportes, gestionar usuarios |
| **Operador de TAGSENSE (nosotros)** | Administra la plataforma multi-tenant | Dar de alta nuevas empresas clientes, monitorear uso e infraestructura |

## 3. Flujo principal (según el material comercial)

1. El técnico ingresa a la plataforma desde cualquier dispositivo (online u offline).
2. Escanea el tag del activo (QR universal, o NFC si el dispositivo lo soporta).
3. El sistema identifica el activo y muestra: información general, manuales, especificaciones, historial, fotos, checklist de inspección.
4. El técnico puede consultar al **asistente técnico virtual**, que hace preguntas guiadas (sistema → componente → verificación) usando *solo* la documentación OEM cargada por esa empresa, y sugiere el procedimiento correspondiente — **sin tomar la decisión final**, que siempre queda en manos del técnico.
5. El técnico registra evidencia (fotos, notas) durante la intervención.
6. Al finalizar, se genera automáticamente un **informe técnico en PDF**, validado por el mantenedor, listo para compartir.
7. Todo lo anterior debe poder ejecutarse **sin conexión**, sincronizando cuando vuelve la señal.

## 4. Alcance funcional del MVP (ver `/docs/ROADMAP.md` para fases previas — Piloto)

### 4.1 Incluido
- Autenticación con roles (técnico, admin) — multi-tenant.
- Identificación de activos vía **QR** (universal) y **NFC** (Android nativo vía Web NFC; Android e iOS vía Capacitor).
- Ficha de activo: información general, especificaciones, número de serie, ubicación, horómetro, última intervención.
- Gestión documental: administrador carga manuales OEM (PDF) por activo o por modelo de activo.
- Checklist de inspección configurable.
- Registro de evidencia fotográfica.
- Historial técnico por activo (qué se hizo, cuándo, quién, qué componentes).
- **Asistente técnico virtual**: chat guiado tipo árbol de decisión (sistema → componente → verificación), respondiendo *exclusivamente* con base en los documentos cargados por ese tenant (RAG). No diagnostica ni decide — entrega información para que el técnico decida.
- Generación automática de informe técnico en PDF con evidencia y firma.
- Modo offline completo para el flujo de campo, con sincronización posterior.
- Panel de administración web (gestión de activos, usuarios, documentos, reportes, notificaciones).
- Multi-tenant: aislamiento total de datos entre empresas clientes.

### 4.2 Explícitamente fuera de alcance del MVP (fases futuras, ver ROADMAP)
- Lectura LoRa/GPS de los tags (tracking en tiempo real, geocercas, mapa de flota).
- Integración con gateways LoRaWAN físicos.
- Diagnóstico "inteligente" que razone más allá de la documentación cargada.
- SSO/SAML, HIPAA u otras certificaciones de nivel Enterprise.

## 5. Requisitos no funcionales clave

- **Offline-first**: ninguna acción de campo (escaneo, checklist, foto) puede depender de tener conexión activa en el momento.
- **Aislamiento multi-tenant**: ninguna empresa cliente puede ver, ni por error de query, datos de otra.
- **Auditabilidad**: toda intervención queda con timestamp, autor y evidencia — no editable retroactivamente sin dejar rastro.
- **El asistente nunca inventa procedimientos** fuera de la documentación cargada — si no hay información suficiente, debe decirlo explícitamente en vez de generar una respuesta plausible pero no verificada.

## 6. Métricas de éxito del piloto

- Tiempo promedio desde "escaneo del tag" hasta "acceso a información crítica" (objetivo: segundos, no minutos).
- % de intervenciones con informe generado automáticamente vs registro manual.
- Reducción de tiempo de diagnóstico reportado por los técnicos del cliente piloto.
- Uso real del asistente (consultas/semana) como señal de adopción.
