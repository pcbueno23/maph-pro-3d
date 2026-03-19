// Versão do cache para forçar atualização do PWA em celulares já instalados.
const CACHE_NAME = "precifica3d-cache-v2";
const OFFLINE_URLS = ["/", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    }),
  );
  // Permite que o novo SW substitua o antigo imediatamente após instalar.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey)),
      ),
    ),
  );
  // Passa a controlar as páginas abertas imediatamente.
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => caches.match("/"));
    }),
  );
});

