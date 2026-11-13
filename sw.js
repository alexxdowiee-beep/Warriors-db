// Service worker: makes the app work offline after one visit (docs/APP_BRIEF.md, step 6).
//
// On install it caches the app shell (SHELL below) and every file of the data bundle, listed in
// data/sw-version.js, which scripts/export_app.py writes. Because that file is imported here, a new
// export changes the service worker, so the browser installs the new version and swaps the cache.
// Requests are answered from the cache first; nothing is ever fetched from another site.

importScripts('data/sw-version.js'); // defines self.BUNDLE_VERSION and self.BUNDLE_FILES

const SHELL_VERSION = 1; // raise when the shell list changes without a data export
const CACHE = `wl-${SHELL_VERSION}-${self.BUNDLE_VERSION}`;

// Every file of the app except data/ (tests/test_app_shell.py checks this list is complete).
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/fonts.css',
  'css/tokens.css',
  'css/app.css',
  'js/main.js',
  'js/data.js',
  'js/components.js',
  'js/claims.js',
  'js/markdown.js',
  'js/search.js',
  'js/timeline.js',
  'js/views/home.js',
  'js/views/pending.js',
  'js/views/person.js',
  'js/views/records.js',
  'js/views/search.js',
  'fonts/alegreya-italic-latin-ext.woff2',
  'fonts/alegreya-italic-latin.woff2',
  'fonts/alegreya-italic-vietnamese.woff2',
  'fonts/alegreya-normal-latin-ext.woff2',
  'fonts/alegreya-normal-latin.woff2',
  'fonts/alegreya-normal-vietnamese.woff2',
  'fonts/cinzel-normal-latin-ext.woff2',
  'fonts/cinzel-normal-latin.woff2',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const files = [...SHELL, ...self.BUNDLE_FILES.map((f) => `data/${f}`)];
    // fetch fresh copies, bypassing the HTTP cache, so the new cache matches this version exactly
    await cache.addAll(files.map((f) => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('wl-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(event.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(event.request);
    } catch (err) {
      // offline and not cached: for page loads fall back to the app itself
      if (event.request.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
