/* LiRo GO v60 – robust prislista.
   Retry, validering och offline-cache utan att någonsin falla tillbaka till index.html. */
(function(){
  if(window._liroCatalogV60) return;
  window._liroCatalogV60=true;

  let catalogPromiseV60=null;

  function validCatalogV60(data){
    return Array.isArray(data) && data.length>0 && Array.isArray(data[0]) && data[0].length>=4;
  }

  async function fetchCatalogResponseV60(){
    const url='./katalog-el.json?v=60';

    try{
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);

      const ct=String(res.headers.get('content-type')||'').toLowerCase();
      const text=await res.text();
      const first=text.trim()[0];

      if((ct.includes('text/html')||first==='<')) throw new Error('Prislistan fick HTML istället för JSON');

      const data=JSON.parse(text);
      if(!validCatalogV60(data)) throw new Error('Ogiltigt format på prislistan');

      try{
        const cache=await caches.open('lirogo-catalog-v60');
        await cache.put('./katalog-el.json',new Response(text,{headers:{'Content-Type':'application/json'}}));
      }catch{}

      return data;
    }catch(networkErr){
      try{
        const cached=await caches.match('./katalog-el.json',{ignoreSearch:true});
        if(cached){
          const text=await cached.text();
          if(text.trim()[0]!=='<'){
            const data=JSON.parse(text);
            if(validCatalogV60(data)) return data;
          }
        }
      }catch{}
      throw networkErr;
    }
  }

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