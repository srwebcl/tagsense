---
name: nfc-qr-scanning
description: Usar esta guía al implementar cualquier flujo de identificación de activos (escaneo de tags), al configurar Capacitor, o al decidir qué método de lectura ofrecer en una pantalla. Contiene las limitaciones reales de NFC en navegador/PWA que deben respetarse.
---

# Skill: Escaneo NFC / QR de tags TAGSENSE

## Limitación crítica (no negociable, viene de plataforma, no de elección de librería)

**Web NFC API solo existe en Chrome/Android.** Safari/iOS no la implementa y no hay indicios de que lo vaya a hacer. Esto significa:

- Una PWA pura (sin empaquetado nativo) **nunca** podrá leer NFC en iPhone, sin importar la librería usada.
- El proyecto usa Capacitor precisamente para resolver esto: en iOS, la lectura NFC solo es posible a través del plugin nativo de Capacitor (Core NFC), que requiere compilar como app nativa (no funciona en una pestaña de Safari).

## Regla de implementación

1. **QR es el método primario y se implementa primero**, porque:
   - Funciona en cualquier dispositivo con cámara, sin plugins nativos.
   - No requiere permisos especiales más allá de cámara.
   - Sirve tanto en la PWA en navegador como en el build de Capacitor.
2. **NFC es un método adicional (accesibilidad/velocidad), nunca el único camino.** Toda pantalla que ofrezca "acercar el dispositivo al tag" debe tener un botón/alternativa visible para escanear QR o ingresar el código manualmente.
3. Nunca se debe bloquear un flujo mostrando solo "Modo Lectura NFC" sin salida — si el dispositivo no soporta NFC (ej. iPhone en navegador sin el build nativo), la UI debe detectarlo (`'NDEFReader' in window` para Web NFC) y mostrar directamente la opción de QR.

## Implementación técnica

### QR
- Librería recomendada: `html5-qrcode` (más simple) o `zxing` (más control de bajo nivel).
- El QR codifica el mismo `tag_code` que identifica al activo en la base de datos (ver `assets.tag_code` en `/docs/DATABASE_SCHEMA.md`).
- Debe funcionar tanto con la cámara trasera (preferida) como con selección manual de cámara en dispositivos con múltiples cámaras.

### NFC en Android (dos caminos válidos, elegir uno y ser consistente)
- **Opción A — Web NFC directo** (`NDEFReader`): más simple, funciona en la PWA sin pasar por Capacitor, pero solo en Chrome/Android.
- **Opción B — Plugin nativo de Capacitor**: más consistente con la implementación de iOS, requiere el build empaquetado.
- Recomendación: usar el plugin de Capacitor para ambas plataformas una vez que exista el build nativo, y dejar Web NFC como fallback solo si se sigue sirviendo una versión PWA-en-navegador sin instalar.

### NFC en iOS
- Únicamente vía Core NFC a través del plugin nativo de Capacitor. No hay alternativa en navegador. Requiere cuenta de Apple Developer para distribución (App Store o TestFlight para el piloto).

## Checklist antes de dar por completo un flujo de escaneo
- [ ] ¿Funciona con QR en cualquier dispositivo, sin depender de NFC?
- [ ] ¿Se detecta correctamente si el dispositivo/navegador no soporta NFC, sin dejar al usuario en una pantalla muerta?
- [ ] ¿El código escaneado (QR o NFC) resuelve contra `assets.tag_code` filtrado por `tenant_id` del usuario autenticado (nunca cruzar tenants)?
- [ ] ¿Existe una opción de ingreso manual del código como último respaldo (cámara rota, tag dañado, etc.)?
