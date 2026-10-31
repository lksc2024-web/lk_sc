// Service worker: deixa a Central instalável e abre mesmo com sinal fraco.
// Rede primeiro (pega atualizações); cache só como reserva. /api e /r nunca são guardados.
const CACHE = "central-v8";
const BASICO = ["/", "/app.js", "/cena3d.js", "/regiao.js", "/styles.css", "/manifest.webmanifest", "/icone-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICO)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Compartilhar do celular (texto ou print do WhatsApp) para a Central
  if (e.request.method === "POST" && url.pathname === "/compartilhar") {
    e.respondWith((async () => {
      const dados = await e.request.formData();
      const p = new URLSearchParams();
      ["titulo", "texto", "link"].forEach((k) => { const v = dados.get(k); if (v) p.set(k, String(v)); });
      const img = dados.get("imagem");
      if (img && img.size) { const c = await caches.open("central-compartilhado"); await c.put("/__compartilhado", new Response(img)); p.set("compartilhado", "img"); }
      else p.set("compartilhado", "texto");
      return Response.redirect("/?" + p.toString() + "#responder", 303);
    })());
    return;
  }
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/r/")) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("/"))));
});
