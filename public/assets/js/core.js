'use strict';

// Utilidades transversales usadas por casi todos los demás módulos — escaneo,
// asistente, informe, documentos, etc. — por eso viven acá en vez de en el
// módulo de la pantalla que las usa primero.

export const TRUCK_PHOTO = "assets/img/truck-mt65s.png";
document.querySelectorAll('img.truck-photo').forEach(img => img.src = TRUCK_PHOTO);

// Lo escribe auth.js (login y verificación de sesión) y lo lee informe-form.js
// (nombre del técnico en el informe) — vive acá para que ninguno de los dos
// dependa del otro.
export const welcomeName = document.getElementById('welcome-name');

// Último horómetro conocido por activo. Lo escribe únicamente el formulario de
// informe (al construir la vista previa), lo leen la ficha técnica (scan.js) y
// Componentes Críticos (componentes.js) — vive acá, no en ninguno de los dos,
// para que ninguno dependa del otro.
export let ultimoHorometro = { 'TS-CAEX-0000125': '8.745 h' };

// Muestra/oculta una fila de la ficha según si hay dato — evita filas vacías
// tipo "Tipo de activo: —" para equipos a los que no se les cargó ese campo.
export function setFilaOpcional(rowId, valId, val){
  const row = document.getElementById(rowId);
  const valEl = document.getElementById(valId);
  if (!row || !valEl) return;
  if (val) {
    valEl.textContent = val;
    row.classList.remove('hidden');
  } else {
    row.classList.add('hidden');
  }
}

export function claseEstado(estado){
  if (estado === 'Detenido') return 'stopped';
  if (estado === 'Mantención') return 'maintenance';
  return '';
}

export function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function hapticPulse(){
  if (navigator.vibrate) { try { navigator.vibrate(50); } catch(e){} }
}

// ---- Navegación entre pantallas ----
export const steps = ['step-access','step-welcome','step-read','step-confirm-2','step-confirm-3','step-asistente','step-info-general','step-historial','step-documentos','step-repuestos','step-instructivos','step-solicitudes','step-doc-reader','step-informe','step-informe-preview'];

// ---- Alto real del viewport (evita espacios en blanco al navegar) ----
// En navegadores que no soportan la unidad dvh, recalculamos --vh a mano
// cada vez que cambia el alto visible (ej. al aparecer/ocultarse la barra de direcciones).
export function actualizarAltoViewport(){
  const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
actualizarAltoViewport();
window.addEventListener('resize', actualizarAltoViewport);
window.addEventListener('orientationchange', actualizarAltoViewport);
if (window.visualViewport) window.visualViewport.addEventListener('resize', actualizarAltoViewport);

export function goTo(id){
  actualizarAltoViewport();
  // Sin esto, si la pantalla anterior quedó con scroll, la nueva pantalla
  // arranca a mitad de scroll — se ve como un margen extra arriba que en
  // realidad es contenido ya pasado de la pantalla anterior.
  window.scrollTo(0, 0);
  steps.forEach(s => {
    const el = document.getElementById(s);
    if(!el) return;
    if(s === id){
      el.classList.remove('hidden');
      el.classList.remove('step-fade');
      void el.offsetWidth; // reinicia animación
      el.classList.add('step-fade');
    } else {
      el.classList.add('hidden');
    }
  });

  const reportFab = document.getElementById('report-fab');
  if (reportFab) {
    // step-confirm-2, step-confirm-3 y step-info-general quedan afuera a
    // propósito: en las dos primeras el contenido ya ocupa casi toda la
    // pantalla y tienen su propio botón en línea para generar informe (el
    // botón grande en confirm-2, "Generar Informe" junto a "Asistente Técnico"
    // en confirm-3); info-general es una ficha de specs técnicas que puede
    // crecer mucho según el activo (specs variables) y es de solo lectura —
    // sin ninguna acción propia que el FAB tuviera que acompañar. Un FAB ahí
    // competía con ese contenido. En las pantallas de abajo sí aporta, porque
    // son listas/sub-secciones sin esa acción ya disponible en línea.
    const EQUIPMENT_CONTEXT_STEPS = [
      'step-asistente',
      'step-historial', 'step-documentos', 'step-repuestos', 'step-doc-reader',
      'step-instructivos', 'step-solicitudes'
    ];
    const muestraFab = EQUIPMENT_CONTEXT_STEPS.includes(id);
    reportFab.classList.toggle('show', muestraFab);
    if (muestraFab) {
      // Lo movemos DENTRO de la pantalla activa (al final, o justo antes de la
      // barra de chat en el asistente) — así es sticky respecto a esa pantalla,
      // no fixed respecto al viewport, y nunca puede flotar encima de otro
      // control sin importar cuánto contenido tenga cada pantalla.
      const stageEl = document.getElementById(id);
      const chatInputRow = stageEl ? stageEl.querySelector('.chat-input-row') : null;
      if (chatInputRow) {
        stageEl.insertBefore(reportFab, chatInputRow);
      } else if (stageEl) {
        stageEl.appendChild(reportFab);
      }
    }
  }
}

let toastTimeout = null;
// El toast ahora lo usan pantallas con headers de alturas distintas (el chat del
// asistente, que tiene su propio chat-header, y las pantallas de detalle tipo
// "Solicitudes") — en vez de una posición fija pensada para una sola, se calcula
// el borde inferior del header de la pantalla activa en cada llamada.
export function mostrarToast(mensaje, duracion = 2500){
  const el = document.getElementById('toast-notification');
  if (!el) return;
  const stageActivo = steps.map(id => document.getElementById(id)).find(s => s && !s.classList.contains('hidden'));
  const header = stageActivo ? stageActivo.querySelector('.chat-header, .detail-topbar') : null;
  const topSeguro = header ? header.getBoundingClientRect().bottom + 12 : 80;
  el.style.top = `${Math.max(topSeguro, 16)}px`;
  el.textContent = mensaje;
  el.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.remove('show');
  }, duracion);
}
