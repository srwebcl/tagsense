'use strict';

// ================= COMPONENTES CRÍTICOS (ficha de vida por pieza) =================
// Se auto-completan con lo que el técnico registra en cada Informe de Mantenimiento —
// no se editan a mano en esta pantalla.
//
// Cacheado por activo (no hay tabla `components` en el backend todavía — ver
// auditoría pre-lanzamiento — así que esto sigue siendo solo caché de sesión,
// se pierde al recargar la página). Antes era un único objeto global: escanear
// un segundo activo real mostraba el historial de reparaciones del primero
// como si fuera del segundo. Cada activo ahora arranca con su propia ficha en
// blanco (sin historial ni fecha de instalación inventada).

import { escapeHtml, goTo, ultimoHorometro } from './core.js';
import { activoActualId } from './scan.js';
import { solicitudesCache } from './solicitudes.js';

// Metadata estática (nombre/ícono no cambian según el activo) — separada del
// estado mutable (estado/empresa/historial), que sí es por activo.
export const COMPONENTE_META = {
  motor: { nombre: 'Motor', icono: 'motor' },
  transmision: { nombre: 'Transmisión', icono: 'transmision' },
  hidraulico: { nombre: 'Sistema Hidráulico', icono: 'hidraulico' },
  frenos: { nombre: 'Frenos', icono: 'frenos' },
  mandos: { nombre: 'Mandos Finales', icono: 'mandos' },
};

const COMPONENTES_POR_ACTIVO = {};

function crearComponentesIniciales(){
  const estado = {};
  for (const key of Object.keys(COMPONENTE_META)) {
    estado[key] = { estado: 'original', empresa: null, fechaInstalacion: null, horometroInstalacion: 0, historial: [] };
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

// Trae la ficha de vida real desde el backend (GET /api/assets/:id/components —
// se reconstruye a partir del historial de intervenciones, no hay tabla aparte,
// ver esa ruta). Antes esto vivía solo en memoria del navegador y se perdía al
// recargar la página; ahora cada apertura de esta pantalla trae lo que de verdad
// quedó guardado, incluidos los informes que se sincronizaron desde la cola offline.
export async function cargarComponentes(){
  const container = document.getElementById('comp-criticos-list');
  if (!container || !activoActualId) return;

  if (!navigator.onLine) {
    if (COMPONENTES_POR_ACTIVO[activoActualId]) { renderComponentes(); return; }
    container.innerHTML = '<p class="historial-status">Sin conexión — los componentes no están disponibles offline todavía.</p>';
    return;
  }

  try {
    const resp = await fetch(`/api/assets/${encodeURIComponent(activoActualId)}/components`);
    if (!resp.ok) { renderComponentes(); return; } // se queda con lo que ya había en caché/default

    const filas = await resp.json();
    const estado = crearComponentesIniciales();
    for (const fila of filas) {
      const c = estado[fila.componente];
      if (!c) continue; // componente desconocido — no debería pasar, pero no revienta la pantalla
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
    // componente es la intervención más reciente, la que define su estado "actual".
    for (const c of Object.values(estado)) {
      if (!c.historial.length) continue;
      const ultima = c.historial[0];
      c.estado = 'reparado';
      c.empresa = ultima.empresa || 'Taller interno';
      c.fechaInstalacion = ultima.fecha !== '—' ? ultima.fecha : null;
      if (typeof ultima.horometro === 'number') c.horometroInstalacion = ultima.horometro;
    }
    COMPONENTES_POR_ACTIVO[activoActualId] = estado;
    renderComponentes();
  } catch (err) {
    renderComponentes(); // sin conexión real (fetch tiró): se queda con lo que había
  }
}

const COMP_ICONS = {
  motor: '<path d="M4 13h3l2-4h6l2 4h3v6H4v-6Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="16" r="1.6" stroke="#D07838" stroke-width="1.4"/><circle cx="15" cy="16" r="1.6" stroke="#D07838" stroke-width="1.4"/>',
  transmision: '<circle cx="12" cy="12" r="3" stroke="#D07838" stroke-width="1.6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="#D07838" stroke-width="1.4" stroke-linecap="round"/>',
  hidraulico: '<path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/>',
  frenos: '<circle cx="12" cy="12" r="8" stroke="#D07838" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="#D07838"/>',
  mandos: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 8l9 5 9-5M12 13v8" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/>',
};

const ESTADO_LABELS = { original: 'Original', reparado: 'Reparado', reacondicionado: 'Reacondicionado', reemplazado: 'Reemplazado' };

export function renderComponentes(){
  const container = document.getElementById('comp-criticos-list');
  if (!container) return;
  if (!activoActualId) { container.innerHTML = ''; return; }
  const horometroActual = parseHorometro(ultimoHorometro[activoActualId]) || 0;
  const UMBRAL_ALERTA_HORAS = 4000; // referencia: sobre esto, sugerir revisión preventiva

  container.innerHTML = Object.entries(getComponentesActivo(activoActualId)).map(([key, c]) => {
    const meta = COMPONENTE_META[key];
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
          <div class="comp-ic"><svg viewBox="0 0 24 24" fill="none">${COMP_ICONS[meta.icono]}</svg></div>
          <div class="comp-head-txt">
            <strong>${escapeHtml(meta.nombre)}</strong>
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

// Actualiza la ficha de vida del componente cuando se genera un informe que lo interviene
export function actualizarComponenteDesdeInforme(compKey, data, empresaTexto){
  const c = getComponentesActivo(activoActualId)[compKey];
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
