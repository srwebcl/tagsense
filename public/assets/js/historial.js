'use strict';

// ---- Historial real: se consulta /api/assets/:tag_code/interventions al entrar ----

import { escapeHtml, goTo } from './core.js';
import { activoActualId, ACTIVOS } from './scan.js';
import { construirInformeHTML } from './informe-form.js';
import { informeState } from './informe-state.js';

const BLANK_SIGNATURE = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80"><rect width="220" height="80" fill="#ffffff"/><text x="110" y="45" font-family="Helvetica" font-size="11" fill="#999" text-anchor="middle">Firma no disponible</text></svg>');

function mapearIntervencionAInforme(item){
  const d = item.details || {};
  const sm = d.solicitudMantenimiento || null;
  const formatearFecha = (iso) => iso ? new Date(iso).toLocaleDateString('es-CL') : '';
  const formatearHora = (iso) => iso ? new Date(iso).toISOString().slice(11, 16) : '';
  return {
    folio: item.report_folio || '(sin informe generado)',
    equipo: (ACTIVOS[activoActualId] && ACTIVOS[activoActualId].nombre) || '',
    equipoId: activoActualId,
    tecnico: item.technician_name || '',
    fecha: formatearFecha(item.started_at),
    horometro: d.horometro || '',
    horaInicio: formatearHora(item.started_at),
    horaTermino: formatearHora(item.finished_at),
    descripcion: item.work_performed || '',
    fallas: item.diagnosis || '',
    severidad: d.severidad || null,
    repuestosUsados: !!(item.parts_used && item.parts_used.usados),
    repuestosDetalle: (item.parts_used && item.parts_used.detalle) || '',
    operativo: item.operational_after,
    observaciones: d.observaciones || '',
    instructivosUsados: !!d.instructivosUsados,
    instructivosNombres: d.instructivosNombres || [],
    alcances: d.alcances || '',
    smAplica: !!sm,
    smFolio: sm ? sm.folio : null,
    smTipo: sm ? sm.tipo : null,
    smPrioridad: sm ? sm.prioridad : null,
    smComponente: sm ? sm.componente : null,
    smDescripcion: sm ? sm.descripcion : '',
    fotos: [],
    firmaDataUrl: BLANK_SIGNATURE,
  };
}

function iconoHistorial(operativo){
  if (operativo === false) return '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a3 3 0 0 1-3.9 3.9L4 17v3h3l6.8-6.8a3 3 0 0 1 3.9-3.9l-2 2-1.4-1.4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
}

function badgeHistorial(operativo){
  if (operativo === false) return '<span class="li-badge err"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>Detenido</span>';
  if (operativo === true) return '<span class="li-badge ok"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Operativo</span>';
  return '<span class="li-badge warn">Registro</span>';
}

let historialCache = [];

export async function cargarHistorial(){
  const listEl = document.getElementById('historial-list');
  if (!listEl) return;

  if (!activoActualId) return;

  if (!navigator.onLine) {
    listEl.innerHTML = '<p class="historial-status">Sin conexión — el historial no está disponible offline todavía.</p>';
    return;
  }

  listEl.innerHTML = '<p class="historial-status" id="historial-status">Cargando historial…</p>';

  try {
    const resp = await fetch(`/api/assets/${encodeURIComponent(activoActualId)}/interventions`);
    if (!resp.ok) {
      listEl.innerHTML = '<p class="historial-status">No se pudo cargar el historial.</p>';
      return;
    }
    const items = await resp.json();
    historialCache = items;

    if (!items.length) {
      listEl.innerHTML = '<p class="historial-status">Todavía no hay intervenciones registradas para este activo.</p>';
      return;
    }

    listEl.innerHTML = items.map((item, idx) => {
      const fechaObj = item.started_at ? new Date(item.started_at) : null;
      const fecha = fechaObj
        ? fechaObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Sin fecha';
      const hora = fechaObj
        ? fechaObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        : '';

      const titulo = escapeHtml(item.work_performed || item.diagnosis || 'Intervención de mantenimiento');
      const tieneDiag = item.diagnosis && item.diagnosis.trim() && item.diagnosis.trim().toLowerCase() !== (item.work_performed || '').trim().toLowerCase();
      const diagnostico = tieneDiag ? escapeHtml(item.diagnosis.trim()) : '';
      const tecnico = escapeHtml(item.technician_name ? item.technician_name.trim() : 'Personal técnico');
      const horometro = item.details && item.details.horometro ? escapeHtml(String(item.details.horometro)) : '';
      const statusClass = item.operational_after === false ? 'stopped' : (item.operational_after === true ? 'ok' : 'warn');

      const btnInforme = item.report_id
        ? `<div class="hist-card-footer">
            <button class="hist-pill" data-hist="${idx}" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.8"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.8"/></svg>
              <span>Ver informe de mantenimiento</span>
              <svg class="hist-chev" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>`
        : '';

      return `
        <div class="hist-card">
          <div class="hist-card-head">
            <div class="hist-card-meta">
              <span class="hist-card-ic ${statusClass}">
                ${iconoHistorial(item.operational_after)}
              </span>
              <div class="hist-card-datetime">
                <span class="hist-date">${fecha}</span>
                ${hora ? `<span class="hist-time">${hora}</span>` : ''}
              </div>
            </div>
            <div class="hist-status-badge">
              ${badgeHistorial(item.operational_after)}
            </div>
          </div>

          <div class="hist-card-body">
            <strong class="hist-work">${titulo}</strong>
            ${diagnostico ? `
              <div class="hist-diag">
                <span class="hist-diag-lbl">Diagnóstico:</span>
                <span class="hist-diag-val">${diagnostico}</span>
              </div>
            ` : ''}
            <div class="hist-meta-bar">
              <div class="hist-tech-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/></svg>
                <span>Téc. ${tecnico}</span>
              </div>
              ${horometro ? `
                <div class="hist-horo-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                  <span>${horometro.includes('h') ? horometro : horometro + ' h'}</span>
                </div>
              ` : ''}
            </div>
          </div>

          ${btnInforme}
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.hist-pill').forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(pill.dataset.hist);
        const data = mapearIntervencionAInforme(historialCache[idx]);
        informeState.ultimoInformeData = data;
        document.getElementById('report-preview-content').innerHTML = construirInformeHTML(data);
        document.querySelectorAll('.report-send-row').forEach(r => r.classList.remove('hidden'));
        informeState.previewOrigen = 'historial';
        goTo('step-informe-preview');
      });
    });
  } catch (err) {
    listEl.innerHTML = '<p class="historial-status">No se pudo conectar con el servidor.</p>';
  }
}

document.getElementById('tile-historial').addEventListener('click', () => { goTo('step-historial'); cargarHistorial(); });
document.getElementById('back-historial').addEventListener('click', () => goTo('step-confirm-3'));
