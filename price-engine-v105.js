/* LiRo GO v111 – global materialpris- och decimalhantering */
(function(){
  'use strict';
  const KEY='lirogo_price_overrides';
  const VERIFIED={
    '0445707':22.42,'1500136':64.07,'1377701':385.70,'1820444':93.61,'0461543':34.78,
    '1418102':24.05,'0030960':29.04,'0445721E':28.75
  };
  const art=v=>String(v||'').trim().replace(/\s+/g,'');
  const sv=(v,f=0)=>{if(v===null||v===undefined||v==='')return f;const n=Number(String(v).replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:f;};
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return {};}};
  const write=o=>localStorage.setItem(KEY,JSON.stringify(o||{}));
  function seed(){const o=read();let c=false;Object.entries(VERIFIED).forEach(([a,p])=>{if(Number(o[a])!==p){o[a]=p;c=true;}});if(c)write(o);}
  function byArt(a){const n=sv(read()[art(a)],NaN);return Number.isFinite(n)&&n>0?n:null;}
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

  seed();
  if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
  setTimeout(syncStoredRows,0);

  window.LiRoPrice={version:111,verified:{...VERIFIED},parseSvNumber:sv,resolveByArt:byArt,resolveRow:rowPrice,readOverrides:read,writeOverrides:write,syncRows};

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
      alert('Pris saknas för artikeln. GNP/listpris används inte som inköpspris.');
      return Promise.resolve(0);
    }
    return bump(jobId,row,d,kind);
  };

  document.addEventListener('click',async e=>{
    const b=e.target?.closest?.('[data-act="save-material"]');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=(typeof st!=='undefined'&&st.matDraft)||{};
    if(!String(d.name||'').trim()){if(typeof flash==='function')flash('Ange ett namn på artikeln');return;}
    const m=await window.addMaterial(st.id,{name:String(d.name).trim(),eNr:d.eNr||'',qty:sv(d.qty,0),unit:d.unit||'st',unitPrice:sv(d.unitPrice,0)});
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials))jobMaterials.push(m);
    st.matPanelMode='browse';st.matDraft={};
    if(typeof flash==='function')flash('Artikel tillagd');
    if(typeof render==='function')render();
  },true);

  document.addEventListener('change',e=>{
    const el=e.target;if(el?.dataset?.field!=='price-override')return;
    const a=art(el.dataset.artnr),n=sv(el.value,NaN);if(!a||!Number.isFinite(n)||n<=0)return;
    const o=read();o[a]=n;write(o);
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,true);
    storedSyncStarted=false;
    setTimeout(syncStoredRows,0);
  },true);

  const render0=window.render;
  if(typeof render0==='function') window.render=function(){
    seed();
    if(typeof jobMaterials!=='undefined'&&Array.isArray(jobMaterials)) syncRows(jobMaterials,false);
    return render0.apply(this,arguments);
  };
})();