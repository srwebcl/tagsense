'use strict';

// ================= INFORME DE MANTENIMIENTO (formulario + vista previa) =================

import { goTo, escapeHtml, welcomeName, ultimoHorometro } from './core.js';
import { ACTIVOS, activoActualId } from './scan.js';
import { COMPONENTE_META, actualizarComponenteDesdeInforme } from './componentes.js';
import { generarFolioSM, agregarSolicitudOptimista } from './solicitudes.js';
import { INSTRUCTIVOS } from './instructivos.js';
import { informeState } from './informe-state.js';

let informeFolioCounter = 1;
// Expuesto para informe-sync.js: el folio se usa al construir la vista previa
// (acá) pero el contador solo se incrementa al descargar/compartir el PDF
// (ver report-pdf-btn en informe-sync.js) — por eso son dos funciones separadas
// en vez de una sola que leyera-e-incrementara junto.
export function obtenerFolioInforme(){
  return 'INF-' + String(informeFolioCounter).padStart(4, '0');
}
export function incrementarFolioInforme(){
  informeFolioCounter++;
}

let informeFotos = [];

// Fecha ISO del informe en curso — 'informe-fecha' se muestra en formato es-CL
// (DD-MM-YYYY) para el PDF/WhatsApp, que `new Date()` no puede re-parsear de
// vuelta; se guarda aparte para armar fechas válidas al persistir en el backend.
let informeFechaISO = null;

// ---- Repuestos utilizados: píldora Sí/No ----
let repuestosUsados = false;
const repuestosDetalle = document.getElementById('informe-repuestos-detalle');
const pillSi = document.getElementById('repuestos-si');
const pillNo = document.getElementById('repuestos-no');
function setRepuestosUsados(valor){
  repuestosUsados = valor;
  pillSi.classList.toggle('selected', valor);
  pillNo.classList.toggle('selected', !valor);
  repuestosDetalle.classList.toggle('hidden', !valor);
  if (!valor) repuestosDetalle.value = '';
  validarInforme();
}
pillSi.addEventListener('click', () => setRepuestosUsados(true));
pillNo.addEventListener('click', () => setRepuestosUsados(false));
repuestosDetalle.addEventListener('input', validarInforme);

// ---- Checklist (solo Equipo queda operativo) ----
function wireToggle(id){
  const el = document.getElementById(id);
  el.addEventListener('click', () => {
    const on = el.classList.toggle('on');
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}
wireToggle('check-operativo');
document.getElementById('check-operativo').addEventListener('click', () => {
  const operativo = document.getElementById('check-operativo').classList.contains('on');
  if (!operativo && severidadSeleccionada === 'alta') setSmAplica(true);
});

// ---- Severidad de fallas encontradas ----
let severidadSeleccionada = null;
const severityChips = { baja: document.getElementById('sev-baja'), media: document.getElementById('sev-media'), alta: document.getElementById('sev-alta') };
Object.entries(severityChips).forEach(([nivel, chip]) => {
  const seleccionar = () => {
    Object.values(severityChips).forEach(c => c.classList.remove('selected'));
    if (severidadSeleccionada === nivel) {
      severidadSeleccionada = null;
    } else {
      severidadSeleccionada = nivel;
      chip.classList.add('selected');
      const operativo = document.getElementById('check-operativo').classList.contains('on');
      if (!operativo && nivel === 'alta') setSmAplica(true);
    }
  };
  chip.addEventListener('click', seleccionar);
  chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(); } });
});

// ---- ¿Utilizó instructivos de verificación? ----
let instructivosUsados = false;
const instructivosSeleccionados = new Set();
const instrUsadosSi = document.getElementById('instr-usados-si');
const instrUsadosNo = document.getElementById('instr-usados-no');
const instrUsadosRow = document.getElementById('instr-usados-row');

