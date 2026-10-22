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
export let ultimoHorometro = {};

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

export function actualizarBottomNav(stageId){
  const bottomNav = document.getElementById('app-bottom-nav');
  if (!bottomNav) return;

  // En login y splash ocultamos el menú inferior
  if (stageId === 'step-access' || stageId === 'step-welcome') {
    bottomNav.classList.add('hidden');
    return;
  }
  bottomNav.classList.remove('hidden');

  let activeTab = 'read';
  const FICHA_STEPS = [
    'step-confirm-2', 'step-confirm-3', 'step-info-general',
    'step-historial', 'step-documentos', 'step-repuestos',
    'step-instructivos', 'step-solicitudes', 'step-doc-reader'
  ];

  if (FICHA_STEPS.includes(stageId)) {
    activeTab = 'ficha';
  } else if (stageId === 'step-asistente') {
    activeTab = 'asistente';
  } else if (stageId === 'step-informe' || stageId === 'step-informe-preview') {
    activeTab = 'informe';
  } else if (stageId === 'step-read') {
    activeTab = 'read';
  }

  bottomNav.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.navTab === activeTab);
  });
}

export function goTo(id){
  actualizarAltoViewport();

  steps.forEach(s => {
    const el = document.getElementById(s);
    if(!el) return;
    if(s === id){
      el.classList.remove('hidden');
      el.classList.remove('step-fade');
      void el.offsetWidth; // reinicia animación
      el.classList.add('step-fade');
      // Scroll interno reseteado en la parte superior para que no inicie desfasado
      el.scrollTop = 0;
    } else {
      el.classList.add('hidden');
    }
  });

  actualizarBottomNav(id);

  // Mantener fallback de reportFab oculto para evitar colisiones con el menú inferior
  const reportFab = document.getElementById('report-fab');
  if (reportFab) {
    reportFab.classList.remove('show');
  }
}

let toastTimeout = null;
export function mostrarToast(mensaje, duracion = 2500){
  const el = document.getElementById('toast-notification');
  if (!el) return;
  el.textContent = mensaje;
  el.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.remove('show');
  }, duracion);
}
