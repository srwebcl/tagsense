'use strict';

// ================= COLA OFFLINE DE INFORMES =================
// Antes, si /api/interventions o /api/reports fallaban (sin conexión, servidor
// caído), el informe se perdía por completo salvo el PDF ya descargado —
// contradice la promesa "offline-first" para el flujo exacto que existe para
// servir (mantenimiento de campo en zonas sin señal). Esto guarda el informe
// en IndexedDB de este dispositivo y reintenta solo cuando vuelve la conexión.

import { mostrarToast, goTo } from './core.js';
import { generarInformePdf } from './informe-pdf.js';
import { obtenerFolioInforme, incrementarFolioInforme } from './informe-form.js';
import { informeState } from './informe-state.js';

const OFFLINE_DB_NAME = 'tagsense-offline';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE = 'informes-pendientes';

function abrirOfflineDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) db.createObjectStore(OFFLINE_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function encolarInformePendiente(registro){
  const db = await abrirOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).put(registro);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function listarInformesPendientes(){
  const db = await abrirOfflineDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(OFFLINE_STORE, 'readonly').objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function eliminarInformePendiente(id){
  const db = await abrirOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function contarInformesPendientes(){
  try { return (await listarInformesPendientes()).length; } catch { return 0; }
}

export async function actualizarBadgePendientes(){
  const badge = document.getElementById('pending-sync-badge');
  const countEl = document.getElementById('pending-sync-count');
  if (!badge || !countEl) return;
  const n = await contarInformesPendientes();
  countEl.textContent = String(n);
  badge.classList.toggle('hidden', n === 0);
}

// ================= PERSISTENCIA DEL INFORME (backend real) =================
// El PDF se sigue generando en el navegador (jsPDF) — se queda offline-first,
// nunca bloqueado por la red (ver skill offline-sync).
//
// intentarSubirInforme hace los dos POST (intervención + PDF) y reporta en qué
// etapa falló. Si interventionIdExistente viene seteado, se salta la creación
// de la intervención — necesario para reintentar sin crear un registro
// duplicado cuando ya se creó la intervención pero solo falló la subida del PDF.
async function intentarSubirInforme(data, pdfBlob, interventionIdExistente){
  let interventionId = interventionIdExistente || null;

  if (!interventionId) {
    // 'fecha' viene en formato es-CL (DD-MM-YYYY) para mostrarse — no sirve para
    // construir un Date, por eso se usa fechaISO (ver report-fab arriba).
    const fechaBase = data.fechaISO || new Date().toISOString().slice(0, 10);
    const intervencionResp = await fetch('/api/interventions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_code: data.equipoId,
        diagnosis: data.fallas || null,
        work_performed: data.descripcion || null,
        parts_used: { usados: data.repuestosUsados, detalle: data.repuestosDetalle || null },
        started_at: data.horaInicio ? new Date(`${fechaBase}T${data.horaInicio}`).toISOString() : new Date().toISOString(),
        finished_at: data.horaTermino ? new Date(`${fechaBase}T${data.horaTermino}`).toISOString() : null,
        operational_after: data.operativo,
        details: {
          severidad: data.severidad,
          horometro: data.horometro,
          observaciones: data.observaciones,
          alcances: data.alcances,
          instructivosUsados: data.instructivosUsados,
          instructivosNombres: data.instructivosNombres,
          componente: data.componente,
          empresa: data.empresa,
          solicitudMantenimiento: data.smAplica ? {
            folio: data.smFolio, tipo: data.smTipo, prioridad: data.smPrioridad,
            componente: data.smComponente, descripcion: data.smDescripcion,
          } : null,
        },
      }),
    });
    if (!intervencionResp.ok) return { ok: false, etapa: 'intervencion' };
    const intervencion = await intervencionResp.json();
    interventionId = intervencion.id;
  }

  const form = new FormData();
  form.append('intervention_id', interventionId);
  form.append('folio', data.folio);
  form.append('file', pdfBlob, `${data.folio}_${data.equipoId}.pdf`);
  const reporteResp = await fetch('/api/reports', { method: 'POST', body: form });
  if (!reporteResp.ok) return { ok: false, etapa: 'reporte', interventionId };

  return { ok: true };
}

