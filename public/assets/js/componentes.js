'use strict';

// ================= COMPONENTES DEL ACTIVO (Sistemas + ficha de vida) =================
// "Componente" acá es lo mismo que "Sistema" en el admin (Frenos, Dirección,
// Tolva...) — el catálogo activo de este activo puntual (asset_components, ver
// /admin/assets/:id/ficha y /admin/categorias). Antes esta pantalla tenía una
// lista fija de 5 piezas (motor/transmision/hidraulico/frenos/mandos) igual
// para cualquier activo; ahora muestra los Sistemas reales de ESTE activo, con
// sus especificaciones y fallas conocidas (Equipamiento/Fallas principales de
// la ficha técnica) más el historial de intervenciones que ya se registraba.

import { escapeHtml, goTo, ultimoHorometro } from './core.js';
import { activoActualId } from './scan.js';
import { solicitudesCache } from './solicitudes.js';
import { cargarSistemasActivo, obtenerSistemasActivo, iconoSistema } from './sistemas-activo.js';

const COMPONENTES_POR_ACTIVO = {};

function crearComponentesIniciales(){
  const estado = {};
  for (const sistema of obtenerSistemasActivo()) {
    estado[sistema.slug] = {
      estado: 'original', empresa: null, fechaInstalacion: null, horometroInstalacion: 0,
      historial: [], especificaciones: null, fallas: null,
    };
  }
  return estado;
}

function getComponentesActivo(id){
  if (!COMPONENTES_POR_ACTIVO[id]) COMPONENTES_POR_ACTIVO[id] = crearComponentesIniciales();
  return COMPONENTES_POR_ACTIVO[id];
}

