'use strict';

// ================= ASISTENTE TÉCNICO (RAG real — Claude + Voyage AI) =================
// Llama a /api/assistant/chat (ver app/api/assistant/chat/route.ts): responde
// EXCLUSIVAMENTE con los fragmentos de los manuales que el admin subió e
// indexó para este activo (o su modelo) — nunca con conocimiento general ni
// con datos de otro activo. Por eso necesita sesión iniciada (requiereLogin,
// ver main.js) y conexión — a diferencia del resto de la ficha técnica, esto
// no puede funcionar offline (llama a Anthropic/Voyage en vivo).

import { hapticPulse, mostrarToast, goTo } from './core.js';
import { activoActualId, ACTIVOS } from './scan.js';

const chatMessages = document.getElementById('chat-messages');
const chatSuggestions = document.getElementById('chat-suggestions');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

const BOT_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2 8 8H4l2 4-2 4h4l4 6 4-6h4l-2-4 2-4h-4l-4-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const SOURCE_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

let chatInitialized = false;
// Se incrementa cada vez que se limpia el chat (iniciarChatNuevo) — la respuesta
// demorada de enviarPregunta() guarda con qué generación arrancó y, si ya cambió
// cuando la respuesta llega, no se pega una respuesta vieja a la conversación
// nueva (pasaba si el técnico tocaba "+ Nuevo" mientras el asistente seguía "pensando").
let chatGeneracion = 0;

export function initChat(){
  cargarCategoriasFalla();
  if (chatInitialized) { chatMessages.scrollTop = chatMessages.scrollHeight; return; }
  chatInitialized = true;
  const activo = ACTIVOS[activoActualId];
  const nombreEquipo = activo ? activo.nombre : 'este equipo';
  appendBotBubble(
    `Hola, soy el asistente técnico de TAGSENSE. Te ayudo con la documentación cargada para ${nombreEquipo}. Pregúntame directamente o toca un sistema.`
  );
}

function iniciarChatNuevo(){
  const teniaMensajes = chatMessages.querySelectorAll('.chat-bubble-row.user').length > 0;
  chatGeneracion++;
  chatMessages.innerHTML = '';
  chatSuggestions.innerHTML = '';
  chatInput.value = '';
  chatSendBtn.disabled = true;
  // Si el técnico estaba con scroll hacia abajo leyendo una respuesta, limpiar el
  // chat sin volver arriba lo dejaba mirando una zona vacía — parecía que el botón
  // no hacía nada.
  window.scrollTo(0, 0);
  document.getElementById('symptom-grid').classList.remove('hidden');
  chatInitialized = false;
  initChat();
  hapticPulse();

  // Feedback visual instantáneo para que se note la acción
  const chatBox = document.getElementById('chat-messages');
  if (chatBox) {
    chatBox.style.animation = 'none';
    void chatBox.offsetHeight;
    chatBox.style.animation = 'fadeUp .25s ease';
  }

  if (teniaMensajes) {
    mostrarToast('Conversación reiniciada. ¿En qué te puedo ayudar?');
  } else {
    mostrarToast('El asistente está listo para tu consulta');
  }
}
document.getElementById('chat-new-btn').addEventListener('click', iniciarChatNuevo);

function renderSuggestions(lista){
  chatSuggestions.innerHTML = '';
  lista.forEach(texto => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'suggestion-chip';
    chip.textContent = texto;
    chip.addEventListener('click', () => {
      if (texto === 'Escalar a supervisor') {
        appendUserBubble(texto);
        chatSuggestions.innerHTML = '';
        appendEscalateChip();
      } else {
        enviarPregunta(texto);
      }
    });
    chatSuggestions.appendChild(chip);
  });
}

