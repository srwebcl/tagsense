'use strict';

// ================= ESCÁNER DE CÓDIGO QR (cámara) =================
// QR es el método primario y universal: funciona en cualquier dispositivo con cámara,
// sin plugins nativos (ver /tagsense-docs/skills/nfc-qr-scanning/SKILL.md).

import { hapticPulse } from './core.js';
import { resolverActivoEscaneado, extraerCodigoActivo, mostrarHintLectura, readState } from './scan.js';

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

export async function abrirEscanerQR(){
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

export function cerrarEscanerQR(){
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
      const manejado = await resolverActivoEscaneado(idResuelto, { origen: 'qr' });
      if (manejado) {
        cerrarEscanerQR();
        return;
      }
      mostrarErrorQR(navigator.onLine ? 'Código no reconocido. Intenta con otro tag.' : 'Sin conexión y activo no visto antes. Intenta con red o ingresa el código manualmente.');
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
