'use strict';

const TRUCK_PHOTO = "assets/img/truck-mt65s.png";
document.querySelectorAll('img.truck-photo').forEach(img => img.src = TRUCK_PHOTO);

// ---- Navegación entre pantallas ----
// ================= REGISTRO DE ACTIVOS (multi-equipo) =================

const ACTIVOS = {
  "TS-CAEX-0000125": {
    nombre: "Camión Minero MT65S",
    serie: "CAT0MT65SFKY100123",
    anio: "2021",
    horometro: "8.745 h",
    ubicacion: "Mina Rajo Sur - Banco 12",
    estado: "Operativo",
    foto: null, // usa TRUCK_PHOTO (foto real ya existente)
  },
};

let activoActualId = "TS-CAEX-0000125";

function aplicarActivo(id){
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
  setText('c2-horometro', (typeof ultimoHorometro !== 'undefined' && ultimoHorometro[id]) || a.horometro);
  setText('c2-ubicacion', a.ubicacion);
  setText('c2-status-text', a.estado);

  setText('c3-nombre', a.nombre);
  setText('c3-id', 'ID: ' + id);
  setText('c3-status-text', a.estado);

  const banner = document.getElementById('ficha-status-banner');
  if (banner) {
    banner.classList.remove('stopped', 'maintenance');
    if (a.estado === 'Detenido') banner.classList.add('stopped');
    else if (a.estado === 'Mantención') banner.classList.add('maintenance');
  }
}

// ---- Apertura directa por tag NFC (URL con ?activo=ID) ----
// Cuando se graba un tag NFC físico con esta misma URL, Android la abre automáticamente
// al acercar el teléfono, sin pasar por login ni por el escaneo simulado.
function manejarAperturaPorNFC(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get('activo');
  if (id && ACTIVOS[id]) {
    sessionAuthenticated = true; // apertura directa por NFC no requiere login
    goTo('step-read');
    ejecutarLecturaNFC(2000, id, 'step-confirm-3');
    return true;
  }
  return false;
}

const steps = ['step-access','step-welcome','step-read','step-confirm-2','step-confirm-3','step-asistente','step-info-general','step-historial','step-documentos','step-repuestos','step-instructivos','step-solicitudes','step-doc-reader','step-informe','step-informe-preview'];

// ---- Alto real del viewport (evita espacios en blanco al navegar) ----
// En navegadores que no soportan la unidad dvh, recalculamos --vh a mano
// cada vez que cambia el alto visible (ej. al aparecer/ocultarse la barra de direcciones).
function actualizarAltoViewport(){
  const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
actualizarAltoViewport();
window.addEventListener('resize', actualizarAltoViewport);
window.addEventListener('orientationchange', actualizarAltoViewport);
if (window.visualViewport) window.visualViewport.addEventListener('resize', actualizarAltoViewport);

function goTo(id){
  actualizarAltoViewport();
  steps.forEach(s => {
    const el = document.getElementById(s);
    if(!el) return;
    if(s === id){
      el.classList.remove('hidden');
      el.classList.remove('step-fade');
      void el.offsetWidth; // reinicia animación
      el.classList.add('step-fade');
    } else {
      el.classList.add('hidden');
    }
  });

  const reportFab = document.getElementById('report-fab');
  if (reportFab) {
    const EQUIPMENT_CONTEXT_STEPS = [
      'step-confirm-2', 'step-confirm-3', 'step-asistente', 'step-info-general',
      'step-historial', 'step-documentos', 'step-repuestos', 'step-doc-reader',
      'step-instructivos', 'step-solicitudes'
    ];
    reportFab.classList.toggle('show', EQUIPMENT_CONTEXT_STEPS.includes(id));
    reportFab.classList.toggle('raised', id === 'step-asistente');
  }
}

// ---- Paso 1: acceso ----
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const pwToggle = document.getElementById('pw-toggle');
const accessBtn = document.getElementById('access-btn');
const welcomeName = document.getElementById('welcome-name');

pwToggle.addEventListener('click', () => {
  const showing = pwToggle.classList.toggle('showing');
  passwordInput.type = showing ? 'text' : 'password';
  pwToggle.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

function nombreDesdeCorreo(correo){
  if (!correo || !correo.includes('@')) return null;
  const usuario = correo.split('@')[0];
  return usuario
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// Credencial de acceso (modo demo): solo este correo y contraseña permiten ingresar.
const CREDENCIAL_VALIDA = { correo: 'gonzalo.quintriqueo@tagsense.cl', clave: '1234' };

accessBtn.addEventListener('click', () => {
  const correoIngresado = emailInput.value.trim().toLowerCase();
  const claveIngresada = passwordInput.value;
  const emailWrap = emailInput.closest('.input-wrap');
  const passWrap = passwordInput.closest('.input-wrap');
  const errorMsg = document.getElementById('login-error');

  const valido = correoIngresado === CREDENCIAL_VALIDA.correo && claveIngresada === CREDENCIAL_VALIDA.clave;

  if (!valido) {
    emailWrap.classList.add('invalid');
    passWrap.classList.add('invalid');
    errorMsg.classList.remove('hidden');
    hapticPulse();
    return;
  }

  emailWrap.classList.remove('invalid');
  passWrap.classList.remove('invalid');
  errorMsg.classList.add('hidden');

  const nombre = nombreDesdeCorreo(emailInput.value.trim());
  welcomeName.textContent = nombre || 'usuario';
  sessionAuthenticated = true;
  goTo('step-confirm-2');
});

[emailInput, passwordInput].forEach(input => {
  input.addEventListener('input', () => {
    input.closest('.input-wrap').classList.remove('invalid');
    document.getElementById('login-error').classList.add('hidden');
  });
});

// ---- Paso 3: modo lectura NFC ----
const nfcCircle = document.getElementById('nfc-circle');
const ringProgress = document.getElementById('ring-progress');
const nfcCheck = document.getElementById('nfc-check');
const nfcMainText = document.getElementById('nfc-main-text');

const LOCK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="1.6" stroke="#6f6d6a" stroke-width="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#6f6d6a" stroke-width="1.6"/></svg>';
const SPIN_ICON = '<svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-3-6.7" stroke="#b3a57e" stroke-width="2.2" stroke-linecap="round"/></svg>';

// ---- Feedback háptico y sonoro al detectar componente ----
function hapticPulse(){
  if (navigator.vibrate) { try { navigator.vibrate(50); } catch(e){} }
}
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

let readState = 'idle'; // idle | reading | found
let sessionAuthenticated = false; // true tras el primer login exitoso en esta sesión
const nfcCore = document.querySelector('.nfc-core');

function resetReadState(){
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

// ---- Selector de activo a simular (para probar sin tags NFC físicos aún) ----
let activoParaSimular = 'TS-CAEX-0000125';
document.querySelectorAll('.asset-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.asset-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    activoParaSimular = chip.dataset.activo;
  });
});

// ---- Secuencia de detección unificada (auto-inicio, radar, confirmación en verde) ----
// duracionMs: tiempo total de "lectura" antes de confirmar. Se usa tanto para el
// auto-inicio sin tocar (2s) como para el tap manual (instantáneo).
let autoLecturaTimer = null;
function ejecutarLecturaNFC(duracionMs, activoId, destinoFinal){
  if (readState !== 'idle') return;
  readState = 'reading';
  clearTimeout(autoLecturaTimer);
  nfcCore.classList.remove('pulsing');
  nfcCore.classList.add('active');
  nfcCircle.classList.add('reading');
  nfcMainText.textContent = 'Leyendo activo';
  ringProgress.style.transition = `stroke-dashoffset ${duracionMs}ms linear`;
  ringProgress.style.strokeDashoffset = '0';

  setTimeout(() => {
    readState = 'found';
    nfcCircle.classList.remove('reading');
    nfcCircle.classList.add('success');
    nfcCore.classList.add('success');
    ringProgress.classList.add('success');
    nfcCheck.classList.add('show', 'success');

    const id = activoId || activoParaSimular;
    const nombreEquipo = (ACTIVOS[id] && ACTIVOS[id].nombre) || 'Equipo';
    nfcMainText.textContent = nombreEquipo;
    detectionFeedback();
    aplicarActivo(id);

    setTimeout(() => {
      goTo(destinoFinal || (sessionAuthenticated ? 'step-confirm-2' : 'step-access'));
    }, 550);
  }, duracionMs);
}

nfcCircle.addEventListener('click', () => {
  // El círculo ya no simula una lectura falsa: un tap abre el escáner de cámara (QR),
  // que es el método universal disponible en cualquier dispositivo (ver skill nfc-qr-scanning).
  abrirEscanerQR();
});

// Arranca al entrar a Modo Lectura: si el navegador soporta NFC real (Web NFC / Chrome-Android)
// empieza a escuchar tags de inmediato; en cualquier caso, QR y código manual quedan siempre
// visibles — nunca se bloquea el flujo asumiendo que hay NFC disponible.
function iniciarAutoLecturaNFC(){
  clearTimeout(autoLecturaTimer);
  if (readState !== 'idle') return;
  iniciarModoLectura();
}

// ---- Navegación ficha técnica ----
document.getElementById('open-ficha-2').addEventListener('click', () => goTo('step-confirm-3'));
document.getElementById('back-to-read').addEventListener('click', () => {
  resetReadState();
  goTo('step-read');
  iniciarAutoLecturaNFC();
});

document.getElementById('tile-info-general').addEventListener('click', () => goTo('step-info-general'));
document.getElementById('back-to-ficha').addEventListener('click', () => goTo('step-confirm-3'));

document.getElementById('tile-historial').addEventListener('click', () => goTo('step-historial'));
document.getElementById('back-historial').addEventListener('click', () => goTo('step-confirm-3'));

document.getElementById('tile-documentos').addEventListener('click', () => goTo('step-documentos'));
document.getElementById('back-documentos').addEventListener('click', () => goTo('step-confirm-3'));

document.getElementById('tile-repuestos').addEventListener('click', () => { renderComponentes(); goTo('step-repuestos'); });
document.getElementById('back-repuestos').addEventListener('click', () => goTo('step-confirm-3'));

document.querySelectorAll('.btn-asistente').forEach(btn => {
  btn.addEventListener('click', () => {
    goTo('step-asistente');
    initChat();
  });
});
document.getElementById('back-asistente').addEventListener('click', () => goTo('step-confirm-3'));

// ================= ASISTENTE TÉCNICO — MOTOR LOCAL GROUNDED EN MANUAL MT65S =================
// Nota: responde con una base de conocimiento local (no llama a ningún servicio externo),
// para que funcione 100% offline en terreno y sin depender de una API key expuesta en el navegador.
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

function initChat(){
  if (chatInitialized) { chatMessages.scrollTop = chatMessages.scrollHeight; return; }
  chatInitialized = true;
  appendBotBubble(
    `Hola, soy el asistente técnico de TAGSENSE. Tengo cargado el manual del ${EQUIPO_ACTUAL} (${EQUIPO_ID}). Toca un sistema si tienes una falla, o pregúntame directamente.`
  );
}

function iniciarChatNuevo(){
  chatMessages.innerHTML = '';
  chatSuggestions.innerHTML = '';
  chatInput.value = '';
  chatSendBtn.disabled = true;
  document.getElementById('symptom-grid').classList.remove('hidden');
  chatInitialized = false;
  initChat();
  hapticPulse();
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
  setTimeout(() => {
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
    docReaderOrigen = 'documentos';
    openDocReader('manual', seccionManual);
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


// ---- Toggle de tema claro/oscuro ----
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('theme-light');
});

// ---- Toggle de modo terreno (alto contraste) ----
const fieldToggle = document.getElementById('field-toggle');
fieldToggle.addEventListener('click', () => {
  document.body.classList.toggle('field-mode');
  fieldToggle.classList.toggle('active');
});

// ---- Última sincronización ----
let lastSyncTime = Date.now();
function formatSyncLabel(){
  const label = document.getElementById('ficha-sync-label');
  if (!label) return;
  const mins = Math.floor((Date.now() - lastSyncTime) / 60000);
  let text;
  if (mins < 1) text = 'Sincronizado hace un momento';
  else if (mins === 1) text = 'Sincronizado hace 1 min';
  else text = `Sincronizado hace ${mins} min`;
  const svg = label.querySelector('svg');
  label.textContent = text;
  if (svg) label.prepend(svg);
}
formatSyncLabel();
setInterval(formatSyncLabel, 30000);

// ---- Swipe entre pestañas de Accesos Rápidos ----
const SWIPE_TABS = ['step-info-general', 'step-historial', 'step-documentos', 'step-repuestos'];
let swipeStartX = 0, swipeStartY = 0;
const panelEl = document.querySelector('.panel');

panelEl.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  swipeStartX = t.clientX;
  swipeStartY = t.clientY;
}, { passive: true });

panelEl.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeStartX;
  const dy = t.clientY - swipeStartY;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

  const activeStage = SWIPE_TABS.find(s => {
    const el = document.getElementById(s);
    return el && !el.classList.contains('hidden');
  });
  const idx = SWIPE_TABS.indexOf(activeStage);
  if (idx === -1) return;

  if (dx < 0 && idx < SWIPE_TABS.length - 1) {
    goTo(SWIPE_TABS[idx + 1]);
  } else if (dx > 0 && idx > 0) {
    goTo(SWIPE_TABS[idx - 1]);
  }
}, { passive: true });

