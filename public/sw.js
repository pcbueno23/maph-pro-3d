// Versão do cache — incremente ao mudar estratégia (clientes antigos limpam caches velhos).
const CACHE_NAME = "precifica3d-cache-v4";
const OFFLINE_URLS = ["/", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    }),
  );
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
  self.clients.claim();
});

/** Navegação de página inteira (F5 / abrir URL): rede primeiro, senão cache (offline). */
function isFullPageNavigation(request) {
  if (request.method !== "GET") return false;
  if (request.mode === "navigate") return true;
  // Alguns browsers / cenários
  if (request.destination === "document") return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isFullPageNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((c) => c || caches.match("/") || caches.match("/login")),
        ),
    );
    return;
  }

  // Demais recursos: cache primeiro, depois rede (comportamento anterior).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => caches.match("/"));
    }),
  );
});
