'use strict';

// ================= ASISTENTE TÉCNICO (BOT INTERACTIVO) =================
// Dos fuentes oficiales de alimentación:
// 1. Manuales y documentación PDF (mediante Voyage AI + Claude Sonnet).
// 2. Ficha técnica del activo (metadatos, specs OEM, componentes y notas por sistema).
// Funciona como un BOT interactivo que orienta y ofrece alternativas concretas.
// Si no hay créditos o la API no está disponible, el motor de contingencia
// responde con datos estructurados, diagnósticos guiados y flujo progresivo.

import { hapticPulse, goTo } from './core.js';
import { activoActualId, ACTIVOS } from './scan.js';
import { abrirFormularioInforme } from './informe-form.js';

const chatMessages = document.getElementById('chat-messages');
const chatSuggestions = document.getElementById('chat-suggestions');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

const BOT_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2 8 8H4l2 4-2 4h4l4 6 4-6h4l-2-4 2-4h-4l-4-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

let chatActivoActualId = null;
let chatGeneracion = 0;
let docsFichaCache = [];
let docsFichaActivoId = null;
let categoriaActivaEnChat = null;
let historialChat = [];

async function cargarDocsFichaParaChat() {
  if (!activoActualId) return [];
  if (docsFichaActivoId === activoActualId && docsFichaCache.length > 0) return docsFichaCache;
  try {
    const resp = await fetch(`/api/assets/${encodeURIComponent(activoActualId)}/documents`);
    if (resp.ok) {
      docsFichaCache = await resp.json();
      docsFichaActivoId = activoActualId;
    }
  } catch (err) {}
  return docsFichaCache;
}

export function resetChatParaActivo(nuevoId) {
  if (chatActivoActualId !== nuevoId) {
    chatActivoActualId = null;
    docsFichaActivoId = null;
    docsFichaCache = [];
    categoriaActivaEnChat = null;
    historialChat = [];
    if (chatMessages) chatMessages.innerHTML = '';
    if (chatSuggestions) chatSuggestions.innerHTML = '';
    if (chatInput) chatInput.value = '';
    if (chatSendBtn) chatSendBtn.disabled = true;
  }
}

export function initChat(forzar = false) {
  const activo = ACTIVOS[activoActualId];
  const nombreEquipo = activo ? activo.nombre : 'este equipo';
  const serieEquipo = activo?.serie || activoActualId || '';

  cargarDocsFichaParaChat();

  // Actualizar encabezado del chat con el equipo actual
  const headerInfo = document.getElementById('chat-equipo-info');
  if (headerInfo && activo) {
    headerInfo.textContent = `${nombreEquipo} · ${serieEquipo}`;
  }

  // Si ya estaba inicializado para este mismo activo y no se fuerza, solo scrollear
  if (!forzar && chatActivoActualId === activoActualId && chatMessages.children.length > 0) {
    scrollChatToBottom();
    return;
  }

  // Si es un activo nuevo o primera vez, limpiar e inicializar de cero
  chatActivoActualId = activoActualId;
  chatGeneracion++;
  chatMessages.innerHTML = '';
  chatSuggestions.innerHTML = '';
  chatInput.value = '';
  chatSendBtn.disabled = true;

  appendBotBubble(
    `Hola, soy el asistente técnico de TAGSENSE. He analizado la ficha técnica y manuales de **${nombreEquipo}**.\n\nPuedes consultarme directamente o seleccionar una de las siguientes opciones para iniciar el diagnóstico:`
  );

  cargarOpcionesIniciales(activo);
}