// ---- Pull-to-refresh en Historial ----
const historialStage = document.getElementById('step-historial');
const ptrIndicator = document.getElementById('ptr-indicator');
const ptrText = document.getElementById('ptr-text');
let ptrStartY = 0, ptrPulling = false, ptrReady = false;

historialStage.addEventListener('touchstart', (e) => {
  if (window.scrollY > 0) { ptrPulling = false; return; }
  ptrStartY = e.touches[0].clientY;
  ptrPulling = true;
  ptrReady = false;
}, { passive: true });

historialStage.addEventListener('touchmove', (e) => {
  if (!ptrPulling) return;
  const dy = e.touches[0].clientY - ptrStartY;
  if (dy > 55) {
    ptrReady = true;
    ptrText.textContent = 'Suelta para sincronizar';
    ptrIndicator.classList.add('show');
  } else if (dy <= 0) {
    ptrPulling = false;
    ptrIndicator.classList.remove('show');
  }
}, { passive: true });

historialStage.addEventListener('touchend', () => {
  if (!ptrPulling) return;
  ptrPulling = false;
  if (ptrReady) {
    ptrIndicator.classList.add('spinning');
    ptrText.textContent = 'Sincronizando...';
    setTimeout(() => {
      ptrIndicator.classList.remove('spinning');
      ptrText.textContent = '✓ Actualizado';
      lastSyncTime = Date.now();
      formatSyncLabel();
      setTimeout(() => {
        ptrIndicator.classList.remove('show');
      }, 900);
    }, 900);
  } else {
    ptrIndicator.classList.remove('show');
  }
});

