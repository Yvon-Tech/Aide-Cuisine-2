/* =========================================================
   Assistant Cuisine — service worker
   - Garde l'application en cache après la première visite.
   - Ne met JAMAIS en cache les appels à l'IA (/api/…).
   - Hors connexion : affiche la page en cache.
   Pour forcer une mise à jour chez tout le monde,
   change le numéro de VERSION ci-dessous.
   ========================================================= */
const VERSION = 'v1';
const CACHE = 'assistant-cuisine-' + VERSION;

const SHELL = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.webmanifest',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/apple-touch-icon.png',
  'assets/sonnerie.mp3'      // facultatif : ignoré s'il n'existe pas
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Un fichier manquant (ex. sonnerie.mp3) ne doit pas bloquer l'installation.
    await Promise.all(SHELL.map(async url => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, res);
      } catch (e) { /* ignoré */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('assistant-cuisine-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Réseau d'abord (contenu à jour), cache si le réseau échoue ou traîne.
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, rej) => setTimeout(() => rej(new Error('lent')), 4000))
    ]);
    if (res && res.status === 200) cache.put(request, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(request)) || (fallbackUrl && await cache.match(fallbackUrl)) ||
      new Response('Hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

// Les navigateurs lisent le son par morceaux (en-tête Range) : on répond avec la bonne tranche du fichier en cache.
async function rangeResponse(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request.url);
  if (!cached) return fetch(request);
  const buf = await cached.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  let start = 0, end = size - 1;
  if (m && m[1] !== '') { start = +m[1]; if (m[2] !== '') end = +m[2]; }
  else if (m && m[2] !== '') { start = Math.max(0, size - +m[2]); }
  end = Math.min(end, size - 1);
  if (start > end) return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1)
    }
  });
}

// Cache d'abord, mise à jour en arrière-plan.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(res => {
    if (res && (res.status === 200 || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await refresh) || new Response('', { status: 504 });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices Google : en cache pour que le texte garde son style hors ligne
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;     // IA et config : toujours le réseau

  if (req.headers.has('range')) {
    event.respondWith(rangeResponse(req));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, 'index.html'));
    return;
  }
  event.respondWith(staleWhileRevalidate(req));
});

// Un appui sur la notification ramène l'utilisateur dans l'application
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { await c.focus(); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow('./');
  })());
});
