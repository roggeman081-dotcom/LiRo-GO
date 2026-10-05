/* LiRo GO v106 – kanonisk prislogik för material i hela appen.
   Samma verifierade nettopris används i sök, registrering, projekt, kalkyl och fakturaunderlag.
   Katalogens row[1] är GNP/listpris och får ALDRIG användas som inköpspris. */
(function(){
  'use strict';
  if(window._liroPriceEngineV106) return;
  window._liroPriceEngineV106=true;

  const VERIFIED={
    '0445707':22.42,
    '1500136':64.07,
    '1377701':385.70,
    '1820444':93.61,
    '0461543':34.78
  };
  const KEY='lirogo_price_overrides';
  const normArt=v=>String(v||'').trim().replace(/\s+/g,'');

  function readOverrides(){
    try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return {};}
  }
  function writeOverrides(o){localStorage.setItem(KEY,JSON.stringify(o||{}));}
  function seedVerified(){
    const o=readOverrides();
    let changed=false;
    for(const [art,price] of Object.entries(VERIFIED)){
      if(Number(o[art])!==price){o[art]=price;changed=true;}
    }
    if(changed) writeOverrides(o);
  }
  function resolveByArt(artnr){
    const art=normArt(artnr);
    if(!art) return null;
    const n=Number(readOverrides()[art]);
    return Number.isFinite(n)&&n>0?n:null;
  }
  function resolveRow(row){return row&&row[0]?resolveByArt(row[0]):null;}
  function resolveMaterial(m){
    if(!m) return null;
    if(m.eNr) return resolveByArt(m.eNr);
    const n=Number(m.unitPrice);
    return Number.isFinite(n)&&n>0?n:null;
  }
  function canonicalUnitPrice(m){
    if(!m?.eNr){
      const n=Number(m?.unitPrice);
      return Number.isFinite(n)&&n>0?n:0;
    }
    const p=resolveByArt(m.eNr);
    return p==null?0:p;
  }
  function priceText(v){
    const n=Number(v);
    if(!Number.isFinite(n)||n<=0) return 'Pris saknas';
    return n.toLocaleString('sv-SE',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2})+' kr';
  }
  function syncLiveJobMaterials(){
    try{
      if(typeof jobMaterials==='undefined'||!Array.isArray(jobMaterials)) return;
      jobMaterials.forEach(m=>{
        if(!m?.eNr) return;
        const p=resolveByArt(m.eNr);
        m.unitPrice=p==null?0:p;
        m.priceMissing=p==null;
      });
    }catch(err){console.warn('Prisengine kunde inte synka material',err);}
  }

  seedVerified();
  window.LiRoPrice={version:106,verified:{...VERIFIED},resolveByArt,resolveRow,resolveMaterial,canonicalUnitPrice,priceText,readOverrides,writeOverrides,syncLiveJobMaterials};

  // 1. Katalogsökning: aldrig fallback till row[1]/GNP.
  window.effectivePrice=function(row){return resolveRow(row);};

  // 2. Okänt pris visas som Pris saknas, inte som 0/NaN.
  const baseFmt=window.fmtKr;
  window.fmtKr=function(v){
    if(v===null||v===''||typeof v==='undefined'||!Number.isFinite(Number(v))) return 'Pris saknas';
    return typeof baseFmt==='function'?baseFmt(Number(v)):priceText(v);
  };

  // 3. Kalkyl/offert/faktura räknar alltid på canonical nettopris från E-numret.
  const baseCalc=window.calculateMaterialTotals;
  if(typeof baseCalc==='function'){
    window.calculateMaterialTotals=function(rows,markupPercent){
      const input=Array.isArray(rows)?rows:[];
      const safe=input.map(m=>({...m,unitPrice:canonicalUnitPrice(m)}));
      const out=baseCalc(safe,markupPercent);
      out.missingPriceCount=input.filter(m=>!!m?.eNr&&resolveByArt(m.eNr)==null).length;
      return out;
    };
  }

  // 4. Befintliga projekt: rätta databasen, inte bara skärmen.
  const baseLoad=window.loadJobDetail;
  if(typeof baseLoad==='function'){
    window.loadJobDetail=async function(id){
      let result=await baseLoad(id);
      if(typeof dbByJob==='function'&&typeof dbPut==='function'){
        const rows=await dbByJob('materials',id);
        let changed=false;
        for(const m of rows){
          if(!m?.eNr) continue;
          const p=resolveByArt(m.eNr);
          const next=p==null?0:p;
          if(Number(m.unitPrice)!==next||Boolean(m.priceMissing)!==(p==null)){
            m.unitPrice=next;
            m.priceMissing=p==null;
            m.updatedAt=new Date().toISOString();
            await dbPut('materials',m);
            changed=true;
          }
        }
        if(changed) result=await baseLoad(id);
      }
      syncLiveJobMaterials();
      return result;
    };
  }

  // 5. Nyregistrering: E-nummer får endast canonical nettopris.
  const baseAdd=window.addMaterial;
  if(typeof baseAdd==='function'){
    window.addMaterial=async function(jobId,input){
      const next={...(input||{})};
      if(next.eNr){
        const p=resolveByArt(next.eNr);
        next.unitPrice=p==null?0:p;
        next.priceMissing=p==null;
      }
      return baseAdd(jobId,next);
    };
  }

  // 6. Snabb + blockeras om säkert nettopris saknas.
  const baseBump=window.bumpMaterialQty;
  if(typeof baseBump==='function'){
    window.bumpMaterialQty=async function(jobId,row,delta,kind){
      if(Number(delta)>0&&row?.[0]&&resolveRow(row)==null){
        alert('Pris saknas för artikeln. GNP/listpris används inte som inköpspris. Lägg in ett verifierat nettopris först.');
        return 0;
      }
      return baseBump(jobId,row,delta,kind);
    };
  }

  // 7. Manuell prisändring blir canonical override för E-numret.
  document.addEventListener('change',e=>{
    const el=e.target;
    if(!el||el.dataset?.field!=='price-override') return;
    const art=normArt(el.dataset.artnr);
    const n=Number(el.value);
    if(!art||!Number.isFinite(n)||n<=0) return;
    const o=readOverrides();o[art]=n;writeOverrides(o);
    syncLiveJobMaterials();
  },true);

  // 8. Inställningar skiljer GNP/listpris från verkligt inköpspris.
  const baseSettings=window.vSettingsMaterial;
  if(typeof baseSettings==='function'){
    window.vSettingsMaterial=function(){
      return String(baseSettings.apply(this,arguments)).replace(/Ahlsell:/g,'GNP/listpris:');
    };
  }

  // 9. Databassvep över ALLA gamla materialrader i ALLA projekt.
  //    Gamla listpriser tas bort. Okänt nettopris blir 0 + priceMissing=true.
  async function repairAllStoredMaterials(){
    if(typeof dbAll!=='function'||typeof dbPut!=='function') return false;
    const rows=await dbAll('materials');
    let changed=0;
    for(const m of rows){
      if(!m?.eNr) continue;
      const p=resolveByArt(m.eNr);
      const next=p==null?0:p;
      if(Number(m.unitPrice)!==next||Boolean(m.priceMissing)!==(p==null)){
        m.unitPrice=next;
        m.priceMissing=p==null;
        m.updatedAt=new Date().toISOString();
        await dbPut('materials',m);
        changed++;
      }
    }
    localStorage.setItem('lirogo_price_repair_v106',JSON.stringify({at:new Date().toISOString(),rows:rows.length,changed}));
    return true;
  }

  let repairTries=0,repairBusy=false;
  const repairTimer=setInterval(async()=>{
    if(repairBusy) return;
    repairBusy=true;
    repairTries++;
    try{
      if(await repairAllStoredMaterials()){
        clearInterval(repairTimer);
        syncLiveJobMaterials();
        try{if(typeof render==='function') render();}catch{}
      }else if(repairTries>80) clearInterval(repairTimer);
    }catch(err){
      console.error('Prisreparation misslyckades',err);
      if(repairTries>80) clearInterval(repairTimer);
    }finally{repairBusy=false;}
  },250);

  // 10. Inbyggt självtest av alla verifierade testartiklar.
  function selfTest(){
    const failures=[];
    for(const [art,want] of Object.entries(VERIFIED)){
      const got=resolveByArt(art);
      if(got!==want) failures.push({art,want,got});
    }
    const ok=failures.length===0;
    window.LiRoPrice.lastSelfTest={ok,failures,at:new Date().toISOString()};
    if(!ok) console.error('LiRo pris-självtest FEL',failures);
    else console.info('LiRo pris-självtest OK',VERIFIED);
    return ok;
  }
  selfTest();

  // 11. Varje render återställer verifierade priser och synkar laddade material.
  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(){
      seedVerified();
      syncLiveJobMaterials();
      return baseRender.apply(this,arguments);
    };
  }
})();