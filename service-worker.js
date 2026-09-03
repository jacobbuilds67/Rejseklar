const CACHE_VERSION = "rejseklar-shell-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/styles/tokens.css",
  "./assets/styles/base.css",
  "./assets/styles/components.css",
  "./src/app.js",
  "./src/backup/backup-service.js",
  "./src/config.js",
  "./src/data/initial-master-data.js",
  "./src/data/seed-service.js",
  "./src/domain/flight-check-service.js",
  "./src/domain/preparation-service.js",
  "./src/domain/quantity-calculator.js",
  "./src/domain/settings-service.js",
  "./src/domain/trip-service.js",
  "./src/domain/validation.js",
  "./src/router.js",
  "./src/storage/database.js",
  "./src/storage/repositories.js",
  "./src/ui/backup-screen.js",
  "./src/ui/history-screen.js",
  "./src/ui/html.js",
  "./src/ui/offline-screen.js",
  "./src/ui/screens.js",
  "./src/ui/settings-screen.js",
  "./src/ui/trip-screen.js",
  "./src/ui/notifications.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put("./index.html", response.clone());
    return response;
  } catch {
    return (await caches.match("./index.html")) || Response.error();
  }
}

async function assetResponse(request) {
  const cached = await caches.match(request);
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
      return response;
    }
    return cached || response;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(navigationResponse(event.request));
    return;
  }
  event.respondWith(assetResponse(event.request));
});
