'use strict';

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

// ---- Registro del Service Worker (PWA instalable + soporte offline) ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // Si falla (ej. abierto como archivo local sin servidor), la app sigue funcionando normal en el navegador
    });
  });
}
