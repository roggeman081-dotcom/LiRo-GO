// Höj versionen när du laddar upp nya filer, så hämtar telefonen uppdateringen.
// katalog-el.json (Ahlsells prislista) precachas medvetet INTE här — den
// hämtas och cachas lazy av fetch-hanteraren nedan först när materialpanelen
// öppnas, så appen inte drar ner ~9 MB vid varje installation/uppdatering.
const CACHE = 'lirogo-v45';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './logo-mark.png', './logo-mark-dark.png', './home-v44.js', './home-v44-safe.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function injectHomeOverlay(res){
  if(!res) return res;
  return res.clone().text().then(text => {
    if(!text.includes('home-v44.js')){
      text = text.replace('</body>', '<script src="./home-v44.js"></script>\n<script src="./home-v44-safe.js"></script>\n</body>');
    } else if(!text.includes('home-v44-safe.js')){
      text = text.replace('</body>', '<script src="./home-v44-safe.js"></script>\n</body>');
    }
    return new Response(text, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  const url = new URL(req.url);
  const isNavigation = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  if(isNavigation){
    e.respondWith(
      caches.match('./index.html').then(hit => {
        const source = hit || fetch('./index.html');
        return Promise.resolve(source).then(injectHomeOverlay);
      }).catch(() => caches.match('./index.html').then(injectHomeOverlay))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});