async function guardarInformeEnBackend(data, pdfDoc){
  const hintEl = document.getElementById('informe-sync-hint');
  const mostrarHint = (texto) => { if (hintEl) { hintEl.textContent = texto; hintEl.classList.remove('hidden'); } };
  const pdfBlob = pdfDoc.output('blob');
  const idCola = `${data.folio}-${Date.now()}`;

  const encolarYAvisar = async (interventionId, texto) => {
    await encolarInformePendiente({ id: idCola, data, pdfBlob, interventionId: interventionId || null, creadoEn: Date.now() });
    mostrarHint(texto);
    actualizarBadgePendientes();
  };

  if (!navigator.onLine) {
    await encolarYAvisar(null, 'Sin conexión — el informe se guardó en este dispositivo y se subirá automáticamente cuando vuelva la señal.');
    return;
  }

  try {
    const resultado = await intentarSubirInforme(data, pdfBlob);
    if (resultado.ok) { mostrarHint('Informe guardado en el servidor.'); return; }
    if (resultado.etapa === 'reporte') {
      await encolarYAvisar(resultado.interventionId, 'El informe se registró, pero el PDF no se pudo subir — se reintentará automáticamente.');
    } else {
      await encolarYAvisar(null, 'No se pudo guardar el informe en el servidor. Se guardó en este dispositivo y se reintentará automáticamente.');
    }
  } catch (err) {
    await encolarYAvisar(null, 'No se pudo conectar con el servidor. El informe se guardó en este dispositivo y se reintentará automáticamente.');
  }
}

// Reintenta todo lo encolado — se llama al volver la conexión y una vez al
// cargar la app (por si quedó algo pendiente de una sesión anterior).
// Si se pide una sincronización mientras otra ya está en curso (ej. se encola
// un informe nuevo justo cuando el evento 'online' ya está sincronizando),
// no se ignora: se marca para correr otra pasada apenas termine la actual, en
// vez de perder silenciosamente ese pedido.
let sincronizandoInformes = false;
let reintentoSincronizacionPendiente = false;
export async function sincronizarInformesPendientes(){
  if (sincronizandoInformes) { reintentoSincronizacionPendiente = true; return; }
  if (!navigator.onLine) return;
  sincronizandoInformes = true;
  try {
    do {
      reintentoSincronizacionPendiente = false;
      const pendientes = await listarInformesPendientes();
      let sincronizados = 0;
      for (const registro of pendientes) {
        try {
          const resultado = await intentarSubirInforme(registro.data, registro.pdfBlob, registro.interventionId);
          if (resultado.ok) {
            await eliminarInformePendiente(registro.id);
            sincronizados++;
          } else if (resultado.etapa === 'reporte') {
            // Guarda el avance (intervención ya creada) para no duplicarla en el próximo intento.
            registro.interventionId = resultado.interventionId;
            await encolarInformePendiente(registro);
          }
        } catch (err) {
          reintentoSincronizacionPendiente = false;
          break; // se cortó la conexión a mitad de la sincronización — se reintenta después
        }
      }
      if (sincronizados > 0) {
        mostrarToast(`${sincronizados} informe${sincronizados > 1 ? 's' : ''} sincronizado${sincronizados > 1 ? 's' : ''} con el servidor.`);
      }
    } while (reintentoSincronizacionPendiente && navigator.onLine);
  } finally {
    sincronizandoInformes = false;
    actualizarBadgePendientes();
  }
}

window.addEventListener('online', sincronizarInformesPendientes);
document.getElementById('pending-sync-badge')?.addEventListener('click', () => {
  if (navigator.onLine) sincronizarInformesPendientes();
  else mostrarToast('Sin conexión — se sincronizará automáticamente al volver la señal.');
});

// Solo se persiste un informe nuevo (no uno reabierto del historial), y solo una vez
// aunque el técnico use más de un botón de salida (descargar, WhatsApp, finalizar).
function asegurarInformeGuardado(pdfDoc){
  if (informeState.previewOrigen !== 'nuevo' || informeState.informeGuardado || !informeState.ultimoInformeData) return Promise.resolve();
  informeState.informeGuardado = true;
  return guardarInformeEnBackend(informeState.ultimoInformeData, pdfDoc);
}

document.getElementById('report-pdf-btn').addEventListener('click', (e) => {
  if (!informeState.ultimoInformeData) { e.preventDefault(); return; }
  const doc = generarInformePdf(informeState.ultimoInformeData);
  doc.save(`${informeState.ultimoInformeData.folio}_${informeState.ultimoInformeData.equipoId}.pdf`);
  asegurarInformeGuardado(doc);
  incrementarFolioInforme();
  e.preventDefault();
});