instrUsadosRow.innerHTML = Object.entries(INSTRUCTIVOS).map(([key, ins]) =>
  `<div class="comp-chip" data-instr-sel="${key}" role="button" tabindex="0">${escapeHtml(ins.nombre.replace('Verificación ', ''))}</div>`
).join('');

instrUsadosRow.querySelectorAll('.comp-chip').forEach(chip => {
  const toggle = () => {
    const k = chip.dataset.instrSel;
    if (instructivosSeleccionados.has(k)) {
      instructivosSeleccionados.delete(k);
      chip.classList.remove('selected');
    } else {
      instructivosSeleccionados.add(k);
      chip.classList.add('selected');
    }
  };
  chip.addEventListener('click', toggle);
  chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
});

function setInstructivosUsados(valor){
  instructivosUsados = valor;
  instrUsadosSi.classList.toggle('selected', valor);
  instrUsadosNo.classList.toggle('selected', !valor);
  instrUsadosRow.classList.toggle('hidden', !valor);
  if (!valor) {
    instructivosSeleccionados.clear();
    instrUsadosRow.querySelectorAll('.comp-chip').forEach(c => c.classList.remove('selected'));
  }
}
instrUsadosSi.addEventListener('click', () => setInstructivosUsados(true));
instrUsadosNo.addEventListener('click', () => setInstructivosUsados(false));

const informeAlcances = document.getElementById('informe-alcances');

// ---- Solicitud de Mantenimiento (SM) ----
let smAplica = false;
let smTipo = null, smPrioridad = null, smComponente = null;
const smSi = document.getElementById('sm-si');
const smNo = document.getElementById('sm-no');
const smFields = document.getElementById('sm-fields');
const smDescripcion = document.getElementById('sm-descripcion');

function setSmAplica(valor){
  smAplica = valor;
  smSi.classList.toggle('selected', valor);
  smNo.classList.toggle('selected', !valor);
  smFields.classList.toggle('hidden', !valor);
}
smSi.addEventListener('click', () => setSmAplica(true));
smNo.addEventListener('click', () => setSmAplica(false));

function wireSingleSelectChips(rowId, dataAttr, onSet){
  document.querySelectorAll(`#${rowId} .comp-chip`).forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll(`#${rowId} .comp-chip`).forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      onSet(chip.dataset[dataAttr]);
    });
  });
}
wireSingleSelectChips('sm-tipo-row', 'smTipo', v => smTipo = v);
wireSingleSelectChips('sm-prioridad-row', 'smPrioridad', v => smPrioridad = v);
wireSingleSelectChips('sm-componente-row', 'smComp', v => smComponente = v);

// ---- Componente intervenido (alimenta la ficha de vida en Componentes del Activo) ----
let componenteIntervenido = 'ninguno';
const compChips = document.querySelectorAll('#comp-intervenido-row .comp-chip');
const empresaLabel = document.getElementById('empresa-section-label');
const empresaTipoRow = document.getElementById('empresa-tipo-row');
const empresaInterno = document.getElementById('empresa-interno');
const empresaExterno = document.getElementById('empresa-externo');
const empresaExternoNombre = document.getElementById('empresa-externo-nombre');

compChips.forEach(chip => {
  const seleccionar = () => {
    compChips.forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    componenteIntervenido = chip.dataset.comp;
    const mostrar = componenteIntervenido !== 'ninguno';
    empresaLabel.classList.toggle('hidden', !mostrar);
    empresaTipoRow.classList.toggle('hidden', !mostrar);
    if (!mostrar) empresaExternoNombre.classList.add('hidden');
    else if (empresaExterno.classList.contains('selected')) empresaExternoNombre.classList.remove('hidden');
  };
  chip.addEventListener('click', seleccionar);
  chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(); } });
});

empresaInterno.addEventListener('click', () => {
  empresaInterno.classList.add('selected');
  empresaExterno.classList.remove('selected');
  empresaExternoNombre.classList.add('hidden');
});
empresaExterno.addEventListener('click', () => {
  empresaExterno.classList.add('selected');
  empresaInterno.classList.remove('selected');
  empresaExternoNombre.classList.remove('hidden');
  empresaExternoNombre.focus();
});

