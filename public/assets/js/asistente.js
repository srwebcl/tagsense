'use strict';

// ================= ASISTENTE TÉCNICO — MOTOR LOCAL GROUNDED EN MANUAL MT65S =================
// Nota: responde con una base de conocimiento local (no llama a ningún servicio externo),
// para que funcione 100% offline en terreno y sin depender de una API key expuesta en el navegador.

import { hapticPulse, mostrarToast, escapeHtml, goTo } from './core.js';
import { openDocReader } from './documentos.js';

const EQUIPO_ACTUAL = 'Camión Minero MT65S';
const EQUIPO_ID = 'TS-CAEX-0000125';

const KB_MT65S = [
  {
    id: 'temp-motor',
    keywords: ['temperatura', 'motor', 'sobrecalent', 'caliente', 'termostato', 'refrigerante'],
    respuesta: `Si el motor del ${EQUIPO_ACTUAL} marca temperatura sobre 105°C:\n\n1. Detén el equipo en un lugar seguro, no apagues el motor de golpe.\n2. Deja el motor en ralentí 3-5 min antes de apagar (evita choque térmico en el turbo).\n3. Revisa nivel de refrigerante SOLO con el motor frío.\n4. Verifica que el radiador no tenga obstrucción de material particulado (común en Rajo Sur).\n\nSi el nivel está bajo o hay fuga visible, no vuelvas a operar — genera un AST y solicita el repuesto correspondiente.`,
    seccion: 'Manual MT65S — Sección 4.2, Sistema de refrigeración'
  },
  {
    id: 'frenos',
    keywords: ['freno', 'frenos', 'pastilla', 'pastillas', 'frenar', 'disco'],
    respuesta: `Para el sistema de frenos del ${EQUIPO_ACTUAL}:\n\n• Torque de pernos de caliper: 180-210 Nm.\n• Espesor mínimo de pastilla antes de reemplazo: 8mm.\n• Si sientes vibración al frenar, probable disco alabeado — no es solo pastilla.\n\nRecuerda: las pastillas de freno (RP-0456) figuran con bajo stock en bodega — si detectas desgaste, repórtalo en tu informe ahora para no quedar detenido después.`,
    seccion: 'Manual MT65S — Sección 7.1, Sistema de frenos'
  },
  {
    id: 'direccion',
    keywords: ['direccion', 'volante', 'no gira', 'dirige', 'dirección'],
    respuesta: `Sistema de dirección hidráulica del ${EQUIPO_ACTUAL}:\n\n• La dirección comparte circuito hidráulico con el sistema de volteo — si la dirección está dura, revisa primero nivel de aceite hidráulico y filtro de succión.\n• Ruido al girar en vacío suele indicar aire en el circuito, no falla de bomba.\n• Si el volante vibra a velocidad, revisa alineación antes de intervenir la dirección.\n\nSi la dirección no responde en absoluto, detén el equipo — no es seguro operar sin dirección confiable.`,
    seccion: 'Manual MT65S — Sección 6.4, Sistema hidráulico (dirección y volteo)'
  },
  {
    id: 'ejes',
    keywords: ['eje', 'ejes', 'mando final', 'mandos finales', 'diferencial'],
    respuesta: `Ejes y mandos finales del ${EQUIPO_ACTUAL}:\n\n• Ruido metálico constante en marcha suele originarse en el mando final, no en el diferencial.\n• Revisa nivel de aceite de mandos finales en cada mantención de 500h (mismo intervalo que motor).\n• Fuga de aceite visible en el cubo de rueda es señal de sello de mando final dañado — no operar hasta reponer.\n\nSi detectas juego excesivo en la rueda, no continúes operando: riesgo de falla estructural del eje.`,
    seccion: 'Manual MT65S — Sección 8.2, Ejes y mandos finales'
  },
  {
    id: 'neumaticos',
    keywords: ['neumatico', 'neumaticos', 'llanta', 'llantas', 'presion', 'rueda', 'desgaste'],
    respuesta: `Neumáticos del ${EQUIPO_ACTUAL} (26.5R25):\n\n• Presión recomendada en carga: 620-650 kPa.\n• Revisa desgaste irregular — puede indicar problema de alineación o suspensión, no solo del neumático.\n• El repuesto RP-0789 (neumático 26.5R25) figura SIN STOCK actualmente — si detectas uno crítico, repórtalo como severidad alta en tu informe.`,
    seccion: 'Manual MT65S — Sección 9.3, Neumáticos y llantas'
  },
  {
    id: 'hidraulico',
    keywords: ['hidraulico', 'hidraulica', 'tolva', 'volteo', 'cilindro', 'no levanta', 'no sube'],
    respuesta: `Sistema hidráulico de volteo (tolva) del ${EQUIPO_ACTUAL}:\n\n1. Verifica nivel de aceite hidráulico con tolva abajo y motor apagado.\n2. Si la tolva sube lento o no sube: revisa filtro de succión antes de sospechar de la bomba.\n3. Ruido metálico al levantar: posible desgaste en bujes del cilindro principal.\n\nSi el problema persiste tras revisar filtro y nivel, detén el equipo — no fuerces el sistema hidráulico en falla, riesgo de daño mayor.`,
    seccion: 'Manual MT65S — Sección 6.4, Sistema hidráulico de volteo'
  },
  {
    id: 'aceite-filtros',
    keywords: ['aceite', 'lubricacion', 'filtro', 'filtros', 'cambio de aceite'],
    respuesta: `Mantenimiento de lubricación del ${EQUIPO_ACTUAL}:\n\n• Cambio de aceite de motor: cada 500h de horómetro.\n• Filtro de aceite (RP-0231) y filtro de aire (RP-0198) — ambos con stock disponible en bodega.\n• Horómetro actual del equipo: 8.745h — según ese registro, próximo cambio programado cerca de las 9.000h.`,
    seccion: 'Manual MT65S — Sección 3.5, Plan de lubricación'
  },
  {
    id: 'codigo-error',
    keywords: ['codigo', 'error', 'e-04', 'e04', 'falla electrica', 'luz', 'testigo', 'alerta'],
    respuesta: `Códigos de falla comunes en el panel del ${EQUIPO_ACTUAL}:\n\n• E-02 — Baja presión de aceite. Detener de inmediato.\n• E-04 — Sobretemperatura de motor. Reducir carga y detener en lugar seguro.\n• E-07 — Falla en sensor de presión hidráulica.\n\nSi el código persiste después de reiniciar el equipo (apagar 30seg y encender), no continúes operando — reporta el hallazgo con foto del panel.`,
    seccion: 'Manual MT65S — Sección 11, Diagnóstico de códigos de falla'
  },
  {
    id: 'bateria-electrico',
    keywords: ['bateria', 'electrico', 'no enciende', 'no parte', 'arranque'],
    respuesta: `Si el ${EQUIPO_ACTUAL} no enciende:\n\n1. Verifica desconectador de batería (a veces queda abierto tras un LOTO).\n2. Revisa bornes de batería — corrosión es causa frecuente en ambiente de mina.\n3. Si hay clic pero no arranca, probable falla de motor de arranque, no de batería.\n\nSi acabas de hacer un procedimiento de bloqueo (LOTO), confirma que todas las tarjetas y candados fueron retirados correctamente.`,
    seccion: 'Manual MT65S — Sección 5.1, Sistema eléctrico y arranque'
  },
  {
    id: 'loto-bloqueo',
    keywords: ['loto', 'bloqueo', 'candado', 'tarjeta', 'ast', 'procedimiento'],
    respuesta: `Para el procedimiento LOTO del ${EQUIPO_ACTUAL}:\n\n1. Notifica al supervisor de turno antes de iniciar.\n2. Coloca candado personal + tarjeta en el desconectador de batería y en la llave de corte hidráulico.\n3. Verifica energía cero: intenta encender el equipo, debe fallar.\n4. Solo entonces comienza la intervención.\n\nNunca uses el candado de otra persona ni retires una tarjeta que no colocaste tú.`,
    seccion: 'Manual MT65S — Sección 2, Procedimientos de bloqueo (LOTO)'
  },
  {
    id: 'suspension',
    keywords: ['suspension', 'amortiguador', 'vibra', 'vibracion', 'bota'],
    respuesta: `Suspensión del ${EQUIPO_ACTUAL}:\n\n• Vibración excesiva en marcha vacía suele ser desalineación o neumático desbalanceado, no siempre suspensión.\n• Si el equipo "bota" con carga, revisa presión de los cilindros de suspensión delantera (rango normal: 5.5-6.2 MPa en vacío).\n\nSi hay fuga de aceite visible en algún cilindro de suspensión, repórtalo — no es solo estético, compromete la geometría de manejo.`,
    seccion: 'Manual MT65S — Sección 8, Sistema de suspensión'
  },
  {
    id: 'torque-general',
    keywords: ['torque', 'perno', 'pernos', 'apriete', 'ajuste'],
    respuesta: `Torques de referencia del ${EQUIPO_ACTUAL} (valores generales, confirma en la sección específica del componente):\n\n• Pernos de rueda: 650-700 Nm.\n• Pernos de caliper de freno: 180-210 Nm.\n• Pernos de tapa de motor: 45-55 Nm.\n\nSiempre usa llave torquímetra calibrada — un perno mal apretado en rueda es causa de incidentes graves.`,
    seccion: 'Manual MT65S — Anexo A, Tabla de torques'
  },
];

