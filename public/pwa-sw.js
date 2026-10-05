// PWA Service Worker for Android WebAPK, Desktop Chrome Installability & Notification Dashboard Routing
const CACHE_NAME = 'apexpulse-pwa-v3';

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of PRECACHE_URLS) {
        try {
          const response = await fetch(url, { credentials: 'include', cache: 'no-cache' });
          if (response && response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (err) {
          // Ignore individual asset failure
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Clicking any notification opens/focuses the app and routes directly to the Dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?tab=dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        try {
          client.postMessage({ type: 'NAVIGATE_DASHBOARD' });
          if ('navigate' in client) {
            await client.navigate(targetUrl).catch(() => {});
          }
          if ('focus' in client) {
            return client.focus();
          }
        } catch (err) {
          // continue
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isPWAStaticAsset =
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/pwa-192x192.png' ||
    url.pathname === '/pwa-512x512.png' ||
    url.pathname === '/pwa-maskable-512x512.png' ||
    url.pathname === '/icon.svg';

  if (isPWAStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request, { credentials: 'include' })
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match('/'))
    )
  );
});
