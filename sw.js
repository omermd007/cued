const CACHE_NAME = 'cued-pwa-v5';
const POSTER_CACHE_NAME = 'cued-posters-v1';
const MAX_POSTER_CACHE = 80;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './engine.js',
  './app.js',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

async function trimPosterCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_POSTER_CACHE) {
    const excess = keys.length - MAX_POSTER_CACHE;
    await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_NAME, POSTER_CACHE_NAME]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin === 'https://image.tmdb.org') {
    let cacheWriteDone = Promise.resolve();
    const responsePromise = caches.open(POSTER_CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && (response.status === 200 || response.type === 'opaque')) {
              const copy = response.clone();
              cacheWriteDone = cache
                .put(event.request, copy)
                .then(() => trimPosterCache(cache))
                .catch(() => {});
            }
            return response;
          })
          .catch(() => Response.error());
      })
    );

    event.respondWith(responsePromise);
    event.waitUntil(
      responsePromise
        .then(() => cacheWriteDone)
        .catch(() => {})
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  const fetchPromise = fetch(event.request)
    .then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        return caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, copy))
          .catch(() => {})
          .then(() => response);
      }
      return response;
    })
    .catch(() => null);

  event.waitUntil(fetchPromise);
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetchPromise.then((res) => res || Response.error());
    })
  );
});
