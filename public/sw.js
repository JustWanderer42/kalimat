// Keeps the app itself available offline (songs are cached separately by Firestore).
// Network first, so new versions show up as soon as you're online; cache as a fallback.
const CACHE = "kalimat-v5";
const SHELL = ["./", "index.html", "styles.css", "app.js", "lyrics-search.js", "word-export.js", "firebase-config.js", "site.js",
  "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const appFile = url.origin === location.origin && !url.pathname.startsWith("/__/");
  const sdkFile = url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  if (e.request.method !== "GET" || !(appFile || sdkFile)) return;
  e.respondWith(fetch(e.request)
    .then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    })
    .catch(() => caches.match(e.request).then(hit => hit || caches.match("index.html"))));
});
