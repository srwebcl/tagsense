'use strict';

// Punto único de resolución de un activo escaneado/ingresado (NFC real, QR,
// código manual) + la UI del círculo de "modo lectura" + Web NFC. Van juntos
// a propósito: resetReadState/iniciarModoLectura y resolverActivoEscaneado
// comparten el mismo estado (readState), separarlos habría forzado un import
// circular entre dos módulos que en la práctica son una sola máquina de estados.

import { TRUCK_PHOTO, setFilaOpcional, claseEstado, ultimoHorometro, hapticPulse, goTo, mostrarToast } from './core.js';

// Vacío a propósito: ya no hay datos mock. Se llena en runtime desde /api/public/assets/:tag_code
// (ver resolverActivoEscaneado) y sirve de caché local para reconsultar el mismo activo offline.
export const ACTIVOS = {};

export let activoActualId = null;

export function aplicarActivo(id){
  const a = ACTIVOS[id];
  if (!a) return;
  activoActualId = id;
  const foto = a.foto || TRUCK_PHOTO;

  document.querySelectorAll('img.truck-photo').forEach(img => { img.src = foto; img.alt = a.nombre; });

  const setText = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };

  setText('c2-nombre', a.nombre);
  setText('c2-id', id);
  setText('c2-serie', a.serie);
  setText('c2-anio', a.anio);
  setText('c2-horometro', (ultimoHorometro && ultimoHorometro[id]) || a.horometro);
  setText('c2-status-text', a.estado);
  setFilaOpcional('c2-tipo-row', 'c2-tipo', a.tipo);
  setFilaOpcional('c2-fabricante-row', 'c2-fabricante', a.fabricante);
  setFilaOpcional('c2-modelo-row', 'c2-modelo', a.modelo);
  setFilaOpcional('c2-ubicacion-row', 'c2-ubicacion', a.ubicacion);

  const pill = document.getElementById('c2-status-pill');
  if (pill) {
    pill.classList.remove('stopped', 'maintenance');
    const cls = claseEstado(a.estado);
    if (cls) pill.classList.add(cls);
  }

  setText('c3-nombre', a.nombre);
  setText('c3-id', 'ID: ' + id);
  setText('c3-status-text', a.estado);

  // Encabezado del Asistente Técnico — quedaba con el texto de demo fijo
  // ("Camión Minero MT65S · TS-CAEX-0000125") sin importar qué activo
  // estuviera realmente abierto, porque esta línea nunca se conectó cuando
  // se sacaron los demás datos mock (ver comentario más abajo, specs).
  setText('chat-equipo-info', `${a.nombre} · ${id}`);

  const banner = document.getElementById('ficha-status-banner');
  if (banner) {
    banner.classList.remove('stopped', 'maintenance');
    const cls = claseEstado(a.estado);
    if (cls) banner.classList.add(cls);
  }

  // Tarjeta "ID TagSense" — se repite igual en Info General, Historial,
  // Manuales y Componentes (ver public/index.html).
  document.querySelectorAll('[data-bind="tag-code"]').forEach(el => { el.textContent = id; });

  // Pantalla "Información General" — antes mostraba datos de demo fijos
  // (Epiroc/MT65S/Suecia) para cualquier equipo. specs es jsonb freeform
  // (ver 0005_asset_fields.sql) y puede venir vacío si el admin no lo completó
  // al crear el activo — por eso usa setFilaOpcional, no setText.
  const specs = a.specs || {};
  setText('ig-serie', a.serie);
  setText('ig-anio', a.anio);
  setFilaOpcional('ig-tipo-row', 'ig-tipo', a.tipo);
  setFilaOpcional('ig-fabricante-row', 'ig-fabricante', a.fabricante);
  setFilaOpcional('ig-modelo-row', 'ig-modelo', a.modelo);
  setFilaOpcional('ig-pais-row', 'ig-pais', specs.country_of_origin);
  setFilaOpcional('ig-peso-row', 'ig-peso', specs.operating_weight);
  setFilaOpcional('ig-capacidad-row', 'ig-capacidad', specs.load_capacity);
  setFilaOpcional('ig-motor-row', 'ig-motor', specs.engine_type);
  setFilaOpcional('ig-potencia-row', 'ig-potencia', specs.power);
}

// ---- Apertura directa por tag NFC (URL con ?activo=ID) ----
// Cuando se graba un tag NFC físico con esta misma URL, Android/iOS la abre
// automáticamente al acercar el teléfono. Como el activo ahora vive en una base
// de datos real por tenant, ya no se puede saltar el login: si no hay sesión
// válida, el código queda pendiente y se resuelve apenas el técnico inicia sesión.
export function idActivoDesdeUrl(){
  return new URLSearchParams(window.location.search).get('activo');
}

