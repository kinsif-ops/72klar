// 72timer – Service Worker
// Oppdater CACHE_NAME når du publiserer ny versjon (f.eks. v1.3, v1.4...)
const CACHE_NAME = '72timer-v1.2';
const FILES_TO_CACHE = [
  './',
  './index.html'
];

// INSTALL – cache filer første gang
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ACTIVATE – slett gamle cacher automatisk
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH – vis cachet versjon offline, hent ny når online
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Returner cachet versjon om tilgjengelig
      if (cachedResponse) {
        // Oppdater cache i bakgrunnen (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      // Ikke i cache – hent fra nett
      return fetch(event.request).catch(() => {
        // Offline og ikke cachet – vis index som fallback
        return caches.match('./index.html');
      });
    })
  );
});
