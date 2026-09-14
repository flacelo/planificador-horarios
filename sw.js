const CACHE = "planify-cache-v190";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./js/app.js",
  "./js/app.js?v=7.82",
  "./js/trust-fixes.js?v=1.3",
  "./js/welcome-flow.js?v=1.17",
  "./css/main.css",
  "./css/panel.css",
  "./css/dashboard.css",
  "./css/grid.css",
  "./css/trust-fixes.css?v=1.3",
  "./css/welcome-flow.css?v=1.13"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.url.includes("qrserver.com")) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 200 })));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached ||
    fetch(event.request).then(response => caches.open(CACHE).then(cache => {
      cache.put(event.request, response.clone());
      return response;
    })).catch(() => new Response("Sin conexión", { status: 200 }))
  ));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window" }).then(windows => {
    if (windows.length) windows[0].focus();
    else clients.openWindow(".");
  }));
});
