const CACHE_NAME = "cerre-pro-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia Stale-While-Revalidate
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Acciones directas desde la notificación del sistema
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana abierta, le enviamos la acción
      if (clientList.length > 0) {
        const client = clientList[0];
        if (action === "confirm" || action === "snooze") {
          client.postMessage({
            type: "NOTIFICATION_ACTION",
            action,
            itemId: data.itemId
          });
        }
        if (action !== "confirm" && "focus" in client) {
          return client.focus();
        }
        return;
      }

      // Si la app estaba cerrada, abrimos pasando parámetros en la URL
      if (clients.openWindow) {
        const params = new URLSearchParams();
        if (action) params.set("notif_action", action);
        if (data.itemId) params.set("item_id", data.itemId);
        const query = params.toString() ? `?${params.toString()}` : "";
        return clients.openWindow(`./index.html${query}`);
      }
    })
  );
});
