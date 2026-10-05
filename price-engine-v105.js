/* LiRo GO v105 – kanonisk prislogik för material.
   Samma verifierade nettopris används i sök, material, kalkyl och fakturaunderlag.
   Katalogens row[1] är GNP/listpris och får aldrig användas som inköpspris. */
(function(){
  'use strict';
  if(window._liroPriceEngineV105) return;
  window._liroPriceEngineV105=true;

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
        m.unitPrice=p==null?NaN:p;
        m.priceMissing=p==null;
      });
    }catch(err){console.warn('Prisengine kunde inte synka material',err);}
  }

  seedVerified();
  window.LiRoPrice={version:105,verified:{...VERIFIED},resolveByArt,resolveRow,resolveMaterial,priceText,readOverrides,writeOverrides,syncLiveJobMaterials};

  // 1. Katalogsökning: aldrig fallback till row[1]/GNP.
  window.effectivePrice=function(row){return resolveRow(row);};

  // 2. Okänt pris visas som Pris saknas, inte NaN från prisengine.
  const baseFmt=window.fmtKr;
  window.fmtKr=function(v){
    if(v===null||v===''||typeof v==='undefined'||!Number.isFinite(Number(v))) return 'Pris saknas';
    return typeof baseFmt==='function'?baseFmt(Number(v)):priceText(v);
  };

  // 3. Kalkyl/offert/faktura räknar alltid om E-nummer från canonical nettopris.
  const baseCalc=window.calculateMaterialTotals;
  if(typeof baseCalc==='function'){
    window.calculateMaterialTotals=function(rows,markupPercent){
      const input=Array.isArray(rows)?rows:[];
      const safe=input.map(m=>{
        const p=resolveMaterial(m);
        return {...m,unitPrice:p==null?0:p};
      });
      const out=baseCalc(safe,markupPercent);
      out.missingPriceCount=input.filter(m=>!!m?.eNr&&resolveMaterial(m)==null).length;
      return out;
    };
  }

  // 4. Befintliga projekt: gamla sparade listpriser ersätts transient när projektet öppnas.
  const baseLoad=window.loadJobDetail;
  if(typeof baseLoad==='function'){
    window.loadJobDetail=async function(id){
      const r=await baseLoad(id);
      syncLiveJobMaterials();
      return r;
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
      }
      return baseAdd(jobId,next);
    };
  }

  // 6. Snabb +/− blockeras om säkert nettopris saknas.
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

  // 8. Inställningar skiljer GNP/listpris från inköpspris.
  const baseSettings=window.vSettingsMaterial;
  if(typeof baseSettings==='function'){
    window.vSettingsMaterial=function(){
      return String(baseSettings.apply(this,arguments)).replace(/Ahlsell:/g,'GNP/listpris:');
    };
  }

  // 9. Varje render synkar även redan laddade materialrader.
  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(){
      seedVerified();
      syncLiveJobMaterials();
      return baseRender.apply(this,arguments);
    };
  }
})();