import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Background sync for POST requests
const bgSyncPlugin = new BackgroundSyncPlugin('leafy-sync-queue', {
  maxRetentionTime: 24 * 60 // Retry for up to 24 hours
});

// API routes that should work offline
registerRoute(
  /\/api\/(products|orders)/,
  new NetworkFirst({
    cacheName: 'leafy-api-cache'
  }),
  'GET'
);

// Queue POST/PUT requests when offline
registerRoute(
  /\/api\/(products|orders)/,
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'leafy-sync-queue') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  const cache = await caches.open('leafy-api-cache');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await fetch(request);
      await cache.put(request, response);
    } catch (error) {
      console.error('Sync failed for:', request.url, error);
    }
  }
}
