// Höj versionen när du laddar upp nya filer, så hämtar telefonen uppdateringen.
// Tilläggslagren (*-vNN.js) laddas med vanliga <script>-taggar i index.html.
// Materialassistenten laddas direkt av flow-v67.js; service workern behåller även
// navigationsinjektionen som fallback för redan cachelagrade installationer.
// katalog-el.json (Ahlsells prislista) precachas medvetet INTE här — den
// hämtas och cachas lazy av fetch-hanteraren nedan först när materialpanelen
// öppnas, så appen inte drar ner ~9 MB vid varje installation/uppdatering.
const CACHE = 'lirogo-v130';
const EXPORT_CACHE = 'lirogo-export-libs-v63';
const EXPORT_LIBS = [
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];
const CUSTOMER_IMPORT_FILES = [
  './customers-import-1.json','./customers-import-2.json','./customers-import-3.json',
  './customers-import-4.json','./customers-import-5.json','./customers-import-6.json'
];
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './logo-mark.png', './logo-mark-dark.png', './home-v44.js', './home-v44-safe.js', './theme-v46.js', './rot-v51.js', './assignment-v52.js', './report-v53.js', './finish-v55.js', './nav-v56.js', './break-even-v57.js', './customer-report-v58.js', './export-v59.js', './catalog-v60.js', './material-scope-v61.js', './no-demo-v62.js', './backup-v64.js', './document-job-v66.js', './flow-v67.js', './work-v99.js', './before-v100.js', './material-assistant-v83.js', './desktop-v92.js', './stats-v94.js', './barcode-v96.js', './quickflow-v103.js', './price-engine-v105.js', './price-activation-v126.js', './barcode-polyfill.js', './zxing_reader.wasm', ...CUSTOMER_IMPORT_FILES];

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

const norm=v=>(v||'').toString().trim().toLowerCase().replace(/\s+/g,' ');
const digits=v=>(v||'').toString().replace(/\D/g,'');
const sameCustomer=(a,b)=>{
  if(a.customerNumber&&b.customerNumber&&norm(a.customerNumber)===norm(b.customerNumber)) return true;
  if(a.orgNumber&&b.orgNumber&&digits(a.orgNumber)&&digits(a.orgNumber)===digits(b.orgNumber)) return true;
  if(a.email&&b.email&&norm(a.email)===norm(b.email)) return true;
  if(a.name&&b.name&&norm(a.name)===norm(b.name)){
    if(a.address&&b.address&&norm(a.address)===norm(b.address)) return true;
    const ap=digits(a.mobile||a.phone),bp=digits(b.mobile||b.phone);
    if(ap&&bp&&ap===bp) return true;
  }
  return false;
};

async function importLegacyCustomersSW(){
  try{
    if(typeof indexedDB.databases!=='function') return;
    const dbs=await indexedDB.databases();
    if(!dbs.some(d=>d.name==='lirogo')) return;

    const rows=[];
    for(const file of CUSTOMER_IMPORT_FILES){
      const res=await fetch(file+'?v=104',{cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status+' '+file);
      rows.push(...await res.json());
    }

    const incoming=rows.map(r=>({
      customerNumber:r[0]||null,name:r[1]||'',address:r[2]||null,city:r[3]||null,postalCode:r[4]||null,
      phone:r[5]||r[6]||null,mobile:r[6]||null,orgNumber:r[7]||null,vatNumber:r[8]||null,email:r[9]||null
    }));

    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('lirogo');
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    if(!db.objectStoreNames.contains('customers')){ db.close(); return; }

    await new Promise((resolve,reject)=>{
      const tx=db.transaction('customers','readwrite');
      const store=tx.objectStore('customers');
      const get=store.getAll();
      get.onerror=()=>reject(get.error);
      get.onsuccess=()=>{
        const existing=get.result||[];
        const now=new Date().toISOString();
        let serial=0;
        for(const r of incoming){
          if(!r.name) continue;
          const match=existing.find(x=>sameCustomer(x,r));
          if(match){
            const merged={...match};
            ['customerNumber','phone','mobile','email','address','postalCode','city','orgNumber','vatNumber']
              .forEach(k=>{ if(!merged[k]&&r[k]) merged[k]=r[k]; });
            if(typeof merged.isCompany!=='boolean') merged.isCompany=!!(merged.orgNumber||merged.vatNumber);
            if(JSON.stringify(merged)!==JSON.stringify(match)){
              merged.updatedAt=now;
              store.put(merged);
              Object.assign(match,merged);
            }
            continue;
          }
          const c={
            id:'legacy-'+(r.customerNumber||('sw-'+serial+++'-'+Date.now())),
            customerNumber:r.customerNumber,name:r.name,phone:r.phone,mobile:r.mobile,email:r.email,address:r.address,
            postalCode:r.postalCode,city:r.city,saveAsContact:false,isCompany:!!(r.orgNumber||r.vatNumber),
            orgNumber:r.orgNumber,vatNumber:r.vatNumber,invoiceAddress:null,invoicePostalCode:null,invoiceCity:null,
            invoiceReference:null,glnNumber:null,source:'legacy-customer-list-2026-10-03',createdAt:now,updatedAt:now
          };
          store.put(c);
          existing.push(c);
        }
      };
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error('Kundimport avbröts'));
    });
    db.close();
  }catch(err){
    console.warn('Service worker kunde inte importera kunder',err);
  }
}

self.addEventListener('activate', e => {
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== 'lirogo-catalog-v60' && k !== EXPORT_CACHE).map(k => caches.delete(k)));
    await importLegacyCustomersSW();
    await self.clients.claim();
  })());
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
      e.respondWith(caches.match('./katalog-el.json',{ignoreSearch:true}).then(hit=>hit||toNetwork()).catch(unavailable()));
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