// Recuerda proveedores externos ya escritos, para autocompletar la próxima vez
const empresasRecientes = new Set();
function actualizarListaEmpresasRecientes(){
  const datalist = document.getElementById('empresas-recientes');
  datalist.innerHTML = Array.from(empresasRecientes).map(nombre => `<option value="${escapeHtml(nombre)}">`).join('');
}
function obtenerEmpresaSeleccionada(){
  if (empresaExterno.classList.contains('selected')) {
    const nombre = empresaExternoNombre.value.trim();
    return nombre || 'Proveedor externo (sin especificar)';
  }
  return 'Taller interno';
}

// ---- Campos obligatorios: horómetro, hora inicio, hora término ----
const informeHorometro = document.getElementById('informe-horometro');
const informeHoraInicio = document.getElementById('informe-hora-inicio');
const informeHoraTermino = document.getElementById('informe-hora-termino');
[informeHorometro, informeHoraInicio, informeHoraTermino].forEach(el => {
  el.addEventListener('input', () => { el.classList.remove('field-invalid'); validarInforme(); });
});

// ---- Fotografías desde galería ----
const fotoInput = document.getElementById('informe-foto-input');
const fotoBtn = document.getElementById('informe-foto-btn');
const fotoThumbs = document.getElementById('informe-foto-thumbs');
fotoBtn.addEventListener('click', () => fotoInput.click());
fotoBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fotoInput.click(); } });
fotoInput.addEventListener('change', () => {
  const files = Array.from(fotoInput.files || []).slice(0, 6 - informeFotos.length);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      informeFotos.push(e.target.result);
      renderFotoThumbs();
    };
    reader.readAsDataURL(file);
  });
  fotoInput.value = '';
});
function renderFotoThumbs(){
  fotoThumbs.innerHTML = informeFotos.map((src, i) => `
    <div class="photo-thumb">
      <img src="${src}" alt="Foto ${i + 1}">
      <div class="photo-remove" data-idx="${i}" role="button" tabindex="0" aria-label="Quitar foto">
        <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>
      </div>
    </div>
  `).join('');
  fotoThumbs.querySelectorAll('.photo-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      informeFotos.splice(Number(btn.dataset.idx), 1);
      renderFotoThumbs();
    });
  });
}

// ---- Descripción del trabajo ----
const informeDescripcion = document.getElementById('informe-descripcion');
informeDescripcion.addEventListener('input', validarInforme);
const informeFallas = document.getElementById('informe-fallas');
const informeObservaciones = document.getElementById('informe-observaciones');

// ---- Firma del técnico (canvas táctil) ----
const sigCanvas = document.getElementById('signature-canvas');
const sigCtx = sigCanvas.getContext('2d');
let hasSignature = false;
let drawing = false;

function resizeSignatureCanvas(){
  const rect = sigCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  sigCanvas.width = rect.width * ratio;
  sigCanvas.height = rect.height * ratio;
  sigCtx.scale(ratio, ratio);
  sigCtx.strokeStyle = '#1a1a1a';
  sigCtx.lineWidth = 2.2;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
}
window.addEventListener('resize', () => {
  if (document.getElementById('step-informe').classList.contains('hidden')) return;
  const data = hasSignature ? sigCanvas.toDataURL() : null;
  resizeSignatureCanvas();
  if (data) { const img = new Image(); img.onload = () => sigCtx.drawImage(img, 0, 0, sigCanvas.width, sigCanvas.height); img.src = data; }
});

function getSigPos(e){
  const rect = sigCanvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}
