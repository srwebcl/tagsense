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
  if (operativo === false) return '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="#D07838" stroke-width="1.6" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a3 3 0 0 1-3.9 3.9L4 17v3h3l6.8-6.8a3 3 0 0 1 3.9-3.9l-2 2-1.4-1.4z" stroke="#D07838" stroke-width="1.5" stroke-linejoin="round"/></svg>';
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
      const fecha = item.started_at ? new Date(item.started_at).toLocaleDateString('es-CL') : '';
      const titulo = escapeHtml(item.work_performed || item.diagnosis || 'Intervención registrada');
      const subtitulo = escapeHtml(`${fecha} · ${item.diagnosis || 'Sin diagnóstico registrado'} · Téc. ${item.technician_name || ''}`);
      const pill = item.report_id
        ? `<button class="hist-pill" data-hist="${idx}" type="button">Ver informe</button>`
        : '';
      return `
        <div class="list-row">
          <div class="li-ic">${iconoHistorial(item.operational_after)}</div>
          <div class="li-txt"><strong>${titulo}</strong><small>${subtitulo}</small></div>
          ${badgeHistorial(item.operational_after)}
          ${pill}
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
