'use strict';

// Subir este número obliga a los dispositivos ya instalados a descargar la nueva versión
// y purgar la caché anterior (ver evento 'activate').
const CACHE_VERSION = 'v6';
const CACHE_NAME = `tagsense-${CACHE_VERSION}`;

// Todo lo que la app necesita para funcionar sin conexión, incluido el primer arranque offline.
// './' ya se puede precachear directamente: next.config.ts sirve index.html en "/" vía
// rewrite (no redirect), así que la respuesta no viene marcada como "redirected" y
// Chromium la acepta sin problema vía respondWith() en una navegación.
//
// app.js (un solo archivo de 3300+ líneas) se partió en módulos ES reales —
// cada uno se lista acá explícito porque el navegador los pide todos al cargar
// main.js (import estático), y el primer arranque offline necesita tenerlos
// ya en caché, no solo "probablemente cacheados" por la estrategia de abajo.
const PRECACHE_URLS = [
  './',
  './index.html',
  './favicon.ico',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/main.js',
  './assets/js/core.js',
  './assets/js/scan.js',
  './assets/js/qr.js',
  './assets/js/manual-code.js',
  './assets/js/auth.js',
  './assets/js/asistente.js',
  './assets/js/ui-misc.js',
  './assets/js/documentos.js',
  './assets/js/instructivos.js',
  './assets/js/componentes.js',
  './assets/js/solicitudes.js',
  './assets/js/historial.js',
  './assets/js/informe-state.js',
  './assets/js/informe-form.js',
  './assets/js/informe-pdf.js',
  './assets/js/informe-sync.js',
  './assets/js/connection.js',
  './assets/js/pwa-install.js',
  './assets/img/logo-mark.png',
  './assets/img/logo-tagsense.png',
  './assets/img/logo-tagsense-dark.png',
  './assets/img/truck-mt65s.png',
  './assets/img/plano-hidraulico.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './vendor/jspdf.umd.min.js',
  './vendor/jsQR.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((nombre) => nombre.startsWith('tagsense-') && nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      ))
      .then(() => self.clients.claim())
  );
});

// Estrategia: cache-first para todo lo del propio origen (app shell 100% offline),
// con actualización silenciosa en segundo plano cuando hay red disponible (stale-while-revalidate).
// Las peticiones a otros orígenes (ej. compartir por WhatsApp) no se interceptan.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          // Nunca cachear una respuesta redirigida bajo la URL original: Chromium rechaza
          // (net::ERR_FAILED) servir una respuesta "redirected" vía respondWith() a una
          // navegación (ej. si algún día se agrega un redirect real a alguna ruta).
          if (networkResponse && networkResponse.ok && !networkResponse.redirected) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) return cachedResponse;

      return networkFetch.then((networkResponse) => {
        if (networkResponse) return networkResponse;
        // Sin caché y sin red: si es una navegación, servir el shell de la app igual.
        if (request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline y sin caché disponible' });
      });
    })
  );
});
