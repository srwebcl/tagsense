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

async function enviarPregunta(texto){
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
      body: JSON.stringify({ asset_id: activo.id, message: limpio }),
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
// la respuesta real siempre sale de los documentos indexados de este activo,
// nunca de una base de conocimiento fija por aquí.
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

document.querySelectorAll('.symptom-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const query = SYMPTOM_QUERIES[tile.dataset.symptom];
    if (query) enviarPregunta(query);
  });
});

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
