/* LiRo GO v105 – kanonisk prislogik för material.
   Syfte: samma verifierade nettopris ska användas i sök, material, kalkyl och fakturaunderlag.
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
  function writeOverrides(o){ localStorage.setItem(KEY,JSON.stringify(o||{})); }
  function seedVerified(){
    const o=readOverrides();
    let changed=false;
    for(const [art,price] of Object.entries(VERIFIED)){
      if(Number(o[art])!==price){ o[art]=price; changed=true; }
    }
    if(changed) writeOverrides(o);
  }
  function resolveByArt(artnr){
    const art=normArt(artnr);
    if(!art) return null;
    const n=Number(readOverrides()[art]);
    return Number.isFinite(n)&&n>0?n:null;
  }
  function resolveRow(row){ return row&&row[0]?resolveByArt(row[0]):null; }
  function resolveMaterial(m){
    if(!m) return null;
    if(m.eNr){ return resolveByArt(m.eNr); }
    const n=Number(m.unitPrice);
    return Number.isFinite(n)&&n>0?n:null;
  }
  function hasPrice(v){ return Number.isFinite(Number(v))&&Number(v)>0; }
  function priceText(v){
    if(!hasPrice(v)) return 'Pris saknas';
    const n=Number(v);
    return n.toLocaleString('sv-SE',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2})+' kr';
  }

  seedVerified();
  window.LiRoPrice={version:105,verified:{...VERIFIED},resolveByArt,resolveRow,resolveMaterial,priceText,readOverrides,writeOverrides};

  // 1. All katalogsökning använder endast verifierat/manuellt nettopris.
  window.effectivePrice=function(row){ return resolveRow(row); };

  // 2. Gemensam formattering: null/okänt pris visas aldrig som 0 kr.
  const baseFmt=window.fmtKr;
  window.fmtKr=function(v){
    if(v===null||v===''||typeof v==='undefined'||!Number.isFinite(Number(v))) return 'Pris saknas';
    return typeof baseFmt==='function'?baseFmt(Number(v)):priceText(v);
  };

  // 3. Alla materialkalkyler räknar om från E-numret, inte från gammalt lagrat listpris.
  const baseCalc=window.calculateMaterialTotals;
  if(typeof baseCalc==='function'){
    window.calculateMaterialTotals=function(rows,markupPercent){
      const safe=(Array.isArray(rows)?rows:[]).map(m=>{
        const p=resolveMaterial(m);
        return {...m,unitPrice:p==null?0:p};
      });
      const out=baseCalc(safe,markupPercent);
      out.missingPriceCount=safe.filter((m,i)=>{
        const original=(Array.isArray(rows)?rows:[])[i];
        return !!original?.eNr && resolveMaterial(original)==null;
      }).length;
      return out;
    };
  }

  // 4. Befintliga projekt får aktuellt nettopris direkt när de öppnas.
  const baseLoad=window.loadJobDetail;
  if(typeof baseLoad==='function'){
    window.loadJobDetail=async function(id){
      const r=await baseLoad(id);
      if(Array.isArray(window.jobMaterials)){
        window.jobMaterials.forEach(m=>{
          if(m?.eNr){
            const p=resolveMaterial(m);
            m.unitPrice=p==null?0:p;
            m.priceMissing=p==null;
          }
        });
      }
      return r;
    };
  }

  // 5. Nytt material med E-nummer får alltid pris från samma källa.
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

  // 6. Snabb +/− får inte skapa artiklar med okänt inköpspris.
  const baseBump=window.bumpMaterialQty;
  if(typeof baseBump==='function'){
    window.bumpMaterialQty=async function(jobId,row,delta,kind){
      if(Number(delta)>0 && row?.[0] && resolveRow(row)==null){
        alert('Pris saknas för artikeln. GNP/listpris används inte som inköpspris. Lägg in ett verifierat nettopris först.');
        return 0;
      }
      return baseBump(jobId,row,delta,kind);
    };
  }

  // 7. Om användaren själv anger pris för ett E-nummer blir det canonical override.
  document.addEventListener('change',e=>{
    const el=e.target;
    if(!el||el.dataset?.field!=='price-override') return;
    const art=normArt(el.dataset.artnr);
    const n=Number(el.value);
    if(!art||!Number.isFinite(n)||n<=0) return;
    const o=readOverrides(); o[art]=n; writeOverrides(o);
  },true);

  // 8. Extra skydd mot gamla katalog/listpriser i UI.
  const baseMatQty=window.vMatQtyRow;
  if(typeof baseMatQty==='function'){
    window.vMatQtyRow=function(row,kind){
      let html=baseMatQty(row,kind);
      const p=resolveRow(row);
      if(p==null){
        html=html.replace(/\d+[\.,]?\d*\s*kr\/(st|m|pkt|förp|rulle|par|sats)/i,'Pris saknas/$1');
      }
      return html;
    };
  }

  // 9. Settings får kalla katalogvärdet för listpris/GNP – aldrig inköpspris.
  const baseSettings=window.vSettingsMaterial;
  if(typeof baseSettings==='function'){
    window.vSettingsMaterial=function(){
      return String(baseSettings.apply(this,arguments)).replace(/Ahlsell:/g,'GNP/listpris:');
    };
  }

  // 10. Varje render säkerställer att verifierade värden ligger kvar som sanning.
  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(){ seedVerified(); return baseRender.apply(this,arguments); };
  }
})();