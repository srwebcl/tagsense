'use strict';

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
    offlineBanner.style.color = '#17191A';
    offlineBanner.classList.add('show');
  }
}
window.addEventListener('online', actualizarEstadoConexion);
window.addEventListener('offline', actualizarEstadoConexion);
actualizarEstadoConexion();
