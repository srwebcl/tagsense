'use strict';

// Login real contra Neon Auth (vía el proxy same-origin /api/auth/*) + el gate
// de sesión que se usa antes de abrir la ficha técnica completa o generar un
// informe. El primer login siempre necesita conexión (no hay forma de validar
// una contraseña contra el servidor sin red) — el resto del flujo de campo
// después de loguearse sigue funcionando 100% offline (ver /skills/offline-sync/SKILL.md).

import { hapticPulse, goTo, welcomeName } from './core.js';
import { iniciarModoLectura, activoActualId } from './scan.js';
import { cargarSolicitudes } from './solicitudes.js';
import { abrirFormularioInforme } from './informe-form.js';

export const emailInput = document.getElementById('email-input');
export const passwordInput = document.getElementById('password-input');
const pwToggle = document.getElementById('pw-toggle');
const accessBtn = document.getElementById('access-btn');

pwToggle.addEventListener('click', () => {
  const showing = pwToggle.classList.toggle('showing');
  passwordInput.type = showing ? 'text' : 'password';
  pwToggle.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

export function nombreDesdeCorreo(correo){
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

function mostrarErrorLogin(mensaje){
  const emailWrap = emailInput.closest('.input-wrap');
  const passWrap = passwordInput.closest('.input-wrap');
  const errorMsg = document.getElementById('login-error');
  emailWrap.classList.add('invalid');
  passWrap.classList.add('invalid');
  errorMsg.textContent = mensaje;
  errorMsg.classList.remove('hidden');
  hapticPulse();
}

let sessionAuthenticated = false; // true tras confirmar sesión (login o cookie válida al cargar)
// Qué hacer tras el login: 'ficha' (abrir la ficha técnica) o 'informe' (abrir
// el formulario de informe) — se pide login solo en esos dos puntos, nunca
// para identificar el activo (ver open-ficha-2 y report-fab).
let pendingDestino = null;

accessBtn.addEventListener('click', async () => {
  const correoIngresado = emailInput.value.trim().toLowerCase();
  const claveIngresada = passwordInput.value;
  const emailWrap = emailInput.closest('.input-wrap');
  const passWrap = passwordInput.closest('.input-wrap');
  const errorMsg = document.getElementById('login-error');

  if (!correoIngresado || !claveIngresada) {
    mostrarErrorLogin('Ingresa tu correo y contraseña.');
    return;
  }

  if (!navigator.onLine) {
    mostrarErrorLogin('Necesitas conexión para iniciar sesión la primera vez. Intenta de nuevo con señal.');
    return;
  }

  accessBtn.disabled = true;

  try {
    const resp = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correoIngresado, password: claveIngresada }),
    });
    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data || !data.user) {
      mostrarErrorLogin('Correo o contraseña incorrectos. Intenta nuevamente.');
      return;
    }

    emailWrap.classList.remove('invalid');
    passWrap.classList.remove('invalid');
    errorMsg.classList.add('hidden');

    const nombre = data.user.name || nombreDesdeCorreo(correoIngresado);
    welcomeName.textContent = nombre || 'usuario';
    sessionAuthenticated = true;

    // El login se pidió a mitad de camino (al abrir la ficha técnica o generar
    // un informe, no al entrar a la app) — tras autenticar, se retoma justo
    // donde el técnico quedó en vez de mandarlo de vuelta al escáner.
    if (pendingDestino === 'ficha') {
      pendingDestino = null;
      goTo('step-confirm-3');
      cargarSolicitudes();
    } else if (pendingDestino === 'informe') {
      pendingDestino = null;
      abrirFormularioInforme();
    } else {
      goTo('step-read');
      iniciarModoLectura();
    }
  } catch (err) {
    mostrarErrorLogin('No se pudo conectar con el servidor. Intenta nuevamente.');
  } finally {
    accessBtn.disabled = false;
  }
});

// El login ahora se pide a mitad de camino (no al entrar a la app), así que
// hace falta poder cancelarlo y volver a donde estaba el técnico sin loguearse.
document.getElementById('back-from-access').addEventListener('click', () => {
  pendingDestino = null;
  goTo(activoActualId ? 'step-confirm-2' : 'step-read');
});

[emailInput, passwordInput].forEach(input => {
  input.addEventListener('input', () => {
    input.closest('.input-wrap').classList.remove('invalid');
    document.getElementById('login-error').classList.add('hidden');
  });
});

// ---- Navegación ficha técnica ----
// Puerta de acceso para "Abrir ficha técnica" y "Generar informe": la sesión
// se confirma en segundo plano al arrancar (ver iniciarApp), así que si el
// técnico escaneó y tocó uno de estos botones muy rápido, sessionAuthenticated
// podría no estar actualizado todavía aunque la cookie siga siendo válida —
// por eso se vuelve a confirmar en vivo antes de mandarlo al login.
export async function requiereLogin(destino){
  if (sessionAuthenticated) return false;
  sessionAuthenticated = await verificarSesionActual();
  if (sessionAuthenticated) return false;
  pendingDestino = destino;
  goTo('step-access');
  return true;
}

// ---- Arranque: confirma sesión en segundo plano, sin bloquear el escaneo ----
// Identificar un activo (QR/NFC/código manual) es público — no requiere sesión,
// ver app/api/public/assets/[tag_code]/route.ts. El login solo se pide más
// adelante, al abrir la ficha técnica o generar un informe (open-ficha-2,
// report-fab).
export async function verificarSesionActual(){
  if (!navigator.onLine) return false; // sin red no hay forma de validar la sesión
  try {
    const resp = await fetch('/api/auth/get-session');
    if (!resp.ok) return false;
    const data = await resp.json();
    if (data && data.user) {
      welcomeName.textContent = data.user.name || nombreDesdeCorreo(data.user.email) || 'usuario';
      return true;
    }
  } catch (err) { /* backend caído o sin red: se trata como sesión no confirmada */ }
  return false;
}

export async function confirmarSesionInicial(){
  sessionAuthenticated = await verificarSesionActual();
  return sessionAuthenticated;
}
