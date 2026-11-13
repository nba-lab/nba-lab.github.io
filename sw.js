/* NBA LAB — service worker (lo que convierte la web en app instalable).
   Estrategia: primero la red, para que los datos de cada mañana salgan siempre al día.
   Si no hay conexión, se usa la última copia guardada. Las fotos y fuentes se guardan
   en caché para que la app cargue rápido. */
var VERSION = "nbalab-v1";
var CORE = ["/", "/index.html", "/offline.html", "/styles.css", "/main.js", "/lib/manifest.js",
            "/assets/img/favicon.svg", "/assets/img/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("nbalab-") === 0 && k !== VERSION && k !== VERSION + "-ext"; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function limpiar(cache, max) {
  cache.keys().then(function (ks) { if (ks.length > max) cache.delete(ks[0]).then(function () { limpiar(cache, max); }); });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Fotos de jugadores y fuentes de Google: caché primero (casi nunca cambian)
  if (/(^|\.)cdn\.nba\.com$/.test(url.hostname) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION + "-ext").then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === "opaque")) { c.put(req, r.clone()); limpiar(c, 400); } return r; })
          .catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Todo lo de la web: red primero, copia guardada si no hay conexión
  e.respondWith(fetch(req).then(function (r) {
    if (r && r.ok) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); limpiar(c, 300); }); }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(function (hit) {
      if (hit) return hit;
      if (url.pathname.indexOf("/data/") === 0) return caches.match(req, { ignoreSearch: true });
      if (req.mode === "navigate") return caches.match("/offline.html");
    });
  }));
});
