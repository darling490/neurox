// ============================================================
// NeuroX v2.0 Service Worker — Offline caching
// ============================================================

const CACHE_NAME = 'neurox-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/ai-engine.js',
  './js/chat.js',
  './js/image-creator.js',
  './js/video-creator.js',
  './js/storage.js',
  './js/ui.js',
  './js/voice.js',
  './js/tools.js',
  './js/conversations.js',
  './manifest.json',
];

// Install — cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first, network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and CDN requests (let WebLLM handle its own caching)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't cache CDN resources (WebLLM loads from esm.run / huggingface)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