export function parseHorometro(str){
  if (!str) return null;
  const n = parseFloat(String(str).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Trae la ficha de vida real desde el backend: historial de intervenciones
// (GET /api/assets/:id/components, reconstruido desde interventions — no hay
// tabla aparte) y especificaciones/fallas de la ficha técnica
// (GET /api/assets/:id/documents, Equipamiento/Fallas principales por Sistema).
export async function cargarComponentes(){
  const container = document.getElementById('comp-criticos-list');
  if (!container || !activoActualId) return;

  if (!navigator.onLine) {
    if (COMPONENTES_POR_ACTIVO[activoActualId]) { renderComponentes(); return; }
    container.innerHTML = '<p class="historial-status">Sin conexión — los componentes no están disponibles offline todavía.</p>';
    return;
  }

  await cargarSistemasActivo();
  const estado = crearComponentesIniciales();

  try {
    const [respHist, respDocs] = await Promise.all([
      fetch(`/api/assets/${encodeURIComponent(activoActualId)}/components`),
      fetch(`/api/assets/${encodeURIComponent(activoActualId)}/documents`),
    ]);

    if (respHist.ok) {
      const filas = await respHist.json();
      for (const fila of filas) {
        const c = estado[fila.componente];
        if (!c) continue; // intervención de un sistema que ya no está activo en este activo
        const horometroNum = parseHorometro(fila.horometro);
        c.historial.push({
          fecha: fila.started_at ? new Date(fila.started_at).toLocaleDateString('es-CL') : '—',
          horometro: horometroNum !== null ? horometroNum : '—',
          folio: fila.folio || '—',
          detalle: fila.detalle || 'Intervención registrada.',
          empresa: fila.empresa,
          tecnico: fila.tecnico,
        });
      }
      // El backend ya ordena por fecha descendente — la primera entrada de cada
      // sistema es la intervención más reciente, la que define su estado "actual".
      for (const c of Object.values(estado)) {
        if (!c.historial.length) continue;
        const ultima = c.historial[0];
        c.estado = 'reparado';
        c.empresa = ultima.empresa || 'Taller interno';
        c.fechaInstalacion = ultima.fecha !== '—' ? ultima.fecha : null;
        if (typeof ultima.horometro === 'number') c.horometroInstalacion = ultima.horometro;
      }
    }

    if (respDocs.ok) {
      const docs = await respDocs.json();
      for (const doc of docs) {
        const c = estado[doc.category_slug];
        if (!c || !doc.raw_text) continue;
        if (doc.field_type_slug === 'equipamiento' && !c.especificaciones) c.especificaciones = doc.raw_text;
        if (doc.field_type_slug === 'fallas' && !c.fallas) c.fallas = doc.raw_text;
      }
    }
  } catch (err) {
    // sin conexión real: se queda con el estado en blanco recién creado
  }

  COMPONENTES_POR_ACTIVO[activoActualId] = estado;
  renderComponentes();
}

const ESTADO_LABELS = { original: 'Original', reparado: 'Reparado', reacondicionado: 'Reacondicionado', reemplazado: 'Reemplazado' };

export function renderComponentes(){
  const container = document.getElementById('comp-criticos-list');
  if (!container) return;
  if (!activoActualId) { container.innerHTML = ''; return; }
  const sistemas = obtenerSistemasActivo();
  if (!sistemas.length) {
    container.innerHTML = '<div class="comp-hist-empty">Este activo todavía no tiene sistemas asignados en el admin.</div>';
    return;
  }
  const horometroActual = parseHorometro(ultimoHorometro[activoActualId]) || 0;
  const UMBRAL_ALERTA_HORAS = 4000; // referencia: sobre esto, sugerir revisión preventiva
  const estadoActivo = getComponentesActivo(activoActualId);

  container.innerHTML = sistemas.map((sistema) => {
    const key = sistema.slug;
    const c = estadoActivo[key] || { estado: 'original', historial: [], horometroInstalacion: 0, especificaciones: null, fallas: null };
    const fechaTexto = c.fechaInstalacion ? escapeHtml(c.fechaInstalacion) : 'fecha no registrada';
    const horas = Math.max(0, Math.round(horometroActual - c.horometroInstalacion));
    const enAlerta = horas >= UMBRAL_ALERTA_HORAS;
    const smAbierta = solicitudesCache.find(s => s.componente === key && s.estado === 'Abierta');
    const origenTexto = c.empresa
      ? `Reparado — ${escapeHtml(c.empresa)}, ${fechaTexto}`
      : `Componente de fábrica, instalado ${fechaTexto}`;
    const historialHtml = c.historial.length
      ? c.historial.slice().reverse().map(h =>
          `<div class="comp-hist-item"><b>${escapeHtml(h.fecha)}</b> · ${escapeHtml(String(h.horometro))}h · ${escapeHtml(h.folio)}<br>${escapeHtml(h.detalle)}${h.empresa ? `<br><span style="color:var(--text-low);">${escapeHtml(h.empresa)}${h.tecnico ? ' · Téc. ' + escapeHtml(h.tecnico) : ''}</span>` : ''}</div>`
        ).join('')
      : '<div class="comp-hist-empty">Sin intervenciones registradas.</div>';

    return `
      <div class="comp-card" id="comp-card-${key}">
        <div class="comp-card-head" data-toggle="${key}" role="button" tabindex="0">
          <div class="comp-ic"><svg viewBox="0 0 24 24" fill="none">${iconoSistema(key)}</svg></div>
          <div class="comp-head-txt">
            <strong>${escapeHtml(sistema.name)}</strong>
            <div class="comp-head-horas ${enAlerta ? 'alerta' : ''}">
              ${enAlerta ? '<svg viewBox="0 0 24 24" fill="none" class="alerta-ic"><path d="M12 2 2 20h20L12 2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v5M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' : ''}
              <b>${horas.toLocaleString('es-CL')}</b> horas acumuladas
            </div>
            ${smAbierta ? `<div class="sm-pending-badge">⏳ ${escapeHtml(smAbierta.folio)} pendiente</div>` : ''}
          </div>
          <span class="comp-badge ${c.estado}">${ESTADO_LABELS[c.estado]}</span>
          <svg class="comp-chev" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="comp-card-body">
          ${enAlerta ? '<div class="comp-alerta-banner">Esta pieza supera las ' + UMBRAL_ALERTA_HORAS.toLocaleString('es-CL') + ' horas de uso — se sugiere programar una revisión preventiva.</div>' : ''}
          <div class="comp-detail-grid">
            <div style="grid-column:1 / -1;"><span class="dk">Origen</span><span class="dv">${origenTexto}</span></div>
            <div><span class="dk">Fecha instalación</span><span class="dv">${fechaTexto}</span></div>
            <div><span class="dk">Horómetro instalación</span><span class="dv">${c.horometroInstalacion.toLocaleString('es-CL')} h</span></div>
          </div>
          <div class="comp-hist-label">Especificaciones</div>
          <div class="comp-hist-item">${c.especificaciones ? escapeHtml(c.especificaciones) : '<span class="comp-hist-empty-inline">Sin especificaciones registradas en la ficha técnica.</span>'}</div>
          <div class="comp-hist-label">Fallas conocidas</div>
          <div class="comp-hist-item">${c.fallas ? escapeHtml(c.fallas) : '<span class="comp-hist-empty-inline">Sin fallas registradas en la ficha técnica.</span>'}</div>
          <div class="comp-hist-label">Historial de intervenciones</div>
          ${historialHtml}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-toggle]').forEach(head => {
    const toggle = () => {
      const card = document.getElementById('comp-card-' + head.dataset.toggle);
      card.classList.toggle('open');
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

// Actualiza la ficha de vida del sistema cuando se genera un informe que lo interviene
export function actualizarComponenteDesdeInforme(sistemaSlug, data, empresaTexto){
  const estadoActivo = getComponentesActivo(activoActualId);
  const c = estadoActivo[sistemaSlug];
  if (!c) return;
  const horometroNum = parseHorometro(data.horometro);
  c.estado = 'reparado';
  c.empresa = empresaTexto || 'Taller interno';
  c.fechaInstalacion = data.fecha;
  if (horometroNum !== null) c.horometroInstalacion = horometroNum;
  c.historial.push({
    fecha: data.fecha,
    horometro: horometroNum !== null ? horometroNum : '—',
    folio: data.folio,
    detalle: data.repuestosUsados ? data.repuestosDetalle : (data.descripcion || 'Intervención registrada.'),
    empresa: c.empresa,
    tecnico: data.tecnico,
  });
}

document.getElementById('tile-repuestos').addEventListener('click', () => {
  const list = document.getElementById('comp-criticos-list');
  if (list) list.innerHTML = '<p class="historial-status">Cargando componentes…</p>';
  goTo('step-repuestos');
  cargarComponentes();
});
document.getElementById('back-repuestos').addEventListener('click', () => goTo('step-confirm-3'));
