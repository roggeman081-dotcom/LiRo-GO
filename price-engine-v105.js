/* LiRo GO v114 – Ahlsell avtalspriser från lokala kundfiler.
   Priser räknas på enheten från Ahlsells beräkningsgrund + kundens avtalsfil.
   Kundspecifika avtal/priser lämnar aldrig enheten och läggs inte i GitHub. */
(function(){
  'use strict';

  const KEY='lirogo_price_overrides';
  const META_KEY='lirogo_ahlsell_import_v114';
  const art=v=>String(v||'').trim().replace(/\s+/g,'');
  const sv=(v,f=0)=>{
    if(v===null||v===undefined||v==='') return f;
    const n=Number(String(v).replace(/\s/g,'').replace(',','.'));
    return Number.isFinite(n)?n:f;
  };
  const readStored=()=>{
    try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}
    catch{return {};}
  };
  let priceMap=readStored();

  function writeStored(o){
    priceMap=o||{};
    localStorage.setItem(KEY,JSON.stringify(priceMap));
  }
  function byArt(a){
    const n=sv(priceMap[art(a)],NaN);
    return Number.isFinite(n)&&n>0?n:null;
  }
  function rowPrice(row){ return row&&row[0]?byArt(row[0]):null; }
  function unitPrice(m){
    if(!m)return 0;
    if(m.eNr)return byArt(m.eNr)||0;
    return Math.max(0,sv(m.unitPrice,0));
  }

  function syncRows(rows,persist=false){
    let changed=0;
    for(const m of (Array.isArray(rows)?rows:[])){
      if(!m?.eNr) continue;
      const p=byArt(m.eNr);
      if(p==null || Number(m.unitPrice)===p) continue;
      m.unitPrice=p;
      m.priceMissing=false;
      changed++;
      if(persist && m.id && typeof dbPut==='function'){
        Promise.resolve(dbPut('materials',m)).catch(()=>{});
      }
    }
    return changed;
  }

  let storedSyncStarted=false;
  async function syncStoredRows(){
    if(storedSyncStarted || typeof dbAll!=='function') return;
    storedSyncStarted=true;
    try{
      const rows=await dbAll('materials');
      syncRows(rows,true);
      if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
    }catch{}
  }

  // Ahlsell fixed-width avtalsfil:
  // artikel 11–30, materialklass 31–36, rabatt 37–40,
  // specifik artikelrabatt 41–44, nettopris 45–53.
  function parseAgreement(text){
    const classDiscount=new Map();
    const articleDiscount=new Map();
    const explicitNet=new Map();

    for(const raw of String(text||'').split(/\r?\n/)){
      if(raw.length<57) continue;
      const a=raw.slice(10,30).trim();
      const cls=raw.slice(30,36).trim();
      const discount=parseInt(raw.slice(36,40),10)||0;
      const specific=parseInt(raw.slice(40,44),10)||0;
      const net=parseInt(raw.slice(44,53),10)||0;

      if(a){
        if(net>0) explicitNet.set(a,net);             // redan i öre
        else if(specific>0) articleDiscount.set(a,specific); // tiondels %
      }else if(cls && discount>=0){
        classDiscount.set(cls,discount);             // tiondels %
      }
    }
    return {classDiscount,articleDiscount,explicitNet};
  }

  // Ahlsell beräkningsgrund:
  // artikel 1–20, GNP 21–32 (öre), materialklass 33–38.
  function calculateFromBase(text,agreement){
    const result={};
    let rows=0,calculated=0,missingAgreement=0;

    for(const raw of String(text||'').split(/\r?\n/)){
      if(raw.length<38) continue;
      const a=raw.slice(0,20).trim();
      const gnpText=raw.slice(20,32).trim();
      const cls=raw.slice(32,38).trim();
      if(!a || !/^\d+$/.test(gnpText)) continue;

      rows++;
      const gnpCents=parseInt(gnpText,10);
      let cents=null;

      if(agreement.explicitNet.has(a)){
        cents=agreement.explicitNet.get(a);
      }else if(agreement.articleDiscount.has(a)){
        const d=agreement.articleDiscount.get(a);
        cents=Math.floor((gnpCents*(1000-d)+500)/1000);
      }else if(agreement.classDiscount.has(cls)){
        const d=agreement.classDiscount.get(cls);
        cents=Math.floor((gnpCents*(1000-d)+500)/1000);
      }else{
        missingAgreement++;
      }

      if(Number.isFinite(cents) && cents>0){
        result[a]=cents/100;
        calculated++;
      }
    }
    return {prices:result,rows,calculated,missingAgreement};
  }

  const decodeFile=async file=>{
    const buf=await file.arrayBuffer();
    // Ahlsell-filerna är ANSI/Windows-1252. Prisfält och nycklar är ASCII,
    // men rätt decoder bevarar även filens svenska text om den används senare.
    try{return new TextDecoder('windows-1252').decode(buf);}
    catch{return new TextDecoder('iso-8859-1').decode(buf);}
  };

  let baseFile=null,agreementFile=null,busy=false;

  async function importIfReady(){
    if(busy||!baseFile||!agreementFile) return;
    busy=true;
    setImportStatus('Läser och räknar priser…');
    try{
      const [baseText,agreementText]=await Promise.all([decodeFile(baseFile),decodeFile(agreementFile)]);
      const agreement=parseAgreement(agreementText);
      const calc=calculateFromBase(baseText,agreement);

      if(calc.calculated<1000) throw new Error('För få priser kunde beräknas. Kontrollera att rätt filer valts.');

      // Automatpriser ska ersätta gamla/stale seedade priser.
      // Manuella poster som inte finns i den nya elfilen bevaras.
      const old=readStored();
      const merged={...old,...calc.prices};
      writeStored(merged);

      const checks={
        '2044120':42.82,'2049109':74.84,'2047708':70.15,'2047760':76.47,'2045213':84.59
      };
      const failed=Object.entries(checks).filter(([a,p])=>calc.prices[a]!==p);
      if(failed.length) throw new Error('Kontrollpriserna stämmer inte: '+failed.map(x=>x[0]).join(', '));

      const meta={
        importedAt:new Date().toISOString(),
        baseFile:baseFile.name,
        agreementFile:agreementFile.name,
        rows:calc.rows,
        prices:calc.calculated,
        missingAgreement:calc.missingAgreement,
        verifiedChecks:Object.keys(checks).length
      };
      localStorage.setItem(META_KEY,JSON.stringify(meta));

      storedSyncStarted=false;
      await syncStoredRows();
      if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,true);

      setImportStatus(`Klart: ${calc.calculated.toLocaleString('sv-SE')} priser. 5/5 kontrollpriser rätt.`);
      if(typeof flash==='function') flash('Ahlsell-priser uppdaterade');
      if(typeof render==='function') render();
    }catch(err){
      console.error('Ahlsell prisimport misslyckades',err);
      setImportStatus('Import misslyckades: '+(err?.message||err));
      alert('Kunde inte uppdatera Ahlsell-priserna. '+(err?.message||'Kontrollera filerna.'));
    }finally{
      busy=false;
      baseFile=null;
      agreementFile=null;
    }
  }

  function readMeta(){
    try{return JSON.parse(localStorage.getItem(META_KEY)||'null');}
    catch{return null;}
  }
  function statusText(){
    const m=readMeta();
    if(!m) return 'Ingen komplett Ahlsell-import gjord ännu.';
    const d=new Date(m.importedAt);
    const when=Number.isNaN(d.getTime())?m.importedAt:d.toLocaleString('sv-SE');
    return `${Number(m.prices||0).toLocaleString('sv-SE')} priser · ${when}`;
  }
  function setImportStatus(text){
    const el=document.querySelector('[data-ahlsell-import-status]');
    if(el) el.textContent=text;
  }
  function importCard(){
    return `<div class="card" style="margin-top:12px">
      <div class="bold">Ahlsell avtalspriser</div>
      <div class="muted" style="font-size:12px;line-height:1.45;margin-top:5px" data-ahlsell-import-status>${statusText()}</div>
      <div class="muted" style="font-size:12px;line-height:1.45;margin-top:8px">
        Filerna behandlas bara på denna enhet. Kundavtalet laddas inte upp till GitHub.
      </div>
      <label class="primary-btn" style="margin-top:12px;cursor:pointer">
        Välj El.txt
        <input type="file" accept=".txt,text/plain" data-ahlsell-file="base" style="display:none">
      </label>
      <label class="primary-btn" style="margin-top:8px;cursor:pointer">
        Välj avtalsfil
        <input type="file" accept=".txt,text/plain" data-ahlsell-file="agreement" style="display:none">
      </label>
      <div class="muted" style="font-size:11px;margin-top:8px">
        Välj båda filerna. Därefter räknas priserna automatiskt enligt Ahlsells prioritering.
      </div>
    </div>`;
  }

  // Lägg importen i materialinställningarna utan att röra kärnfilen.
  const settings0=window.vSettingsMaterial;
  if(typeof settings0==='function'){
    window.vSettingsMaterial=function(){
      return settings0.apply(this,arguments)+importCard();
    };
  }

  document.addEventListener('change',e=>{
    const el=e.target;
    const kind=el?.dataset?.ahlsellFile;
    if(!kind||!el.files?.[0]) return;
    if(kind==='base') baseFile=el.files[0];
    if(kind==='agreement') agreementFile=el.files[0];
    setImportStatus(baseFile&&agreementFile?'Båda filer valda. Startar…':`${el.files[0].name} vald. Välj den andra filen.`);
    importIfReady();
  },true);

  if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
  setTimeout(syncStoredRows,0);

  window.LiRoPrice={
    version:114,
    parseSvNumber:sv,
    resolveByArt:byArt,
    resolveRow:rowPrice,
    readOverrides:()=>({...priceMap}),
    writeOverrides:writeStored,
    syncRows,
    parseAgreement,
    calculateFromBase,
    getImportMeta:readMeta
  };

  window.effectivePrice=rowPrice;
  window.toNumber=(v,f=0)=>sv(v,f);

  const calc0=window.calculateMaterialTotals;
  if(typeof calc0==='function') window.calculateMaterialTotals=function(rows,markup){
    const input=Array.isArray(rows)?rows:[];
    return calc0(input.map(m=>({...m,qty:Math.max(0,sv(m.qty,0)),unitPrice:unitPrice(m)})),markup);
  };

  const add0=window.addMaterial;
  if(typeof add0==='function') window.addMaterial=function(jobId,input){
    const x={...(input||{})};
    x.qty=Math.max(0,sv(x.qty,0));
    x.unitPrice=x.eNr?(byArt(x.eNr)||0):Math.max(0,sv(x.unitPrice,0));
    if(x.eNr)x.priceMissing=byArt(x.eNr)==null;
    return add0(jobId,x);
  };

  const bump0=window.bumpMaterialQty;
  if(typeof bump0==='function') window.bumpMaterialQty=function(jobId,row,delta,kind){
    const d=sv(delta,0);
    if(d>0&&row?.[0]&&rowPrice(row)==null){
      alert('Pris saknas för artikeln. Importera Ahlsells El.txt och din avtalsfil under materialinställningarna.');
      return Promise.resolve(0);
    }
    return bump0(jobId,row,d,kind);
  };

  document.addEventListener('change',e=>{
    const el=e.target;
    if(el?.dataset?.field!=='price-override') return;
    const a=art(el.dataset.artnr),n=sv(el.value,NaN);
    if(!a||!Number.isFinite(n)||n<=0)return;
    priceMap[a]=n;
    try{writeStored(priceMap);}catch(err){console.error('Kunde inte spara manuellt pris',err);}
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,true);
    storedSyncStarted=false;
    setTimeout(syncStoredRows,0);
  },true);

  const render0=window.render;
  if(typeof render0==='function') window.render=function(){
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
    return render0.apply(this,arguments);
  };
})();