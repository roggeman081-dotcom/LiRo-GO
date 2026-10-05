/* LiRo GO v116 – Ahlsell avtalspris strikt från kundens två filer.
   Avtalsfil + El.txt är enda källan för Ahlsell-priser.
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
  let loadStarted=false;

  const art=v=>String(v||'').trim().replace(/\s+/g,'');
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
      }else if(a && (net>0 || specific>0 || chain>0 || rabatt>0) && /^[0-9A-Za-zÄÖÅäöå-]+$/.test(a)){
        articles[a]={rabatt,specific,net,chain};
        articleCount++;
      }
    }
    return {classes,articles,classCount,articleCount};
  }

  // Ahlsells beräknade nettopriser följer decimalavrundning till helt öre.
  // Vid exakt x,5 öre används half-even (banker's rounding), vilket matchar
  // verifierade avtalspriser som 97,50 × 23 % = 22,42 och 92,50 × 31,4 % = 29,04.
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
    const rule=agreement?.articles?.[a];
    if(rule?.net>0) return rule.net;
    if(rule?.specific>0) return discountPrice(gnpCents,rule.specific);
    if(rule?.chain>0) return discountPrice(gnpCents,rule.chain);
    if(rule?.rabatt>0) return discountPrice(gnpCents,rule.rabatt);

    const cr=agreement?.classes?.[cls];
    if(!(gnpCents>0)) return 0;
    // Ahlsells egen Excel-modell använder 0 % rabatt när varken artikel-
    // eller materialklassavtal finns. Då är beräkningsgrunden/GNP priset för raden.
    if(!cr) return gnpCents;
    if(cr.net>0) return cr.net;
    if(cr.specific>0) return discountPrice(gnpCents,cr.specific);
    if(cr.chain>0) return discountPrice(gnpCents,cr.chain);
    return discountPrice(gnpCents,cr.rabatt);
  }

  function calculateFromBase(text,agreement){
    const prices={};
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
        if(!(gnp>0)) missingBase++;
        else if(!agreement?.classes?.[cls] && !agreement?.articles?.[a]) missingClass++;
      }
    }
    return {prices,rows,priced,missingBase,missingClass};
  }

  async function readFileText(file){
    if(!file) throw new Error('Ingen fil vald');
    const buf=await file.arrayBuffer();
    try{return new TextDecoder('windows-1252').decode(buf);}
    catch{return new TextDecoder().decode(buf);}
  }

  async function importAgreementFile(file){
    const parsed=parseAgreement(await readFileText(file));
    if(parsed.classCount<100) throw new Error('Filen ser inte ut som en Ahlsell-avtalsfil');
    contract=parsed;
    // Ett nytt avtal får aldrig kombineras med priser beräknade från ett äldre avtal.
    contractPrices={};
    await Promise.all([dbSet(CONTRACT_ID,parsed),dbSet(PRICE_ID,{})]);
    meta={agreementName:file.name,agreementImported:new Date().toISOString(),
      classCount:parsed.classCount,articleCount:parsed.articleCount};
    await dbSet(META_ID,meta);
    return parsed;
  }

  async function importBaseFile(file){
    if(!contract) contract=await dbGet(CONTRACT_ID);
    if(!contract) throw new Error('Importera avtalsfilen först');
    const result=calculateFromBase(await readFileText(file),contract);
    if(result.rows<1000 || result.priced<1000) throw new Error('Filen ser inte ut som Ahlsells El-beräkningsgrund');
    contractPrices=result.prices;
    await dbSet(PRICE_ID,contractPrices);
    meta={...meta,baseName:file.name,baseImported:new Date().toISOString(),
      baseRows:result.rows,priced:result.priced,missingBase:result.missingBase,missingClass:result.missingClass};
    await dbSet(META_ID,meta);
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,true);
    try{if(typeof render==='function') render();}catch{}
    return result;
  }

  async function loadPersisted(){
    if(loadStarted) return;
    loadStarted=true;
    try{
      const [p,c,m]=await Promise.all([dbGet(PRICE_ID),dbGet(CONTRACT_ID),dbGet(META_ID)]);
      if(p&&typeof p==='object') contractPrices=p;
      if(c&&typeof c==='object') contract=c;
      if(m&&typeof m==='object') meta=m;
      if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
      try{if(typeof render==='function') render();}catch{}
    }catch(err){
      console.warn('Kunde inte läsa lokala Ahlsell-priser',err);
    }
  }

  function byArt(a){
    const key=art(a);
    const cp=Number(contractPrices[key]);
    return Number.isFinite(cp)&&cp>0?cp:null;
  }
  function rowPrice(row){return row&&row[0]?byArt(row[0]):null;}
  function unitPrice(m){if(!m)return 0;if(m.eNr)return byArt(m.eNr)||0;return Math.max(0,sv(m.unitPrice,0));}

  function syncRows(rows,persist=false){
    let changed=0;
    for(const m of (Array.isArray(rows)?rows:[])){
      if(!m?.eNr) continue;
      const p=byArt(m.eNr);
      if(p==null || Number(m.unitPrice)===p) continue;
      m.unitPrice=p;
      m.priceMissing=false;
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
      : 'Avtalsfil saknas';
    const priceText=hasPrices
      ? `El-priser: ${Number(meta.priced||Object.keys(contractPrices).length).toLocaleString('sv-SE')} artiklar`
      : 'El-beräkningsgrund saknas';
    return `<div class="card" style="margin-bottom:16px">
      <div class="bold">Ahlsell avtalspriser</div>
      <div class="muted" style="font-size:12px;line-height:1.45;margin-top:4px">
        ${agreementText}<br>${priceText}<br>
        Pris = avtalsfil + El.txt. Inga manuella Ahlsell-prispatchar används.<br>
        Filerna behandlas lokalt på denna enhet och laddas inte upp till GitHub.
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px">
        <label class="primary-btn" style="cursor:pointer">
          Välj avtalsfil
          <input type="file" accept=".txt,text/plain" data-ahlsell-file="agreement" style="display:none">
        </label>
        <label class="primary-btn" style="cursor:pointer;background:var(--surface2)">
          Välj El.txt
          <input type="file" accept=".txt,text/plain" data-ahlsell-file="base" style="display:none">
        </label>
      </div>
    </div>`;
  }

  const oldSettings=window.vSettingsMaterial;
  if(typeof oldSettings==='function'){
    window.vSettingsMaterial=function(){
      return statusHtml()+oldSettings.apply(this,arguments);
    };
  }

  document.addEventListener('change',async e=>{
    const el=e.target;
    const kind=el?.dataset?.ahlsellFile;
    if(!kind) return;
    const file=el.files&&el.files[0];
    if(!file) return;
    try{
      if(typeof flash==='function') flash(kind==='agreement'?'Läser avtalsfil…':'Beräknar Ahlsell-priser…');
      if(kind==='agreement'){
        const r=await importAgreementFile(file);
        if(typeof flash==='function') flash(`Avtalsfil klar: ${r.classCount.toLocaleString('sv-SE')} rabattgrupper. Importera El.txt.`);
      }else{
        const r=await importBaseFile(file);
        if(typeof flash==='function') flash(`Priser klara: ${r.priced.toLocaleString('sv-SE')} artiklar`);
      }
      try{if(typeof render==='function') render();}catch{}
    }catch(err){
      console.error(err);
      alert(err?.message||'Importen misslyckades');
    }finally{
      try{el.value='';}catch{}
    }
  },true);

  window.LiRoPrice={
    version:116,
    source:'ahlsell-files-only',
    parseSvNumber:sv,
    parseAgreement,
    calculateFromBase,
    priceForBaseRow,
    resolveByArt:byArt,
    resolveRow:rowPrice,
    syncRows,
    importAgreementFile,
    importBaseFile,
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
  if(typeof add==='function') window.addMaterial=function(jobId,input){
    const x={...(input||{})};
    x.qty=Math.max(0,sv(x.qty,0));
    x.unitPrice=x.eNr?(byArt(x.eNr)||0):Math.max(0,sv(x.unitPrice,0));
    if(x.eNr)x.priceMissing=byArt(x.eNr)==null;
    return add(jobId,x);
  };

  const bump=window.bumpMaterialQty;
  if(typeof bump==='function') window.bumpMaterialQty=function(jobId,row,delta,kind){
    const d=sv(delta,0);
    if(d>0&&row?.[0]&&rowPrice(row)==null){
      alert('Pris saknas för artikeln. Importera avtalsfilen och El.txt under materialinställningar.');
      return Promise.resolve(0);
    }
    return bump(jobId,row,d,kind);
  };

  const render0=window.render;
  if(typeof render0==='function') window.render=function(){
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
    return render0.apply(this,arguments);
  };

  setTimeout(loadPersisted,0);
})();