function sigStart(e){
  e.preventDefault();
  drawing = true;
  const p = getSigPos(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
}
function sigMove(e){
  if (!drawing) return;
  e.preventDefault();
  const p = getSigPos(e);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
  if (!hasSignature) { hasSignature = true; validarInforme(); }
}
function sigEnd(){ drawing = false; }

sigCanvas.addEventListener('touchstart', sigStart, { passive: false });
sigCanvas.addEventListener('touchmove', sigMove, { passive: false });
sigCanvas.addEventListener('touchend', sigEnd);
sigCanvas.addEventListener('mousedown', sigStart);
sigCanvas.addEventListener('mousemove', sigMove);
sigCanvas.addEventListener('mouseup', sigEnd);
sigCanvas.addEventListener('mouseleave', sigEnd);

document.getElementById('signature-clear').addEventListener('click', () => {
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasSignature = false;
  validarInforme();
});

const btnPreviewInforme = document.getElementById('btn-preview-informe');

function validarInforme(){
  let ok = informeDescripcion.value.trim().length > 0 && hasSignature;
  ok = ok && informeHorometro.value.trim().length > 0;
  ok = ok && informeHoraInicio.value.trim().length > 0;
  ok = ok && informeHoraTermino.value.trim().length > 0;
  if (repuestosUsados) ok = ok && repuestosDetalle.value.trim().length > 0;
  btnPreviewInforme.disabled = !ok;
}

// Abre el formulario de informe ya con los campos iniciales listos — separado
// del listener para poder llamarlo también después de un login pedido a mitad
// de camino (ver pendingDestino === 'informe' en auth.js).
export function abrirFormularioInforme(){
  document.getElementById('informe-tecnico').textContent = welcomeName.textContent || 'usuario';
  // Quedaban con el texto de demo fijo ("Camión MT65S" / "TS-CAEX-0000125")
  // sin importar qué activo estuviera realmente abierto — mismo descuido que
  // el encabezado del Asistente Técnico (ver aplicarActivo en scan.js).
  const activo = ACTIVOS[activoActualId];
  document.getElementById('informe-equipo').textContent = activo ? activo.nombre : '—';
  document.getElementById('informe-id-tagsense').textContent = activoActualId || '—';
  const ahora = new Date();
  informeFechaISO = ahora.toISOString().slice(0, 10);
  document.getElementById('informe-fecha').textContent = ahora.toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  goTo('step-informe');
  requestAnimationFrame(() => {
    resizeSignatureCanvas();
    hasSignature = false;
    severidadSeleccionada = null;
    Object.values(severityChips).forEach(c => c.classList.remove('selected'));
    setInstructivosUsados(false);
    document.getElementById('informe-alcances').value = '';
    setSmAplica(false);
    smTipo = null; smPrioridad = null; smComponente = null;
    document.querySelectorAll('#sm-tipo-row .comp-chip, #sm-prioridad-row .comp-chip, #sm-componente-row .comp-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('sm-descripcion').value = '';
    componenteIntervenido = 'ninguno';
    document.querySelectorAll('#comp-intervenido-row .comp-chip').forEach(c => c.classList.remove('selected'));
    document.querySelector('#comp-intervenido-row .comp-chip[data-comp="ninguno"]').classList.add('selected');
    document.getElementById('empresa-section-label').classList.add('hidden');
    document.getElementById('empresa-tipo-row').classList.add('hidden');
    document.getElementById('empresa-interno').classList.add('selected');
    document.getElementById('empresa-externo').classList.remove('selected');
    document.getElementById('empresa-externo-nombre').classList.add('hidden');
    document.getElementById('empresa-externo-nombre').value = '';
    repuestosUsados = false;
    document.getElementById('repuestos-si').classList.remove('selected');
    document.getElementById('repuestos-no').classList.add('selected');
    document.getElementById('informe-repuestos-detalle').classList.add('hidden');
    document.getElementById('informe-repuestos-detalle').value = '';
    informeFotos = [];
    renderFotoThumbs();
    document.getElementById('informe-horometro').classList.remove('field-invalid');
    document.getElementById('informe-hora-inicio').classList.remove('field-invalid');
    document.getElementById('informe-hora-termino').classList.remove('field-invalid');
    validarInforme();
  });
}

document.getElementById('back-informe').addEventListener('click', () => goTo('step-confirm-3'));
document.getElementById('back-informe-preview').addEventListener('click', () => {
  goTo(informeState.previewOrigen === 'historial' ? 'step-historial' : 'step-informe');
});

export function construirInformeHTML(data){
  // Logo oscuro fijo, sin importar el tema activo en la app: la vista previa y
  // el PDF siempre tienen fondo blanco, y el wordmark marfil quedaría invisible ahí.
  const logoSrc = 'assets/img/logo-tagsense-dark.png';
  const sevLabel = { baja: 'Severidad: Baja', media: 'Severidad: Media', alta: 'Severidad: Alta' };
  const sevColor = { baja: '#177b57', media: '#eb912b', alta: '#c91233' };
  const fotosHtml = (data.fotos && data.fotos.length)
    ? `<div class="preview-h">Fotografías</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">${data.fotos.map(f => `<img src="${f}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">`).join('')}</div>`
    : '';

  return `
    <img class="preview-logo" src="${logoSrc}" alt="TAGSENSE">
    <h2>Informe de Mantenimiento</h2>
    <div class="preview-meta">${escapeHtml(data.folio)} · ${escapeHtml(data.fecha)}</div>
    <div class="preview-grid">
      <div><b>Equipo:</b> ${escapeHtml(data.equipo)}</div>
      <div><b>ID:</b> ${escapeHtml(data.equipoId)}</div>
      <div><b>Técnico:</b> ${escapeHtml(data.tecnico)}</div>
      <div><b>Horómetro:</b> ${escapeHtml(data.horometro)}</div>
      <div><b>Inicio:</b> ${escapeHtml(data.horaInicio)}</div>
      <div><b>Término:</b> ${escapeHtml(data.horaTermino)}</div>
    </div>
    <div class="preview-h">Descripción del trabajo</div>
    <p class="preview-p">${escapeHtml(data.descripcion)}</p>
    ${data.fallas ? `<div class="preview-h">Fallas encontradas</div>
    ${data.severidad ? `<div style="display:inline-block;font-size:10.5px;font-weight:800;color:#fff;background:${sevColor[data.severidad]};padding:3px 9px;border-radius:10px;margin-bottom:6px;">${sevLabel[data.severidad]}</div>` : ''}
    <p class="preview-p">${escapeHtml(data.fallas)}</p>` : ''}
    <div class="preview-h">Repuestos utilizados</div>
    <div class="preview-p">${data.repuestosUsados ? escapeHtml(data.repuestosDetalle) : 'No se utilizaron repuestos'}</div>
    <div class="preview-h">Checklist</div>
    <div class="preview-checks">${data.operativo ? '✅' : '❌'} Equipo queda operativo</div>
    <div class="preview-h">Instructivos de verificación</div>
    <div class="preview-p">${data.instructivosUsados && data.instructivosNombres.length ? data.instructivosNombres.map(n => '• ' + escapeHtml(n)).join('<br>') : 'No se utilizaron instructivos'}</div>
    ${data.alcances ? `<div class="preview-h">Alcances técnicos del mantenedor</div><p class="preview-p">${escapeHtml(data.alcances)}</p>` : ''}
    ${data.smAplica ? `<div class="preview-h">Solicitud de Mantenimiento</div><p class="preview-p"><b>${escapeHtml(data.smFolio || 'SM')}</b> · ${escapeHtml(data.smTipo || '')} · Prioridad ${escapeHtml(data.smPrioridad || '')}${data.smComponente && COMPONENTE_META[data.smComponente] ? ' · ' + escapeHtml(COMPONENTE_META[data.smComponente].nombre) : ''}<br>${escapeHtml(data.smDescripcion || '')}</p>` : ''}
    ${data.observaciones ? `<div class="preview-h">Recomendaciones</div><p class="preview-p">${escapeHtml(data.observaciones)}</p>` : ''}
    ${fotosHtml}
    <div class="preview-h">Firma del técnico</div>
    <img class="preview-sig" src="${data.firmaDataUrl}" alt="Firma">
  `;
}

btnPreviewInforme.addEventListener('click', () => {
  let valido = true;
  if (!informeHorometro.value.trim()) { informeHorometro.classList.add('field-invalid'); valido = false; }
  if (!informeHoraInicio.value.trim()) { informeHoraInicio.classList.add('field-invalid'); valido = false; }
  if (!informeHoraTermino.value.trim()) { informeHoraTermino.classList.add('field-invalid'); valido = false; }
  if (!valido) return;

  const data = {
    folio: obtenerFolioInforme(),
    equipo: ACTIVOS[activoActualId] ? ACTIVOS[activoActualId].nombre : (activoActualId || 'Activo'),
    equipoId: activoActualId,
    tecnico: document.getElementById('informe-tecnico').textContent,
    fecha: document.getElementById('informe-fecha').textContent,
    fechaISO: informeFechaISO,
    horometro: informeHorometro.value.trim(),
    horaInicio: informeHoraInicio.value,
    horaTermino: informeHoraTermino.value,
    descripcion: informeDescripcion.value.trim(),
    fallas: informeFallas.value.trim(),
    severidad: severidadSeleccionada,
    repuestosUsados: repuestosUsados,
    repuestosDetalle: repuestosDetalle.value.trim(),
    operativo: document.getElementById('check-operativo').classList.contains('on'),
    observaciones: informeObservaciones.value.trim(),
    instructivosUsados: instructivosUsados,
    instructivosNombres: Array.from(instructivosSeleccionados).map(k => INSTRUCTIVOS[k].nombre),
    alcances: informeAlcances.value.trim(),
    componente: componenteIntervenido !== 'ninguno' ? componenteIntervenido : null,
    empresa: null,
    smAplica: smAplica,
    smFolio: null,
    smTipo: smTipo,
    smPrioridad: smPrioridad,
    smComponente: smComponente,
    smDescripcion: smDescripcion.value.trim(),
    fotos: informeFotos.slice(),
    firmaDataUrl: sigCanvas.toDataURL('image/png'),
  };
  informeState.ultimoInformeData = data;
  ultimoHorometro[activoActualId] = data.horometro;
  if (componenteIntervenido !== 'ninguno') {
    const empresaTexto = obtenerEmpresaSeleccionada();
    data.empresa = empresaTexto;
    if (empresaExterno.classList.contains('selected') && empresaExternoNombre.value.trim()) {
      empresasRecientes.add(empresaExternoNombre.value.trim());
      actualizarListaEmpresasRecientes();
    }
    actualizarComponenteDesdeInforme(componenteIntervenido, data, empresaTexto);
  }
  if (smAplica && smTipo && smPrioridad) {
    const smFolio = generarFolioSM();
    data.smFolio = smFolio;
    // Optimista: todavía no existe en el backend (se crea recién al guardar el
    // informe, ver /api/interventions) — por eso no tiene id, y por eso
    // renderSMList() no le muestra el botón de resolver hasta que
    // cargarSolicitudes() la reemplace por la copia real del servidor.
    agregarSolicitudOptimista({
      folio: smFolio, tipo: smTipo, prioridad: smPrioridad, componente: smComponente,
      descripcion: data.smDescripcion || 'Sin detalle adicional.',
      estado: 'Abierta', fecha: data.fecha, tecnico: data.tecnico,
    });
  }

  document.getElementById('report-preview-content').innerHTML = construirInformeHTML(data);
  document.querySelectorAll('.report-send-row').forEach(r => r.classList.remove('hidden'));
  informeState.previewOrigen = 'nuevo';
  informeState.informeGuardado = false;
  goTo('step-informe-preview');
});