// ================= LECTOR DE DOCUMENTOS =================
const DOC_DATA = {"manual": {"titulo": "Manual Técnico", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Rev. 3 · Actualizado 10/01/2024", "sections": [{"h": "1. Introducción y datos generales", "p": ["Este manual técnico corresponde al Camión Minero MT65S, equipo de acarreo pesado utilizado en las operaciones de Mina Rajo Sur, Banco 12, bajo la propiedad de Minera Andina S.A.", "El equipo está identificado en TAGSENSE bajo el ID TS-CAEX-0000125, con número de serie CAT0MT65SFKY100123, año de fabricación 2021."], "table": [["Especificación", "Valor"], ["Peso operacional", "62.000 kg"], ["Capacidad de carga", "65 toneladas"], ["Motor", "Diésel, 390 kW (523 HP)"], ["Horómetro de referencia", "8.745 h"]]}, {"h": "2. Procedimientos de bloqueo (LOTO)", "p": ["Antes de cualquier intervención mecánica o eléctrica en el MT65S, debe ejecutarse el procedimiento de bloqueo y etiquetado (LOTO):"], "list": ["Notificar al supervisor de turno antes de iniciar la intervención.", "Colocar candado personal y tarjeta en el desconectador de batería y en la llave de corte hidráulico.", "Verificar energía cero: intentar encender el equipo; debe fallar.", "Solo entonces iniciar la intervención sobre el equipo."], "note": "Nunca usar el candado de otra persona ni retirar una tarjeta que no fue colocada por uno mismo."}, {"h": "3. Plan de lubricación", "p": ["El cambio de aceite de motor debe realizarse cada 500 horas de horómetro. Los filtros asociados (aceite y aire) deben inspeccionarse en cada mantención programada."], "table": [["Componente", "Código", "Intervalo"], ["Filtro de aceite de motor", "RP-0231", "Cada 500h"], ["Filtro de aire", "RP-0198", "Cada 500h / según indicador de restricción"], ["Aceite de motor", "—", "Cada 500h"]]}, {"h": "4. Sistema de refrigeración", "p": ["Temperatura de operación normal: hasta 100°C. Sobre 105°C se considera sobretemperatura.", "Ante una alerta de sobretemperatura: detener el equipo en un lugar seguro sin apagar el motor de inmediato, dejarlo en ralentí de 3 a 5 minutos antes de apagar (evita choque térmico en el turbo), y revisar el nivel de refrigerante solo con el motor frío.", "Verificar que el radiador no presente obstrucción por material particulado, condición frecuente en las operaciones de Rajo Sur."]}, {"h": "5. Sistema eléctrico y arranque", "p": ["Si el equipo no enciende, verificar en este orden: 1) desconectador de batería (puede quedar abierto tras un LOTO), 2) bornes de batería por corrosión, condición frecuente en ambiente de mina, 3) motor de arranque si hay clic pero no arranca."]}, {"h": "6. Sistema hidráulico de volteo", "p": ["El sistema de volteo de tolva opera con una bomba hidráulica de engranajes (caudal nominal 85 L/min) y un cilindro de volteo telescópico con carrera de 1.850 mm.", "Presión máxima de sistema: 210 bar. Presión de trabajo normal: 180-195 bar.", "Antes de operar, verificar el nivel de aceite hidráulico con la tolva abajo y el motor apagado. Si la tolva sube lenta o no sube, revisar primero el filtro de succión antes de sospechar de la bomba.", "Ver diagrama completo del circuito en el documento «Plano Hidráulico» de esta ficha."]}, {"h": "7. Sistema de frenos", "p": ["Torque de pernos de caliper: 180-210 Nm. Espesor mínimo de pastilla antes de reemplazo: 8mm.", "Vibración al frenar sugiere disco alabeado, no únicamente desgaste de pastilla."], "table": [["Componente", "Código", "Estado stock"], ["Pastillas de freno", "RP-0456", "Bajo stock"]]}, {"h": "8. Sistema de suspensión", "p": ["Rango normal de presión de cilindros de suspensión delantera en vacío: 5,5-6,2 MPa.", "Vibración excesiva en marcha vacía suele deberse a desalineación o neumático desbalanceado, no siempre a la suspensión. Fuga visible de aceite en un cilindro de suspensión debe reportarse: compromete la geometría de manejo."]}, {"h": "9. Neumáticos y llantas", "p": ["Medida: 26.5R25. Presión recomendada en carga: 620-650 kPa.", "Desgaste irregular puede indicar problema de alineación o de suspensión, no solo del neumático."], "table": [["Componente", "Código", "Estado stock"], ["Neumático 26.5R25", "RP-0789", "Sin stock"]]}, {"h": "10. Diagnóstico de códigos de falla", "table": [["Código", "Descripción", "Acción"], ["E-02", "Baja presión de aceite", "Detener el equipo de inmediato"], ["E-04", "Sobretemperatura de motor", "Reducir carga y detener en lugar seguro"], ["E-07", "Falla en sensor de presión hidráulica", "Reportar; no operar el sistema de volteo"]], "note": "Si un código persiste tras reiniciar el equipo (apagar 30 segundos y encender), no continuar operando. Reportar el hallazgo con fotografía del panel."}, {"h": "Anexo A — Tabla de torques", "table": [["Elemento", "Torque"], ["Pernos de rueda", "650-700 Nm"], ["Pernos de caliper de freno", "180-210 Nm"], ["Pernos de tapa de motor", "45-55 Nm"]], "note": "Usar siempre llave torquímetra calibrada. Un perno mal apretado en rueda es causa de incidentes graves."}]}, "garantia": {"titulo": "Certificado de Garantía", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Vigente hasta 12/2026", "sections": [{"h": "Datos del equipo", "table": [["Modelo", "MT65S"], ["Número de serie", "CAT0MT65SFKY100123"], ["Año de fabricación", "2021"], ["Propietario", "Minera Andina S.A."], ["Fecha de entrega", "15/03/2021"], ["Vigencia de garantía", "Hasta 12/2026"]]}, {"h": "Cobertura de garantía", "p": ["El fabricante garantiza el Camión Minero MT65S contra defectos de material y fabricación, bajo las siguientes coberturas y plazos contados desde la fecha de entrega:"], "table": [["Sistema", "Cobertura"], ["Motor", "5 años o 15.000 horas, lo que ocurra primero"], ["Transmisión", "5 años o 15.000 horas, lo que ocurra primero"], ["Sistema hidráulico de volteo", "3 años o 10.000 horas, lo que ocurra primero"], ["Estructura de chasis y tolva", "7 años, sin límite de horas"], ["Sistema eléctrico y electrónico", "2 años o 6.000 horas, lo que ocurra primero"]]}, {"h": "Exclusiones", "p": ["Esta garantía no cubre:"], "list": ["Desgaste normal de piezas de fricción (pastillas de freno, neumáticos, filtros).", "Daños derivados de uso indebido, sobrecarga o negligencia operacional.", "Modificaciones o reparaciones realizadas por talleres no autorizados por el fabricante.", "Falta de cumplimiento del plan de mantención preventiva establecido en el Manual Técnico.", "Uso de repuestos no originales en sistemas críticos (motor, transmisión, sistema hidráulico)."]}, {"h": "Condiciones para mantener la validez de la garantía", "list": ["Realizar todas las mantenciones preventivas en los intervalos indicados en el Manual Técnico MT65S.", "Utilizar exclusivamente repuestos originales o autorizados por el fabricante.", "Mantener registro actualizado de horómetro y mantenciones en TAGSENSE.", "Reportar cualquier falla relevante dentro de las 48 horas siguientes a su detección."]}, {"h": "Procedimiento para reclamos de garantía", "p": ["Ante una falla cubierta por esta garantía, contactar al proveedor autorizado adjuntando: identificación del equipo (ID TAGSENSE), horómetro al momento de la falla, descripción del hallazgo y evidencia fotográfica.", "El proveedor dispone de 5 días hábiles para realizar la evaluación técnica y confirmar la cobertura."]}, {"h": "Vigencia", "p": ["Este certificado es válido hasta diciembre de 2026, sujeto al cumplimiento de las condiciones descritas en este documento."]}]}, "ast": {"titulo": "AST — Análisis de Seguridad del Trabajo", "subtitulo": "Cambio de Filtros", "meta": "Camión Minero MT65S · TS-CAEX-0000125 · 12/05/2024", "sections": [{"h": "Datos generales de la tarea", "table": [["Tarea", "Cambio de filtros (aceite y aire)"], ["Equipo", "Camión Minero MT65S — TS-CAEX-0000125"], ["Ubicación", "Mina Rajo Sur - Banco 12"], ["Fecha", "12/05/2024"], ["Responsable", "Técnico de mantenimiento asignado"], ["Duración estimada", "45 minutos"]]}, {"h": "Equipo de Protección Personal (EPP) requerido", "list": ["Casco con barbiquejo", "Lentes de seguridad", "Guantes de nitrilo resistentes a hidrocarburos", "Zapatos de seguridad con puntera de acero", "Ropa de trabajo manga larga", "Protección auditiva (zona de alto ruido)"]}, {"h": "Pasos de la tarea, peligros y medidas de control", "table": [["N°", "Paso", "Peligro asociado", "Medida de control"], ["1", "Aplicar procedimiento LOTO", "Arranque accidental del motor", "Candado y tarjeta personal en desconectador de batería; verificar energía cero"], ["2", "Dejar enfriar el motor", "Quemaduras por contacto con superficies calientes", "Esperar mínimo 15 min tras el apagado antes de manipular filtros"], ["3", "Retirar filtro de aceite usado", "Contacto con aceite caliente / derrame", "Usar guantes, posicionar bandeja de contención"], ["4", "Retirar filtro de aire usado", "Inhalación de material particulado", "Usar mascarilla, realizar la tarea en zona ventilada"], ["5", "Instalar filtros nuevos (RP-0231 / RP-0198)", "Instalación incorrecta, fugas posteriores", "Verificar torque y sello según Manual Técnico Sección 3.5"], ["6", "Disponer filtros usados", "Contaminación ambiental", "Depositar en contenedor de residuos peligrosos designado"], ["7", "Retirar bloqueo LOTO y probar equipo", "Arranque con personal cerca del equipo", "Verificar zona despejada antes de retirar candado y encender"]]}, {"h": "Aprobación", "p": ["Este AST debe ser revisado y firmado por el técnico ejecutor y el supervisor de turno antes de iniciar la tarea."], "table": [["Rol", "Nombre", "Firma"], ["Técnico ejecutor", "_______________________", "_______________"], ["Supervisor de turno", "_______________________", "_______________"]]}]}, "plano": {"titulo": "Plano Hidráulico", "subtitulo": "Sistema de Volteo — Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Mayo 2023", "sections": [{"h": "Descripción general", "p": ["El sistema hidráulico de volteo del MT65S permite el levante y descenso controlado de la tolva mediante un circuito cerrado compuesto por seis componentes principales."]}, {"img": "plano_hidraulico.png"}, {"h": "Leyenda de componentes", "table": [["N°", "Componente", "Especificación"], ["1", "Estanque de aceite hidráulico", "Capacidad 180 L, aceite ISO VG 46"], ["2", "Bomba hidráulica de engranajes", "Caudal nominal 85 L/min"], ["3", "Válvula direccional 4/3 vías", "Control de subida / retención / bajada de tolva"], ["4", "Cilindro de volteo telescópico", "Carrera 1.850 mm, presión máx. 210 bar"], ["5", "Filtro de retorno", "Elemento de 10 micrones, reemplazo cada 500h"], ["6", "Manguera de alta presión", "Clasificación SAE 100R2, revisión visual diaria"]]}, {"h": "Especificaciones de presión", "table": [["Parámetro", "Valor"], ["Presión máxima de sistema", "210 bar"], ["Presión de trabajo normal", "180-195 bar"]]}, {"h": "Procedimiento básico de revisión de nivel", "list": ["Posicionar la tolva completamente abajo y apagar el motor.", "Esperar a que el sistema se estabilice (sin presión residual).", "Verificar el nivel de aceite en la mirilla del estanque (componente 1).", "Si el nivel está bajo, no operar el sistema hasta reponer y verificar fugas visibles en mangueras y conexiones."]}, {"h": "Referencia", "p": ["Este plano complementa la Sección 6.4 del Manual Técnico MT65S — Sistema hidráulico de volteo."]}]}, "plano_electrico": {"titulo": "Plano Eléctrico", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Contenido de ejemplo", "sections": [{"h": "Contenido de ejemplo", "p": ["Diagrama del sistema eléctrico: distribución de potencia, módulos electrónicos y alimentación 24V del equipo.", "Este documento es un marcador de posición para mostrar la navegación y estructura de TAGSENSE. El contenido técnico real debe ser cargado por el equipo antes de usarse en terreno."], "note": "Contenido no validado — reemplazar con la documentación oficial del fabricante antes de uso operativo."}]}, "plano_neumatico": {"titulo": "Plano Neumático", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Contenido de ejemplo", "sections": [{"h": "Contenido de ejemplo", "p": ["Diagrama del circuito neumático: compresor, válvulas, y actuadores neumáticos del equipo.", "Este documento es un marcador de posición para mostrar la navegación y estructura de TAGSENSE. El contenido técnico real debe ser cargado por el equipo antes de usarse en terreno."], "note": "Contenido no validado — reemplazar con la documentación oficial del fabricante antes de uso operativo."}]}, "manual_servicio": {"titulo": "Manual de Servicio", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Contenido de ejemplo", "sections": [{"h": "Contenido de ejemplo", "p": ["Procedimientos detallados de servicio y mantención mayor del equipo, paso a paso.", "Este documento es un marcador de posición para mostrar la navegación y estructura de TAGSENSE. El contenido técnico real debe ser cargado por el equipo antes de usarse en terreno."], "note": "Contenido no validado — reemplazar con la documentación oficial del fabricante antes de uso operativo."}]}, "inspecciones": {"titulo": "Inspecciones", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Contenido de ejemplo", "sections": [{"h": "Contenido de ejemplo", "p": ["Checklists de inspección periódica pre-uso y programada del equipo.", "Este documento es un marcador de posición para mostrar la navegación y estructura de TAGSENSE. El contenido técnico real debe ser cargado por el equipo antes de usarse en terreno."], "note": "Contenido no validado — reemplazar con la documentación oficial del fabricante antes de uso operativo."}]}, "manual_repuestos": {"titulo": "Manual de Repuestos", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Contenido de ejemplo", "sections": [{"h": "Contenido de ejemplo", "p": ["Despieces, números de parte y componentes asociados al equipo.", "Este documento es un marcador de posición para mostrar la navegación y estructura de TAGSENSE. El contenido técnico real debe ser cargado por el equipo antes de usarse en terreno."], "note": "Contenido no validado — reemplazar con la documentación oficial del fabricante antes de uso operativo."}]}, "aceites": {"titulo": "Aceites y Lubricación", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Plan de lubricación", "sections": [{"h": "Plan de lubricación", "p": ["El cambio de aceite de motor debe realizarse cada 500 horas de horómetro. Los filtros asociados (aceite y aire) deben inspeccionarse en cada mantención programada."], "table": [["Componente", "Código", "Intervalo"], ["Filtro de aceite de motor", "RP-0231", "Cada 500h"], ["Filtro de aire", "RP-0198", "Cada 500h / según indicador de restricción"], ["Aceite de motor", "—", "Cada 500h"]]}, {"h": "Aceite hidráulico", "p": ["El sistema hidráulico de volteo utiliza aceite ISO VG 46, con una capacidad de estanque de 180 L.", "Verificar el nivel con la tolva completamente abajo y el motor apagado, esperando a que el sistema se estabilice."]}, {"h": "Referencia", "p": ["Este documento complementa la Sección 3 del Manual Técnico MT65S — Plan de lubricación."]}]}, "procedimientos": {"titulo": "Procedimientos de Bloqueo (LOTO)", "subtitulo": "Camión Minero MT65S", "meta": "TS-CAEX-0000125 · Seguridad", "sections": [{"h": "Procedimiento de bloqueo y etiquetado", "p": ["Antes de cualquier intervención mecánica o eléctrica en el MT65S, debe ejecutarse el procedimiento de bloqueo y etiquetado (LOTO):"], "list": ["Notificar al supervisor de turno antes de iniciar la intervención.", "Colocar candado personal y tarjeta en el desconectador de batería y en la llave de corte hidráulico.", "Verificar energía cero: intentar encender el equipo; debe fallar.", "Solo entonces iniciar la intervención sobre el equipo."], "note": "Nunca usar el candado de otra persona ni retirar una tarjeta que no fue colocada por uno mismo."}, {"h": "Referencia", "p": ["Este documento complementa la Sección 2 del Manual Técnico MT65S — Procedimientos de bloqueo (LOTO)."]}]}, "instr_frenos": {"titulo": "Verificación Sistema de Frenos", "subtitulo": "Camión Minero MT65S", "meta": "IT-FRE-001 · Frecuencia: cada 250 h", "sections": [{"h": "Alcance", "p": ["Instructivo de verificación en terreno para el Camión Minero MT65S (TS-CAEX-0000125). Frecuencia: cada 250 h."]}, {"h": "Pasos de verificación", "table": [["N°", "Paso de verificación", "Referencia"], ["1", "Aplicar procedimiento LOTO antes de iniciar la verificación.", "—"], ["2", "Medir espesor de pastilla en las 4 ruedas con pie de metro.", "Mínimo: 8 mm"], ["3", "Verificar torque de pernos de caliper con llave torquímetra calibrada.", "180-210 Nm"], ["4", "Inspeccionar disco: buscar rayado profundo, alabeo o grietas superficiales.", "—"], ["5", "Verificar nivel de fluido del circuito de frenos y buscar fugas en líneas.", "—"], ["6", "En frenos SAHR: verificar presión de precarga del acumulador.", "Según ficha del acumulador"], ["7", "Prueba funcional: aplicar freno y verificar que no haya pedal esponjoso.", "—"]]}, {"h": "Precauciones", "list": ["No omitir. Requisito de seguridad obligatorio.", "Si el pedal está esponjoso, hay aire en el circuito — no operar."], "note": "Estas precauciones son de cumplimiento obligatorio durante la ejecución del instructivo."}, {"h": "Registro", "p": ["Al finalizar la verificación, registrar el resultado en el Informe de Mantenimiento indicando que se utilizó este instructivo, junto con cualquier alcance técnico observado."]}]}, "instr_hidraulico": {"titulo": "Verificación Sistema Hidráulico", "subtitulo": "Camión Minero MT65S", "meta": "IT-HID-001 · Frecuencia: cada 250 h", "sections": [{"h": "Alcance", "p": ["Instructivo de verificación en terreno para el Camión Minero MT65S (TS-CAEX-0000125). Frecuencia: cada 250 h."]}, {"h": "Pasos de verificación", "table": [["N°", "Paso de verificación", "Referencia"], ["1", "Posicionar la tolva completamente abajo y apagar el motor.", "—"], ["2", "Verificar nivel de aceite hidráulico en la mirilla del estanque.", "Capacidad 180 L · ISO VG 46"], ["3", "Inspeccionar mangueras de alta presión: abrasión, grietas y fugas.", "SAE 100R2 · revisión visual diaria"], ["4", "Verificar apriete y estado de o-rings en las conexiones principales.", "—"], ["5", "Con el equipo operativo, medir presión de trabajo del sistema.", "Normal: 180-195 bar · Máx: 210 bar"], ["6", "Verificar estado del filtro de retorno y su indicador de restricción.", "Elemento 10 micrones · cambio cada 500 h"], ["7", "Operar la tolva un ciclo completo y verificar recorrido sin trabas ni ruidos.", "—"]]}, {"h": "Precauciones", "list": ["Esperar a que el sistema pierda presión residual."], "note": "Estas precauciones son de cumplimiento obligatorio durante la ejecución del instructivo."}, {"h": "Registro", "p": ["Al finalizar la verificación, registrar el resultado en el Informe de Mantenimiento indicando que se utilizó este instructivo, junto con cualquier alcance técnico observado."]}]}, "instr_neumaticos": {"titulo": "Verificación Presión de Neumáticos", "subtitulo": "Camión Minero MT65S", "meta": "IT-NEU-001 · Frecuencia: diaria (pre-uso)", "sections": [{"h": "Alcance", "p": ["Instructivo de verificación en terreno para el Camión Minero MT65S (TS-CAEX-0000125). Frecuencia: diaria (pre-uso)."]}, {"h": "Pasos de verificación", "table": [["N°", "Paso de verificación", "Referencia"], ["1", "Realizar la medición con los neumáticos fríos, antes de operar.", "—"], ["2", "Medir presión en los 6 neumáticos con manómetro calibrado.", "En carga: 620-650 kPa"], ["3", "Registrar cada valor individualmente, no solo el promedio.", "—"], ["4", "Inspeccionar desgaste de banda de rodadura en cada neumático.", "—"], ["5", "Buscar cortes, penetraciones o separación de capas en el flanco.", "—"], ["6", "Verificar torque de pernos de rueda.", "650-700 Nm"], ["7", "Reportar cualquier neumático fuera de rango en el Informe.", "—"]]}, {"h": "Precauciones", "list": ["Medir en caliente da lecturas falsamente altas.", "Desgaste irregular puede indicar problema de alineación o suspensión.", "RP-0789 figura sin stock — reportar con severidad alta si es crítico."], "note": "Estas precauciones son de cumplimiento obligatorio durante la ejecución del instructivo."}, {"h": "Registro", "p": ["Al finalizar la verificación, registrar el resultado en el Informe de Mantenimiento indicando que se utilizó este instructivo, junto con cualquier alcance técnico observado."]}]}, "instr_tolva": {"titulo": "Verificación Estado de Tolva", "subtitulo": "Camión Minero MT65S", "meta": "IT-TOL-001 · Frecuencia: cada 500 h", "sections": [{"h": "Alcance", "p": ["Instructivo de verificación en terreno para el Camión Minero MT65S (TS-CAEX-0000125). Frecuencia: cada 500 h."]}, {"h": "Pasos de verificación", "table": [["N°", "Paso de verificación", "Referencia"], ["1", "Inspeccionar estructura de la tolva: grietas en soldaduras y refuerzos.", "—"], ["2", "Verificar desgaste del piso de la tolva y placas antidesgaste.", "—"], ["3", "Revisar pasadores y bujes del pivote de volteo: juego y lubricación.", "—"], ["4", "Inspeccionar cilindro telescópico de volteo: fuga en vástago y rayado.", "Carrera 1.850 mm"], ["5", "Verificar fijación y estado del sistema de amortiguación de descarga.", "—"], ["6", "Realizar un ciclo completo de subida y bajada, midiendo tiempo.", "—"], ["7", "Verificar que el seguro mecánico de tolva levantada opere correctamente.", "—"]]}, {"h": "Precauciones", "list": ["Toda grieta estructural debe reportarse de inmediato.", "Si la tolva sube lenta, revisar filtro de succión antes de sospechar de la bomba.", "Crítico: nunca trabajar bajo tolva sin el seguro puesto."], "note": "Estas precauciones son de cumplimiento obligatorio durante la ejecución del instructivo."}, {"h": "Registro", "p": ["Al finalizar la verificación, registrar el resultado en el Informe de Mantenimiento indicando que se utilizó este instructivo, junto con cualquier alcance técnico observado."]}]}, "instr_motor": {"titulo": "Verificación Motor y Refrigeración", "subtitulo": "Camión Minero MT65S", "meta": "IT-MOT-001 · Frecuencia: cada 250 h", "sections": [{"h": "Alcance", "p": ["Instructivo de verificación en terreno para el Camión Minero MT65S (TS-CAEX-0000125). Frecuencia: cada 250 h."]}, {"h": "Pasos de verificación", "table": [["N°", "Paso de verificación", "Referencia"], ["1", "Verificar nivel de refrigerante con el motor completamente frío.", "—"], ["2", "Inspeccionar el radiador: obstrucción por polvo o material particulado.", "—"], ["3", "Verificar tensión y estado de la correa del ventilador.", "—"], ["4", "Revisar nivel de aceite de motor y buscar fugas visibles.", "Cambio cada 500 h"], ["5", "Verificar estado del filtro de aire e indicador de restricción.", "RP-0198 · cada 500 h o según indicador"], ["6", "Encender el motor y verificar temperatura de operación estabilizada.", "Normal: hasta 100 °C · Alerta: sobre 105 °C"], ["7", "Revisar el panel: registrar cualquier código de falla activo.", "E-02 / E-04 / E-07 · ver manual sección 10"]]}, {"h": "Precauciones", "list": ["Nunca abrir la tapa del radiador con el motor caliente.", "Condición frecuente en operaciones de rajo — limpiar si corresponde."], "note": "Estas precauciones son de cumplimiento obligatorio durante la ejecución del instructivo."}, {"h": "Registro", "p": ["Al finalizar la verificación, registrar el resultado en el Informe de Mantenimiento indicando que se utilizó este instructivo, junto con cualquier alcance técnico observado."]}]}};