function appendUserBubble(texto){
  const row = document.createElement('div');
  row.className = 'chat-bubble-row user';
  row.innerHTML = `<div class="chat-bubble"></div>`;
  row.querySelector('.chat-bubble').textContent = texto;
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendBotBubble(texto, fuentes){
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot';
  const sourceHtml = fuentes
    ? `<div class="source-tag">${SOURCE_ICON_SVG}${fuentes}</div>`
    : '';
  row.innerHTML = `
    <div class="chat-avatar-sm">${BOT_AVATAR_SVG}</div>
    <div class="chat-bubble"></div>
  `;
  const bubble = row.querySelector('.chat-bubble');
  bubble.textContent = texto;
  if (sourceHtml) bubble.insertAdjacentHTML('beforeend', sourceHtml);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping(){
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot typing-row';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="chat-avatar-sm">${BOT_AVATAR_SVG}</div>
    <div class="typing-dots"><span></span><span></span><span></span></div>
  `;
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function hideTyping(){
  const row = document.getElementById('typing-row');
  if (row) row.remove();
}

function appendEscalateChip(){
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
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escalarASupervisor(){
  const activo = ACTIVOS[activoActualId];
  const nombreEquipo = activo ? activo.nombre : 'Equipo';
  const historialTexto = Array.from(chatMessages.querySelectorAll('.chat-bubble-row'))
    .filter(r => !r.classList.contains('typing-row'))
    .slice(-6)
    .map(r => {
      const esUser = r.classList.contains('user');
      const txt = r.querySelector('.chat-bubble')?.childNodes[0]?.textContent || '';
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

async function enviarPregunta(texto, categorySlug){
  const limpio = texto.trim();
  if (!limpio) return;
  document.getElementById('symptom-grid').classList.add('hidden');
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
  if (!navigator.onLine) {
    appendBotBubble('Necesitas conexión para usar el asistente — a diferencia del resto de la ficha, esto no funciona offline.');
    return;
  }

  showTyping();
  const generacionAlEnviar = chatGeneracion;
  try {
    const resp = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: activo.id, message: limpio, category_slug: categorySlug || null }),
    });
    // El chat se reinició (botón "+ Nuevo") mientras esta respuesta estaba
    // en camino — no la pegamos a la conversación nueva.
    if (chatGeneracion !== generacionAlEnviar) return;
    hideTyping();
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) || 'El asistente no está disponible en este momento.';
      appendBotBubble(msg);
      if (resp.status !== 429) appendEscalateChip();
      return;
    }
    appendBotBubble(data.message, data.sources && data.sources.length ? data.sources.join(', ') : undefined);
    renderSuggestions(['Escalar a supervisor']);
  } catch (err) {
    if (chatGeneracion !== generacionAlEnviar) return;
    hideTyping();
    appendBotBubble('No se pudo conectar con el servidor.');
    appendEscalateChip();
  }
}

// Preguntas de partida por sistema — solo sirven para no tener que escribir;
// la respuesta real siempre sale de los documentos indexados de este activo
// (o de la ficha por categoría que haya cargado el admin), nunca de una base
// de conocimiento fija por acá. Las 8 categorías originales tienen una
// pregunta más natural escrita a mano; una categoría nueva que agregue el
// admin (ver fault_categories) usa el texto genérico.
const SYMPTOM_QUERIES = {
  frenos: 'Tengo una falla en los frenos',
  direccion: 'Tengo una falla en la dirección',
  tolva: 'Tengo una falla en la tolva',
  electrico: 'Tengo un problema eléctrico',
  hidraulico: 'Tengo una falla en el sistema hidráulico',
  ejes: 'Tengo una falla en los ejes',
  sensores: 'Un sensor está dando una alerta en el panel',
  temperatura: 'Tengo una falla de temperatura en el motor',
};

// Mismos íconos que antes estaban fijos en el HTML para las 8 categorías
// originales — una categoría nueva que agregue el admin usa un ícono genérico
// (no tiene forma de adivinar uno específico para, por ejemplo, "Neumáticos").
const SYMPTOM_ICONS = {
  frenos: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#c91233" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="#c91233"/></svg>',
  direccion: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#c91233" stroke-width="1.7"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4" stroke="#c91233" stroke-width="1.7" stroke-linecap="round"/></svg>',
  tolva: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 17h13l4-8H7L3 17Z" stroke="#c91233" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="19" r="1.6" stroke="#c91233" stroke-width="1.5"/><circle cx="16" cy="19" r="1.6" stroke="#c91233" stroke-width="1.5"/></svg>',
  electrico: '<svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="#c91233" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  hidraulico: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke="#c91233" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  ejes: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#c91233" stroke-width="1.7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="#c91233" stroke-width="1.5" stroke-linecap="round"/></svg>',
  sensores: '<svg viewBox="0 0 24 24" fill="none"><rect x="7" y="7" width="10" height="10" rx="2" stroke="#c91233" stroke-width="1.7"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="#c91233" stroke-width="1.5" stroke-linecap="round"/></svg>',
  temperatura: '<svg viewBox="0 0 24 24" fill="none"><path d="M10 14.76V4a2 2 0 1 1 4 0v10.76a4 4 0 1 1-4 0Z" stroke="#c91233" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};
const ICONO_GENERICO = '<svg viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4L14.7 6.3Z" stroke="#c91233" stroke-width="1.6" stroke-linejoin="round"/></svg>';

const symptomGridItems = document.getElementById('symptom-grid-items');
// Los componentes son por activo (un camión tiene tolva, una bomba no — ver
// asset_components) — hay que recargar los tiles si el técnico escanea un
// activo distinto dentro de la misma sesión, no solo la primera vez.
let categoriasFallaDeActivoId = null;

async function cargarCategoriasFalla(){
  if (!symptomGridItems || !activoActualId || categoriasFallaDeActivoId === activoActualId) return;
  const activo = ACTIVOS[activoActualId];
  if (!activo || !activo.id) return;
  try {
    const resp = await fetch('/api/fault-categories?asset_id=' + encodeURIComponent(activo.id));
    if (!resp.ok) return;
    const data = await resp.json().catch(() => null);
    const categorias = (data && data.categorias) || [];
    symptomGridItems.innerHTML = '';
    categoriasFallaDeActivoId = activoActualId;
    if (categorias.length === 0) return;

    categorias.forEach(categoria => {
      const tile = document.createElement('div');
      tile.className = 'symptom-tile';
      tile.innerHTML = `${SYMPTOM_ICONS[categoria.slug] || ICONO_GENERICO}<span></span>`;
      tile.querySelector('span').textContent = categoria.name;
      tile.addEventListener('click', () => {
        const query = SYMPTOM_QUERIES[categoria.slug] || `Tengo una falla en ${categoria.name.toLowerCase()}`;
        enviarPregunta(query, categoria.slug);
      });
      symptomGridItems.appendChild(tile);
    });
  } catch (err) {
    // Sin red: el grid queda vacío, pero el input de texto libre sigue
    // disponible — no es el único camino para preguntarle al asistente.
  }
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
