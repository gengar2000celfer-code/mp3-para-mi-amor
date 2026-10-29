const V = "playlist-v3"; // sube el número (v2, v3...) cada vez que cambies archivos
const CORE = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];
// Escribe aquí TODOS tus mp3, igual que en index.html:
const SONGS = [
  // "musica/cancion1.mp3",
  // "musica/cancion2.mp3",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll([...CORE, ...SONGS])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    let res = await c.match(r.url);
    if (!res) {
      try {
        res = await fetch(r);
        // guarda también las fuentes de Google (respuesta "opaca") para verlas offline
        if ((res.ok || res.type === "opaque") && !r.headers.get("range")) c.put(r.url, res.clone());
      } catch (err) { return (await c.match("index.html")) || Response.error(); }
    }
    const rg = r.headers.get("range");
    if (rg && res.status === 200) { // el audio pide pedacitos (Range); los armamos desde el caché
      const b = await res.blob(), m = /bytes=(\d*)-(\d*)/.exec(rg);
      const s = +m[1] || 0, en = m[2] ? +m[2] : b.size - 1;
      return new Response(b.slice(s, en + 1), { status: 206, headers: {
        "Content-Type": res.headers.get("Content-Type") || "audio/mpeg",
        "Content-Range": `bytes ${s}-${en}/${b.size}`, "Content-Length": en - s + 1 } });
    }
    return res;
  })());
});