function scrollChatToBottom() {
  setTimeout(() => {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    const inputRow = document.querySelector('.chat-input-row');
    if (inputRow) {
      inputRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 40);
}

function renderSuggestions(lista) {
  chatSuggestions.innerHTML = '';
  if (!lista || lista.length === 0) return;

  lista.forEach(texto => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'suggestion-chip';
    chip.textContent = texto;
    chip.addEventListener('click', () => {
      if (texto.includes('Escalar a supervisor')) {
        appendUserBubble(texto);
        chatSuggestions.innerHTML = '';
        appendEscalateChip();
      } else if (texto.includes('Abrir Formulario de Informe')) {
        abrirFormularioInforme();
      } else {
        enviarPregunta(texto);
      }
    });
    chatSuggestions.appendChild(chip);
  });
  scrollChatToBottom();
}

function appendUserBubble(texto) {
  historialChat.push({ role: 'user', content: texto });
  if (historialChat.length > 12) historialChat = historialChat.slice(-12);
  const row = document.createElement('div');
  row.className = 'chat-bubble-row user';
  row.innerHTML = `<div class="chat-bubble"></div>`;
  row.querySelector('.chat-bubble').textContent = texto;
  chatMessages.appendChild(row);
  scrollChatToBottom();
}

function formatearTextoBot(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  let html = div.innerHTML;
  // Negrita Markdown **texto** -> <strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Saltos de línea limpios
  html = html.replace(/\n\n/g, '<div style="height:7px;"></div>').replace(/\n/g, '<br>');
  return html;
}

function appendBotBubble(texto) {
  historialChat.push({ role: 'assistant', content: texto });
  if (historialChat.length > 12) historialChat = historialChat.slice(-12);
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot';
  row.innerHTML = `
    <div class="chat-avatar-sm">${BOT_AVATAR_SVG}</div>
    <div class="chat-bubble"></div>
  `;
  const bubble = row.querySelector('.chat-bubble');
  bubble.innerHTML = formatearTextoBot(texto);
  chatMessages.appendChild(row);
  scrollChatToBottom();
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot typing-row';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="chat-avatar-sm">${BOT_AVATAR_SVG}</div>
    <div class="typing-dots"><span></span><span></span><span></span></div>
  `;
  chatMessages.appendChild(row);
  scrollChatToBottom();
}

function hideTyping() {
  const row = document.getElementById('typing-row');
  if (row) row.remove();
}

function appendEscalateChip() {
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot';
  row.innerHTML = `<div style="margin-left:34px;"></div>`;
  const wrap = row.querySelector('div');
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'escalate-chip';
  chip.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.07-1.32A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Z" stroke="currentColor" stroke-width="1.6"/></svg> Escalar a supervisor por WhatsApp';
  chip.addEventListener('click', escalarASupervisor);
  wrap.appendChild(chip);
  chatMessages.appendChild(row);
  scrollChatToBottom();
}

function escalarASupervisor() {
  const activo = ACTIVOS[activoActualId];
  const nombreEquipo = activo ? activo.nombre : 'Equipo';
  const historialTexto = Array.from(chatMessages.querySelectorAll('.chat-bubble-row'))
    .filter(r => !r.classList.contains('typing-row'))
    .slice(-6)
    .map(r => {
      const esUser = r.classList.contains('user');
      const txt = r.querySelector('.chat-bubble')?.textContent || '';
      return `${esUser ? 'Técnico' : 'Asistente'}: ${txt.trim()}`;
    })
    .join('\n');
  let mensaje = `*Escalamiento — Asistente Técnico TagSense*\n`;
  mensaje += `Equipo: ${nombreEquipo} (${activoActualId || ''})\n\n`;
  mensaje += `Resumen de la conversación:\n${historialTexto}\n\n`;
  mensaje += `El técnico solicita apoyo de supervisor.`;
  const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(mensaje);
  window.open(url, '_blank');
}

// ================= MOTOR BOT OFFLINE / CONTINGENCIA LOCAL =================
function normalizarTextoLocal(t) {
  return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseFichaTagsLocal(raw) {
  if (!raw) return [];
  const lines = raw.split(/\n|•/).map(l => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const clean = line.replace(/^[\s\-*•\d.]+/, '').trim();
    if (!clean) continue;
    const colonIdx = clean.indexOf(':');
    if (colonIdx > 0 && colonIdx <= 65) {
      items.push({
        title: clean.substring(0, colonIdx).trim(),
        detail: clean.substring(colonIdx + 1).trim(),
      });
    } else {
      const dashIdx = clean.search(/\s+[—–-]\s+/);
      if (dashIdx > 0 && dashIdx <= 65) {
        items.push({
          title: clean.substring(0, dashIdx).trim(),
          detail: clean.substring(dashIdx).replace(/^[\s—–-]+/, '').trim(),
        });
      } else {
        items.push({
          title: clean,
          detail: '',
        });
      }
    }
  }
  return items;
}

const ICONOS_COMPONENTES_LOCAL = {
  frenos: '🛑',
  motor: '⚙️',
  hidraulico: '💧',
  tolva: '📦',
  direccion: '🔄',
  ejes: '🚛',
  temperatura: '🌡️',
  electrico: '⚡',
  suspension: '🔩',
  neumaticos: '🛞',
  sensores: '🚨',
};

const NOMBRES_COMPONENTES_LOCAL = {
  frenos: 'Frenos y Retardo',
  motor: 'Motor y Combustible',
  hidraulico: 'Sistema Hidráulico',
  tolva: 'Tolva y Levante',
  direccion: 'Dirección y Articulación',
  ejes: 'Transmisión y Ejes',
  temperatura: 'Refrigeración y Temperatura',
  electrico: 'Sistema Eléctrico y Sensores',
  suspension: 'Suspensión y Chasis',
  neumaticos: 'Neumáticos y Llantas',
  sensores: 'Sensores y Telemetría',
};

function responderBotOffline(texto, categorySlug, activo) {
  const norm = normalizarTextoLocal(texto);
  const nombreEquipo = activo.nombre || 'Equipo';
  const modeloStr = activo.modelo ? ` (${activo.modelo})` : '';
  const specs = activo.specs || {};

  const getNombreComp = (slug) => NOMBRES_COMPONENTES_LOCAL[slug] || slug.toUpperCase();

  const getBotonesComponentes = () => {
    const slugsConFicha = Array.from(
      new Set(docsFichaCache.map((f) => f.category_slug).filter(Boolean))
    );
    const slugsBase = slugsConFicha.length > 0 ? slugsConFicha : Object.keys(ICONOS_COMPONENTES_LOCAL);
    const lista = slugsBase.map((slug) => {
      const icono = ICONOS_COMPONENTES_LOCAL[slug] || '🔧';
      const nom = getNombreComp(slug);
      const corto = nom.length > 25 ? nom.slice(0, 24) + '…' : nom;
      return `${icono} ${corto}`;
    });
    return [...lista.slice(0, 6), '📋 Especificaciones Técnicas'];
  };

  // 1. INTENCIÓN PRIORITARIA: Negación de falla / Aclaración "Sin fallas" / Consulta informativa
  const esNegacionSinFalla =
    /\b(no tiene falla|no hay falla|sin falla|no falla|ninguna falla|no presenta falla|cero falla|no tiene averia|sin averia|no hay averia|ningun problema|no tiene problema|no hay problema|sin problema|todo bien|todo normal|todo en orden|esta operativo|esta normal|esta impecable|esta perfecto|solo queria saber|solo queria consultar|solo queria ver|solo era una duda|solo era una pregunta|solo una consulta|solo una duda|solo pregunto|no le pasa nada|no tiene nada|no pasa nada|ninguno|ninguna|nada)\b/i.test(norm);

  if (esNegacionSinFalla) {
    const tieneMotor = norm.includes('motor') || categorySlug === 'motor';
    const tieneFrenos = norm.includes('freno') || categorySlug === 'frenos';
    const tieneHidraulico = norm.includes('hidraul') || categorySlug === 'hidraulico';

    let detalleComp = '';
    if (tieneMotor) detalleComp = 'el motor';
    else if (tieneFrenos) detalleComp = 'el sistema de frenos';
    else if (tieneHidraulico) detalleComp = 'el sistema hidráulico';
    else if (categorySlug) detalleComp = `el sistema de ${getNombreComp(categorySlug)}`;

    if (detalleComp) {
      return {
        message: `👍 **Comprobación de Estado · ${detalleComp.toUpperCase()}**\n\nEntendido. Queda registrado que **${detalleComp}** de **${nombreEquipo}${modeloStr}** opera con normalidad y no presenta condiciones anómalas ni fallas activas.\n\n¿Deseas consultar otro parámetro técnico o revisar otro sistema del equipo?`,
        alternativas: [
          '🛢️ Fluidos y lubricación',
          '📋 Ficha Técnica',
          '🔄 Consultar otro componente',
          'Escalar a supervisor',
        ],
      };
    }

    return {
      message: `👍 **Equipo Operativo**\n\nEntendido. Confirmado que **${nombreEquipo}${modeloStr}** se mantiene en condición normal sin anomalías reportadas en este turno.\n\n¿Deseas consultar especificaciones técnicas, lubricación o revisar algún componente?`,
      alternativas: [
        '📋 Ver Ficha Técnica',
        '🛢️ Puntos de engrase y fluidos',
        '🔄 Consultar un componente',
        'Escalar a supervisor',
      ],
    };
  }

  // 2. INTENCIÓN: Agradecimiento y Cierre Cordial
  const msgSinPuntos = norm.replace(/[.,!¡¿?]/g, '').trim();
  const esAgradecimiento =
    /^(gracias|muchas gracias|muchisimas gracias|vale|ok gracias|listo gracias|perfecto gracias|excelente gracias|entendido|comprendido|todo claro|buenisimo|de diez|ok vale|muchas gracias bot|gracias bot)$/i.test(msgSinPuntos) ||
    /\b(muchas gracias|muchisimas gracias)\b/i.test(norm);

  if (esAgradecimiento) {
    return {
      message: `🤖 **Asistente TAGSENSE**\n\n¡De nada! Quedo a tu disposición si necesitas verificar torques, tolerancias, presiones o procedimientos en terreno para **${nombreEquipo}${modeloStr}**.\n\n¡Buen trabajo y turno seguro en faena!`,
      alternativas: [
        '📋 Ver Ficha Técnica',
        '🔄 Consultar un componente',
        'Escalar a supervisor',
      ],
    };
  }

  // 3. INTENCIÓN: Falla confirmada / Generar informe
  if (
    norm.includes('falla confirmada') ||
    norm.includes('anomalia confirmada') ||
    norm.includes('generar informe') ||
    norm.includes('abrir informe') ||
    norm.includes('registrar hallazgo') ||
    norm.includes('sigue fallando') ||
    norm.includes('no se soluciono') ||
    norm.includes('requiere reparacion')
  ) {
    return {
      message: `⚠️ **Registro de Anomalía Confirmada**\n\nHe registrado la condición crítica en la sesión de **${nombreEquipo}${modeloStr}**.\n\nEl equipo requiere un informe técnico formal para gestionar repuestos, coordinar la intervención o aplicar detención preventiva segura según protocolo de faena.\n\nPuedes abrir el formulario digital ahora o notificar por WhatsApp al supervisor:`,
      alternativas: [
        'Abrir Formulario de Informe',
        'Escalar a supervisor',
        '🔄 Cambiar de componente',
      ],
    };
  }

  // 4. INTENCIÓN: Falla corregida en terreno
  if (
    norm.includes('falla corregida') ||
    norm.includes('corregida en terreno') ||
    norm.includes('solucionado') ||
    norm.includes('falla resuelta') ||
    norm.includes('quedo operativo') ||
    norm.includes('reparado') ||
    norm.includes('sin fugas') ||
    norm.includes('aire en circuito purgado') ||
    norm.includes('dentro de rango')
  ) {
    return {
      message: `✅ **Falla Corregida en Terreno**\n\n¡Excelente trabajo! Se verificó la normalización del sistema conforme a los parámetros oficiales de **${nombreEquipo}${modeloStr}**.\n\nEl equipo se mantiene en condición **OPERATIVO**.\n\n¿Deseas registrar una nota breve en el informe técnico o continuar inspeccionando otro componente?`,
      alternativas: [
        'Abrir Formulario de Informe',
        '🔄 Inspeccionar otro componente',
        '📋 Ver especificaciones',
      ],
    };
  }

  // 5. INTENCIÓN: Menú / Cambiar de componente / Lista de componentes
  if (
    norm.includes('otro componente') ||
    norm.includes('cambiar componente') ||
    norm.includes('otro sistema') ||
    norm.includes('volver a opciones') ||
    norm.includes('menu principal') ||
    norm.includes('diagnosticar una falla') ||
    norm.includes('ver componentes') ||
    norm.includes('inicio') ||
    norm.includes('menu') ||
    norm.includes('hola') ||
    norm.includes('empezar')
  ) {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico por Componente**\n\nSelecciona el componente o sistema de **${nombreEquipo}${modeloStr}** que deseas revisar o diagnosticar:`,
      alternativas: getBotonesComponentes(),
    };
  }

  // 6. INTENCIÓN: Consulta Específica de Motorización / Datos del Motor (Informativo, NO falla)
  const esConsultaFluidos =
    norm.includes('engrase') ||
    norm.includes('fluido') ||
    norm.includes('lubricac') ||
    norm.includes('aceite') ||
    norm.includes('grasa') ||
    norm.includes('refrigerante');

  const esConsultaMotorInfo =
    !esConsultaFluidos &&
    (/\b(que motor|cual motor|modelo de motor|motor usa|motor tiene|marca del motor|potencia del motor|cilindrada|ficha del motor|datos del motor|especificaciones del motor|tipo de motor|motorizacion)\b/i.test(norm) ||
    (/\bmotor\b/i.test(norm) && /\b(usa|cual|que|modelo|marca|tipo|potencia|hp|rpm)\b/i.test(norm)));

  if (esConsultaMotorInfo) {
    const docMotor = docsFichaCache.find(
      (f) => f.category_slug === 'motor' && f.field_type_slug === 'equipamiento'
    );
    const tagsMotor = docMotor && docMotor.raw_text ? parseFichaTagsLocal(docMotor.raw_text) : [];

    const tagMotorOem = tagsMotor.find((t) => /motor oem|modelo|motor/i.test(t.title));
    const tagPotencia = tagsMotor.find((t) => /potencia|torque/i.test(t.title));
    const tagInyeccion = tagsMotor.find((t) => /inyecci|combustible/i.test(t.title));
    const tagFluidos = tagsMotor.find((t) => /aceite|fluido|capacidad/i.test(t.title));

    const motorDesc = tagMotorOem?.detail || specs.engine_type || specs.motor || activo.modelo || 'Motorización OEM estándar';
    const potenciaDesc = tagPotencia?.detail || specs.power || 'Potencia nominal según diseño OEM';

    let msg = `⚙️ **Motorización Oficial · ${nombreEquipo}${modeloStr}**\n\n`;
    msg += `Datos técnicos maestros registrados en la ficha oficial:\n\n`;
    msg += `• **Motor OEM:** ${motorDesc}\n`;
    msg += `• **Potencia y Régimen:** ${potenciaDesc}\n`;
    if (tagInyeccion) {
      msg += `• **Inyección y Alimentación:** ${tagInyeccion.detail}\n`;
    }
    if (tagFluidos) {
      msg += `• **Capacidades registradas:** ${tagFluidos.detail}\n`;
    }
    msg += `\n¿Deseas consultar sus capacidades de fluidos, tolerancias de operación o revisar otro componente?`;

    return {
      message: msg,
      alternativas: [
        '🛢️ Aceite y fluidos de motor',
        '📋 Ver Ficha Técnica',
        '🔍 Diagnosticar una anomalía',
        '🔄 Cambiar de componente',
      ],
    };
  }

  // 7. INTENCIÓN: Consulta de Transmisión / Tren de Fuerza (Informativo, NO falla)
  const esConsultaTransmision =
    /\b(que transmision|cual transmision|caja de cambio|caja de transmision|modelo de transmision|que caja usa|convertidor)\b/i.test(norm);

  if (esConsultaTransmision) {
    const docEjes = docsFichaCache.find(
      (f) => f.category_slug === 'ejes' && f.field_type_slug === 'equipamiento'
    );
    const tagsEjes = docEjes && docEjes.raw_text ? parseFichaTagsLocal(docEjes.raw_text) : [];
    const tagTransmision = tagsEjes.find((t) => /transmision|caja/i.test(t.title));
    const desc = tagTransmision?.detail || specs.transmission || 'Transmisión según diseño OEM';

    return {
      message: `🚛 **Transmisión y Tren de Fuerza · ${nombreEquipo}${modeloStr}**\n\n• **Transmisión OEM:** ${desc}\n\n¿Deseas consultar presiones de embrague, fluidos o revisar otro sistema?`,
      alternativas: [
        '🛢️ Aceite de transmisión',
        '📋 Ver Ficha Técnica',
        '🔄 Cambiar de componente',
      ],
    };
  }

  // 8. INTENCIÓN: Ficha y Especificaciones Generales
  if (
    norm.includes('especific') ||
    norm.includes('ficha') ||
    norm.includes('specs') ||
    norm.includes('datos del equipo') ||
    norm.includes('capacidad y peso') ||
    norm.includes('cuanto pesa') ||
    norm.includes('peso operativo') ||
    norm.includes('cuanto carga') ||
    norm.includes('capacidad de carga') ||
    norm.includes('horometro')
  ) {
    let msg = `📋 **Asistente TAGSENSE · Ficha y Especificaciones Oficiales**\n\n`;
    msg += `Datos técnicos maestros de **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `• **Modelo / Fabricante:** ${activo.modelo || nombreEquipo} (${activo.fabricante || 'OEM'})\n`;
    msg += `• **Motorización OEM:** ${specs.engine_type || 'Estándar'} · Potencia: ${specs.power || 'Nominal'}\n`;
    msg += `• **Capacidad de Carga:** ${specs.load_capacity || 'Según diseño OEM'} · Peso op.: ${specs.operating_weight || 'Nominal'}\n`;
    msg += `• **Horómetro Acumulado:** ${activo.horometro || 'No registrado'} · Estado: ${activo.estado || 'Operativo'}\n`;
    if (activo.serie) msg += `• **Número de Serie:** ${activo.serie}\n`;
    if (activo.ubicacion) msg += `• **Ubicación en Faena:** ${activo.ubicacion}\n`;
    msg += `\n¿Qué deseas consultar a continuación?`;

    return {
      message: msg,
      alternativas: [
        '🛢️ Puntos de engrase y fluidos',
        '🔍 Diagnosticar un componente',
        '🔄 Cambiar de componente',
      ],
    };
  }

  // 9. INTENCIÓN: Puntos de Engrase y Fluidos / Consulta de Capacidades
  if (
    norm.includes('engrase') ||
    norm.includes('fluido') ||
    norm.includes('lubricac') ||
    norm.includes('aceite') ||
    norm.includes('grasa') ||
    norm.includes('refrigerante')
  ) {
    let compEspecifico = categorySlug;
    if (!compEspecifico) {
      if (norm.includes('motor')) compEspecifico = 'motor';
      else if (norm.includes('hidraul')) compEspecifico = 'hidraulico';
      else if (norm.includes('transmis') || norm.includes('eje')) compEspecifico = 'ejes';
      else if (norm.includes('freno')) compEspecifico = 'frenos';
      else if (norm.includes('tolva')) compEspecifico = 'tolva';
    }

    const fluidosEncontrados = [];
    docsFichaCache.forEach((f) => {
      if (f.field_type_slug === 'equipamiento' && f.raw_text && f.category_slug) {
        const tags = parseFichaTagsLocal(f.raw_text);
        tags.forEach((t) => {
          const tNorm = normalizarTextoLocal(t.title + ' ' + t.detail);
          if (
            tNorm.includes('aceite') ||
            tNorm.includes('fluido') ||
            tNorm.includes('refrigerante') ||
            tNorm.includes('grasa') ||
            tNorm.includes('capacidad') ||
            tNorm.includes('litro') ||
            tNorm.includes('galon')
          ) {
            fluidosEncontrados.push({ comp: f.category_slug, tag: t });
          }
        });
      }
    });

    if (compEspecifico) {
      const nomC = getNombreComp(compEspecifico);
      const iconoC = ICONOS_COMPONENTES_LOCAL[compEspecifico] || '⚙️';
      const fluidosComp = fluidosEncontrados.filter((f) => f.comp === compEspecifico);

      if (fluidosComp.length > 0) {
        let msg = `${iconoC} **Especificación de Fluidos · ${nomC}**\n\n`;
        msg += `Datos registrados en la ficha técnica de **${nombreEquipo}${modeloStr}**:\n\n`;
        fluidosComp.forEach((item) => {
          msg += `• **${item.tag.title}:** ${item.tag.detail || 'Verificado en ficha OEM'}\n`;
        });
        msg += `\n¿Deseas verificar más especificaciones o revisar otro componente?`;

        return {
          message: msg,
          alternativas: [
            '📋 Ver Ficha Técnica',
            `🔧 Diagnosticar ${nomC.slice(0, 18)}`,
            '🔄 Cambiar de componente',
          ],
        };
      } else {
        const paramStr = compEspecifico === 'motor' ? 'la capacidad de aceite de motor' : `la especificación de aceite o fluidos de ${nomC}`;
        const msg = `En la ficha técnica de ${nombreEquipo} no está registrada ${paramStr}.`;

        return {
          message: msg,
          alternativas: getBotonesComponentes(),
        };
      }
    }

    if (fluidosEncontrados.length > 0) {
      let msg = `🛢️ **Asistente TAGSENSE · Puntos de Engrase y Fluidos**\n\n`;
      msg += `Capacidades y pautas de lubricación registradas para **${nombreEquipo}${modeloStr}**:\n\n`;
      fluidosEncontrados.slice(0, 6).forEach((item) => {
        msg += `• **${getNombreComp(item.comp)} · ${item.tag.title}:** ${item.tag.detail}\n`;
      });
      msg += `\n¿Deseas consultar algún componente en específico o volver a la ficha?`;

      return {
        message: msg,
        alternativas: getBotonesComponentes(),
      };
    } else {
      const msg = `En la ficha técnica de ${nombreEquipo} no está registrada la capacidad de aceite de motor ni especificaciones de fluidos.`;

      return {
        message: msg,
        alternativas: getBotonesComponentes(),
      };
    }
  }

  // 10. INTENCIÓN: Procedimientos Técnicos Paso a Paso (Informativo / Guiado)
  const esConsultaProcedimiento =
    /\b(como se|como medir|como purgar|como cambiar|como regular|como verificar|procedimiento|pasos para|protocolo de)\b/i.test(norm);

  if (esConsultaProcedimiento) {
    let compProc = categorySlug;
    if (!compProc) {
      for (const slug of Object.keys(ICONOS_COMPONENTES_LOCAL)) {
        if (norm.includes(slug) || norm.includes(getNombreComp(slug).toLowerCase())) {
          compProc = slug;
          break;
        }
      }
    }

    const docsProc = docsFichaCache.filter((f) => f.field_type_slug === 'procedimientos');
    for (const dProc of docsProc) {
      if (dProc.raw_text && (!compProc || dProc.category_slug === compProc)) {
        const tags = parseFichaTagsLocal(dProc.raw_text);
        const matchProc = tags.find((t) => {
          const tNorm = normalizarTextoLocal(t.title);
          return norm.includes(tNorm) || tNorm.includes(norm);
        });

        if (matchProc && dProc.category_slug) {
          const nomComp = getNombreComp(dProc.category_slug);
          const iconoComp = ICONOS_COMPONENTES_LOCAL[dProc.category_slug] || '🔧';
          let msg = `${iconoComp} **Procedimiento Técnico · ${matchProc.title}**\n\n`;
          msg += `Pauta oficial de mantenimiento para **${nombreEquipo}${modeloStr}** (${nomComp}):\n\n`;
          msg += `• **Instrucción:** ${matchProc.detail || 'Seguir protocolo de taller OEM.'}\n\n`;
          msg += `¿Pudiste ejecutar el procedimiento en faena o requieres apoyo adicional?`;

          return {
            message: msg,
            alternativas: [
              '✅ Procedimiento completado',
              '⚠️ Falla confirmada (generar informe)',
              '🔄 Cambiar de componente',
            ],
          };
        }
      }
    }
  }

  // 11. INTENCIÓN: Coincidencia con una Falla Específica en docsFichaCache
  if (docsFichaCache && docsFichaCache.length > 0) {
    const docsFallasOrdenados = categorySlug
      ? [
          ...docsFichaCache.filter((f) => f.category_slug === categorySlug && f.field_type_slug === 'fallas'),
          ...docsFichaCache.filter((f) => f.category_slug !== categorySlug && f.field_type_slug === 'fallas'),
        ]
      : docsFichaCache.filter((f) => f.field_type_slug === 'fallas');

    for (const docFalla of docsFallasOrdenados) {
      if (docFalla.raw_text && docFalla.category_slug) {
        const tagsFallas = parseFichaTagsLocal(docFalla.raw_text);
        const catSlug = docFalla.category_slug;
        const nomComp = getNombreComp(catSlug);
        const iconoComp = ICONOS_COMPONENTES_LOCAL[catSlug] || '🔧';

        const msgLimpio = norm.replace(/^\d+[\.\)\s\-]+/, '').trim();

        const fallaMatch = tagsFallas.find((tf) => {
          const titleNorm = normalizarTextoLocal(tf.title);
          if (msgLimpio === titleNorm || msgLimpio.includes(titleNorm) || titleNorm.includes(msgLimpio)) {
            return true;
          }
          const wordsTitle = titleNorm.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
          const wordsMsg = msgLimpio.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
          const intersect = wordsTitle.filter((w) => wordsMsg.includes(w));
          return intersect.length >= 2;
        });

        if (fallaMatch) {
          const docProc = docsFichaCache.find(
            (d) => d.category_slug === catSlug && d.field_type_slug === 'procedimientos'
          );
          const docEquip = docsFichaCache.find(
            (d) => d.category_slug === catSlug && d.field_type_slug === 'equipamiento'
          );

          const tagsProc = docProc && docProc.raw_text ? parseFichaTagsLocal(docProc.raw_text) : [];
          const tagsEquip = docEquip && docEquip.raw_text ? parseFichaTagsLocal(docEquip.raw_text) : [];

          let msg = `${iconoComp} **Protocolo de Verificación · ${fallaMatch.title}**\n\n`;
          msg += `**Sistema:** ${nomComp} · **Equipo:** ${nombreEquipo}${modeloStr}\n\n`;

          if (fallaMatch.detail) {
            msg += `**Criterio Técnico / Causa Raíz:**\n• ${fallaMatch.detail}\n\n`;
          }

          if (tagsEquip.length > 0) {
            msg += `**Parámetros Nominales de Referencia (OEM):**\n`;
            tagsEquip.slice(0, 3).forEach((eq) => {
              msg += eq.detail ? `• **${eq.title}:** ${eq.detail}\n` : `• ${eq.title}\n`;
            });
            msg += `\n`;
          }

          if (tagsProc.length > 0) {
            msg += `**Procedimiento de Comprobación en Terreno:**\n`;
            tagsProc.slice(0, 4).forEach((pr, idx) => {
              msg += `${idx + 1}. **${pr.title}:** ${pr.detail || 'Verificar condición física y funcional.'}\n`;
            });
            msg += `\n¿Pudiste normalizar la condición en terreno o la anomalía queda confirmada?`;
          } else {
            msg += `**Procedimiento de Inspección en Faena:**\n`;
            msg += `1. **Seguridad (LOTO):** Estacionar en superficie plana, aplicar cuñas y bloquear energías.\n`;
            msg += `2. **Inspección Física:** Verificar ausencia de fugas, conectores sueltos o daños estructurales.\n`;
            msg += `3. **Prueba Funcional:** Medir parámetro con instrumento calibrado y comparar con tolerancia OEM.\n\n`;
            msg += `¿Pudiste corregir el problema en terreno o la anomalía queda confirmada?`;
          }

          const otraFallaOpcion = `🔍 Otra falla de ${nomComp.slice(0, 16)}`;
          return {
            message: msg,
            alternativas: [
              '✅ Falla corregida en terreno',
              '⚠️ Falla confirmada (generar informe)',
              otraFallaOpcion,
              '🔄 Cambiar de componente',
            ],
          };
        }
      }
    }
  }

  // 12. INTENCIÓN: Detección de Componente Seleccionado (Modo Neutral vs. Modo Avería)
  let detectedSlug = categorySlug;
  if (!detectedSlug) {
    for (const slug of Object.keys(ICONOS_COMPONENTES_LOCAL)) {
      const nom = getNombreComp(slug).toLowerCase();
      if (norm.includes(slug) || norm.includes(nom)) {
        detectedSlug = slug;
        break;
      }
    }
    if (!detectedSlug) {
      if (norm.includes('freno') || norm.includes('retardo')) detectedSlug = 'frenos';
      else if (norm.includes('hidraul') || norm.includes('bomba')) detectedSlug = 'hidraulico';
      else if (norm.includes('tolva') || norm.includes('volteo') || norm.includes('levante')) detectedSlug = 'tolva';
      else if (norm.includes('motor') || norm.includes('combustible') || norm.includes('inyector')) detectedSlug = 'motor';
      else if (norm.includes('direccion') || norm.includes('giro') || norm.includes('articulac')) detectedSlug = 'direccion';
      else if (norm.includes('eje') || norm.includes('transmision') || norm.includes('convertidor')) detectedSlug = 'ejes';
      else if (norm.includes('temperatura') || norm.includes('calor') || norm.includes('refrigerac')) detectedSlug = 'temperatura';
      else if (norm.includes('electr') || norm.includes('bateria') || norm.includes('arranque')) detectedSlug = 'electrico';
      else if (norm.includes('suspens') || norm.includes('chasis') || norm.includes('amortiguad')) detectedSlug = 'suspension';
      else if (norm.includes('neumatic') || norm.includes('llanta') || norm.includes('presion rueda')) detectedSlug = 'neumaticos';
      else if (norm.includes('sensor') || norm.includes('alerta') || norm.includes('codigo') || norm.includes('pantalla')) detectedSlug = 'sensores';
    }
  }

  if (detectedSlug) {
    const nomComp = getNombreComp(detectedSlug);
    const iconoComp = ICONOS_COMPONENTES_LOCAL[detectedSlug] || '🔧';

    const docFalla = docsFichaCache.find(
      (f) => f.category_slug === detectedSlug && f.field_type_slug === 'fallas'
    );
    const docEquip = docsFichaCache.find(
      (f) => f.category_slug === detectedSlug && f.field_type_slug === 'equipamiento'
    );

    const tagsFallas = docFalla && docFalla.raw_text ? parseFichaTagsLocal(docFalla.raw_text) : [];
    const tagsEquip = docEquip && docEquip.raw_text ? parseFichaTagsLocal(docEquip.raw_text) : [];

    const quiereDiagnosticarFalla =
      /\b(falla|problema|anomalia|sintoma|ruido|fuga|temperatura|calienta|humo|vibracion|no frena|no levanta|no gira|no arranca|alerta|codigo|dañado|roto|averia|presion baja|alta temperatura)\b/i.test(norm) ||
      /^\d+[\.\)]/.test(norm.trim()) ||
      norm.startsWith('tengo una falla');

    if (quiereDiagnosticarFalla) {
      let msg = `${iconoComp} **Diagnóstico Técnico · ${nomComp}**\n\n`;
      msg += `Parámetros técnicos oficiales de **${nombreEquipo}${modeloStr}** para **${nomComp.toUpperCase()}**:\n\n`;

      if (tagsEquip.length > 0) {
        tagsEquip.slice(0, 3).forEach((eq) => {
          msg += eq.detail ? `• **${eq.title}:** ${eq.detail}\n` : `• ${eq.title}\n`;
        });
        msg += `\n`;
      }

      msg += `Selecciona el síntoma observado o la condición anómala para iniciar la comprobación en terreno:`;

      const alternativasFallas = tagsFallas.length > 0
        ? tagsFallas.slice(0, 4).map((t, i) => `${i + 1}. ${t.title.length > 28 ? t.title.slice(0, 26) + '…' : t.title}`)
        : [
            `1. Pérdida de rendimiento en ${detectedSlug}`,
            `2. Ruido o vibración anómala`,
            `3. Fuga de fluido en ${detectedSlug}`,
          ];

      return {
        message: msg,
        alternativas: [
          ...alternativasFallas,
          '🔄 Cambiar de componente',
        ],
      };
    } else {
      // Modo informativo / presentación neutral del componente (no asume avería)
      let msg = `${iconoComp} **Sistema: ${nomComp}**\n\n`;
      msg += `Parámetros y equipamiento registrado en **${nombreEquipo}${modeloStr}**:\n\n`;

      if (tagsEquip.length > 0) {
        tagsEquip.slice(0, 4).forEach((eq) => {
          msg += eq.detail ? `• **${eq.title}:** ${eq.detail}\n` : `• ${eq.title}\n`;
        });
        msg += `\n`;
      }

      msg += `¿Qué deseas realizar o consultar en este sistema?`;

      const opciones = [
        `🔍 Diagnosticar una anomalía`,
      ];
      if (tagsEquip.some((t) => /aceite|fluido|refrigerante|grasa/i.test(t.title + ' ' + t.detail))) {
        opciones.push(`🛢️ Fluidos de ${nomComp.slice(0, 18)}`);
      } else {
        opciones.push(`📋 Ver Ficha Técnica`);
      }
      opciones.push(`🔄 Cambiar de componente`);

      return {
        message: msg,
        alternativas: opciones,
      };
    }
  }

  // 13. FALLBACK GENERAL CONTEXTUAL
  return {
    message: `🤖 **Asistente TAGSENSE · Diagnóstico por Componente**\n\nHe consultado la ficha técnica oficial de **${nombreEquipo}${modeloStr}**.\n\nPara orientarte con máxima precisión en terreno, selecciona el componente que deseas revisar o diagnosticar:`,
    alternativas: getBotonesComponentes(),
  };
}

async function enviarPregunta(texto, categorySlug) {
  const limpio = texto.trim();
  if (!limpio) return;
  appendUserBubble(limpio);
  chatSuggestions.innerHTML = '';
  chatInput.value = '';
  chatSendBtn.disabled = true;
  hapticPulse();

  const activo = ACTIVOS[activoActualId];
  if (!activo || !activo.id) {
    appendBotBubble('No se pudo identificar el activo. Vuelve a escanear el tag e intenta de nuevo.');
    return;
  }

  if (categorySlug) {
    categoriaActivaEnChat = categorySlug;
  } else if (
    /no tiene falla|no hay falla|sin falla|no falla|ninguna falla|solo queria|solo era|todo bien|todo normal|operativo|gracias|vale|cambiar componente|otro componente|especific|ficha|menu principal|inicio/i.test(
      limpio
    )
  ) {
    categoriaActivaEnChat = null;
  }
  const slugAEnviar = categorySlug || categoriaActivaEnChat || null;

  showTyping();
  const generacionAlEnviar = chatGeneracion;

  // Si no hay red, usar inmediatamente el motor Bot offline local
  if (!navigator.onLine) {
    setTimeout(() => {
      if (chatGeneracion !== generacionAlEnviar) return;
      hideTyping();
      const localResp = responderBotOffline(limpio, slugAEnviar, activo);
      appendBotBubble(localResp.message);
      const unicas = Array.from(new Set([...(localResp.alternativas || []), 'Escalar a supervisor']));
      renderSuggestions(unicas);
    }, 350);
    return;
  }

  try {
    const resp = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: activo.id,
        message: limpio,
        category_slug: slugAEnviar,
        history: historialChat.slice(-6),
      }),
    });

    if (chatGeneracion !== generacionAlEnviar) return;
    hideTyping();
    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.message) {
      // Si la API falla por rate limit, crédito agotado o error 500, activar el BOT de contingencia
      const localResp = responderBotOffline(limpio, slugAEnviar, activo);
      appendBotBubble(localResp.message);
      const unicas = Array.from(new Set([...(localResp.alternativas || []), 'Escalar a supervisor']));
      renderSuggestions(unicas);
      return;
    }

    appendBotBubble(data.message);

    const listaOpciones = Array.isArray(data.alternativas) && data.alternativas.length > 0
      ? data.alternativas
      : ['📋 Especificaciones Técnicas', '🔄 Cambiar de componente'];

    const unicas = Array.from(new Set([...listaOpciones, 'Escalar a supervisor']));
    renderSuggestions(unicas);
  } catch (err) {
    if (chatGeneracion !== generacionAlEnviar) return;
    hideTyping();
    const localResp = responderBotOffline(limpio, slugAEnviar, activo);
    appendBotBubble(localResp.message);
    const unicas = Array.from(new Set([...(localResp.alternativas || []), 'Escalar a supervisor']));
    renderSuggestions(unicas);
  }
}

// Opciones de inicio consolidadas en formato de chips interactivos
const CATEGORIAS_BASE = [
  { nombre: '📋 Ficha y Especificaciones', query: 'Consultar especificaciones del equipo' },
  { nombre: '🛑 Falla en Frenos', query: 'Tengo una falla en los frenos', slug: 'frenos' },
  { nombre: '💧 Sistema Hidráulico', query: 'Tengo una falla en el sistema hidráulico', slug: 'hidraulico' },
  { nombre: '📦 Tolva y Levante', query: 'Tengo una falla en tolva', slug: 'tolva' },
  { nombre: '🌡️ Temperatura Motor', query: 'Tengo una falla de temperatura en el motor', slug: 'temperatura' },
  { nombre: '⚙️ Dirección / Giro', query: 'Tengo una falla en la dirección', slug: 'direccion' },
  { nombre: '⚡ Sistema Eléctrico', query: 'Tengo un problema eléctrico', slug: 'electrico' },
  { nombre: '🚨 Alerta en Sensores', query: 'Un sensor está dando una alerta en el panel', slug: 'sensores' },
  { nombre: '📞 Escalar a Supervisor', query: 'Escalar a supervisor' },
];

async function cargarOpcionesIniciales(activo) {
  chatSuggestions.innerHTML = '';

  let opciones = CATEGORIAS_BASE;
  if (activo && activo.id) {
    try {
      const resp = await fetch('/api/fault-categories?asset_id=' + encodeURIComponent(activo.id));
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        const dynamicCats = data?.categorias;
        if (Array.isArray(dynamicCats) && dynamicCats.length > 0) {
          const din = dynamicCats.map(c => {
            const icono = ICONOS_COMPONENTES_LOCAL[c.slug] || '🔧';
            return {
              nombre: `${icono} ${c.name}`,
              query: `Tengo una falla en ${c.name.toLowerCase()}`,
              slug: c.slug,
            };
          });
          opciones = [
            { nombre: '📋 Ficha y Especificaciones', query: 'Consultar especificaciones del equipo' },
            ...din,
            { nombre: '📞 Escalar a Supervisor', query: 'Escalar a supervisor' },
          ];
        }
      }
    } catch (e) {
      // Continuar con CATEGORIAS_BASE
    }
  }

  opciones.forEach(item => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'suggestion-chip';
    chip.textContent = item.nombre;
    chip.addEventListener('click', () => {
      if (item.query.includes('Escalar a supervisor')) {
        appendUserBubble(item.nombre);
        chatSuggestions.innerHTML = '';
        appendEscalateChip();
      } else {
        enviarPregunta(item.query, item.slug);
      }
    });
    chatSuggestions.appendChild(chip);
  });
  scrollChatToBottom();
}

chatInput.addEventListener('input', () => {
  chatSendBtn.disabled = chatInput.value.trim().length === 0;
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !chatSendBtn.disabled) {
    enviarPregunta(chatInput.value);
  }
});
chatSendBtn.addEventListener('click', () => enviarPregunta(chatInput.value));

document.getElementById('back-asistente').addEventListener('click', () => goTo('step-confirm-3'));
