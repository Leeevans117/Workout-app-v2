// Safe Non-Intercepting PWA Service Worker (v4)
// Immediately clears any stale caches so the latest build always loads cleanly
const CACHE_NAME = 'apexpulse-pwa-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
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

self.addEventListener('fetch', () => {
  // Never return stale cached HTML or module scripts
});
