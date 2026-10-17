'use strict';

// ================= INGRESO MANUAL DE CÓDIGO (respaldo final) =================
// Último recurso si la cámara falla o el tag está dañado (ver checklist del skill nfc-qr-scanning).

import { hapticPulse } from './core.js';
import { resolverActivoEscaneado } from './scan.js';

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

async function intentarCodigoManual(){
  const valor = manualCodeInput.value.trim().toUpperCase();
  if (!valor) return;
  manualCodeSubmit.disabled = true;
  try {
    const ok = await resolverActivoEscaneado(valor, { origen: 'manual' });
    manualCodeError.textContent = navigator.onLine
      ? 'Código no encontrado. Verifica e intenta nuevamente.'
      : 'Sin conexión y activo no visto antes. Intenta con red o verifica el código.';
    manualCodeError.classList.toggle('hidden', ok);
    if (!ok) hapticPulse();
  } finally {
    manualCodeSubmit.disabled = false;
  }
}

if (manualCodeSubmit) manualCodeSubmit.addEventListener('click', intentarCodigoManual);
if (manualCodeInput) {
  manualCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarCodigoManual(); });
  manualCodeInput.addEventListener('input', () => manualCodeError.classList.add('hidden'));
}
