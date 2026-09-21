// The Blueprint — service worker
// Page: network-first (always shows the latest version when online, cached copy offline)
// Icons + manifest: cache-first (rarely change)
const CACHE_NAME = 'blueprint-v3';
const CORE_ASSETS = ['./', './index.html', './manifest.json'];
const OPTIONAL_ASSETS = ['./icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(CORE_ASSETS).then(() =>
        // Icons are cached individually so one missing file can't break install
        Promise.all(OPTIONAL_ASSETS.map(url => cache.add(url).catch(() => {})))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Let cross-origin requests (Google Fonts, store links) go straight to the network
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || req.destination === 'document';

  if (isPage) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then(hit => hit || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return res;
    }))
  );
});
