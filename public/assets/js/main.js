'use strict';

// Punto de entrada — importa cada módulo de pantalla/funcionalidad (lo que
// registra sus propios listeners y arranca su propio estado) y conecta acá
// solo el puñado de interacciones que cruzan dos módulos a la vez (login +
// destino, escaneo QR disparado desde el círculo NFC). El resto de la
// navegación vive directamente en el módulo dueño de cada pantalla.

import { goTo } from './core.js';
import { idActivoDesdeUrl, resolverActivoEscaneado, iniciarModoLectura, mostrarHintLectura } from './scan.js';
import { abrirEscanerQR } from './qr.js';
import { requiereLogin, confirmarSesionInicial } from './auth.js';
import { cargarSolicitudes } from './solicitudes.js';
import { abrirFormularioInforme } from './informe-form.js';
import { actualizarBadgePendientes, sincronizarInformesPendientes } from './informe-sync.js';

// Módulos que solo necesitan cargarse (registran sus propios listeners al
// evaluarse) — no se usa ningún export acá directamente.
import './manual-code.js';
import './asistente.js';
import './ui-misc.js';
import './documentos.js';
import './instructivos.js';
import './componentes.js';
import './historial.js';
import './connection.js';
import './pwa-install.js';

// ---- El círculo NFC también abre el escáner QR al tocarlo ----
document.getElementById('nfc-circle').addEventListener('click', () => {
  abrirEscanerQR();
});

// ---- Puntos donde se pide login a mitad de camino (nunca para identificar el activo) ----
document.getElementById('open-ficha-2').addEventListener('click', async () => {
  if (await requiereLogin('ficha')) return;
  goTo('step-confirm-3');
  cargarSolicitudes();
});

document.getElementById('btn-informe-confirm3').addEventListener('click', async () => {
  if (await requiereLogin('informe')) return;
  abrirFormularioInforme();
});

document.getElementById('report-fab').addEventListener('click', async () => {
  if (await requiereLogin('informe')) return;
  abrirFormularioInforme();
});

// ---- Arranque: escanear es lo primero, el login se pide después ----
// Identificar un activo (QR/NFC/código manual) es público — no requiere sesión,
// ver app/api/public/assets/[tag_code]/route.ts. El login solo se pide más
// adelante, al abrir la ficha técnica o generar un informe (open-ficha-2,
// report-fab), así que aquí la sesión se confirma en segundo plano, sin
// bloquear el escaneo: si ya había sesión (cookie de una visita anterior) esos
// dos puntos no vuelven a pedir usuario y contraseña.
(async function iniciarApp(){
  goTo('step-read');
  iniciarModoLectura();

  const idDesdeUrl = idActivoDesdeUrl();
  if (idDesdeUrl) {
    const resuelto = await resolverActivoEscaneado(idDesdeUrl, { origen: 'nfc-url' });
    if (!resuelto) mostrarHintLectura('No se pudo cargar el activo del tag. Intenta de nuevo o usa QR.');
  }

  await confirmarSesionInicial();
})();

// Por si quedaron informes pendientes de una sesión anterior (se cerró la app
// sin conexión, por ejemplo) y ya hay señal al volver a abrir.
actualizarBadgePendientes();
sincronizarInformesPendientes();
