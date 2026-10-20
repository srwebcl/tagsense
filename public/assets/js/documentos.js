'use strict';

// ================= DOCUMENTOS (manuales reales subidos por el admin) =================
// Antes esta pantalla mostraba un manual fijo hardcodeado (MT65S) para
// cualquier activo. Ahora lista los documentos reales que el admin subió
// para ESTE activo (GET /api/assets/:tag_code/documents) y abre el PDF real
// — el mismo documento que el asistente usa como fuente (ver asistente.js).

import { goTo, escapeHtml } from './core.js';
import { activoActualId } from './scan.js';

const TYPE_LABEL = { operacion: 'Operación', servicio: 'Servicio', reparacion: 'Reparación', partes: 'Partes' };

async function cargarDocumentos(){
  const cont = document.getElementById('documentos-list');
  if (!cont || !activoActualId) return;

  if (!navigator.onLine) {
    cont.innerHTML = '<p class="historial-status">Sin conexión — los documentos no están disponibles offline todavía.</p>';
    return;
  }

  cont.innerHTML = '<p class="historial-status">Cargando documentos…</p>';

  try {
    const resp = await fetch(`/api/assets/${encodeURIComponent(activoActualId)}/documents`);
    if (!resp.ok) {
      cont.innerHTML = '<p class="historial-status">No se pudo cargar los documentos.</p>';
      return;
    }
    // Esta pantalla es solo para archivos reales subidos por el admin — el
    // contenido de la ficha técnica (Equipamiento/Fallas/Procedimientos, sin
    // archivo propio) se muestra en Componentes e Instructivos, no acá.
    const docs = (await resp.json()).filter((d) => d.source_type === 'upload' && d.url);
    if (!docs.length) {
      cont.innerHTML = '<div class="comp-hist-empty" style="padding:4px 2px;">Todavía no hay documentos cargados para este activo.</div>';
      return;
    }

    cont.innerHTML = docs.map((doc) => `
      <div class="list-row" data-doc-id="${doc.id}" role="button" tabindex="0" aria-label="Abrir ${escapeHtml(doc.title)}">
        <div class="li-ic"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12h6M9 16h6" stroke="#D07838" stroke-width="1.6" stroke-linecap="round"/></svg></div>
        <div class="li-txt">
          <strong>${escapeHtml(doc.title)}</strong>
          <small>${TYPE_LABEL[doc.document_type] || doc.document_type}${doc.index_status !== 'indexed' ? ' · Indexando para el asistente…' : ''}</small>
        </div>
      </div>
    `).join('');

    cont.querySelectorAll('[data-doc-id]').forEach((row) => {
      const doc = docs.find((d) => d.id === row.dataset.docId);
      if (!doc) return;
      const abrir = () => window.open(doc.url, '_blank');
      row.addEventListener('click', abrir);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    });
  } catch (err) {
    cont.innerHTML = '<p class="historial-status">No se pudo conectar con el servidor.</p>';
  }
}

document.getElementById('tile-documentos').addEventListener('click', () => {
  goTo('step-documentos');
  cargarDocumentos();
});
document.getElementById('back-documentos').addEventListener('click', () => goTo('step-confirm-3'));