const KB_FALLBACK = `No tengo información específica sobre eso en el manual del ${EQUIPO_ACTUAL} que tengo cargado. Puedes reformular la pregunta, o si es una falla que ya identificaste, te recomiendo escalarla directamente al supervisor de turno.`;

function normalizarTexto(t){
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buscarRespuesta(pregunta){
  const q = normalizarTexto(pregunta);
  let mejor = null, mejorScore = 0;
  KB_MT65S.forEach(entry => {
    let score = 0;
    entry.keywords.forEach(kw => { if (q.includes(kw)) score++; });
    if (score > mejorScore) { mejorScore = score; mejor = entry; }
  });
  if (mejor && mejorScore > 0) return mejor;
  return null;
}

const chatMessages = document.getElementById('chat-messages');
const chatSuggestions = document.getElementById('chat-suggestions');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

const BOT_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2 8 8H4l2 4-2 4h4l4 6 4-6h4l-2-4 2-4h-4l-4-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const SOURCE_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

const SUGERENCIAS_INICIALES = [
  '¿Cómo reviso la temperatura del motor?',
  'Torque de pernos de freno',
  'Código de error E-04',
  'Presión de neumáticos',
];

let chatInitialized = false;
// Se incrementa cada vez que se limpia el chat (iniciarChatNuevo) — la respuesta
// demorada de enviarPregunta() guarda con qué generación arrancó y, si ya cambió
// cuando el setTimeout dispara, no se pega una respuesta vieja a la conversación
// nueva (pasaba si el técnico tocaba "+ Nuevo" mientras el bot seguía "escribiendo").
let chatGeneracion = 0;

export function initChat(){
  if (chatInitialized) { chatMessages.scrollTop = chatMessages.scrollHeight; return; }
  chatInitialized = true;
  appendBotBubble(
    `Hola, soy el asistente técnico de TAGSENSE. Tengo cargado el manual del ${EQUIPO_ACTUAL} (${EQUIPO_ID}). Toca un sistema si tienes una falla, o pregúntame directamente.`
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

function appendBotBubble(texto, seccion){
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot';
  const sourceHtml = seccion
    ? `<div class="source-tag">${SOURCE_ICON_SVG}${seccion}</div>`
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
  mensaje += `Equipo: ${EQUIPO_ACTUAL} (${EQUIPO_ID})\n\n`;
  mensaje += `Resumen de la conversación:\n${historialTexto}\n\n`;
  mensaje += `El técnico solicita apoyo de supervisor.`;
  const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(mensaje);
  window.open(url, '_blank');
}

function enviarPregunta(texto){
  const limpio = texto.trim();
  if (!limpio) return;
  document.getElementById('symptom-grid').classList.add('hidden');
  appendUserBubble(limpio);
  chatSuggestions.innerHTML = '';
  chatInput.value = '';
  chatSendBtn.disabled = true;
  hapticPulse();

  showTyping();
  const demoraMs = 550 + Math.random() * 500;
  const generacionAlEnviar = chatGeneracion;
  setTimeout(() => {
    // El chat se reinició (botón "+ Nuevo") mientras esta respuesta estaba
    // "escribiendo" — no la pegamos a la conversación nueva.
    if (chatGeneracion !== generacionAlEnviar) return;
    hideTyping();
    const match = buscarRespuesta(limpio);
    if (match) {
      appendBotBubble(match.respuesta, match.seccion);
    } else {
      appendBotBubble(KB_FALLBACK);
      appendEscalateChip();
    }
    // Sugerencias de seguimiento
    renderSuggestions(['Torque de pernos', 'Código de error E-04', 'Escalar a supervisor'].filter(s => s !== limpio));
  }, demoraMs);
}

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

// ---- Árbol de diagnóstico guiado (síntoma → sistema → componente → checklist) ----
const DIAGNOSTIC_TREE = {
  hidraulico: {
    pregunta: '¿En qué sistema?',
    opciones: [
      { key: 'tolva', label: 'Levante Tolva', opciones: [
          { key: 'flexible', label: 'Flexible hidráulico', seccion: 'hidráulico de volteo', checklist: [
              'Conexión superior', 'Conexión inferior', 'Abrasión', 'Presión nominal', 'Torque',
            ]},
          { key: 'cilindro', label: 'Cilindro', seccion: 'hidráulico de volteo', checklist: [
              'Fuga en vástago', 'Rayado en camisa', 'Fijación de pasadores', 'Nivel de aceite del sistema', 'Recorrido completo sin trabas',
            ]},
          { key: 'valvula', label: 'Válvula', seccion: 'hidráulico de volteo', checklist: [
              'Fuga externa en cuerpo', 'Accionamiento manual de emergencia', 'Presión de alivio calibrada', 'Conexiones eléctricas (si es proporcional)', 'Filtro piloto limpio',
            ]},
          { key: 'conexion', label: 'Conexión', seccion: 'hidráulico de volteo', checklist: [
              'Apriete de unión', 'Estado de o-ring / sello', 'Alineación de rosca', 'Corrosión visible', 'Torque según manual',
            ]},
        ]},
      { key: 'direccion', label: 'Dirección', seccion: 'hidráulico de volteo', checklist: [
          'Nivel de aceite hidráulico', 'Presión de la bomba', 'Fuga en manguera de dirección', 'Juego en el volante', 'Ruido al girar en vacío',
        ]},
      { key: 'frenos', label: 'Frenos', seccion: 'frenos', checklist: [
          'Nivel de fluido del circuito', 'Fuga en línea de freno', 'Presión de frenado', 'Pedal esponjoso', 'Purga de aire pendiente',
        ]},
      { key: 'otro', label: 'Otro', fallback: true },
    ],
  },
  frenos: {
    pregunta: '¿Qué tipo de freno?',
    opciones: [
      { key: 'servicio', label: 'Frenos de Servicio', opciones: [
          { key: 'pastillas', label: 'Pastillas', seccion: 'frenos', checklist: [
              'Espesor mínimo (8mm)', 'Desgaste irregular', 'Ruido metálico al frenar', 'Contaminación con aceite', 'Estado del sensor de desgaste',
            ]},
          { key: 'disco', label: 'Disco', seccion: 'frenos', checklist: [
              'Rayado profundo', 'Alabeo (vibración al frenar)', 'Espesor mínimo', 'Sobrecalentamiento visible', 'Grietas superficiales',
            ]},
        ]},
      { key: 'sahr', label: 'Frenos SAHR', opciones: [
          { key: 'acumulador', label: 'Acumulador', seccion: 'frenos', checklist: [
              'Presión de precarga de nitrógeno', 'Fuga de aceite', 'Tiempo de respuesta al aplicar', 'Corrosión en carcasa', 'Fijación al chasis',
            ]},
          { key: 'liberacion', label: 'Válvula de liberación', seccion: 'frenos', checklist: [
              'Fuga hidráulica', 'Accionamiento manual de emergencia', 'Presión mínima de liberación', 'Conexión eléctrica del solenoide', 'Filtro de línea piloto',
            ]},
        ]},
      { key: 'otro', label: 'Otro', fallback: true },
    ],
  },
  direccion: {
    pregunta: '¿Qué tipo de problema de dirección?',
    opciones: [
      { key: 'dura', label: 'Dirección dura', opciones: [
          { key: 'bomba', label: 'Bomba', seccion: 'hidráulico de volteo', checklist: [
              'Nivel de aceite hidráulico', 'Fuga en sello de bomba', 'Ruido de cavitación', 'Presión de salida', 'Estado de correa / acople',
            ]},
          { key: 'valvula-orbital', label: 'Válvula orbital', seccion: 'hidráulico de volteo', checklist: [
              'Fuga externa', 'Centrado de válvula', 'Conexión a columna de dirección', 'Desgaste interno', 'Ruido al girar',
            ]},
        ]},
      { key: 'ruido-direccion', label: 'Ruido al girar', opciones: [
          { key: 'cilindro-direccion', label: 'Cilindro de dirección', seccion: 'hidráulico de volteo', checklist: [
              'Fuga en vástago', 'Rayado en camisa', 'Fijación de rótulas', 'Juego en pasadores', 'Aire en el circuito',
            ]},
          { key: 'rotulas', label: 'Rótulas', seccion: 'hidráulico de volteo', checklist: [
              'Juego mecánico', 'Estado de guardapolvo', 'Lubricación', 'Corrosión', 'Fijación al eje',
            ]},
        ]},
      { key: 'vibracion', label: 'Vibración en el volante', seccion: 'hidráulico de volteo', checklist: [
          'Alineación de neumáticos', 'Balanceo de rueda', 'Presión de neumáticos', 'Desgaste irregular', 'Juego en columna de dirección',
        ]},
      { key: 'otro', label: 'Otro', fallback: true },
    ],
  },
  electrico: {
    pregunta: '¿Qué está fallando?',
    opciones: [
      { key: 'no-enciende', label: 'No enciende', opciones: [
          { key: 'bateria', label: 'Batería', seccion: 'eléctrico', checklist: [
              'Voltaje de batería', 'Bornes con corrosión', 'Fijación de terminales', 'Nivel de electrolito', 'Estado de carga',
            ]},
          { key: 'arranque', label: 'Motor de arranque', seccion: 'eléctrico', checklist: [
              'Clic al girar la llave', 'Conexión de cable positivo', 'Solenoide de arranque', 'Engranaje de bendix', 'Masa a chasis',
            ]},
        ]},
      { key: 'panel', label: 'Testigo o alerta en panel', seccion: 'diagnóstico de códigos', checklist: [
          'Código de falla mostrado', 'Reinicio del equipo (30 seg)', 'Persistencia tras reinicio', 'Fotografía del panel', 'Reportar en el Informe',
        ]},
      { key: 'corte', label: 'Corte de energía en marcha', opciones: [
          { key: 'fusible', label: 'Fusible / breaker', seccion: 'eléctrico', checklist: [
              'Fusible quemado', 'Breaker disparado', 'Continuidad del circuito', 'Sobrecarga reciente', 'Conexión floja',
            ]},
          { key: 'alternador', label: 'Alternador', seccion: 'eléctrico', checklist: [
              'Voltaje de carga', 'Correa del alternador', 'Ruido anormal', 'Conexiones eléctricas', 'Testigo de carga en panel',
            ]},
        ]},
      { key: 'otro', label: 'Otro', fallback: true },
    ],
  },
  ejes: {
    pregunta: '¿Dónde nota el problema?',
    opciones: [
      { key: 'ruido-eje', label: 'Ruido en marcha', opciones: [
          { key: 'mando-final', label: 'Mando final', checklist: [
              'Nivel de aceite del mando', 'Fuga en sello de cubo', 'Ruido constante vs intermitente', 'Temperatura del cubo', 'Juego en la rueda',
            ]},
          { key: 'diferencial', label: 'Diferencial', checklist: [
              'Nivel de aceite', 'Fuga en retenes', 'Ruido al girar en curva', 'Vibración a velocidad', 'Juego axial',
            ]},
        ]},
      { key: 'fuga-eje', label: 'Fuga de aceite visible', checklist: [
          'Ubicación exacta de la fuga', 'Sello de mando final', 'Nivel de aceite restante', 'Manchas en el suelo', 'No operar hasta reponer',
        ]},
      { key: 'juego', label: 'Juego excesivo en rueda', checklist: [
          'Juego axial de la rueda', 'Rodamiento de cubo', 'Torque de pernos de rueda', 'Riesgo estructural', 'Detener el equipo',
        ]},
      { key: 'otro', label: 'Otro', fallback: true },
    ],
  },
  sensores: {
    pregunta: '¿Qué tipo de sensor está fallando?',
    opciones: [
      { key: 'sensor-presion', label: 'Sensor de presión', seccion: 'diagnóstico de códigos', checklist: [
          'Código de error asociado', 'Conexión y pines', 'Cableado dañado', 'Calibración pendiente', 'Reemplazo si persiste',
        ]},
      { key: 'sensor-temp', label: 'Sensor de temperatura', seccion: 'diagnóstico de códigos', checklist: [
          'Código de error asociado', 'Lectura errática vs fija', 'Conexión del sensor', 'Corrosión en el conector', 'Comparar con temperatura real',
        ]},
      { key: 'sensor-nivel', label: 'Sensor de nivel', seccion: 'diagnóstico de códigos', checklist: [
          'Lectura vs nivel real', 'Flotador atascado', 'Conexión eléctrica', 'Suciedad en el sensor', 'Código de error en panel',
        ]},
      { key: 'otro', label: 'Otro', fallback: true },
    ],
  },
  temperatura: {
    pregunta: '¿Cuándo ocurre la sobretemperatura?',
    opciones: [
      { key: 'carga', label: 'Bajo carga / cuesta arriba', seccion: 'refrigeración', checklist: [
          'Nivel de refrigerante', 'Obstrucción en radiador', 'Estado del termostato', 'Tensión de correa del ventilador', 'Carga de trabajo excesiva',
        ]},
      { key: 'ralenti', label: 'En ralentí', seccion: 'refrigeración', checklist: [
          'Ventilador eléctrico funcionando', 'Sensor de temperatura', 'Nivel de refrigerante', 'Fuga en sistema de refrigeración', 'Radiador con material particulado',
        ]},
      { key: 'constante', label: 'De forma constante', opciones: [
          { key: 'radiador', label: 'Radiador', seccion: 'refrigeración', checklist: [
              'Obstrucción por polvo / material', 'Fuga visible', 'Aletas dañadas', 'Tapa de presión', 'Flujo de aire',
            ]},
          { key: 'termostato', label: 'Termostato', seccion: 'refrigeración', checklist: [
              'Apertura a temperatura correcta', 'Atascado cerrado', 'Fuga en carcasa', 'Circulación de refrigerante', 'Reemplazo si falla',
            ]},
        ]},
      { key: 'otro', label: 'Otro', fallback: true },
    ],
  },
};

function renderOptionButtons(opciones){
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot';
  row.innerHTML = `<div class="option-btn-wrap" style="margin-left:34px;"></div>`;
  const wrap = row.querySelector('.option-btn-wrap');
  opciones.forEach(op => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.textContent = op.label;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
      seleccionarOpcionArbol(op);
    });
    wrap.appendChild(btn);
  });
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendChecklistBubble(items, seccionManual){
  const row = document.createElement('div');
  row.className = 'chat-bubble-row bot';
  const itemsHtml = items.map(i =>
    `<div class="checklist-line"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#177b57" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${escapeHtml(i)}</div>`
  ).join('');
  row.innerHTML = `
    <div class="chat-avatar-sm">${BOT_AVATAR_SVG}</div>
    <div class="chat-bubble">
      <div class="checklist-title">Revise primero:</div>
      ${itemsHtml}
      <button class="oem-proc-btn" type="button">
        Procedimiento OEM disponible
        <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  `;
  row.querySelector('.oem-proc-btn').addEventListener('click', () => {
    openDocReader('manual', seccionManual, 'documentos');
  });
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function seleccionarOpcionArbol(op){
  appendUserBubble(op.label);
  hapticPulse();
  showTyping();
  setTimeout(() => {
    hideTyping();
    if (op.opciones) {
      appendBotBubble('Seleccione el componente.');
      renderOptionButtons(op.opciones);
    } else if (op.checklist) {
      appendChecklistBubble(op.checklist, op.seccion);
    } else if (op.fallback) {
      appendBotBubble('Cuéntame con más detalle qué está pasando, o escribe tu consulta abajo.');
    }
  }, 500);
}

function iniciarArbolDiagnostico(arbolKey, opcionInicial){
  document.getElementById('symptom-grid').classList.add('hidden');
  const arbol = DIAGNOSTIC_TREE[arbolKey];
  const textoUsuario = opcionInicial === 'tolva' ? 'Tengo una falla en la tolva' : SYMPTOM_QUERIES[arbolKey];
  appendUserBubble(textoUsuario);
  hapticPulse();
  showTyping();
  setTimeout(() => {
    hideTyping();
    if (opcionInicial) {
      // Salta directo al nivel de componente para esa opción (ej. Tolva)
      const op = arbol.opciones.find(o => o.key === opcionInicial);
      appendBotBubble('Seleccione el componente.');
      renderOptionButtons(op.opciones);
    } else {
      appendBotBubble(arbol.pregunta);
      renderOptionButtons(arbol.opciones);
    }
  }, 500);
}

document.querySelectorAll('.symptom-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const key = tile.dataset.symptom;
    if (key === 'tolva') { iniciarArbolDiagnostico('hidraulico', 'tolva'); return; }
    if (DIAGNOSTIC_TREE[key]) { iniciarArbolDiagnostico(key); return; }
    const query = SYMPTOM_QUERIES[key];
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

document.querySelectorAll('.btn-asistente').forEach(btn => {
  btn.addEventListener('click', () => {
    goTo('step-asistente');
    initChat();
  });
});
document.getElementById('back-asistente').addEventListener('click', () => goTo('step-confirm-3'));
