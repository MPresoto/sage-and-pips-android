const CACHE = "sage-pips-iphone-v1";
const FILES = [
  "./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./pet_feed.png", "./pet_drink.png", "./pet_tummy.png", "./pet_sleep.png",
  "./pet_play.png", "./pet_zoomies.png", "./pet_wrestle.png",
  "./cat_meow.mp3", "./cat_purr.mp3"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
