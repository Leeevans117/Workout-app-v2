// Network-First Auto-Rebuilding Service Worker (v6)
// Ensures the app always opens cleanly after a cache purge and automatically rebuilds its cache on every launch.
const CACHE_NAME = 'apexpulse-live-cache-v6';
const CORE_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
];

async function rebuildCoreCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      CORE_SHELL_ASSETS.map(async (url) => {
        const response = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
        if (response && response.ok) {
          await cache.put(url, response.clone());
        }
      })
    );
  } catch (err) {
    // Ignore transient offline errors during shell warm-up
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(rebuildCoreCache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => rebuildCoreCache())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'REBUILD_CACHE') {
    event.waitUntil(rebuildCoreCache());
  } else if (event.data.type === 'PURGE_AND_REBUILD_CACHE') {
    event.waitUntil(
      caches
        .keys()
        .then((names) => Promise.all(names.map((n) => caches.delete(n))))
        .then(() => rebuildCoreCache())
        .then(() => {
          if (event.source && 'postMessage' in event.source) {
            event.source.postMessage({ type: 'CACHE_REBUILT', timestamp: Date.now() });
          }
        })
    );
  }
});

// Network-First strategy: Always fetch fresh from the server and update the cache,
// falling back to cache only if the network is unreachable. Never caches API/OAuth requests.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('hot-update') ||
    url.pathname.endsWith('sw.js')
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const copy = networkRes.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
        }
        return networkRes;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }
        throw new Error('Network and cache unavailable');
      })
  );
});

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
        } catch (err) {}
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

