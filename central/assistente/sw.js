// Service worker do Assistente: app próprio, separado da Central (escopo /assistente/).
// Rede primeiro para pegar atualizações; o cache só entra quando o sinal falha.
const CACHE = "assistente-v1";
const BASICO = ["/assistente/", "/assistente/assistente.js", "/nucleo.js", "/assistente/manifest.webmanifest", "/assistente/icone-192.png", "/assistente/icone-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICO)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("assistente-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("/assistente/"))));
});