// ---- Paso 3: modo lectura NFC ----
const nfcCircle = document.getElementById('nfc-circle');
const ringProgress = document.getElementById('ring-progress');
const nfcCheck = document.getElementById('nfc-check');
const nfcMainText = document.getElementById('nfc-main-text');
const nfcCore = document.querySelector('.nfc-core');

// ---- Feedback háptico y sonoro al detectar componente ----
let sharedAudioCtx = null;
function playBeep(){
  try {
    sharedAudioCtx = sharedAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1500;
    gain.gain.setValueAtTime(0.001, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, sharedAudioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start();
    osc.stop(sharedAudioCtx.currentTime + 0.19);
  } catch(e) {}
}
function detectionFeedback(){
  hapticPulse();
  playBeep();
}

export let readState = 'idle'; // idle | reading | found
// Se mantiene declarado porque resetReadState/resolverActivoEscaneado lo limpian
// defensivamente; ya no hay ningún setTimeout real que lo asigne (ver historial de
// git si se necesita recuperar la animación de auto-lectura simulada).
export let autoLecturaTimer = null;

export function resetReadState(){
  readState = 'idle';
  clearTimeout(autoLecturaTimer);
  nfcCircle.classList.remove('reading', 'success');
  nfcCore.classList.remove('success');
  ringProgress.classList.remove('success');
  ringProgress.style.transition = 'none';
  ringProgress.style.strokeDashoffset = '578';
  void ringProgress.offsetWidth;
  ringProgress.style.transition = 'stroke-dashoffset 0.65s cubic-bezier(0.2, 0.8, 0.2, 1)';
  nfcCheck.classList.remove('show', 'success');
  nfcMainText.textContent = 'Leyendo activo';
  nfcCore.classList.add('pulsing');
  nfcCore.classList.remove('active');
}

// Arranca al entrar a Modo Lectura: si el navegador soporta NFC real (Web NFC / Chrome-Android)
// empieza a escuchar tags de inmediato; en cualquier caso, QR y código manual quedan siempre
// visibles — nunca se bloquea el flujo asumiendo que hay NFC disponible.
export function iniciarAutoLecturaNFC(){
  clearTimeout(autoLecturaTimer);
  if (readState !== 'idle') return;
  iniciarModoLectura();
}

export function mostrarHintLectura(texto){
  const hint = document.getElementById('read-status-hint');
  if (hint) hint.textContent = texto;
}

// ================= NFC REAL (Web NFC API — Chrome/Android) =================
// Web NFC solo existe en Chrome/Android (ninguna versión de Safari/iOS la implementa).
// Por eso nunca es el único camino: si no está disponible, la UI ya muestra QR y código
// manual de todas formas (ver checklist del skill nfc-qr-scanning).
const soportaWebNFC = 'NDEFReader' in window;
let nfcReaderActivo = null;

function decodificarRegistroNDEF(evento){
  for (const record of evento.message.records) {
    if (record.recordType === 'url' || record.recordType === 'text') {
      try {
        const texto = new TextDecoder(record.encoding || 'utf-8').decode(record.data);
        return extraerCodigoActivo(texto);
      } catch (err) { /* registro NDEF no legible como texto/URL */ }
    }
  }
  return null;
}

async function iniciarEscuchaNFCReal(){
  if (!soportaWebNFC) return;
  try {
    nfcReaderActivo = new NDEFReader();
    await nfcReaderActivo.scan();
    nfcReaderActivo.onreading = (evento) => {
      const codigo = decodificarRegistroNDEF(evento);
      if (codigo) resolverActivoEscaneado(codigo, { origen: 'nfc' });
    };
    nfcReaderActivo.onreadingerror = () => {
      mostrarHintLectura('No se pudo leer el TAG. Intenta de nuevo o usa el código QR.');
    };
  } catch (err) {
    // Permiso denegado o NFC apagado en el equipo: no bloquear, QR/manual siguen disponibles.
    // El mensaje nunca nombra la tecnología (NFC) — para el técnico es siempre
    // "el TAG del equipo", sea cual sea el método real que termine resolviéndolo.
    mostrarHintLectura('Acerca tu dispositivo al TAG del equipo para escanear, o usa el código QR / manual.');
  }
}

// ---- Arranque real del modo lectura: sin animación falsa, con métodos reales ----
export function iniciarModoLectura(){
  if (soportaWebNFC) {
    mostrarHintLectura('Acerca tu dispositivo al TAG del equipo para escanear.');
    iniciarEscuchaNFCReal();
  } else {
    mostrarHintLectura('Acerca tu dispositivo al TAG del equipo para escanear, o usa el código QR.');
  }
}

// ================= RESOLUCIÓN UNIFICADA DE CÓDIGO ESCANEADO/INGRESADO =================
// Punto único por el que pasan NFC real, QR real y el ingreso manual, para no duplicar la
// lógica de "activo encontrado / no encontrado" en cada método de lectura
// (ver /tagsense-docs/skills/nfc-qr-scanning/SKILL.md, checklist final).
// Convierte la fila de la tabla `assets` (API real) al formato que ya usa la UI.
function mapearActivoDesdeApi(data){
  const estadoLabel = { operativo: 'Operativo', mantenimiento: 'Mantención', fuera_de_servicio: 'Detenido' };
  return {
    id: data.id,
    nombre: data.name,
    serie: data.serial_number || '—',
    anio: data.manufacture_year || '—',
    horometro: data.hour_meter != null ? `${data.hour_meter} h` : '—',
    ubicacion: data.location || '',
    estado: estadoLabel[data.status] || data.status || '—',
    tipo: data.asset_type || '',
    fabricante: data.manufacturer || '',
    modelo: data.model || '',
    foto: data.photo_url || null,
    specs: data.specs || {},
  };
}

// Busca el activo en el backend — identificación pública, sin login (ver
// app/api/public/assets/[tag_code]/route.ts). El login solo se pide más
// adelante, al abrir la ficha técnica completa o generar un informe.
async function buscarActivoRemoto(id){
  if (!navigator.onLine) return null;
  try {
    const resp = await fetch('/api/public/assets/' + encodeURIComponent(id));
    if (!resp.ok) return null;
    const data = await resp.json();
    return mapearActivoDesdeApi(data);
  } catch (err) {
    return null; // sin red o backend caído: se trata igual que "no encontrado sin conexión"
  }
}

export async function resolverActivoEscaneado(id, opciones){
  opciones = opciones || {};
  if (!id) return false;
  if (readState === 'found') return true; // ya resuelto por otra vía (ej. NFC real mientras se mostraba QR)

  // Primero la caché local (activos ya vistos antes) — permite reconsulta offline
  // sin depender de la red (ver /tagsense-docs/skills/offline-sync/SKILL.md).
  if (!ACTIVOS[id]) {
    const activoRemoto = await buscarActivoRemoto(id);
    if (!activoRemoto) return false;
    ACTIVOS[id] = activoRemoto;
  }

  readState = 'found';
  clearTimeout(autoLecturaTimer);
  nfcCircle.classList.remove('reading');
  nfcCircle.classList.add('success');
  nfcCore.classList.add('success');
  ringProgress.classList.add('success');
  nfcCheck.classList.add('show', 'success');
  nfcMainText.textContent = ACTIVOS[id].nombre;
  detectionFeedback();
  aplicarActivo(id);
  // La identificación del activo es pública — el login se pide después,
  // al abrir la ficha técnica o generar un informe (ver open-ficha-2 y report-fab).
  setTimeout(() => {
    goTo('step-confirm-2');
  }, opciones.origen === 'qr' ? 250 : 550);
  return true;
}

// Si el código codifica una URL completa (ej. la misma URL grabada en un tag NFC físico,
// https://app.tagsense.cl/?activo=ID), se extrae el parámetro; si es el tag_code puro, se usa tal cual.
export function extraerCodigoActivo(valorDecodificado){
  try {
    const url = new URL(valorDecodificado);
    const idParam = url.searchParams.get('activo');
    if (idParam) return idParam.trim().toUpperCase();
  } catch (err) { /* no es una URL: es el código directo */ }
  return String(valorDecodificado).trim().toUpperCase();
}

// Botón "Copiar ID del equipo" — se repite en 4 pantallas (ver data-copy-id
// en public/index.html), delegado en document porque todas comparten markup.
// Vive acá porque depende directamente de activoActualId, que este módulo ya posee.
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-copy-id]');
  if (!btn || !activoActualId) return;
  navigator.clipboard.writeText(activoActualId)
    .then(() => mostrarToast('ID copiado al portapapeles'))
    .catch(() => mostrarToast('No se pudo copiar el ID'));
});

document.getElementById('tile-info-general').addEventListener('click', () => goTo('step-info-general'));
document.getElementById('back-to-ficha').addEventListener('click', () => goTo('step-confirm-3'));
document.getElementById('back-to-read').addEventListener('click', () => {
  resetReadState();
  goTo('step-read');
  iniciarAutoLecturaNFC();
});
document.getElementById('back-to-read-2').addEventListener('click', () => {
  resetReadState();
  goTo('step-read');
  iniciarAutoLecturaNFC();
});
