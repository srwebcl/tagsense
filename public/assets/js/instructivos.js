'use strict';

// ================= INSTRUCTIVOS DE VERIFICACIÓN =================
// Procedimientos ejecutables paso a paso en terreno, con los valores de referencia
// que normalmente solo maneja el área de confiabilidad / monitoreo de condiciones.

import { goTo, escapeHtml } from './core.js';
import { openDocReader } from './documentos.js';

export const INSTRUCTIVOS = {
  frenos: {
    nombre: 'Verificación Sistema de Frenos',
    meta: 'IT-FRE-001 · Frecuencia: cada 250 h',
    icono: '<circle cx="12" cy="12" r="8" stroke="#D07838" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="#D07838"/>',
    pasos: [
      { txt: 'Aplicar procedimiento LOTO antes de iniciar la verificación.', alerta: 'No omitir. Requisito de seguridad obligatorio.' },
      { txt: 'Medir espesor de pastilla en las 4 ruedas con pie de metro.', ref: 'Mínimo: 8 mm' },
      { txt: 'Verificar torque de pernos de caliper con llave torquímetra calibrada.', ref: '180-210 Nm' },
      { txt: 'Inspeccionar disco: buscar rayado profundo, alabeo o grietas superficiales.' },
      { txt: 'Verificar nivel de fluido del circuito de frenos y buscar fugas en líneas.' },
      { txt: 'En frenos SAHR: verificar presión de precarga del acumulador.', ref: 'Según ficha del acumulador' },
      { txt: 'Prueba funcional: aplicar freno y verificar que no haya pedal esponjoso.', alerta: 'Si el pedal está esponjoso, hay aire en el circuito — no operar.' },
    ],
  },
  hidraulico: {
    nombre: 'Verificación Sistema Hidráulico',
    meta: 'IT-HID-001 · Frecuencia: cada 250 h',
    icono: '<path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke="#D07838" stroke-width="1.7" stroke-linejoin="round"/>',
    pasos: [
      { txt: 'Posicionar la tolva completamente abajo y apagar el motor.', alerta: 'Esperar a que el sistema pierda presión residual.' },
      { txt: 'Verificar nivel de aceite hidráulico en la mirilla del estanque.', ref: 'Capacidad 180 L · ISO VG 46' },
      { txt: 'Inspeccionar mangueras de alta presión: abrasión, grietas y fugas.', ref: 'SAE 100R2 · revisión visual diaria' },
      { txt: 'Verificar apriete y estado de o-rings en las conexiones principales.' },
      { txt: 'Con el equipo operativo, medir presión de trabajo del sistema.', ref: 'Normal: 180-195 bar · Máx: 210 bar' },
      { txt: 'Verificar estado del filtro de retorno y su indicador de restricción.', ref: 'Elemento 10 micrones · cambio cada 500 h' },
      { txt: 'Operar la tolva un ciclo completo y verificar recorrido sin trabas ni ruidos.' },
    ],
  },
  neumaticos: {
    nombre: 'Verificación Presión de Neumáticos',
    meta: 'IT-NEU-001 · Frecuencia: diaria (pre-uso)',
    icono: '<circle cx="12" cy="12" r="8" stroke="#D07838" stroke-width="1.7"/><circle cx="12" cy="12" r="3.2" stroke="#D07838" stroke-width="1.5"/>',
    pasos: [
      { txt: 'Realizar la medición con los neumáticos fríos, antes de operar.', alerta: 'Medir en caliente da lecturas falsamente altas.' },
      { txt: 'Medir presión en los 6 neumáticos con manómetro calibrado.', ref: 'En carga: 620-650 kPa' },
      { txt: 'Registrar cada valor individualmente, no solo el promedio.' },
      { txt: 'Inspeccionar desgaste de banda de rodadura en cada neumático.', alerta: 'Desgaste irregular puede indicar problema de alineación o suspensión.' },
      { txt: 'Buscar cortes, penetraciones o separación de capas en el flanco.' },
      { txt: 'Verificar torque de pernos de rueda.', ref: '650-700 Nm' },
      { txt: 'Reportar cualquier neumático fuera de rango en el Informe.', alerta: 'RP-0789 figura sin stock — reportar con severidad alta si es crítico.' },
    ],
  },
  tolva: {
    nombre: 'Verificación Estado de Tolva',
    meta: 'IT-TOL-001 · Frecuencia: cada 500 h',
    icono: '<path d="M3 17h13l4-8H7L3 17Z" stroke="#D07838" stroke-width="1.7" stroke-linejoin="round"/>',
    pasos: [
      { txt: 'Inspeccionar estructura de la tolva: grietas en soldaduras y refuerzos.', alerta: 'Toda grieta estructural debe reportarse de inmediato.' },
      { txt: 'Verificar desgaste del piso de la tolva y placas antidesgaste.' },
      { txt: 'Revisar pasadores y bujes del pivote de volteo: juego y lubricación.' },
      { txt: 'Inspeccionar cilindro telescópico de volteo: fuga en vástago y rayado.', ref: 'Carrera 1.850 mm' },
      { txt: 'Verificar fijación y estado del sistema de amortiguación de descarga.' },
      { txt: 'Realizar un ciclo completo de subida y bajada, midiendo tiempo.', alerta: 'Si la tolva sube lenta, revisar filtro de succión antes de sospechar de la bomba.' },
      { txt: 'Verificar que el seguro mecánico de tolva levantada opere correctamente.', alerta: 'Crítico: nunca trabajar bajo tolva sin el seguro puesto.' },
    ],
  },
  motor: {
    nombre: 'Verificación Motor y Refrigeración',
    meta: 'IT-MOT-001 · Frecuencia: cada 250 h',
    icono: '<path d="M4 13h3l2-4h6l2 4h3v6H4v-6Z" stroke="#D07838" stroke-width="1.6" stroke-linejoin="round"/>',
    pasos: [
      { txt: 'Verificar nivel de refrigerante con el motor completamente frío.', alerta: 'Nunca abrir la tapa del radiador con el motor caliente.' },
      { txt: 'Inspeccionar el radiador: obstrucción por polvo o material particulado.', alerta: 'Condición frecuente en operaciones de rajo — limpiar si corresponde.' },
      { txt: 'Verificar tensión y estado de la correa del ventilador.' },
      { txt: 'Revisar nivel de aceite de motor y buscar fugas visibles.', ref: 'Cambio cada 500 h' },
      { txt: 'Verificar estado del filtro de aire e indicador de restricción.', ref: 'RP-0198 · cada 500 h o según indicador' },
      { txt: 'Encender el motor y verificar temperatura de operación estabilizada.', ref: 'Normal: hasta 100 °C · Alerta: sobre 105 °C' },
      { txt: 'Revisar el panel: registrar cualquier código de falla activo.', ref: 'E-02 / E-04 / E-07 · ver manual sección 10' },
    ],
  },
};

// La lista abre cada instructivo en el visor de documentos (solo lectura, sin descarga).
export function renderInstructivosList(){
  const cont = document.getElementById('instructivos-list');
  cont.innerHTML = Object.entries(INSTRUCTIVOS).map(([key, ins]) => `
      <div class="instructivo-card" data-instr="${key}" role="button" tabindex="0">
        <div class="instructivo-ic"><svg viewBox="0 0 24 24" fill="none">${ins.icono}</svg></div>
        <div class="instructivo-txt">
          <strong>${escapeHtml(ins.nombre)}</strong>
          <small>${escapeHtml(ins.meta)}</small>
        </div>
        <svg class="instructivo-chev" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
  `).join('');

  cont.querySelectorAll('.instructivo-card').forEach(card => {
    const abrir = () => openDocReader('instr_' + card.dataset.instr, undefined, 'instructivos');
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
  });
}

document.getElementById('tile-instructivos').addEventListener('click', () => {
  renderInstructivosList();
  goTo('step-instructivos');
});
document.getElementById('back-instructivos').addEventListener('click', () => goTo('step-confirm-3'));
