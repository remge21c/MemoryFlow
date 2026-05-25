// Cleanup service worker for local/dev sessions that previously registered one.
// MemoryFlow does not currently use an offline service worker, so this file
// replaces any stale registration and lets the browser fall back to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      await self.clients.claim();
      await self.registration.unregister();

      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        clients.map((client) => {
          if ("navigate" in client) {
            return client.navigate(client.url);
          }

          return undefined;
        }),
      );
    })(),
  );
});

