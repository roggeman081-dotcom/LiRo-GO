// Höj versionen när du laddar upp nya filer, så hämtar telefonen uppdateringen.
// Tilläggslagren (*-vNN.js) laddas med vanliga <script>-taggar i index.html.
// Materialassistenten laddas direkt av flow-v67.js; service workern behåller även
// navigationsinjektionen som fallback för redan cachelagrade installationer.
// katalog-el.json (Ahlsells prislista) precachas medvetet INTE här — den
// hämtas och cachas lazy av fetch-hanteraren nedan först när materialpanelen
// öppnas, så appen inte drar ner ~9 MB vid varje installation/uppdatering.
const CACHE = 'lirogo-v101';
const EXPORT_CACHE = 'lirogo-export-libs-v63';
const EXPORT_LIBS = [
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './logo-mark.png', './logo-mark-dark.png', './home-v44.js', './home-v44-safe.js', './theme-v46.js', './rot-v51.js', './assignment-v52.js', './report-v53.js', './finish-v55.js', './nav-v56.js', './break-even-v57.js', './customer-report-v58.js', './export-v59.js', './catalog-v60.js', './material-scope-v61.js', './no-demo-v62.js', './backup-v64.js', './document-job-v66.js', './flow-v67.js', './work-v99.js', './before-v100.js', './material-assistant-v83.js', './desktop-v92.js', './stats-v94.js', './barcode-v96.js', './barcode-polyfill.js', './zxing_reader.wasm'];

self.addEventListener('install', e => {
  e.waitUntil((async()=>{
    const appCache=await caches.open(CACHE);
    await appCache.addAll(FILES.map(f => new Request(f, {cache:'reload'})));

    try{
      const exportCache=await caches.open(EXPORT_CACHE);
      await exportCache.addAll(EXPORT_LIBS.map(url=>new Request(url,{mode:'cors',cache:'reload'})));
    }catch(err){
      console.warn('Kunde inte precacha exportbiblioteken',err);
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'lirogo-catalog-v60' && k !== EXPORT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req=e.request;
  if(req.method!=='GET' || new URL(req.url).origin!==location.origin) return;

  const url=new URL(req.url);
  const isNavigation=req.mode==='navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  const isCatalog=url.pathname.endsWith('/katalog-el.json');

  if(isNavigation){
    e.respondWith(
      caches.match('./index.html').then(hit=>hit || fetch('./index.html'))
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  if(isCatalog){
    const toNetwork=()=>fetch(req).then(res=>{
      if(!res.ok) throw new Error('HTTP '+res.status);
      const copy=res.clone();
      caches.open('lirogo-catalog-v60').then(cache=>cache.put('./katalog-el.json',copy));
      return res;
    });
    const unavailable=()=>new Response(JSON.stringify({error:'catalog-unavailable'}),{
      status:503,headers:{'Content-Type':'application/json'}
    });
    if(url.searchParams.has('refresh')){
      e.respondWith(toNetwork().catch(async()=>(await caches.match('./katalog-el.json',{ignoreSearch:true}))||unavailable()));
    }else{
      e.respondWith(caches.match('./katalog-el.json',{ignoreSearch:true}).then(hit=>hit||toNetwork()).catch(unavailable));
    }
    return;
  }

  e.respondWith(
    caches.match(req,{ignoreSearch:true}).then(hit=>{
      const net=fetch(req).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy));
        }
        return res;
      });
      return hit || net;
    })
  );
});