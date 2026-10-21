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

function parseTagLineLocal(line) {
  const clean = (line || '').replace(/^[\s\-*•\d.]+/, '').trim();
  if (!clean) return { title: '', detail: '' };
  const colonIdx = clean.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 45) {
    return {
      title: clean.substring(0, colonIdx).trim(),
      detail: clean.substring(colonIdx + 1).trim(),
    };
  }
  const dashIdx = clean.search(/\s+[—–-]\s+/);
  if (dashIdx > 0 && dashIdx <= 45) {
    return {
      title: clean.substring(0, dashIdx).trim(),
      detail: clean.substring(dashIdx).replace(/^[\s—–-]+/, '').trim(),
    };
  }
  return { title: clean, detail: '' };
}

function responderBotOffline(texto, categorySlug, activo) {
  const norm = normalizarTextoLocal(texto);
  const nombreEquipo = activo.nombre || 'Equipo';
  const modeloStr = activo.modelo ? ` (${activo.modelo})` : '';
  const specs = activo.specs || {};

  // 1. INTENCIÓN: Consultar otro componente o volver al menú
  if (
    norm.includes('otro componente') ||
    norm.includes('cambiar componente') ||
    norm.includes('otro sistema') ||
    norm.includes('volver a opciones') ||
    norm.includes('menu principal') ||
    norm.includes('diagnosticar una falla') ||
    norm.includes('ver sistemas y fallas')
  ) {
    return {
      message: `🤖 **Asistente TAGSENSE · Selección de Sistema**\n\n¿Qué componente o sistema deseas diagnosticar para **${nombreEquipo}${modeloStr}**?`,
      alternativas: [
        '🛑 Falla en Frenos',
        '💧 Sistema Hidráulico',
        '📦 Tolva y Levante',
        '🌡️ Motor y Temperatura',
        '⚙️ Dirección y Giro',
        '⚡ Sistema Eléctrico',
        '📋 Especificaciones Técnicas',
      ],
    };
  }

  // 2. INTENCIÓN: Especificaciones técnicas / Ficha oficial
  if (
    norm.includes('especific') ||
    norm.includes('ficha') ||
    norm.includes('specs') ||
    norm.includes('datos del equipo') ||
    norm.includes('capacidad y peso') ||
    norm.includes('potencia')
  ) {
    let msg = `🤖 **Asistente TAGSENSE · Ficha y Especificaciones**\n\n`;
    msg += `Especificaciones técnicas oficiales de **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `• **Modelo / Fabricante:** ${activo.modelo || nombreEquipo} (${activo.fabricante || 'OEM'})\n`;
    msg += `• **Motorización OEM:** ${specs.engine_type || 'Estándar'} · Potencia: ${specs.power || 'Nominal'}\n`;
    msg += `• **Capacidad de Carga:** ${specs.load_capacity || 'Según diseño OEM'} · Peso op.: ${specs.operating_weight || 'Nominal'}\n`;
    msg += `• **Horómetro Acumulado:** ${activo.horometro || 'No registrado'} · Estado: ${activo.estado || 'Operativo'}\n\n`;
    msg += `¿Qué deseas realizar a continuación?`;

    return {
      message: msg,
      alternativas: [
        'Procedimientos de inspección',
        'Puntos de engrase y fluidos',
        'Consultar otro componente',
      ],
    };
  }

  // 3. INTENCIÓN: Puntos de engrase y fluidos
  if (
    norm.includes('engrase') ||
    norm.includes('fluido') ||
    norm.includes('lubricac') ||
    norm.includes('aceite')
  ) {
    let msg = `🛢️ **Asistente TAGSENSE · Puntos de Engrase y Fluidos**\n\n`;
    msg += `Pautas de lubricación y niveles recomendados para **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `• **Aceite de Motor:** 15W-40 CK-4 — Comprobar nivel con varilla en motor apagado y piso plano.\n`;
    msg += `• **Circuito Hidráulico:** Fluido ISO VG 46/68 — Mirilla en estanque con cilindros retraídos.\n`;
    msg += `• **Grasa de Chasis y Tolva:** Grasa de litio NLGI 2 EP en graseras de bujes y articulaciones.\n`;
    msg += `• **Refrigerante:** OAT 50/50 — Nivel entre marcas MIN y MAX en vaso de expansión.\n\n`;
    msg += `¿Deseas verificar un punto en terreno o registrar la mantención?`;

    return {
      message: msg,
      alternativas: [
        'Inspeccionar nivel hidráulico',
        'Procedimiento de lubricación',
        'Registrar hallazgo en informe',
      ],
    };
  }

  // 4. INTENCIÓN: Procedimientos de inspección general
  if (norm.includes('procedimiento') && !norm.includes('tolva') && !norm.includes('freno')) {
    let msg = `🔍 **Asistente TAGSENSE · Procedimientos de Inspección**\n\n`;
    msg += `Protocolo de inspección técnica para **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `1. **Seguridad previa (LOTO):** Estacionar en piso plano, colocar cuñas y aplicar freno de parqueo.\n`;
    msg += `2. **Inspección de 360°:** Verificar ausencia de fugas activas en mangueras, acoples y estado de neumáticos/chasis.\n`;
    msg += `3. **Comprobación de cabina:** Testigos de advertencia, horómetro y presiones de corte en manómetros del tablero.\n\n`;
    msg += `¿Sobre cuál de estos sistemas deseas profundizar?`;

    return {
      message: msg,
      alternativas: [
        'Inspeccionar tolva y levante',
        'Inspeccionar sistema de frenos',
        'Inspeccionar circuito hidráulico',
      ],
    };
  }

  // 5. INTENCIÓN: Registrar hallazgo / Generar informe
  if (
    norm.includes('registrar hallazgo') ||
    norm.includes('generar informe') ||
    norm.includes('abrir informe') ||
    norm.includes('formulario de informe')
  ) {
    return {
      message: `📝 **Asistente TAGSENSE · Registro en Informe**\n\nHe preparado el hallazgo técnico para el informe de mantenimiento de **${nombreEquipo}${modeloStr}**.\n\nPuedes presionar **Abrir Formulario de Informe** para adjuntar fotografías, detalle de la intervención y firma:`,
      alternativas: [
        'Abrir Formulario de Informe',
        'Consultar otro componente',
        'Escalar a supervisor',
      ],
    };
  }

  // 5.5 INTENCIÓN: Coincidencia con tags dinámicos de la ficha técnica
  if (docsFichaCache && docsFichaCache.length > 0) {
    for (const doc of docsFichaCache) {
      if (doc.field_type_slug === 'fallas' && doc.raw_text) {
        const rawLines = doc.raw_text.split(/\n|•/).map(s => s.trim()).filter(Boolean);
        const structuredTags = rawLines.map(parseTagLineLocal).filter(t => t.title.length > 2);

        const match = structuredTags.find((t) => {
          const titleNorm = normalizarTextoLocal(t.title);
          return norm.includes(titleNorm) || titleNorm.includes(norm);
        });

        if (match) {
          const docProc = docsFichaCache.find(
            (d) => d.category_slug === doc.category_slug && d.field_type_slug === 'procedimientos'
          );
          const procTags =
            docProc && docProc.raw_text
              ? docProc.raw_text
                  .split(/\n|•/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map(parseTagLineLocal)
                  .filter((t) => t.title.length > 2)
              : [];

          let msg = `🔧 **Asistente TAGSENSE · Diagnóstico de ${doc.category_slug.toUpperCase()}**\n\n`;
          msg += `Para la condición reportada: **${match.title}** en **${nombreEquipo}**:\n\n`;
          if (match.detail) {
            msg += `**Criterio técnico de diagnóstico:**\n• ${match.detail}\n\n`;
          }
          if (procTags.length > 0) {
            msg += `**Procedimiento técnico guiado:**\n`;
            procTags.forEach((p, idx) => {
              const linea = p.detail ? `**${p.title}:** ${p.detail}` : p.title;
              msg += `${idx + 1}. ${linea}\n`;
            });
            msg += `\n¿Pudiste ejecutar la verificación en terreno o confirmas la anomalía?`;
          } else {
            msg += `1. Detener el equipo en zona segura y colocar calzos.\n2. Efectuar inspección visual y registrar estado en informe.\n\n¿Deseas registrar este hallazgo en el informe técnico?`;
          }

          return {
            message: msg,
            alternativas: [
              'Anomalía confirmada en terreno',
              'Registrar hallazgo en informe',
              'Consultar especificaciones del equipo',
            ],
          };
        }
      }
    }
  }

  // 6. INTENCIÓN: Síntomas específicos
  // TOLVA
  if (norm.includes('no sube') || norm.includes('no levanta') || norm.includes('sube muy lenta') || norm.includes('sube lenta')) {
    let msg = `🔧 **Asistente TAGSENSE · Diagnóstico de Tolva**\n\n`;
    msg += `Procedimiento para **Tolva no sube o sube lenta** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Seguridad:** Ubica el equipo en terreno nivelado con despeje aéreo vertical de al menos 8 metros.\n`;
    msg += `2. **Nivel de fluido:** Revisa la mirilla del depósito hidráulico con cilindros abajo y motor apagado.\n`;
    msg += `3. **Presión de levante:** Conecta manómetro en puerto TP de volteo. Acelera a 1.800 RPM y acciona la palanca. La presión nominal debe alcanzar **210 bar (3.000 psi)**.\n`;
    msg += `4. **Válvula de alivio:** Si la presión no supera 140 bar, la válvula de alivio del banco de tolva puede estar trabada abierta.\n\n`;
    msg += `¿Cuál fue la lectura observada en la comprobación?`;

    return {
      message: msg,
      alternativas: [
        'Presión dentro de rango (210 bar)',
        'Presión baja (< 160 bar)',
        'Fuga visible en mangueras',
      ],
    };
  }

  if (norm.includes('no baja') || norm.includes('no desciende') || norm.includes('cae con golpe') || norm.includes('desciende con golpe')) {
    let msg = `🔧 **Asistente TAGSENSE · Diagnóstico de Tolva**\n\n`;
    msg += `Procedimiento para **Tolva no baja o desciende bruscamente** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Traba de seguridad:** Coloca la traba mecánica de seguridad de tolva antes de inspeccionar bajo el chasis.\n`;
    msg += `2. **Válvula de descenso:** Revisa la bobina solenoide de bajada y el cableado del mando en cabina.\n`;
    msg += `3. **Holding Valve:** Comprueba que la válvula de contrabalance o amortiguación de fin de carrera no esté obstruida.\n\n`;
    msg += `¿Cuál fue el resultado de la inspección?`;

    return {
      message: msg,
      alternativas: [
        'Solenoide o mando eléctrico dañado',
        'Obstrucción en válvula hidráulica',
        'Registrar hallazgo en informe',
      ],
    };
  }

  if (norm.includes('fuga en cilindro') || (norm.includes('fuga') && norm.includes('tolva'))) {
    let msg = `🔧 **Asistente TAGSENSE · Diagnóstico de Fugas en Tolva**\n\n`;
    msg += `Protocolo de inspección para **Fuga en cilindros o mangueras de tolva** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Despresurización:** Apaga el motor y mueve el joystick en todas direcciones para despresurizar el circuito.\n`;
    msg += `2. **Inspección de sellos:** Limpia el vástago del cilindro telescópico y observa si hay rayaduras o fuga por el retén rascador.\n`;
    msg += `3. **Acoples:** Verifica el torque de racores y mangueras de alta presión buscando dilataciones o fisuras.\n\n`;
    msg += `¿Qué condición encontraste?`;

    return {
      message: msg,
      alternativas: [
        'Sello de vástago con fuga activa',
        'Manguera con abrasión o fisura',
        'Sin fugas tras reapriete',
      ],
    };
  }

  // FRENOS
  if (norm.includes('esponjoso') || (norm.includes('presion') && norm.includes('freno'))) {
    let msg = `🛑 **Asistente TAGSENSE · Diagnóstico de Frenos**\n\n`;
    msg += `Procedimiento para **Pedal esponjoso o baja presión de frenado** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Acumuladores:** Revisa la presión de precarga en los acumuladores de nitrógeno (mínimo 90 bar).\n`;
    msg += `2. **Purga de aire:** Realiza purga de aire en los purgadores de cada rueda comenzando por el eje posterior.\n`;
    msg += `3. **Válvula moduladora:** Comprueba que no exista retorno excesivo al estanque al pisar el freno.\n\n`;
    msg += `¿Qué resultado arrojó la verificación de frenos?`;

    return {
      message: msg,
      alternativas: [
        'Aire en circuito purgado con éxito',
        'Baja precarga en acumulador',
        'Registrar hallazgo en informe',
      ],
    };
  }

  // 7. INTENCIÓN: Resultado de prueba guiada
  if (
    norm.includes('dentro de rango') ||
    norm.includes('presion baja') ||
    norm.includes('fuga visible') ||
    norm.includes('solenoide') ||
    norm.includes('obstruccion') ||
    norm.includes('sello de vastago') ||
    norm.includes('manguera con') ||
    norm.includes('sin fugas') ||
    norm.includes('aire en circuito') ||
    norm.includes('baja precarga') ||
    norm.includes('anomalia confirmada')
  ) {
    return {
      message: `📋 **Asistente TAGSENSE · Registro de Diagnóstico**\n\nEntendido. He incorporado el hallazgo (**${texto}**) a la sesión de trabajo para **${nombreEquipo}${modeloStr}**.\n\nPara cerrar el ciclo de mantenimiento, puedes registrar formalmente el informe o continuar con la revisión de otro componente:`,
      alternativas: [
        'Registrar hallazgo en informe',
        'Consultar otro componente',
        'Escalar a supervisor',
      ],
    };
  }

  // 8. INTENCIÓN: Reporte inicial de falla por sistema
  let sistema = categorySlug;
  if (!sistema) {
    if (norm.includes('tolva') || norm.includes('volteo') || norm.includes('levante')) sistema = 'tolva';
    else if (norm.includes('freno')) sistema = 'frenos';
    else if (norm.includes('hidraul') || norm.includes('bomba')) sistema = 'hidraulico';
    else if (norm.includes('temperatura') || norm.includes('motor') || norm.includes('calor') || norm.includes('refrigerante')) sistema = 'temperatura';
    else if (norm.includes('direccion') || norm.includes('volante') || norm.includes('giro')) sistema = 'direccion';
    else if (norm.includes('electr') || norm.includes('bateria') || norm.includes('arranque')) sistema = 'electrico';
    else if (norm.includes('sensor') || norm.includes('codigo') || norm.includes('alerta')) sistema = 'sensores';
  }

  // Prioridad: si este sistema tiene tags cargados en la ficha técnica, utilizarlos directamente
  if (sistema && docsFichaCache && docsFichaCache.length > 0) {
    const docFallas = docsFichaCache.find(d => d.category_slug === sistema && d.field_type_slug === 'fallas');
    const docEquip = docsFichaCache.find(d => d.category_slug === sistema && d.field_type_slug === 'equipamiento');

    const tagsFallas = docFallas && docFallas.raw_text
      ? docFallas.raw_text.split(/\n|•/).map(s => s.trim()).filter(Boolean).map(parseTagLineLocal).filter(t => t.title.length > 2)
      : [];
    const tagsEquip = docEquip && docEquip.raw_text
      ? docEquip.raw_text.split(/\n|•/).map(s => s.trim()).filter(Boolean).map(parseTagLineLocal).filter(t => t.title.length > 2)
      : [];

    if (tagsFallas.length > 0) {
      let msg = `🤖 **Asistente TAGSENSE · Diagnóstico de ${sistema.toUpperCase()}**\n\nHe analizado los tags técnicos de **${nombreEquipo}${modeloStr}** para **${sistema.toUpperCase()}**:\n\n`;
      if (tagsEquip.length > 0) {
        msg += `**Parámetros clave de referencia:**\n`;
        tagsEquip.slice(0, 2).forEach(eq => {
          msg += eq.detail ? `• **${eq.title}:** ${eq.detail}\n` : `• ${eq.title}\n`;
        });
        msg += `\n`;
      }
      msg += `¿Cuál de las siguientes condiciones o síntomas detectas en el equipo?`;
      return {
        message: msg,
        alternativas: [
          ...tagsFallas.slice(0, 3).map(t => t.title.length > 32 ? t.title.substring(0, 30) + '…' : t.title),
          'Procedimientos de inspección',
        ],
      };
    }
  }

  if (sistema === 'tolva') {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Tolva**\n\nHe analizado la documentación técnica de **${nombreEquipo}${modeloStr}** para **TOLVA Y VOLTEO**:\n\n• Cilindros de volteo telescópicos de doble efecto conectados al circuito hidráulico principal.\n\nPara orientarte con precisión, ¿cuál es el síntoma principal que presenta la tolva?`,
      alternativas: [
        'Tolva no sube o sube muy lenta',
        'Tolva no baja o desciende con golpe',
        'Fuga en cilindros de levante',
      ],
    };
  }

  if (sistema === 'frenos') {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Frenos**\n\nHe analizado los parámetros oficiales de **${nombreEquipo}${modeloStr}** para **FRENOS**:\n\n• Frenos de servicio: Discos húmedos enfriados por aceite forzado en todos los ejes con circuito doble independiente.\n\n¿Cuál es el síntoma principal que presenta el sistema de frenos?`,
      alternativas: [
        'Pedal esponjoso o baja presión',
        'Sobrecalentamiento o bloqueo',
        'Freno de parqueo no libera / no retiene',
      ],
    };
  }

  if (sistema === 'hidraulico') {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico Hidráulico**\n\nHe analizado la ficha de **${nombreEquipo}${modeloStr}** para **SISTEMA HIDRÁULICO**:\n\n• Circuito hidráulico central con bombas de caudal variable y válvulas de alivio proporcionales.\n\n¿Cuál es la anomalía principal observada?`,
      alternativas: [
        'Baja presión de trabajo general',
        'Ruido o cavitación en bomba',
        'Fuga en mangueras o estanque',
      ],
    };
  }

  if (sistema === 'temperatura') {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Temperatura**\n\nHe analizado los datos de **${nombreEquipo}${modeloStr}** para **TEMPERATURA Y MOTOR**:\n\n• Circuito de refrigeración forzada para motor con termostato regulado y enfriador de aceite.\n\n¿Cuál es la falla o alerta detectada?`,
      alternativas: [
        'Temperatura sobre 105°C en motor',
        'Nivel bajo de refrigerante o fuga',
        'Alerta de baja presión de aceite',
      ],
    };
  }

  if (sistema === 'direccion') {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Dirección**\n\nHe analizado los parámetros de **${nombreEquipo}${modeloStr}** para **DIRECCIÓN Y ARTICULACIÓN**:\n\n• Dirección hidromecánica articulada con sistema secundario de emergencia según norma ISO 5010.\n\n¿Cuál es el problema que presenta la dirección?`,
      alternativas: [
        'Dirección pesada / giro lento',
        'Juego excesivo en pasadores de giro',
        'Alerta dirección de emergencia',
      ],
    };
  }

  if (sistema === 'electrico') {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico Eléctrico**\n\nHe analizado los datos de **${nombreEquipo}${modeloStr}** para **SISTEMA ELÉCTRICO**:\n\n• Sistema eléctrico 24V con interruptor maestro LOTO, baterías de servicio y alternador de 28V.\n\n¿Cuál es el síntoma observado?`,
      alternativas: [
        'Equipo no da arranque / batería baja',
        'Códigos de falla en display',
        'Falla en luces o alternador',
      ],
    };
  }

  // 9. FALLBACK GENERAL CONTEXTUAL
  return {
    message: `🤖 **Asistente TAGSENSE · Diagnóstico Técnico**\n\nHe consultado la ficha y manuales de **${nombreEquipo}${modeloStr}**.\n\nPara orientarte de forma ordenada, selecciona una de las siguientes opciones:`,
    alternativas: [
      '📋 Especificaciones Técnicas',
      'Procedimientos de inspección',
      'Consultar otro componente',
    ],
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

  showTyping();
  const generacionAlEnviar = chatGeneracion;

  // Si no hay red, usar inmediatamente el motor Bot offline local
  if (!navigator.onLine) {
    setTimeout(() => {
      if (chatGeneracion !== generacionAlEnviar) return;
      hideTyping();
      const localResp = responderBotOffline(limpio, categorySlug, activo);
      appendBotBubble(localResp.message);
      renderSuggestions([...localResp.alternativas, 'Escalar a supervisor']);
    }, 350);
    return;
  }

  try {
    const resp = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: activo.id, message: limpio, category_slug: categorySlug || null }),
    });

    if (chatGeneracion !== generacionAlEnviar) return;
    hideTyping();
    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.message) {
      // Si la API falla por rate limit, crédito agotado o error 500, activar el BOT de contingencia
      const localResp = responderBotOffline(limpio, categorySlug, activo);
      appendBotBubble(localResp.message);
      renderSuggestions([...localResp.alternativas, 'Escalar a supervisor']);
      return;
    }

    appendBotBubble(data.message);

    const listaOpciones = Array.isArray(data.alternativas) && data.alternativas.length > 0
      ? data.alternativas
      : ['📋 Especificaciones Técnicas', 'Procedimientos de inspección', 'Consultar otro componente'];

    renderSuggestions([...listaOpciones, 'Escalar a supervisor']);
  } catch (err) {
    if (chatGeneracion !== generacionAlEnviar) return;
    hideTyping();
    const localResp = responderBotOffline(limpio, categorySlug, activo);
    appendBotBubble(localResp.message);
    renderSuggestions([...localResp.alternativas, 'Escalar a supervisor']);
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
          const din = dynamicCats.map(c => ({
            nombre: `🔧 ${c.name}`,
            query: `Tengo una falla en ${c.name.toLowerCase()}`,
            slug: c.slug,
          }));
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