if (navigator.share) {
  const waLabel = document.getElementById('wa-btn-label');
  if (waLabel) waLabel.textContent = 'Compartir PDF por WhatsApp';
}

document.getElementById('btn-informe-whatsapp').addEventListener('click', async () => {
  if (!informeState.ultimoInformeData) return;
  const d = informeState.ultimoInformeData;

  const construirMensajeTexto = () => {
    const sevLabelWa = { baja: 'Baja', media: 'Media', alta: 'Alta' };
    let mensaje = `*Informe de Mantenimiento — TagSense*\n`;
    mensaje += `Folio: ${d.folio}\n`;
    mensaje += `Equipo: ${d.equipo} (${d.equipoId})\n`;
    mensaje += `Técnico: ${d.tecnico}\n`;
    mensaje += `Fecha: ${d.fecha}  ·  Horómetro: ${d.horometro}\n`;
    mensaje += `Inicio: ${d.horaInicio}  ·  Término: ${d.horaTermino}\n\n`;
    mensaje += `Trabajo realizado:\n${d.descripcion}\n\n`;
    if (d.fallas) {
      mensaje += `Fallas encontradas${d.severidad ? ` (Severidad: ${sevLabelWa[d.severidad]})` : ''}:\n${d.fallas}\n\n`;
    }
    mensaje += `Repuestos utilizados: ${d.repuestosUsados ? d.repuestosDetalle : 'No se utilizaron repuestos'}\n\n`;
    mensaje += `Operativo: ${d.operativo ? 'Sí' : 'No'}\n`;
    if (d.instructivosUsados && d.instructivosNombres.length) {
      mensaje += `\nInstructivos utilizados: ${d.instructivosNombres.join(', ')}\n`;
    }
    if (d.alcances) mensaje += `\nAlcances técnicos: ${d.alcances}\n`;
    if (d.smAplica) {
      const compNombre = d.smComponenteNombre || '';
      mensaje += `\n*Solicitud de Mantenimiento:* ${d.smFolio || 'SM'} — ${d.smTipo || ''} · Prioridad ${d.smPrioridad || ''}${compNombre ? ' · ' + compNombre : ''}\n${d.smDescripcion || ''}\n`;
    }
    if (d.observaciones) mensaje += `\nRecomendaciones: ${d.observaciones}\n`;
    mensaje += `\nInforme firmado digitalmente. PDF completo disponible en TAGSENSE.`;
    return mensaje;
  };

  const enviarSoloTexto = () => {
    const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(construirMensajeTexto());
    window.open(url, '_blank');
  };

  // Intenta compartir el PDF real (Web Share API) — funciona en la mayoría de navegadores móviles.
  // Abre el selector nativo del teléfono; ahí se elige WhatsApp y el PDF va adjunto de verdad.
  try {
    const pdfDoc = generarInformePdf(d);
    // El informe queda registrado al compartir igual que al descargar — no depende
    // de si el selector nativo de compartir realmente se completa o se cancela.
    asegurarInformeGuardado(pdfDoc);
    const blob = pdfDoc.output('blob');
    const file = new File([blob], `${d.folio}_${d.equipoId}.pdf`, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Informe de Mantenimiento ${d.folio}`,
        text: `Informe de Mantenimiento — ${d.equipo} (${d.folio})`,
      });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return; // el usuario canceló el selector, no hacer fallback
  }

  // Respaldo: el navegador no soporta compartir archivos — se envía solo el resumen en texto.
  enviarSoloTexto();
});

// Cierra el flujo: asegura que el informe quede guardado (por si el técnico no
// descargó ni compartió desde esta pantalla) y vuelve a la ficha del equipo.
document.getElementById('btn-informe-finalizar').addEventListener('click', async () => {
  const btn = document.getElementById('btn-informe-finalizar');
  if (informeState.ultimoInformeData && informeState.previewOrigen === 'nuevo' && !informeState.informeGuardado) {
    btn.disabled = true;
    try {
      await asegurarInformeGuardado(generarInformePdf(informeState.ultimoInformeData));
    } finally {
      btn.disabled = false;
    }
  }
  goTo(informeState.previewOrigen === 'historial' ? 'step-historial' : 'step-confirm-3');
});
