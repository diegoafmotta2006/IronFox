const CACHE_VERSION = "5.8.4";
const CACHE_NAME = `ironfox-v${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=5.8.4",
  "./manifest.webmanifest",
  "./src/app.js?v=5.8.4",
  "./src/config.js?v=5.8.4",
  "./src/dom.js?v=5.8.4",
  "./src/screens/index.js?v=5.8.4",
  "./src/screens/home.js?v=5.8.4",
  "./src/screens/day.js?v=5.8.4",
  "./src/screens/account.js?v=5.8.4",
  "./src/lib/dates.js?v=5.8.4",
  "./src/lib/workouts.js?v=5.8.4",
  "./src/lib/firebase.js?v=5.8.4",
  "./src/lib/sync.js?v=5.8.4",
  "./icons/favicon.svg",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  // HTML e navegação nunca podem vir do cache HTTP do navegador: o
  // index.html tem max-age e, sem isso, o aparelho fica preso na versão
  // antiga (com os ?v=5.8.4"navigate" || request.destination === "document";
  try {
    const response = mustRevalidate
      ? await fetch(request.url, { cache: "no-store", credentials: "same-origin" })
      : await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const fallback = await cache.match("./index.html");
      if (fallback) return fallback;
    }
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});
