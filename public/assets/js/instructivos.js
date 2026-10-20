'use strict';

// ================= INSTRUCTIVOS DE VERIFICACIÓN =================
// Procedimientos de verificación en terreno por Sistema — mismo contenido que
// el admin carga en la ficha técnica (Procedimientos, ver /admin/assets/:id/ficha),
// no una lista fija. Solo se listan los Sistemas del activo que ya tienen un
// procedimiento cargado — si no hay nada que leer, no aparece la card.

import { goTo, escapeHtml } from './core.js';
import { activoActualId } from './scan.js';
import { cargarSistemasActivo, obtenerSistemasActivo, iconoSistema } from './sistemas-activo.js';

let instructivosDeActivoId = null;
let instructivosCache = []; // [{slug, name, texto}]

async function cargarInstructivos(){
  await cargarSistemasActivo();
  if (instructivosDeActivoId === activoActualId) return instructivosCache;

  instructivosCache = [];
  try {
    const resp = await fetch(`/api/assets/${encodeURIComponent(activoActualId)}/documents`);
    if (resp.ok) {
      const docs = await resp.json();
      const sistemas = obtenerSistemasActivo();
      for (const doc of docs) {
        if (doc.field_type_slug !== 'procedimientos' || !doc.raw_text) continue;
        const sistema = sistemas.find((s) => s.slug === doc.category_slug);
        if (!sistema) continue;
        instructivosCache.push({ slug: sistema.slug, name: sistema.name, texto: doc.raw_text });
      }
      instructivosDeActivoId = activoActualId;
    }
  } catch (err) {
    // sin conexión: la lista queda vacía, se reintenta la próxima vez que se abra
  }
  return instructivosCache;
}

export function renderInstructivosList(){
  const cont = document.getElementById('instructivos-list');
  cont.innerHTML = '<p class="historial-status">Cargando instructivos…</p>';
  cargarInstructivos().then((instructivos) => {
    if (!instructivos.length) {
      cont.innerHTML = '<div class="comp-hist-empty">Este activo todavía no tiene procedimientos de verificación cargados en la ficha técnica.</div>';
      return;
    }
    cont.innerHTML = instructivos.map((ins) => `
        <div class="instructivo-card" data-instr="${ins.slug}" role="button" tabindex="0">
          <div class="instructivo-ic"><svg viewBox="0 0 24 24" fill="none">${iconoSistema(ins.slug)}</svg></div>
          <div class="instructivo-txt">
            <strong>Verificación ${escapeHtml(ins.name)}</strong>
            <small>Procedimiento de terreno</small>
          </div>
          <svg class="instructivo-chev" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
    `).join('');

    cont.querySelectorAll('.instructivo-card').forEach(card => {
      const abrir = () => abrirInstructivo(card.dataset.instr);
      card.addEventListener('click', abrir);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    });
  });
}

function abrirInstructivo(slug){
  const ins = instructivosCache.find((i) => i.slug === slug);
  if (!ins) return;

  document.getElementById('doc-title').textContent = `Verificación ${ins.name}`;
  document.getElementById('doc-subtitle').textContent = 'Verificación en terreno';
  document.getElementById('doc-meta').textContent = 'Procedimiento de la ficha técnica';

  const body = document.getElementById('doc-body');
  body.innerHTML = `<div class="doc-p">${escapeHtml(ins.texto)}</div>`;

  goTo('step-doc-reader');
  const stage = document.querySelector('.doc-reader-stage');
  if (stage) stage.scrollTop = 0;
}

document.getElementById('tile-instructivos').addEventListener('click', () => {
  renderInstructivosList();
  goTo('step-instructivos');
});
document.getElementById('back-instructivos').addEventListener('click', () => goTo('step-confirm-3'));
document.getElementById('back-doc-reader').addEventListener('click', () => goTo('step-instructivos'));
