'use strict';

// Subir este número obliga a los dispositivos ya instalados a descargar la nueva versión
// y purgar la caché anterior (ver evento 'activate').
const CACHE_VERSION = 'v1';
const CACHE_NAME = `tagsense-${CACHE_VERSION}`;

// Todo lo que la app necesita para funcionar sin conexión, incluido el primer arranque offline.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/img/logo-mark.png',
  './assets/img/logo-wide.png',
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
          if (networkResponse && networkResponse.ok) {
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
