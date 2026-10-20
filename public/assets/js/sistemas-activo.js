'use strict';

// ================= SISTEMAS ACTIVOS DEL ACTIVO (catálogo único) =================
// Fuente única de verdad de "qué componentes tiene este activo" para toda la app
// de campo — Componentes, Instructivos, y los selectores de componente del
// Informe y la Solicitud de Mantenimiento. Antes cada pantalla tenía su propia
// lista fija de 5 piezas (motor/transmision/hidraulico/frenos/mandos), igual
// para cualquier activo. Ahora todas comparten la misma consulta que ya usa el
// Asistente (GET /api/fault-categories?asset_id=, ver asset_components en el
// admin) — un camión tiene Tolva, una pala tiene Balde, y se administra desde
// /admin/categorias y /admin/assets/:id/ficha.

import { activoActualId, ACTIVOS } from './scan.js';

let sistemasDeActivoId = null;
let sistemasCache = [];

// Íconos color cobre para las pantallas de campo (Componentes/Instructivos) —
// mismos trazos que ya usa el Asistente (asistente.js, SYMPTOM_ICONS) recoloreados;
// una categoría que el admin agregue sin ícono dedicado usa el genérico.
const ICONOS_SISTEMA = {
  frenos: '<circle cx="12" cy="12" r="8" stroke="#D07838" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="#D07838"/>',
  direccion: '<circle cx="12" cy="12" r="8" stroke="#D07838" stroke-width="1.7"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4" stroke="#D07838" stroke-width="1.7" stroke-linecap="round"/>',
  tolva: '<path d="M3 17h13l4-8H7L3 17Z" stroke="#D07838" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="19" r="1.6" stroke="#D07838" stroke-width="1.5"/><circle cx="16" cy="19" r="1.6" stroke="#D07838" stroke-width="1.5"/>',
  electrico: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/>',
  hidraulico: '<path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke="#D07838" stroke-width="1.7" stroke-linejoin="round"/>',
  ejes: '<circle cx="12" cy="12" r="3" stroke="#D07838" stroke-width="1.7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="#D07838" stroke-width="1.5" stroke-linecap="round"/>',
  sensores: '<rect x="7" y="7" width="10" height="10" rx="2" stroke="#D07838" stroke-width="1.7"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="#D07838" stroke-width="1.5" stroke-linecap="round"/>',
  temperatura: '<path d="M10 14.76V4a2 2 0 1 1 4 0v10.76a4 4 0 1 1-4 0Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/>',
  motor: '<path d="M4 13h3l2-4h6l2 4h3v6H4v-6Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="16" r="1.6" stroke="#D07838" stroke-width="1.4"/><circle cx="15" cy="16" r="1.6" stroke="#D07838" stroke-width="1.4"/>',
};
export const ICONO_SISTEMA_GENERICO = '<path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4L14.7 6.3Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/>';

export function iconoSistema(slug){
  return ICONOS_SISTEMA[slug] || ICONO_SISTEMA_GENERICO;
}

export async function cargarSistemasActivo(){
  if (sistemasDeActivoId === activoActualId) return sistemasCache;
  const activo = ACTIVOS[activoActualId];
  if (!activo || !activo.id) return sistemasCache;
  try {
    const resp = await fetch('/api/fault-categories?asset_id=' + encodeURIComponent(activo.id));
    if (!resp.ok) return sistemasCache;
    const data = await resp.json().catch(() => null);
    sistemasCache = (data && data.categorias) || [];
    sistemasDeActivoId = activoActualId;
  } catch (err) {
    // Sin red: se queda con lo último cacheado (puede ser de otro activo, pero
    // es mejor que dejar las pantallas completamente vacías).
  }
  return sistemasCache;
}

export function obtenerSistemasActivo(){
  return sistemasCache;
}

export function nombreSistema(slug){
  const encontrado = sistemasCache.find((s) => s.slug === slug);
  return encontrado ? encontrado.name : slug;
}
