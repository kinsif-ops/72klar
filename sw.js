// 72timer – Service Worker
// Oppdater CACHE_NAME når du publiserer ny versjon (f.eks. v1.4, v1.5...)
const CACHE_NAME = '72timer-v2.1';
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

// FETCH – network-first for HTML (alltid fersk app), cache-first for resten (offline-støtte)
self.addEventListener('fetch', (event) => {
  const isHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // HTML: prøv nett først, fall tilbake på cache om offline
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then(r => r || caches.match('./index.html'));
      })
    );
  } else {
    // Alt annet: cache-first (bilder, fonter, etc.)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => {});
      })
    );
  }
});

// NOTIFICATION CLICK – åpne appen når bruker trykker på varsel
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Fokuser eksisterende vindu hvis åpent
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Ellers åpne nytt vindu
      return clients.openWindow(url);
    })
  );
});
