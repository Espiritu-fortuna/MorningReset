const CACHE = 'morningreset-v3';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './routine.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './audio/manifest.json'
];
const APP_SHELL = new Set(SHELL.map((path) => new URL(path, self.location.origin + self.location.pathname).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isShellAsset = APP_SHELL.has(url.pathname);
  const isAudioAsset = url.pathname.includes('/audio/');

  if (isShellAsset) {
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  if (isAudioAsset) {
    event.respondWith(cacheFirst(event.request, './index.html'));
    return;
  }

  event.respondWith(networkFirst(event.request, './index.html'));
});

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match(fallbackPath);
  }
}

async function cacheFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    return caches.match(fallbackPath);
  }
}