const PLANO_IMG_URL = "assets/img/plano-hidraulico.png";

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderDocSection(sec){
  let html = '';
  if (sec.h) html += `<div class="doc-h">${escapeHtml(sec.h)}</div>`;
  if (sec.p) sec.p.forEach(par => { html += `<p class="doc-p">${escapeHtml(par)}</p>`; });
  if (sec.list) {
    html += '<ul class="doc-list">';
    sec.list.forEach(li => { html += `<li>${escapeHtml(li)}</li>`; });
    html += '</ul>';
  }
  if (sec.table) {
    html += '<table class="doc-table"><thead><tr>';
    sec.table[0].forEach(cell => { html += `<th>${escapeHtml(cell)}</th>`; });
    html += '</tr></thead><tbody>';
    sec.table.slice(1).forEach(row => {
      html += '<tr>';
      row.forEach(cell => { html += `<td>${escapeHtml(cell)}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
  }
  if (sec.img) {
    html += `<img class="doc-img" src="${PLANO_IMG_URL}" alt="Diagrama del sistema hidráulico">`;
  }
  if (sec.note) {
    html += `<div class="doc-note"><b>Importante:</b> ${escapeHtml(sec.note)}</div>`;
  }
  return html;
}

function openDocReader(docKey, scrollToText){
  const data = DOC_DATA[docKey];
  if (!data) return;

  document.getElementById('doc-title').textContent = data.titulo;
  document.getElementById('doc-subtitle').textContent = data.subtitulo;
  document.getElementById('doc-meta').textContent = data.meta;

  const body = document.getElementById('doc-body');
  body.innerHTML = data.sections.map(renderDocSection).join('');

  goTo('step-doc-reader');
  const stage = document.querySelector('.doc-reader-stage');
  stage.scrollTop = 0;

  if (scrollToText) {
    requestAnimationFrame(() => {
      const heading = Array.from(body.querySelectorAll('.doc-h'))
        .find(h => h.textContent.toLowerCase().includes(scrollToText.toLowerCase()));
      if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

document.querySelectorAll('#step-documentos .list-row[data-doc]').forEach(row => {
  row.addEventListener('click', () => { docReaderOrigen = 'documentos'; openDocReader(row.dataset.doc); });
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); docReaderOrigen = 'documentos'; openDocReader(row.dataset.doc); }
  });
});

let docReaderOrigen = 'documentos';
document.getElementById('back-doc-reader').addEventListener('click', () => {
  if (docReaderOrigen === 'instructivos') {
    renderInstructivosList();
    goTo('step-instructivos');
  } else {
    goTo('step-documentos');
  }
});

// ---- Acordeón del Manual Técnico + Accesos Rápidos por tema ----
const manualToggle = document.getElementById('manual-accordion-toggle');
const manualPanel = document.getElementById('manual-accordion-panel');
const manualChevron = document.getElementById('manual-accordion-chevron');

function toggleManualAccordion(){
  const isOpen = manualPanel.classList.toggle('open');
  manualToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}
manualToggle.addEventListener('click', toggleManualAccordion);
manualToggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleManualAccordion(); }
});

document.querySelectorAll('.manual-qa-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    if (tile.dataset.doc) { docReaderOrigen = 'documentos'; openDocReader(tile.dataset.doc); }
  });
});

const TODOS_LOS_MANUALES = [
  { key: 'manual', nombre: 'Manual Técnico MT65S', icon: 'M7 3h7l4 4v14H7z' },
  { key: 'plano', nombre: 'Plano Hidráulico', icon: 'M7 3h7l4 4v14H7z' },
  { key: 'plano_electrico', nombre: 'Plano Eléctrico', icon: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z' },
  { key: 'plano_neumatico', nombre: 'Plano Neumático', icon: 'M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z' },
  { key: 'aceites', nombre: 'Aceites', icon: 'M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z' },
  { key: 'procedimientos', nombre: 'Procedimientos', icon: 'M6 4h12v16H6z' },
  { key: 'manual_servicio', nombre: 'Manual de Servicio', icon: 'M14.7 6.3a4 4 0 0 0-5.4 4.7' },
  { key: 'inspecciones', nombre: 'Inspecciones', icon: 'M4 4h16v16H4z' },
  { key: 'manual_repuestos', nombre: 'Manual de Repuestos', icon: 'M21 8 12 3 3 8v8l9 5 9-5V8Z' },
  { key: 'garantia', nombre: 'Certificado de Garantía', icon: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z' },
  { key: 'ast', nombre: 'AST Cambio de Filtros', icon: 'M4 4h16v16H4z' },
];

const manualIndexList = document.getElementById('manual-index-list');
manualIndexList.innerHTML = TODOS_LOS_MANUALES.map(m => `
  <div class="list-row" data-doc="${m.key}" role="button" tabindex="0" aria-label="Abrir ${escapeHtml(m.nombre)}">
    <div class="li-ic"><svg viewBox="0 0 24 24" fill="none"><path d="${m.icon}" stroke="#b3a57e" stroke-width="1.6" stroke-linejoin="round"/></svg></div>
    <div class="li-txt"><strong>${escapeHtml(m.nombre)}</strong></div>
  </div>
`).join('');
manualIndexList.querySelectorAll('.list-row').forEach(row => {
  row.addEventListener('click', () => { docReaderOrigen = 'documentos'; openDocReader(row.dataset.doc); });
});

const manualIndexPanel = document.getElementById('manual-index-panel');
document.getElementById('manual-open-full').addEventListener('click', () => {
  manualIndexPanel.classList.toggle('open');
});

// ================= INSTRUCTIVOS DE VERIFICACIÓN =================
// Procedimientos ejecutables paso a paso en terreno, con los valores de referencia
// que normalmente solo maneja el área de confiabilidad / monitoreo de condiciones.
const INSTRUCTIVOS = {
  frenos: {
    nombre: 'Verificación Sistema de Frenos',
    meta: 'IT-FRE-001 · Frecuencia: cada 250 h',
    icono: '<circle cx="12" cy="12" r="8" stroke="#b3a57e" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="#b3a57e"/>',
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
    icono: '<path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke="#b3a57e" stroke-width="1.7" stroke-linejoin="round"/>',
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
    icono: '<circle cx="12" cy="12" r="8" stroke="#b3a57e" stroke-width="1.7"/><circle cx="12" cy="12" r="3.2" stroke="#b3a57e" stroke-width="1.5"/>',
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
    icono: '<path d="M3 17h13l4-8H7L3 17Z" stroke="#b3a57e" stroke-width="1.7" stroke-linejoin="round"/>',
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
    icono: '<path d="M4 13h3l2-4h6l2 4h3v6H4v-6Z" stroke="#b3a57e" stroke-width="1.6" stroke-linejoin="round"/>',
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
function renderInstructivosList(){
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
    const abrir = () => {
      docReaderOrigen = 'instructivos';
      openDocReader('instr_' + card.dataset.instr);
    };
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
  });
}

document.getElementById('tile-instructivos').addEventListener('click', () => {
  renderInstructivosList();
  goTo('step-instructivos');
});
document.getElementById('back-instructivos').addEventListener('click', () => goTo('step-confirm-3'));


// ================= SOLICITUDES DE MANTENIMIENTO (SM) =================
// Nacen dentro del Informe cuando el mantenedor detecta algo que excede la intervención
// del día (repuesto pendiente, inspección técnica, monitoreo predictivo, etc.).
let smFolioCounter = 1;
const SOLICITUDES_MANTENIMIENTO = [
  {
    folio: 'SM-0001', tipo: 'Inspección técnica', prioridad: 'Media', componente: 'frenos',
    descripcion: 'Pastilla delantera izquierda cercana al espesor mínimo. Programar reemplazo en próxima mantención.',
    estado: 'Abierta', origenInforme: 'INF-H003', fecha: '28/03/2024', tecnico: 'Ana Rojas',
  },
];

function renderSMList(){
  const cont = document.getElementById('sm-list');
  if (!cont) return;
  if (!SOLICITUDES_MANTENIMIENTO.length) {
    cont.innerHTML = '<div class="comp-hist-empty" style="padding:4px 2px;">Aún no se han generado solicitudes de mantenimiento desde los informes.</div>';
    return;
  }
  const PRIORIDAD_CLASE = { 'Baja':'baja', 'Media':'media', 'Alta':'alta', 'Urgente':'urgente' };
  cont.innerHTML = SOLICITUDES_MANTENIMIENTO.slice().reverse().map(sm => `
    <div class="sm-card">
      <div class="sm-card-top">
        <div>
          <div class="sm-folio">${escapeHtml(sm.folio)}</div>
          <div class="sm-meta">${escapeHtml(sm.fecha)} · ${escapeHtml(sm.tecnico)} · Origen: ${escapeHtml(sm.origenInforme)}</div>
        </div>
        <span class="sm-prioridad ${PRIORIDAD_CLASE[sm.prioridad] || ''}">${escapeHtml(sm.prioridad)}</span>
      </div>
      <div class="sm-tipo"><b>${escapeHtml(sm.tipo)}</b>${sm.componente && COMPONENTES[sm.componente] ? ' · ' + escapeHtml(COMPONENTES[sm.componente].nombre) : ''}</div>
      <div class="sm-desc">${escapeHtml(sm.descripcion)}</div>
      <span class="sm-estado">${escapeHtml(sm.estado)}</span>
    </div>
  `).join('');
}

function actualizarTileSolicitudes(){
  const el = document.getElementById('sm-tile-count');
  if (!el) return;
  const abiertas = SOLICITUDES_MANTENIMIENTO.filter(s => s.estado === 'Abierta').length;
  el.textContent = abiertas > 0 ? `${abiertas} abierta${abiertas > 1 ? 's' : ''}` : 'Sin solicitudes';
}
actualizarTileSolicitudes();

document.getElementById('tile-solicitudes').addEventListener('click', () => {
  renderSMList();
  goTo('step-solicitudes');
});
document.getElementById('back-solicitudes').addEventListener('click', () => goTo('step-confirm-3'));

// ================= COMPONENTES CRÍTICOS (ficha de vida por pieza) =================
// Se auto-completan con lo que el técnico registra en cada Informe de Mantenimiento —
// no se editan a mano en esta pantalla.
const COMPONENTES = {
  motor: {
    nombre: 'Motor', icono: 'motor',
    estado: 'original', empresa: null,
    fechaInstalacion: '15/03/2021', horometroInstalacion: 0,
    historial: [],
  },
  transmision: {
    nombre: 'Transmisión', icono: 'transmision',
    estado: 'original', empresa: null,
    fechaInstalacion: '15/03/2021', horometroInstalacion: 0,
    historial: [],
  },
  hidraulico: {
    nombre: 'Sistema Hidráulico', icono: 'hidraulico',
    estado: 'reparado', empresa: 'Taller interno Pucobre',
    fechaInstalacion: '15/01/2024', horometroInstalacion: 8050,
    historial: [
      { fecha: '15/01/2024', horometro: 8050, folio: 'INF-H002', detalle: 'Reemplazo de manguera de retorno por fuga activa.' },
    ],
  },
  frenos: {
    nombre: 'Frenos', icono: 'frenos',
    estado: 'original', empresa: null,
    fechaInstalacion: '15/03/2021', horometroInstalacion: 0,
    historial: [
      { fecha: '28/03/2024', horometro: 8420, folio: 'INF-H003', detalle: 'Inspección: pastilla delantera izquierda con desgaste cercano al mínimo. Pendiente reemplazo.' },
    ],
  },
  mandos: {
    nombre: 'Mandos Finales', icono: 'mandos',
    estado: 'original', empresa: null,
    fechaInstalacion: '15/03/2021', horometroInstalacion: 0,
    historial: [],
  },
};

const COMP_ICONS = {
  motor: '<path d="M4 13h3l2-4h6l2 4h3v6H4v-6Z" stroke="#b3a57e" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="16" r="1.6" stroke="#b3a57e" stroke-width="1.4"/><circle cx="15" cy="16" r="1.6" stroke="#b3a57e" stroke-width="1.4"/>',
  transmision: '<circle cx="12" cy="12" r="3" stroke="#b3a57e" stroke-width="1.6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="#b3a57e" stroke-width="1.4" stroke-linecap="round"/>',
  hidraulico: '<path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke="#b3a57e" stroke-width="1.6" stroke-linejoin="round"/>',
  frenos: '<circle cx="12" cy="12" r="8" stroke="#b3a57e" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="#b3a57e"/>',
  mandos: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" stroke="#b3a57e" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 8l9 5 9-5M12 13v8" stroke="#b3a57e" stroke-width="1.6" stroke-linejoin="round"/>',
};

const ESTADO_LABELS = { original: 'Original', reparado: 'Reparado', reacondicionado: 'Reacondicionado', reemplazado: 'Reemplazado' };

function parseHorometro(str){
  if (!str) return null;
  const n = parseFloat(String(str).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function renderComponentes(){
  const container = document.getElementById('comp-criticos-list');
  if (!container) return;
  const horometroActual = parseHorometro(ultimoHorometro[activoActualId]) || 0;
  const UMBRAL_ALERTA_HORAS = 4000; // referencia: sobre esto, sugerir revisión preventiva

  container.innerHTML = Object.entries(COMPONENTES).map(([key, c]) => {
    const horas = Math.max(0, Math.round(horometroActual - c.horometroInstalacion));
    const enAlerta = horas >= UMBRAL_ALERTA_HORAS;
    const smAbierta = SOLICITUDES_MANTENIMIENTO.find(s => s.componente === key && s.estado === 'Abierta');
    const origenTexto = c.empresa
      ? `Reparado — ${escapeHtml(c.empresa)}, ${escapeHtml(c.fechaInstalacion)}`
      : `Componente de fábrica, instalado ${escapeHtml(c.fechaInstalacion)}`;
    const historialHtml = c.historial.length
      ? c.historial.slice().reverse().map(h =>
          `<div class="comp-hist-item"><b>${escapeHtml(h.fecha)}</b> · ${escapeHtml(String(h.horometro))}h · ${escapeHtml(h.folio)}<br>${escapeHtml(h.detalle)}${h.empresa ? `<br><span style="color:var(--text-low);">${escapeHtml(h.empresa)}${h.tecnico ? ' · Téc. ' + escapeHtml(h.tecnico) : ''}</span>` : ''}</div>`
        ).join('')
      : '<div class="comp-hist-empty">Sin intervenciones registradas.</div>';

    return `
      <div class="comp-card" id="comp-card-${key}">
        <div class="comp-card-head" data-toggle="${key}" role="button" tabindex="0">
          <div class="comp-ic"><svg viewBox="0 0 24 24" fill="none">${COMP_ICONS[c.icono]}</svg></div>
          <div class="comp-head-txt">
            <strong>${escapeHtml(c.nombre)}</strong>
            <div class="comp-head-horas ${enAlerta ? 'alerta' : ''}">
              ${enAlerta ? '<svg viewBox="0 0 24 24" fill="none" class="alerta-ic"><path d="M12 2 2 20h20L12 2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v5M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' : ''}
              <b>${horas.toLocaleString('es-CL')}</b> horas acumuladas
            </div>
            ${smAbierta ? `<div class="sm-pending-badge">⏳ ${escapeHtml(smAbierta.folio)} pendiente</div>` : ''}
          </div>
          <span class="comp-badge ${c.estado}">${ESTADO_LABELS[c.estado]}</span>
          <svg class="comp-chev" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="comp-card-body">
          ${enAlerta ? '<div class="comp-alerta-banner">Esta pieza supera las ' + UMBRAL_ALERTA_HORAS.toLocaleString('es-CL') + ' horas de uso — se sugiere programar una revisión preventiva.</div>' : ''}
          <div class="comp-detail-grid">
            <div style="grid-column:1 / -1;"><span class="dk">Origen</span><span class="dv">${origenTexto}</span></div>
            <div><span class="dk">Fecha instalación</span><span class="dv">${escapeHtml(c.fechaInstalacion)}</span></div>
            <div><span class="dk">Horómetro instalación</span><span class="dv">${c.horometroInstalacion.toLocaleString('es-CL')} h</span></div>
          </div>
          <div class="comp-hist-label">Historial de intervenciones</div>
          ${historialHtml}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-toggle]').forEach(head => {
    const toggle = () => {
      const card = document.getElementById('comp-card-' + head.dataset.toggle);
      card.classList.toggle('open');
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

// Actualiza la ficha de vida del componente cuando se genera un informe que lo interviene
function actualizarComponenteDesdeInforme(compKey, data, empresaTexto){
  const c = COMPONENTES[compKey];
  if (!c) return;
  const horometroNum = parseHorometro(data.horometro);
  c.estado = 'reparado';
  c.empresa = empresaTexto || 'Interno Pucobre';
  c.fechaInstalacion = data.fecha;
  if (horometroNum !== null) c.horometroInstalacion = horometroNum;
  c.historial.push({
    fecha: data.fecha,
    horometro: horometroNum !== null ? horometroNum : '—',
    folio: data.folio,
    detalle: data.repuestosUsados ? data.repuestosDetalle : (data.descripcion || 'Intervención registrada.'),
    empresa: c.empresa,
    tecnico: data.tecnico,
  });
}

// ================= INFORME DE MANTENIMIENTO =================
let informeFolioCounter = 1;
let ultimoHorometro = { 'TS-CAEX-0000125': '8.745 h' };
let informeFotos = [];

document.getElementById('report-fab').addEventListener('click', () => {
  document.getElementById('informe-tecnico').textContent = welcomeName.textContent || 'usuario';
  const ahora = new Date();
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
});
document.getElementById('back-informe').addEventListener('click', () => goTo('step-confirm-3'));
let previewOrigen = 'nuevo';
document.getElementById('back-informe-preview').addEventListener('click', () => {
  goTo(previewOrigen === 'historial' ? 'step-historial' : 'step-informe');
});

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

// ---- Componente intervenido (alimenta la ficha de vida en Componentes del Activo) ----
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
  return 'Interno Pucobre';
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

// ---- Vista previa ----
let ultimoInformeData = null;

function construirInformeHTML(data){
  const logoSrc = document.querySelector('#step-access .logo').src;
  const sevLabel = { baja: 'Severidad: Baja', media: 'Severidad: Media', alta: 'Severidad: Alta' };
  const sevColor = { baja: '#177b57', media: '#eb912b', alta: '#c91233' };
  const fotosHtml = (data.fotos && data.fotos.length)
    ? `<div class="preview-h">Fotografías</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">${data.fotos.map(f => `<img src="${f}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">`).join('')}</div>`
    : '';

  return `
    <img class="preview-logo" src="${logoSrc}" alt="Pucobre">
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
    ${data.smAplica ? `<div class="preview-h">Solicitud de Mantenimiento</div><p class="preview-p"><b>${escapeHtml(data.smFolio || 'SM')}</b> · ${escapeHtml(data.smTipo || '')} · Prioridad ${escapeHtml(data.smPrioridad || '')}${data.smComponente && COMPONENTES[data.smComponente] ? ' · ' + escapeHtml(COMPONENTES[data.smComponente].nombre) : ''}<br>${escapeHtml(data.smDescripcion || '')}</p>` : ''}
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
    folio: 'INF-' + String(informeFolioCounter).padStart(4, '0'),
    equipo: ACTIVOS[activoActualId] ? ACTIVOS[activoActualId].nombre : 'Camión Minero MT65S',
    equipoId: activoActualId,
    tecnico: document.getElementById('informe-tecnico').textContent,
    fecha: document.getElementById('informe-fecha').textContent,
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
  ultimoInformeData = data;
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
    const smFolio = 'SM-' + String(smFolioCounter).padStart(4, '0');
    smFolioCounter++;
    data.smFolio = smFolio;
    SOLICITUDES_MANTENIMIENTO.push({
      folio: smFolio, tipo: smTipo, prioridad: smPrioridad, componente: smComponente,
      descripcion: data.smDescripcion || 'Sin detalle adicional.',
      estado: 'Abierta', origenInforme: data.folio, fecha: data.fecha, tecnico: data.tecnico,
    });
    actualizarTileSolicitudes();
  }

  document.getElementById('report-preview-content').innerHTML = construirInformeHTML(data);
  document.querySelectorAll('.report-send-row').forEach(r => r.classList.remove('hidden'));
  previewOrigen = 'nuevo';
  goTo('step-informe-preview');
});

// ---- Generar PDF con jsPDF (incluye logo Pucobre y firma) ----
function generarInformePdf(data){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const KHAKI = [138, 123, 81];
  const KHAKI_LIGHT = [221, 213, 195];
  const KHAKI_PALE = [245, 243, 238];
  const DARK = [20, 20, 22];
  const TEXT = [38, 38, 38];
  const MUTED = [128, 128, 128];
  const RED = [201, 18, 51];
  const ORANGE = [235, 145, 43];
  const GREEN = [23, 123, 87];
  const RULE = [214, 210, 199];

  const docNum = `TAGSENSE-MT65S-${data.folio}`;
  let y = 0;
  let seccionN = 0;

  // ---------- ENCABEZADO ----------
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setFillColor(...KHAKI);
  doc.rect(0, 26, pageW, 1.1, 'F');

  const logoImg = document.querySelector('#step-access .logo');
  try { doc.addImage(logoImg.src, 'PNG', marginX, 5.5, 15, 15); } catch(e) {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(245, 242, 235);
  doc.text('INFORME DE MANTENIMIENTO', marginX + 20, 12.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...KHAKI_LIGHT);
  doc.text(`Documento técnico N° ${docNum}`, marginX + 20, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...KHAKI);
  doc.text('PUCOBRE', pageW - marginX, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 148, 140);
  doc.text('TAGSENSE · Plataforma de activos mineros', pageW - marginX, 15, { align: 'right' });

  // ---------- FRANJA DE CONTROL DOCUMENTAL ----------
  y = 32;
  doc.setFillColor(...KHAKI_PALE);
  doc.rect(marginX, y - 5, contentW, 9, 'F');
  const ctrlW = contentW / 4;
  function ctrlItem(label, val, i){
    const x = marginX + ctrlW * i + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y - 1.4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(String(val), x, y + 2.6);
    if (i > 0) { doc.setDrawColor(...RULE); doc.line(marginX + ctrlW * i, y - 4.3, marginX + ctrlW * i, y + 3.3); }
  }
  ctrlItem('Folio', data.folio, 0);
  ctrlItem('Fecha de emisión', data.fecha, 1);
  ctrlItem('Clasificación', 'Uso interno', 2);
  ctrlItem('Revisión', 'Rev. 0', 3);
  y += 12;

  // ---------- RESUMEN EJECUTIVO ----------
  const SEV_COLOR = { alta: RED, media: ORANGE, baja: GREEN };
  const SEV_LABEL = { alta: 'SEVERIDAD ALTA', media: 'SEVERIDAD MEDIA', baja: 'SEVERIDAD BAJA' };
  const sevColor = SEV_COLOR[data.severidad] || KHAKI;
  const sevLabel = data.fallas ? (SEV_LABEL[data.severidad] || 'FALLA REGISTRADA') : 'SIN FALLAS';

  const boxH = 30;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentW, boxH, 1.5, 1.5, 'D');
  doc.setFillColor(...(data.fallas ? sevColor : GREEN));
  doc.rect(marginX, y, 2, boxH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...(data.fallas ? sevColor : GREEN));
  doc.text(sevLabel, marginX + 7, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(data.operativo ? 'EQUIPO OPERATIVO' : 'EQUIPO NO OPERATIVO', pageW - marginX - 4, y + 6, { align: 'right' });

  const colW3 = (contentW - 10) / 3;
  function resumenItem(label, val, col, row){
    const x = marginX + 7 + colW3 * col;
    const yy = y + 13 + row * 8.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(String(val), x, yy + 4);
  }
  resumenItem('Equipo', data.equipo, 0, 0);
  resumenItem('ID TagSense', data.equipoId, 1, 0);
  resumenItem('Técnico ejecutor', data.tecnico, 2, 0);
  resumenItem('Horómetro', data.horometro, 0, 1);
  resumenItem('Horario de trabajo', `${data.horaInicio} – ${data.horaTermino}`, 1, 1);
  resumenItem('Duración', calcularDuracion(data.horaInicio, data.horaTermino), 2, 1);

  y += boxH + 11;

  // ---------- HELPERS DE SECCIÓN ----------
  function checkPageBreak(minSpace){
    if (y > pageH - minSpace) { doc.addPage(); y = 22; }
  }
  function seccion(titulo){
    seccionN++;
    doc.setFillColor(...KHAKI);
    doc.roundedRect(marginX, y - 4.6, 6.4, 6.4, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(String(seccionN), marginX + 3.2, y - 0.9, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(35, 33, 28);
    doc.text(titulo.toUpperCase(), marginX + 10, y);
    y += 4;
    doc.setDrawColor(...RULE);
    doc.line(marginX, y, pageW - marginX, y);
    y += 6.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
  }
  function parrafo(texto){
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(texto, contentW - 2);
    doc.text(lines, marginX, y);
    y += lines.length * 4.6 + 8;
  }
  function calloutBox(color, tag, texto){
    const lines = doc.splitTextToSize(texto, contentW - 14);
    const h = lines.length * 4.6 + 11;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentW, h, 1.5, 1.5, 'D');
    doc.setFillColor(...color);
    doc.rect(marginX, y, 1.8, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...color);
    doc.text(tag.toUpperCase(), marginX + 6, y + 6);
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(lines, marginX + 6, y + 11.5);
    y += h + 8;
  }
  function checkFilaPdf(marcado, texto){
    doc.setDrawColor(190, 190, 190);
    doc.setFillColor(marcado ? KHAKI[0] : 255, marcado ? KHAKI[1] : 255, marcado ? KHAKI[2] : 255);
    doc.roundedRect(marginX, y - 3.6, 4.4, 4.4, 1, 1, marcado ? 'FD' : 'D');
    if (marcado) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(marginX + 0.9, y - 1.6, marginX + 1.9, y - 0.4);
      doc.line(marginX + 1.9, y - 0.4, marginX + 3.6, y - 3.1);
      doc.setLineWidth(0.2);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(texto, marginX + 8, y);
    y += 7.5;
  }

  // ---------- 1. DESCRIPCIÓN DEL TRABAJO ----------
  checkPageBreak(50);
  seccion('Descripción del trabajo realizado');
  parrafo(data.descripcion || '—');

  // ---------- 2. HALLAZGOS Y FALLAS ----------
  if (data.fallas) {
    checkPageBreak(55);
    seccion('Hallazgos y fallas encontradas');
    calloutBox(sevColor, SEV_LABEL[data.severidad] || 'Hallazgo registrado', data.fallas);
  }

  // ---------- 3. REPUESTOS ----------
  checkPageBreak(40);
  seccion('Repuestos utilizados');
  if (data.repuestosUsados && data.repuestosDetalle) {
    parrafo(data.repuestosDetalle);
  } else {
    doc.setFont('times', 'italic');
    doc.setTextColor(...MUTED);
    doc.text('No se utilizaron repuestos en esta intervención.', marginX, y);
    y += 10;
  }

  // ---------- 4. COMPONENTE INTERVENIDO ----------
  if (data.componente && COMPONENTES[data.componente]) {
    checkPageBreak(40);
    seccion('Componente intervenido');
    parrafo(`${COMPONENTES[data.componente].nombre} · Empresa: ${data.empresa || 'Interno Pucobre'}`);
  }

  // ---------- 5. VERIFICACIÓN EN TERRENO ----------
  checkPageBreak(45);
  seccion('Verificación en terreno');
  if (data.instructivosUsados && data.instructivosNombres.length) {
    data.instructivosNombres.forEach(n => {
      doc.setFillColor(...KHAKI);
      doc.circle(marginX + 1.2, y - 1.6, 0.9, 'F');
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      doc.text(n, marginX + 5, y);
      y += 6;
    });
    y += 4;
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No se utilizaron instructivos de verificación.', marginX, y);
    y += 10;
  }

  // ---------- 6. ALCANCE TÉCNICO DEL MANTENEDOR ----------
  if (data.alcances) {
    checkPageBreak(50);
    seccion('Alcance técnico del mantenedor');
    calloutBox(KHAKI, 'Nota técnica de terreno', data.alcances);
  }

  // ---------- 7. SOLICITUD DE MANTENIMIENTO ----------
  if (data.smAplica) {
    checkPageBreak(55);
    seccion('Solicitud de mantenimiento generada');
    const compNombre = data.smComponente && COMPONENTES[data.smComponente] ? COMPONENTES[data.smComponente].nombre : '—';
    const PR_COLOR = { 'Baja': GREEN, 'Media': ORANGE, 'Alta': RED, 'Urgente': RED };
    const prColor = PR_COLOR[data.smPrioridad] || KHAKI;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(data.smFolio || 'SM', marginX, y);
    const prW = doc.getTextWidth((data.smPrioridad || '').toUpperCase()) + 6;
    doc.setFillColor(...prColor);
    doc.roundedRect(pageW - marginX - prW, y - 4.2, prW, 5.6, 1.4, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text((data.smPrioridad || '').toUpperCase(), pageW - marginX - prW/2, y - 0.6, { align: 'center' });
    y += 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Tipo: ${data.smTipo || '—'}   ·   Componente asociado: ${compNombre}`, marginX, y);
    y += 7;
    parrafo(data.smDescripcion || 'Sin detalle adicional.');
  }

  // ---------- 8. CHECKLIST ----------
  checkPageBreak(30);
  seccion('Checklist de cierre');
  checkFilaPdf(data.operativo, 'Equipo queda operativo');
  y += 4;

  // ---------- 9. RECOMENDACIONES ----------
  if (data.observaciones) {
    checkPageBreak(40);
    seccion('Recomendaciones');
    parrafo(data.observaciones);
  }

  // ---------- 10. REGISTRO FOTOGRÁFICO ----------
  if (data.fotos && data.fotos.length) {
    checkPageBreak(75);
    seccion('Registro fotográfico');
    let fx = marginX, col = 0;
    const fw = 36, fh = 36, gap = 4;
    data.fotos.slice(0, 6).forEach((foto, i) => {
      doc.setDrawColor(...RULE);
      doc.rect(fx, y, fw, fh, 'D');
      try { doc.addImage(foto, 'JPEG', fx + 0.6, y + 0.6, fw - 1.2, fh - 1.2); } catch(e) {}
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(`Fig. ${i + 1}`, fx, y + fh + 4);
      col++;
      fx += fw + gap;
      if (col === 4) { col = 0; fx = marginX; y += fh + 9; }
    });
    if (col !== 0) y += fh + 9;
    y += 4;
  }

  // ---------- 11. VALIDACIÓN Y FIRMA ----------
  checkPageBreak(70);
  seccion('Validación y firma');
  const sigBoxW = 80, sigBoxH = 32;
  doc.setDrawColor(...RULE);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, y, sigBoxW, sigBoxH, 1.5, 1.5, 'D');
  try { doc.addImage(data.firmaDataUrl, 'PNG', marginX + 4, y + 3, sigBoxW - 8, sigBoxH - 13); } catch(e) {}
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX + 5, y + sigBoxH - 8, marginX + sigBoxW - 5, y + sigBoxH - 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(data.tecnico, marginX + 5, y + sigBoxH - 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Técnico ejecutor', marginX + 5, y + sigBoxH - 0.5);

  const revX = marginX + sigBoxW + 10;
  doc.setDrawColor(...RULE);
  doc.roundedRect(revX, y, sigBoxW, sigBoxH, 1.5, 1.5, 'D');
  doc.setDrawColor(200, 200, 200);
  doc.line(revX + 5, y + sigBoxH - 8, revX + sigBoxW - 5, y + sigBoxH - 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Sin asignar', revX + 5, y + sigBoxH - 3.5);
  doc.text('Supervisor / revisor', revX + 5, y + sigBoxH - 0.5);

  y += sigBoxH + 7;
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const nota = doc.splitTextToSize('Documento validado digitalmente por el técnico ejecutor mediante firma electrónica capturada en la plataforma TAGSENSE. La validación del supervisor queda pendiente de firma física o digital posterior.', contentW);
  doc.text(nota, marginX, y);

  // ---------- PIE DE PÁGINA ----------
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.line(marginX, pageH - 14, pageW - marginX, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${docNum}  ·  Confidencial — uso interno`, marginX, pageH - 9);
    doc.text(`Página ${p} de ${totalPages}`, pageW - marginX, pageH - 9, { align: 'right' });
  }

  return doc;
}

function calcularDuracion(hi, ht){
  if (!hi || !ht) return '—';
  const [h1,m1] = hi.split(':').map(Number);
  const [h2,m2] = ht.split(':').map(Number);
  let mins = (h2*60+m2) - (h1*60+m1);
  if (mins < 0) mins += 24*60;
  const hh = Math.floor(mins/60), mm = mins%60;
  return `${hh}h ${mm}min`;
}

document.getElementById('report-pdf-btn').addEventListener('click', (e) => {
  if (!ultimoInformeData) { e.preventDefault(); return; }
  const doc = generarInformePdf(ultimoInformeData);
  doc.save(`${ultimoInformeData.folio}_${ultimoInformeData.equipoId}.pdf`);
  informeFolioCounter++;
  e.preventDefault();
});

if (navigator.share) {
  const waLabel = document.getElementById('wa-btn-label');
  if (waLabel) waLabel.textContent = 'Compartir PDF por WhatsApp';
}

document.getElementById('btn-informe-whatsapp').addEventListener('click', async () => {
  if (!ultimoInformeData) return;
  const d = ultimoInformeData;

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
      const compNombre = d.smComponente && COMPONENTES[d.smComponente] ? COMPONENTES[d.smComponente].nombre : '';
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

// ---- Historial: píldora "Ver informe" (ejemplos previos al generador de informes) ----
const HISTORIAL_INFORMES = [
  {
    folio: 'INF-H004', equipo: 'Camión Minero MT65S', equipoId: 'TS-CAEX-0000125',
    tecnico: 'Carlos Muñoz', fecha: '12/05/2024', horometro: '8.610 h', horaInicio: '08:15', horaTermino: '09:40',
    descripcion: 'Se realizó cambio de aceite de motor y reemplazo de filtros de aceite y aire según plan de lubricación programado.',
    fallas: '', severidad: null, repuestosUsados: true, repuestosDetalle: 'Filtro de aceite (RP-0231), Filtro de aire (RP-0198)',
    operativo: true, observaciones: 'Sin hallazgos adicionales. Próxima mantención programada a las 9.100h.',
    instructivosUsados: true, instructivosNombres: ['Verificación Motor y Refrigeración'], alcances: 'Conviene soltar el filtro de aceite con el motor tibio, no frío — sale con menos esfuerzo y drena mejor.',
    fotos: [], firmaDataUrl: null,
  },
  {
    folio: 'INF-H003', equipo: 'Camión Minero MT65S', equipoId: 'TS-CAEX-0000125',
    tecnico: 'Ana Rojas', fecha: '28/03/2024', horometro: '8.420 h', horaInicio: '10:00', horaTermino: '11:20',
    descripcion: 'Inspección programada de sistema de frenos y neumáticos. Se midió espesor de pastillas y presión de los 6 neumáticos.',
    fallas: 'Pastilla de freno delantera izquierda con desgaste cercano al mínimo (8,5mm).', severidad: 'media',
    repuestosUsados: false, repuestosDetalle: '',
    operativo: true, observaciones: 'Se recomienda programar cambio de pastillas de freno en la próxima intervención.',
    instructivosUsados: true, instructivosNombres: ['Verificación Sistema de Frenos', 'Verificación Presión de Neumáticos'], alcances: 'Medir el espesor de pastilla en dos puntos del disco: el desgaste no siempre es parejo y por un lado puede estar bajo el mínimo.',
    fotos: [], firmaDataUrl: null,
  },
  {
    folio: 'INF-H002', equipo: 'Camión Minero MT65S', equipoId: 'TS-CAEX-0000125',
    tecnico: 'Carlos Muñoz', fecha: '15/01/2024', horometro: '8.050 h', horaInicio: '14:30', horaTermino: '17:10',
    descripcion: 'Reparación de fuga detectada en manguera de retorno del sistema hidráulico de volteo. Se reemplazó la manguera completa.',
    fallas: 'Fuga activa de aceite hidráulico en manguera de retorno, sector filtro.', severidad: 'alta',
    repuestosUsados: true, repuestosDetalle: 'Manguera hidráulica (RP-0512)',
    operativo: true, observaciones: 'Se realizó prueba de presión post-reparación sin novedades.',
    instructivosUsados: true, instructivosNombres: ['Verificación Sistema Hidráulico'], alcances: 'Despresurizar completamente el sistema hidráulico antes de intervenir: bajar tolva, apagar motor y accionar la palanca de volteo un par de veces para liberar presión residual.',
    fotos: [], firmaDataUrl: null,
  },
  {
    folio: 'INF-H001', equipo: 'Camión Minero MT65S', equipoId: 'TS-CAEX-0000125',
    tecnico: 'Pedro Silva', fecha: '02/11/2023', horometro: '7.500 h', horaInicio: '08:00', horaTermino: '09:30',
    descripcion: 'Servicio programado de 250 horas según plan de mantención preventiva. Revisión general del equipo.',
    fallas: '', severidad: null, repuestosUsados: false, repuestosDetalle: '',
    operativo: true, observaciones: 'Equipo en buenas condiciones generales.',
    instructivosUsados: false, instructivosNombres: [], alcances: '',
    fotos: [], firmaDataUrl: null,
  },
];

const BLANK_SIGNATURE = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80"><rect width="220" height="80" fill="#ffffff"/><text x="110" y="45" font-family="Helvetica" font-size="11" fill="#999" text-anchor="middle">Firma no disponible</text></svg>');

document.querySelectorAll('.hist-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = Number(pill.dataset.hist);
    const data = { ...HISTORIAL_INFORMES[idx], firmaDataUrl: BLANK_SIGNATURE };
    ultimoInformeData = data;
    document.getElementById('report-preview-content').innerHTML = construirInformeHTML(data);
    document.querySelectorAll('.report-send-row').forEach(r => r.classList.remove('hidden'));
    previewOrigen = 'historial';
    goTo('step-informe-preview');
  });
});


// ================= RESOLUCIÓN UNIFICADA DE CÓDIGO ESCANEADO/INGRESADO =================
// Punto único por el que pasan NFC real, QR real y el ingreso manual, para no duplicar la
// lógica de "activo encontrado / no encontrado" en cada método de lectura
// (ver /tagsense-docs/skills/nfc-qr-scanning/SKILL.md, checklist final).
function resolverActivoEscaneado(id, opciones){
  opciones = opciones || {};
  if (!id || !ACTIVOS[id]) return false;
  if (readState === 'found') return true; // ya resuelto por otra vía (ej. NFC real mientras se mostraba QR)
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
  setTimeout(() => {
    goTo(sessionAuthenticated ? 'step-confirm-2' : 'step-access');
  }, opciones.origen === 'qr' ? 250 : 550);
  return true;
}

// Si el código codifica una URL completa (ej. la misma URL grabada en un tag NFC físico,
// https://app.tagsense.cl/?activo=ID), se extrae el parámetro; si es el tag_code puro, se usa tal cual.
function extraerCodigoActivo(valorDecodificado){
  try {
    const url = new URL(valorDecodificado);
    const idParam = url.searchParams.get('activo');
    if (idParam) return idParam.trim().toUpperCase();
  } catch (err) { /* no es una URL: es el código directo */ }
  return String(valorDecodificado).trim().toUpperCase();
}

function mostrarHintLectura(texto){
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
      mostrarHintLectura('No se pudo leer el tag NFC. Intenta de nuevo o usa QR.');
    };
  } catch (err) {
    // Permiso denegado o NFC apagado en el equipo: no bloquear, QR/manual siguen disponibles.
    mostrarHintLectura('Activa el NFC del dispositivo, o usa el escáner QR / código manual.');
  }
}

// ---- Arranque real del modo lectura: sin animación falsa, con métodos reales ----
function iniciarModoLectura(){
  if (soportaWebNFC) {
    mostrarHintLectura('Acerca el dispositivo al tag NFC, o escanea el código QR.');
    iniciarEscuchaNFCReal();
  } else {
    mostrarHintLectura('Este navegador no lee NFC — usa el escáner QR o ingresa el código manualmente.');
  }
}

// ================= ESCÁNER DE CÓDIGO QR (cámara) =================
// QR es el método primario y universal: funciona en cualquier dispositivo con cámara,
// sin plugins nativos (ver /tagsense-docs/skills/nfc-qr-scanning/SKILL.md).
let qrStream = null;
let qrRafId = null;
let qrScanningActive = false;
let qrTorchOn = false;
let qrVideoTrack = null;

const qrOverlay = document.getElementById('qr-overlay');
const qrVideo = document.getElementById('qr-video');
const qrCanvas = document.getElementById('qr-canvas');
const qrCtx = qrCanvas ? qrCanvas.getContext('2d', { willReadFrequently: true }) : null;
const qrCloseBtn = document.getElementById('qr-close-btn');
const qrTorchBtn = document.getElementById('qr-torch-btn');
const qrOverlayHint = document.getElementById('qr-overlay-hint');
const qrOverlayError = document.getElementById('qr-overlay-error');

// BarcodeDetector nativo cuando existe (Chrome/Android, Safari 17+); si no, se usa jsQR
// (vendorizado en /vendor/jsQR.js) para que el escaneo funcione también sin conexión.
const nativeBarcodeDetector = (typeof BarcodeDetector !== 'undefined')
  ? new BarcodeDetector({ formats: ['qr_code'] })
  : null;

function mostrarErrorQR(msg){
  if (!qrOverlayError) return;
  qrOverlayError.textContent = msg;
  qrOverlayError.classList.remove('hidden');
  hapticPulse();
  setTimeout(() => qrOverlayError.classList.add('hidden'), 2200);
}

async function abrirEscanerQR(){
  if (readState === 'found') return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mostrarHintLectura('Este navegador no permite acceder a la cámara. Usa el ingreso manual.');
    return;
  }
  qrOverlayError.classList.add('hidden');
  qrOverlayHint.textContent = 'Apunta la cámara al código QR del activo';
  qrOverlay.classList.remove('hidden');
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch (err) {
    qrOverlay.classList.add('hidden');
    mostrarHintLectura('No se pudo acceder a la cámara. Revisa los permisos e intenta de nuevo.');
    return;
  }
  qrVideo.srcObject = qrStream;
  await qrVideo.play().catch(() => {});
  qrVideoTrack = qrStream.getVideoTracks()[0];
  const capacidades = (qrVideoTrack && qrVideoTrack.getCapabilities) ? qrVideoTrack.getCapabilities() : {};
  qrTorchBtn.classList.toggle('hidden', !capacidades.torch);
  qrScanningActive = true;
  qrRafId = requestAnimationFrame(cicloEscaneoQR);
}

function cerrarEscanerQR(){
  qrScanningActive = false;
  if (qrRafId) cancelAnimationFrame(qrRafId);
  qrRafId = null;
  if (qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
  }
  qrVideoTrack = null;
  qrTorchOn = false;
  qrVideo.srcObject = null;
  qrOverlay.classList.add('hidden');
}

async function toggleTorchQR(){
  if (!qrVideoTrack) return;
  qrTorchOn = !qrTorchOn;
  try {
    await qrVideoTrack.applyConstraints({ advanced: [{ torch: qrTorchOn }] });
  } catch (err) {
    qrTorchOn = !qrTorchOn;
  }
}

async function cicloEscaneoQR(){
  if (!qrScanningActive) return;
  if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA && qrVideo.videoWidth) {
    let codigo = null;
    try {
      if (nativeBarcodeDetector) {
        const resultados = await nativeBarcodeDetector.detect(qrVideo);
        if (resultados && resultados.length) codigo = resultados[0].rawValue;
      } else if (typeof jsQR === 'function') {
        qrCanvas.width = qrVideo.videoWidth;
        qrCanvas.height = qrVideo.videoHeight;
        qrCtx.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
        const frame = qrCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
        const resultado = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
        if (resultado && resultado.data) codigo = resultado.data;
      }
    } catch (err) { /* frame ilegible, se reintenta en el siguiente ciclo */ }

    if (codigo) {
      const idResuelto = extraerCodigoActivo(codigo);
      const manejado = resolverActivoEscaneado(idResuelto, { origen: 'qr' });
      if (manejado) {
        cerrarEscanerQR();
        return;
      }
      mostrarErrorQR('Código no reconocido. Intenta con otro tag.');
    }
  }
  if (qrScanningActive) qrRafId = requestAnimationFrame(cicloEscaneoQR);
}

if (qrCloseBtn) qrCloseBtn.addEventListener('click', cerrarEscanerQR);
if (qrTorchBtn) qrTorchBtn.addEventListener('click', toggleTorchQR);
const btnScanQr = document.getElementById('btn-scan-qr');
if (btnScanQr) btnScanQr.addEventListener('click', abrirEscanerQR);

// Apaga la cámara si la app pasa a segundo plano (batería/privacidad) mientras se escanea.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && qrScanningActive) cerrarEscanerQR();
});

// ================= INGRESO MANUAL DE CÓDIGO (respaldo final) =================
// Último recurso si la cámara falla o el tag está dañado (ver checklist del skill nfc-qr-scanning).
const manualCodeBox = document.getElementById('manual-code-box');
const manualCodeInput = document.getElementById('manual-code-input');
const manualCodeError = document.getElementById('manual-code-error');
const btnManualCode = document.getElementById('btn-manual-code');
const manualCodeSubmit = document.getElementById('manual-code-submit');

if (btnManualCode) {
  btnManualCode.addEventListener('click', () => {
    manualCodeBox.classList.toggle('hidden');
    if (!manualCodeBox.classList.contains('hidden')) manualCodeInput.focus();
  });
}

function intentarCodigoManual(){
  const valor = manualCodeInput.value.trim().toUpperCase();
  if (!valor) return;
  const ok = resolverActivoEscaneado(valor, { origen: 'manual' });
  manualCodeError.classList.toggle('hidden', ok);
  if (!ok) hapticPulse();
}

if (manualCodeSubmit) manualCodeSubmit.addEventListener('click', intentarCodigoManual);
if (manualCodeInput) {
  manualCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarCodigoManual(); });
  manualCodeInput.addEventListener('input', () => manualCodeError.classList.add('hidden'));
}

// ================= ESTADO DE CONEXIÓN (banner offline) =================
// El flujo de campo funciona igual online/offline; este banner solo informa, nunca bloquea
// (ver /tagsense-docs/skills/offline-sync/SKILL.md).
const offlineBanner = document.getElementById('offline-banner');
function actualizarEstadoConexion(){
  if (!offlineBanner) return;
  if (navigator.onLine) {
    if (offlineBanner.classList.contains('show')) {
      offlineBanner.textContent = 'Conexión restablecida';
      offlineBanner.style.background = 'var(--ok)';
      offlineBanner.style.color = '#eafff2';
      setTimeout(() => offlineBanner.classList.remove('show'), 2200);
    }
  } else {
    offlineBanner.textContent = 'Sin conexión — modo offline activo';
    offlineBanner.style.background = 'var(--warn-color)';
    offlineBanner.style.color = '#1a0f05';
    offlineBanner.classList.add('show');
  }
}
window.addEventListener('online', actualizarEstadoConexion);
window.addEventListener('offline', actualizarEstadoConexion);
actualizarEstadoConexion();

// ================= INSTALACIÓN DE LA APP (PWA "descargable") =================
const enModoStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('btn-install-app');
  if (btn) btn.classList.remove('hidden');
});

const btnInstallApp = document.getElementById('btn-install-app');
if (btnInstallApp) {
  btnInstallApp.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    btnInstallApp.classList.add('hidden');
  });
}

window.addEventListener('appinstalled', () => {
  if (btnInstallApp) btnInstallApp.classList.add('hidden');
});

// iOS Safari no dispara 'beforeinstallprompt': se muestra la instrucción manual en su lugar.
if (!enModoStandalone) {
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const esSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
  if (esIOS && esSafari) {
    const hint = document.getElementById('install-ios-hint');
    if (hint) hint.classList.remove('hidden');
  }
}

// ---- Verifica si la app se abrió vía tag NFC (URL con ?activo=ID) ----
const abrioViaNFC = manejarAperturaPorNFC();
if (!abrioViaNFC) iniciarAutoLecturaNFC();

// ---- Registro del Service Worker (PWA instalable + soporte offline) ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // Si falla (ej. abierto como archivo local sin servidor), la app sigue funcionando normal en el navegador
    });
  });
}

