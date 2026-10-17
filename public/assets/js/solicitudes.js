'use strict';

// ================= SOLICITUDES DE MANTENIMIENTO (SM) =================
// Nacen dentro del Informe cuando el mantenedor detecta algo que excede la intervención
// del día (repuesto pendiente, inspección técnica, monitoreo predictivo, etc.).
// Son un registro real en el backend (tabla maintenance_requests) — ver
// /api/assets/:tag_code/maintenance-requests y /api/maintenance-requests/:id (PATCH
// para cerrarla). solicitudesCache es la última copia conocida para esta sesión;
// se reemplaza por completo cada vez que cargarSolicitudes() consulta al servidor.

import { escapeHtml, mostrarToast, goTo } from './core.js';
import { activoActualId } from './scan.js';
import { COMPONENTE_META } from './componentes.js';

let smFolioCounter = 1;
// Lo incrementa btnPreviewInforme (informe-form.js) al crear una SM optimista —
// se expone como función en vez de dejar el contador como global mutable desde
// afuera, para que siga siendo el único lugar que lo toca.
export function generarFolioSM(){
  const folio = 'SM-' + String(smFolioCounter).padStart(4, '0');
  smFolioCounter++;
  return folio;
}

export let solicitudesCache = [];

function renderSMList(){
  const cont = document.getElementById('sm-list');
  if (!cont) return;
  if (!solicitudesCache.length) {
    cont.innerHTML = '<div class="comp-hist-empty" style="padding:4px 2px;">Aún no se han generado solicitudes de mantenimiento desde los informes.</div>';
    return;
  }
  const PRIORIDAD_CLASE = { 'Baja':'baja', 'Media':'media', 'Alta':'alta', 'Urgente':'urgente' };
  cont.innerHTML = solicitudesCache.map(sm => `
    <div class="sm-card">
      <div class="sm-card-top">
        <div>
          <div class="sm-folio">${escapeHtml(sm.folio)}</div>
          <div class="sm-meta">${escapeHtml(sm.fecha)}${sm.tecnico ? ' · ' + escapeHtml(sm.tecnico) : ''}</div>
        </div>
        <span class="sm-prioridad ${PRIORIDAD_CLASE[sm.prioridad] || ''}">${escapeHtml(sm.prioridad)}</span>
      </div>
      <div class="sm-tipo"><b>${escapeHtml(sm.tipo)}</b>${sm.componente && COMPONENTE_META[sm.componente] ? ' · ' + escapeHtml(COMPONENTE_META[sm.componente].nombre) : ''}</div>
      <div class="sm-desc">${escapeHtml(sm.descripcion || 'Sin detalle adicional.')}</div>
      <div class="sm-card-bottom">
        <span class="sm-estado ${sm.estado === 'Resuelta' ? 'resuelta' : ''}">${escapeHtml(sm.estado)}</span>
        ${sm.estado === 'Abierta' && sm.id ? `<button class="sm-resolve-btn" data-sm-id="${sm.id}" type="button">Marcar como resuelta</button>` : ''}
      </div>
    </div>
  `).join('');

  cont.querySelectorAll('.sm-resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => resolverSolicitud(btn.dataset.smId, btn));
  });
}

async function resolverSolicitud(id, btn){
  if (!navigator.onLine) { mostrarToast('Necesitas conexión para marcarla como resuelta.'); return; }
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  try {
    const resp = await fetch(`/api/maintenance-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'Resuelta' }),
    });
    if (!resp.ok) {
      mostrarToast('No se pudo marcar como resuelta. Intenta de nuevo.');
      btn.disabled = false;
      btn.textContent = 'Marcar como resuelta';
      return;
    }
    const sm = solicitudesCache.find(s => s.id === id);
    if (sm) sm.estado = 'Resuelta';
    renderSMList();
    actualizarTileSolicitudes();
    mostrarToast('Solicitud marcada como resuelta.');
  } catch (err) {
    mostrarToast('No se pudo conectar con el servidor.');
    btn.disabled = false;
    btn.textContent = 'Marcar como resuelta';
  }
}

function actualizarTileSolicitudes(){
  const el = document.getElementById('sm-tile-count');
  if (!el) return;
  const abiertas = solicitudesCache.filter(s => s.estado === 'Abierta').length;
  el.textContent = abiertas > 0 ? `${abiertas} abierta${abiertas > 1 ? 's' : ''}` : 'Sin solicitudes';
}
actualizarTileSolicitudes();

// Trae las solicitudes reales del activo actual — se usa tanto al entrar a la
// pantalla "Solicitudes" como de fondo al abrir la ficha técnica (para que el
// contador del tile y el badge "pendiente" en Componentes ya tengan datos).
export async function cargarSolicitudes(){
  if (!activoActualId) return;
  if (!navigator.onLine) {
    // Sin esto, el tile deja "Cargando solicitudes…" fijo para siempre si se
    // abre la pantalla sin conexión (mismo patrón de fallback que cargarHistorial).
    if (solicitudesCache.length) {
      renderSMList();
    } else {
      const cont = document.getElementById('sm-list');
      if (cont) cont.innerHTML = '<p class="historial-status">Sin conexión — las solicitudes no están disponibles offline todavía.</p>';
    }
    return;
  }
  try {
    const resp = await fetch(`/api/assets/${encodeURIComponent(activoActualId)}/maintenance-requests`);
    if (!resp.ok) return;
    const items = await resp.json();
    solicitudesCache = items.map(item => ({
      id: item.id, folio: item.folio, tipo: item.tipo, prioridad: item.prioridad,
      componente: item.componente, descripcion: item.descripcion, estado: item.estado,
      fecha: item.created_at ? new Date(item.created_at).toLocaleDateString('es-CL') : '',
      tecnico: item.tecnico_nombre,
    }));
    actualizarTileSolicitudes();
    renderSMList();
  } catch (err) { /* sin red o backend caído: se queda con lo que ya tenía en caché */ }
}

export function agregarSolicitudOptimista(sm){
  solicitudesCache.unshift(sm);
  actualizarTileSolicitudes();
}

document.getElementById('tile-solicitudes').addEventListener('click', () => {
  document.getElementById('sm-list').innerHTML = '<p class="historial-status">Cargando solicitudes…</p>';
  goTo('step-solicitudes');
  cargarSolicitudes();
});
document.getElementById('back-solicitudes').addEventListener('click', () => goTo('step-confirm-3'));
