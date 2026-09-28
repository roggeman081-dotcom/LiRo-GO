/* LiRo GO v60 – robust prislista.
   Retry, validering och offline-cache utan att någonsin falla tillbaka till index.html. */
(function(){
  if(window._liroCatalogV60) return;
  window._liroCatalogV60=true;

  let catalogPromiseV60=null;

  function validCatalogV60(data){
    return Array.isArray(data) && data.length>0 && Array.isArray(data[0]) && data[0].length>=4;
  }

  const CATALOG_CACHE_V60='lirogo-catalog-v60';
  const REFRESH_KEY_V78='lirogo_catalog_refreshed_v78';
  const REFRESH_MS_V78=7*24*3600*1000; // kolla efter ny prislista högst en gång i veckan

  function parseCatalogTextV60(text,ct){
    const first=String(text||'').trim()[0];
    if((String(ct||'').toLowerCase().includes('text/html')||first==='<')) throw new Error('Prislistan fick HTML istället för JSON');
    const data=JSON.parse(text);
    if(!validCatalogV60(data)) throw new Error('Ogiltigt format på prislistan');
    return data;
  }

  // v78: läs den lokala kopian först så att prislistan fungerar i källare/ställverk utan täckning
  // och inte drar ner 9 MB mobildata varje gång materialpanelen öppnas.
  async function readCachedCatalogV78(){
    try{
      const cached=await caches.match('./katalog-el.json',{ignoreSearch:true});
      if(!cached) return null;
      return parseCatalogTextV60(await cached.text(),cached.headers.get('content-type'));
    }catch{ return null; }
  }

  async function downloadCatalogV78(){
    // ?refresh gör att service workern går mot nätet istället för sin cache.
    const res=await fetch('./katalog-el.json?refresh='+Date.now(),{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const text=await res.text();
    const data=parseCatalogTextV60(text,res.headers.get('content-type'));
    try{
      const cache=await caches.open(CATALOG_CACHE_V60);
      await cache.put('./katalog-el.json',new Response(text,{headers:{'Content-Type':'application/json'}}));
    }catch{}
    try{ localStorage.setItem(REFRESH_KEY_V78,String(Date.now())); }catch{}
    return data;
  }

  function refreshDueV78(){
    let last=0; try{ last=Number(localStorage.getItem(REFRESH_KEY_V78))||0; }catch{}
    return Date.now()-last>REFRESH_MS_V78;
  }

  async function fetchCatalogResponseV60(){
    const cached=await readCachedCatalogV78();
    if(cached){
      if(navigator.onLine!==false && refreshDueV78()){
        downloadCatalogV78().then(data=>{ catalog=data; }).catch(()=>{});
      }
      return cached;
    }
    return downloadCatalogV78();
  }

  // v78: ladda ner prislistan i bakgrunden första gången appen har nät,
  // så den finns offline även om materialpanelen aldrig öppnats med täckning.
  setTimeout(async()=>{
    try{
      if(navigator.onLine===false || validCatalogV60(catalog)) return;
      if(await caches.match('./katalog-el.json',{ignoreSearch:true})) return;
      await downloadCatalogV78();
    }catch{}
  },6000);

  ensureCatalog=async function(force){
    if(validCatalogV60(catalog) && !force) return catalog;
    if(catalogPromiseV60 && !force) return catalogPromiseV60;

    catalogLoading=true;

    catalogPromiseV60=(async()=>{
      try{
        const data=await fetchCatalogResponseV60();
        catalog=data;
        return catalog;
      }catch(err){
        console.error('Kunde inte ladda prislistan',err);
        catalog=null;
        throw err;
      }finally{
        catalogLoading=false;
        catalogPromiseV60=null;
      }
    })();

    return catalogPromiseV60;
  };

  const oldPanelListV60=vMatPanelList;
  vMatPanelList=function(){
    if(catalogLoading) return '<p class="muted" style="padding:16px 0">Laddar prislista…</p>';

    if(!validCatalogV60(catalog)){
      return '<div class="card" style="margin-top:12px">'
        +'<div class="bold">Prislistan kunde inte laddas</div>'
        +'<div class="muted" style="font-size:12px;line-height:1.45;margin-top:4px">LiRo kan försöka igen utan att du behöver lämna uppdraget.</div>'
        +'<button type="button" class="primary-btn" style="margin-top:12px" data-act="retry-catalog-v60">Försök igen</button>'
        +'</div>';
    }

    return oldPanelListV60();
  };

  const oldPriceResultsV60=vPriceSearchResults;
  vPriceSearchResults=function(){
    const q=(st.priceSearch||'').trim();
    if(q.length<2) return '';

    if(catalogLoading) return '<p class="muted" style="padding:12px 0">Laddar prislista…</p>';

    if(!validCatalogV60(catalog)){
      return '<div class="card" style="margin-top:12px">'
        +'<div class="bold">Prislistan kunde inte laddas</div>'
        +'<button type="button" class="primary-btn" style="margin-top:10px" data-act="retry-catalog-v60">Försök igen</button>'
        +'</div>';
    }

    return oldPriceResultsV60();
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act="retry-catalog-v60"]');
    if(!b) return;

    catalog=null;
    catalogLoading=true;
    render();

    ensureCatalog(true)
      .then(()=>{
        flash('Prislistan är laddad');
        render();
      })
      .catch(()=>{
        flash('Kunde fortfarande inte ladda prislistan');
        render();
      });
  });

  // Om en tidigare version redan satte catalog=[] efter fel,
  // nollställ det så nästa materialöppning faktiskt försöker igen.
  if(Array.isArray(catalog) && catalog.length===0) catalog=null;
})();