'use strict';

// Controles de interfaz sin estado propio compartido con otros módulos: tema
// claro/oscuro, modo terreno, etiqueta de "última sincronización", swipe entre
// pestañas y pull-to-refresh del historial.

import { goTo } from './core.js';

// ---- Toggle de tema claro/oscuro ----
// El wordmark oficial es marfil (claro) — invisible sobre el fondo claro del
// tema light, así que se cambia por la variante oscura (logo-tagsense-dark.png)
// cada vez que se alterna el tema.
function actualizarLogosPorTema(){
  const claro = document.body.classList.contains('theme-light');
  document.querySelectorAll('[data-logo-themed]').forEach(img => {
    img.src = claro
      ? img.src.replace('logo-tagsense.png', 'logo-tagsense-dark.png')
      : img.src.replace('logo-tagsense-dark.png', 'logo-tagsense.png');
  });
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('theme-light');
  actualizarLogosPorTema();
});

// ---- Toggle de modo terreno (alto contraste) ----
const fieldToggle = document.getElementById('field-toggle');
fieldToggle.addEventListener('click', () => {
  document.body.classList.toggle('field-mode');
  fieldToggle.classList.toggle('active');
});

// ---- Última sincronización ----
let lastSyncTime = Date.now();
function formatSyncLabel(){
  const label = document.getElementById('ficha-sync-label');
  if (!label) return;
  const mins = Math.floor((Date.now() - lastSyncTime) / 60000);
  let text;
  if (mins < 1) text = 'Sincronizado hace un momento';
  else if (mins === 1) text = 'Sincronizado hace 1 min';
  else text = `Sincronizado hace ${mins} min`;
  const svg = label.querySelector('svg');
  label.textContent = text;
  if (svg) label.prepend(svg);
}
formatSyncLabel();
setInterval(formatSyncLabel, 30000);

// ---- Swipe entre pestañas de Accesos Rápidos ----
const SWIPE_TABS = ['step-info-general', 'step-historial', 'step-documentos', 'step-repuestos'];
let swipeStartX = 0, swipeStartY = 0;
const panelEl = document.querySelector('.panel');

panelEl.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  swipeStartX = t.clientX;
  swipeStartY = t.clientY;
}, { passive: true });

panelEl.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeStartX;
  const dy = t.clientY - swipeStartY;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

  const activeStage = SWIPE_TABS.find(s => {
    const el = document.getElementById(s);
    return el && !el.classList.contains('hidden');
  });
  const idx = SWIPE_TABS.indexOf(activeStage);
  if (idx === -1) return;

  if (dx < 0 && idx < SWIPE_TABS.length - 1) {
    goTo(SWIPE_TABS[idx + 1]);
  } else if (dx > 0 && idx > 0) {
    goTo(SWIPE_TABS[idx - 1]);
  }
}, { passive: true });

// ---- Pull-to-refresh en Historial ----
const historialStage = document.getElementById('step-historial');
const ptrIndicator = document.getElementById('ptr-indicator');
const ptrText = document.getElementById('ptr-text');
let ptrStartY = 0, ptrPulling = false, ptrReady = false;

historialStage.addEventListener('touchstart', (e) => {
  if (window.scrollY > 0) { ptrPulling = false; return; }
  ptrStartY = e.touches[0].clientY;
  ptrPulling = true;
  ptrReady = false;
}, { passive: true });

historialStage.addEventListener('touchmove', (e) => {
  if (!ptrPulling) return;
  const dy = e.touches[0].clientY - ptrStartY;
  if (dy > 55) {
    ptrReady = true;
    ptrText.textContent = 'Suelta para sincronizar';
    ptrIndicator.classList.add('show');
  } else if (dy <= 0) {
    ptrPulling = false;
    ptrIndicator.classList.remove('show');
  }
}, { passive: true });

historialStage.addEventListener('touchend', () => {
  if (!ptrPulling) return;
  ptrPulling = false;
  if (ptrReady) {
    ptrIndicator.classList.add('spinning');
    ptrText.textContent = 'Sincronizando...';
    setTimeout(() => {
      ptrIndicator.classList.remove('spinning');
      ptrText.textContent = '✓ Actualizado';
      lastSyncTime = Date.now();
      formatSyncLabel();
      setTimeout(() => {
        ptrIndicator.classList.remove('show');
      }, 900);
    }, 900);
  } else {
    ptrIndicator.classList.remove('show');
  }
});
