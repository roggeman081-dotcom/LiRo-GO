/* LiRo GO v118 – Ahlsell avtalspris från kundens filer.
   Avtalsfil + El.txt eller en verifierad färdig prislista används.
   Inga kundspecifika priser, rabatter eller manuella prispatchar lagras i GitHub. */
(function(){
  'use strict';

  const DB_NAME='lirogo-prices';
  const DB_VERSION=1;
  const STORE='data';
  const PRICE_ID='ahlsell-net-v1';
  const CONTRACT_ID='ahlsell-contract-v1';
  const META_ID='ahlsell-meta-v1';

  let contractPrices={};
  let contract=null;
  let meta={};
  let loadPromise;
  let pricesLoaded=false;
  let importStatus='';
  function setImportStatus(message){
    importStatus=message;
    const status=document.querySelector('[data-ahlsell-import-status]');
    if(status) status.textContent=message;
  }

  // E-nummer förekommer i appen med/utan inledande nollor, mellanslag och ibland E-prefix/suffix.
  // Normalisera samma sätt både vid import och uppslag så 220, 0000220 och "E 00 002 20" träffar samma rad.
  const art=v=>{
    let s=String(v||'').trim().toUpperCase().replace(/\s+/g,'');
    if(/^E[-:]?\d{1,7}$/.test(s)) s=s.replace(/^E[-:]?/,'');
    if(/^\d{1,7}$/.test(s)) return s.padStart(7,'0');
    const suff=s.match(/^(\d{1,7})E$/);
    if(suff) return suff[1].padStart(7,'0')+'E';
    return s;
  };
  const sv=(v,f=0)=>{
    if(v===null||v===undefined||v==='') return f;
    const n=Number(String(v).replace(/\s/g,'').replace(',','.'));
    return Number.isFinite(n)?n:f;
  };
  const intField=(s,a,b)=>{
    const v=String(s||'').slice(a,b).trim();
    return /^\d+$/.test(v)?Number(v):0;
  };

  function openPriceDb(){
    return new Promise((resolve,reject)=>{
      if(typeof indexedDB==='undefined') return reject(new Error('IndexedDB saknas'));
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Kunde inte öppna prisdatabasen'));
    });
  }
  async function dbGet(id){
    const db=await openPriceDb();
    try{
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).get(id);
        req.onsuccess=()=>resolve(req.result?.value??null);
        req.onerror=()=>reject(req.error);
      });
    } finally { db.close(); }
  }
  async function dbSet(id,value){
    const db=await openPriceDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put({id,value});
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error||new Error('Prislagring avbröts'));
      });
    } finally { db.close(); }
  }

  function parseAgreement(text){
    const classes={};
    const articles={};
    let classCount=0,articleCount=0;
    for(const raw of String(text||'').split(/\r?\n/)){
      if(!raw.trim() || raw.length<57) continue;
      const a=art(raw.slice(10,30));
      const cls=raw.slice(30,36).trim();
      const rabatt=intField(raw,36,40);
      const specific=intField(raw,40,44);
      const net=intField(raw,44,53);
      const chain=intField(raw,53,57);

      if(cls){
        classes[cls]={rabatt,specific,net,chain};
        classCount++;
      }else if(a && (net>0 || specific>0 || chain>0 || rabatt>0) && /^[0-9A-ZÄÖÅ-]+$/.test(a)){
        articles[a]={rabatt,specific,net,chain};
        articleCount++;
      }
    }
    return {classes,articles,classCount,articleCount};
  }

  // Ahlsells beräknade nettopriser följer decimalavrundning till helt öre.
  // Vid exakt x,5 öre används half-even (banker's rounding).
  function roundHalfEven(n){
    const lo=Math.floor(n);
    const frac=n-lo;
    const eps=1e-9;
    if(frac<0.5-eps) return lo;
    if(frac>0.5+eps) return lo+1;
    return lo%2===0?lo:lo+1;
  }
  function discountPrice(gnpCents,perMille){
    if(!(gnpCents>0)) return 0;
    const d=Math.max(0,Math.min(1000,Number(perMille)||0));
    return roundHalfEven(gnpCents*(1000-d)/1000);
  }

  function priceForBaseRow(a,gnpCents,cls,agreement){
    a=art(a);
    const rule=agreement?.articles?.[a];
    if(rule?.net>0) return rule.net;
    if(rule?.specific>0) return discountPrice(gnpCents,rule.specific);
    if(rule?.chain>0) return discountPrice(gnpCents,rule.chain);
    if(rule?.rabatt>0) return discountPrice(gnpCents,rule.rabatt);

    const cr=agreement?.classes?.[cls];
    if(!(gnpCents>0)) return 0;
    if(!cr) return gnpCents;
    if(cr.net>0) return cr.net;
    if(cr.specific>0) return discountPrice(gnpCents,cr.specific);
    if(cr.chain>0) return discountPrice(gnpCents,cr.chain);
    return discountPrice(gnpCents,cr.rabatt);
  }

  function calculateFromBase(text,agreement){
    const prices={};
    const missingArticles=[];
    let rows=0,priced=0,missingBase=0,missingClass=0;
    for(const raw of String(text||'').split(/\r?\n/)){
      if(!raw.trim() || raw.length<38) continue;
      const a=art(raw.slice(0,20));
      if(!a) continue;
      rows++;
      const gnp=intField(raw,20,32);
      const cls=raw.slice(32,38).trim();
      const cents=priceForBaseRow(a,gnp,cls,agreement);
      if(cents>0){
        prices[a]=cents/100;
        priced++;
      }else{
        missingArticles.push(a);
        if(!(gnp>0)) missingBase++;
        else if(!agreement?.classes?.[cls] && !agreement?.articles?.[a]) missingClass++;
      }
    }
    return {prices,rows,priced,missingBase,missingClass,missingArticles};
  }

  async function readFileText(file){
    if(!file) throw new Error('Ingen fil vald');
    const buf=await file.arrayBuffer();
    try{return new TextDecoder('windows-1252').decode(buf);}
    catch{return new TextDecoder().decode(buf);}
  }

  async function importAgreementFile(file){
    await loadPersisted();
    const parsed=parseAgreement(await readFileText(file));
    if(parsed.classCount<100) throw new Error('Filen ser inte ut som en Ahlsell-avtalsfil');
    contract=parsed;
    contractPrices={};
    await Promise.all([dbSet(CONTRACT_ID,parsed),dbSet(PRICE_ID,{})]);
    meta={agreementName:file.name,agreementImported:new Date().toISOString(),
      classCount:parsed.classCount,articleCount:parsed.articleCount};
    await dbSet(META_ID,meta);
    return parsed;
  }

  async function importBaseFile(file){
    await loadPersisted();
    if(!contract) contract=await dbGet(CONTRACT_ID);
    if(!contract) throw new Error('Importera avtalsfilen först');
    const result=calculateFromBase(await readFileText(file),contract);
    if(result.rows<1000 || result.priced<1000) throw new Error('Filen ser inte ut som Ahlsells El-beräkningsgrund');
    contractPrices=result.prices;
    await dbSet(PRICE_ID,contractPrices);
    meta={...meta,baseName:file.name,baseImported:new Date().toISOString(),
      baseRows:result.rows,priced:result.priced,missingBase:result.missingBase,
      missingClass:result.missingClass,missingArticles:result.missingArticles};
    await dbSet(META_ID,meta);
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,true);
    try{if(typeof render==='function') render();}catch{}
    return result;
  }

  function loadPersisted(){
    if(loadPromise) return loadPromise;
    loadPromise=(async()=>{try{
      const [p,c,m]=await Promise.all([dbGet(PRICE_ID),dbGet(CONTRACT_ID),dbGet(META_ID)]);
      if(p&&typeof p==='object') contractPrices=p;
      if(c&&typeof c==='object') contract=c;
      if(m&&typeof m==='object') meta=m;
      pricesLoaded=true;
      if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
      try{if(typeof render==='function') render();}catch{}
    }catch(err){
      console.warn('Kunde inte läsa lokala Ahlsell-priser',err);
    }})();
    return loadPromise;
  }

  function parsePreparedPrices(data){
    if(data?.format!=='lirogo-ahlsell-prices-v1' || !data.prices ||
       typeof data.prices!=='object' || Array.isArray(data.prices))
      throw new Error('Prislistan har fel format');
    const prices={};
    for(const [key,value] of Object.entries(data.prices)){
      const normalized=art(key);
      if(!/^[0-9A-ZÄÖÅ-]{1,20}$/.test(normalized) || typeof value!=='number' ||
         !Number.isFinite(value) || value<=0 || Object.hasOwn(prices,normalized))
        throw new Error('Prislistan innehåller en ogiltig eller dubbel artikel');
      prices[normalized]=value;
    }
    const count=Object.keys(prices).length;
    if(!count || (data.meta?.priced!=null && data.meta.priced!==count))
      throw new Error('Prislistans artikelantal stämmer inte');
    return {prices,count};
  }

  async function importPreparedPrices(data){
    const {prices,count}=parsePreparedPrices(data);
    await loadPersisted();
    const nextMeta={prepared:true,priced:count,imported:new Date().toISOString(),
      missingBase:Number(data.meta?.missingBasePrice)||0};
    const db=await openPriceDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        const store=tx.objectStore(STORE);
        store.put({id:PRICE_ID,value:prices});
        store.put({id:CONTRACT_ID,value:null});
        store.put({id:META_ID,value:nextMeta});
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error||new Error('Priserna kunde inte sparas'));
      });
    }finally{db.close();}
    contractPrices=prices;
    contract=null;
    meta=nextMeta;
    pricesLoaded=true;
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,true);
    try{if(typeof render==='function') render();}catch{}
    return {priced:count};
  }

  async function exportPreparedPrices(){
    await window.LiRoPrice.ready;
    if(!Object.keys(contractPrices).length) return null;
    return {format:'lirogo-ahlsell-prices-v1',meta:{priced:Object.keys(contractPrices).length,
      missingBasePrice:Number(meta.missingBase)||0},prices:{...contractPrices}};
  }

  function byArt(a){
    const key=art(a);
    const cp=Number(contractPrices[key]);
    return Number.isFinite(cp)&&cp>0?cp:null;
  }
  function missingInSource(a){
    const key=art(a);
    return Array.isArray(meta.missingArticles)&&meta.missingArticles.includes(key);
  }
  function rowPrice(row){return row&&row[0]?byArt(row[0]):null;}
  function unitPrice(m){if(!m)return 0;if(m.eNr)return byArt(m.eNr)||0;return Math.max(0,sv(m.unitPrice,0));}

  function syncRows(rows,persist=false){
    if(!pricesLoaded) return 0;
    let changed=0;
    for(const m of (Array.isArray(rows)?rows:[])){
      if(!m?.eNr) continue;
      const p=byArt(m.eNr);
      if(Number(m.unitPrice)===(p||0) && m.priceMissing===(p==null)) continue;
      m.unitPrice=p||0;
      m.priceMissing=p==null;
      changed++;
      if(persist && m.id && typeof dbPut==='function') Promise.resolve(dbPut('materials',m)).catch(()=>{});
    }
    return changed;
  }

  function statusHtml(){
    const hasAgreement=!!contract;
    const hasPrices=Object.keys(contractPrices).length>0;
    const agreementText=hasAgreement
      ? `Avtal: ${Number(meta.classCount||contract.classCount||0).toLocaleString('sv-SE')} rabattgrupper`
      : (meta.prepared?'Din färdiga prislista är aktiverad':'Avtalsfil saknas');
    const priceText=hasPrices
      ? `El-priser: ${Number(meta.priced||Object.keys(contractPrices).length).toLocaleString('sv-SE')} artiklar`
      : 'El-beräkningsgrund saknas';
    const missingText=hasPrices&&Number(meta.missingBase||0)>0
      ? `<br>Ahlsell saknar prisgrund på ${Number(meta.missingBase).toLocaleString('sv-SE')} rader i El.txt.`
      : '';
    return `<div class="card" style="margin-bottom:16px">
      <div class="bold">Ahlsell avtalspriser</div>
      <div class="muted" style="font-size:12px;line-height:1.45;margin-top:4px">
        ${agreementText}<br>${priceText}${missingText}<br>
        ${hasPrices?'Priserna används automatiskt i alla uppdrag, även offline.':'Aktivera din prislista en gång för att använda den i alla uppdrag.'}<br>
        Filerna behandlas lokalt på denna enhet och laddas inte upp till GitHub.
      </div>
      <div style="margin-top:12px">
        <div class="bold">Återställ färdig prislista</div>
        <button type="button" class="primary-btn" data-ahlsell-choose="prepared" aria-label="Välj färdig prislista" style="display:block;width:100%;min-height:48px;margin-top:8px">Välj prisfil</button>
      </div>
      <div data-ahlsell-import-status role="status" aria-live="polite" style="margin-top:10px;font-size:14px">${typeof esc==='function'?esc(importStatus):''}</div>
      <details style="margin-top:12px"><summary>Uppdatera priser från Ahlsell-filer</summary>
      <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px">
        <label class="primary-btn" style="cursor:pointer">
          Välj avtalsfil
          <input type="file" accept=".txt,text/plain" data-ahlsell-file="agreement" style="display:none">
        </label>
        <label class="primary-btn" style="cursor:pointer;background:var(--surface2)">
          Välj El.txt
          <input type="file" accept=".txt,text/plain" data-ahlsell-file="base" style="display:none">
        </label>
      </div></details>
    </div>`;
  }

  const oldSettings=window.vSettingsMaterial;
  if(typeof oldSettings==='function'){
    window.vSettingsMaterial=function(){
      const html=oldSettings.apply(this,arguments);
      const marker='<div class="settings-body">';
      return html.replace(marker,marker+statusHtml());
    };
  }

  // Keep the picker outside the app's replaceable HTML. Background updates can
  // render while iOS Files is open; replacing its input loses the selected File.
  let preparedPicker;
  function getPreparedPicker(){
    if(preparedPicker) return preparedPicker;
    preparedPicker=document.createElement('input');
  preparedPicker.type='file';
  preparedPicker.id='ahlsell-prepared-file';
  preparedPicker.dataset.ahlsellFile='prepared';
  preparedPicker.setAttribute('aria-label','Prisfil');
  preparedPicker.style.cssText='position:fixed;left:-10000px;width:1px;height:1px;opacity:0';
  document.body.append(preparedPicker);
    return preparedPicker;
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-ahlsell-choose="prepared"]');
    if(!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const picker=getPreparedPicker();
    picker.value='';
    picker.click();
  },true);

  document.addEventListener('change',async e=>{
    const el=e.target;
    const kind=el?.dataset?.ahlsellFile;
    if(!kind) return;
    const file=el.files&&el.files[0];
    if(!file) return;
    try{
      // Keep the file input attached while WebKit reads its File object.
      setImportStatus('Läser '+file.name+'…');
      if(kind==='prepared'){
        const r=await importPreparedPrices(JSON.parse(new TextDecoder().decode(await file.arrayBuffer())));
        setImportStatus(`Klart! ${r.priced.toLocaleString('sv-SE')} priser är sparade.`);
        try{await navigator.storage?.persist?.();}catch{}
        if(typeof flash==='function') flash(`Priser sparade: ${r.priced.toLocaleString('sv-SE')} artiklar. Fungerar även offline.`);
      }else if(kind==='agreement'){
        const r=await importAgreementFile(file);
        if(typeof flash==='function') flash(`Avtalsfil klar: ${r.classCount.toLocaleString('sv-SE')} rabattgrupper. Importera El.txt.`);
      }else{
        const r=await importBaseFile(file);
        if(typeof flash==='function') flash(`Priser klara: ${r.priced.toLocaleString('sv-SE')} artiklar`);
      }
      try{if(typeof render==='function') render();}catch{}
    }catch(err){
      console.error(err);
      setImportStatus('Importen misslyckades: '+(err?.message||'Filen kunde inte läsas'));
    }finally{
      try{el.value='';}catch{}
    }
  },true);

  window.LiRoPrice={
    version:118,
    source:'ahlsell-files-only',
    normalizeArt:art,
    parseSvNumber:sv,
    parseAgreement,
    calculateFromBase,
    priceForBaseRow,
    resolveByArt:byArt,
    resolveRow:rowPrice,
    missingInSource,
    syncRows,
    importAgreementFile,
    importBaseFile,
    parsePreparedPrices,
    importPreparedPrices,
    exportPreparedPrices,
    ready:loadPersisted(),
    getMeta:()=>({...meta}),
    contractCount:()=>Object.keys(contractPrices).length
  };

  window.effectivePrice=rowPrice;
  window.toNumber=(v,f=0)=>sv(v,f);

  const calc=window.calculateMaterialTotals;
  if(typeof calc==='function') window.calculateMaterialTotals=function(rows,markup){
    const input=Array.isArray(rows)?rows:[];
    return calc(input.map(m=>({...m,qty:Math.max(0,sv(m.qty,0)),unitPrice:unitPrice(m)})),markup);
  };

  const add=window.addMaterial;
  if(typeof add==='function') window.addMaterial=async function(jobId,input){
    await window.LiRoPrice.ready;
    const x={...(input||{})};
    x.qty=Math.max(0,sv(x.qty,0));
    if(x.eNr){
      x.eNr=art(x.eNr);
      const p=byArt(x.eNr);
      x.unitPrice=p||0;
      x.priceMissing=p==null;
    }else{
      x.unitPrice=Math.max(0,sv(x.unitPrice,0));
    }
    return add(jobId,x);
  };

  // Material ska alltid kunna registreras. Om Ahlsells El.txt saknar prisgrund
  // sparas raden med priceMissing=true i stället för att blockera elektrikern.
  const bump=window.bumpMaterialQty;
  if(typeof bump==='function') window.bumpMaterialQty=function(jobId,row,delta,kind){
    const d=sv(delta,0);
    return bump(jobId,row,d,kind);
  };

  const render0=window.render;
  if(typeof render0==='function') window.render=function(){
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
    return render0.apply(this,arguments);
  };

})();
