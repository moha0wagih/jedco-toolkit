/* JEDCO Toolkit — online copy cache.
   First visit downloads each tool once; after that tools open from the device.
   · pages (html): fresh copy when online, saved copy when offline or slow
   · heavy files (js/wasm/images): saved copy right away, refreshed quietly in the background */
const CACHE = 'jedco-toolkit-v4';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('jedco-toolkit-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
const isPage = req => req.mode === 'navigate' || req.destination === 'iframe' || req.destination === 'document' || /\.html?$/.test(new URL(req.url).pathname) || /\/shared\//.test(new URL(req.url).pathname);
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; });
    if (isPage(req)) {
      // fresh page if it arrives within 15s, otherwise the saved one (the fresh one still gets saved)
      if (!hit) return net;
      return Promise.race([net.catch(() => hit), new Promise(res => setTimeout(() => res(hit), 15000))]);
    }
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
