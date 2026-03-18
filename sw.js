// 72timer – Service Worker
// Oppdater CACHE_NAME når du publiserer ny versjon (f.eks. v2.1, v2.2...)
const CACHE_NAME = '72timer-v4.11';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './og-image.png'
];

// Fonts to cache for offline use
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
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

// FETCH – network-first for HTML, cache-first for fonts & assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');
  const isFont = FONT_ORIGINS.some(origin => event.request.url.startsWith(origin));

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
  } else if (isFont) {
    // Fonter: cache-first med stale-while-revalidate (kritisk for offline)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {});
        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // Alt annet: cache-first (bilder, API-svar, etc.)
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
