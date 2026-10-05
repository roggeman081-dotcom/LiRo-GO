/* LiRo GO v112 – global materialpris- och decimalhantering.
   Ahlsell avtalsfil: NETTOPRIS är byte 45–53 och anges i ören.
   Explicita artikelrader nedan är importerade direkt från avtalsfilen 2026-10-05.
   Katalog-/GNP-pris får aldrig användas som inköpspris. */
(function(){
  'use strict';
  const KEY='lirogo_price_overrides';

  // Explicita artikelpriser ur Ahlsells avtalsfil (NETTOPRIS / 100).
  const AHLSSELL_EXPLICIT={
    '1620002':483,'1621360':147,'1623332':157,'1623336':173,'1820917':3820,'1820922':3230,'1820932':4730,'233093':52,'233094':55.5,'233197':175,'233378':737,'244294':209,'245240':334,'250699':266,'257515':637,'257568':153,'257700':50,'258837':257,'260568':182,'260571':197,'261973':234,'263412':2175,'266040':161,'266080':242,'266081':316,'273176':361,'273177':73,'280296':363,'280297':282,'280410':226,'280427':200,'280431':178,'284955':230,'284956':243,'284957':255,'284960':46,'284961':95.5,'285607':220,'285637':285,'290003':221,'290026':200,'290028':281,'290029':352,'290030':327,'293289':296,'310316':286,'310317':304,'314098':677,'356341':182,'357637':631,'361940':1755,'374888':499,'38137281':392,'38170119':1515,'384958':200,'384976':488,'384977':617,'384978':792,'403061':551,'410436':282,'410438':283,'410439':282,'410440':259,'410441':283,'410442':544,'416530':1615,'416556':105,'416557':111,'416558':115,'416559':129,'416561':120,'416562':146,'416570':648,'418834':787,'4201322':2490,'457729':38.5,'457732':41.5,'457759':205,'457764':293,'457963':418,'457964':647,'457965':581,'457966':988,'457967':897,'465499':65,'467288':60,'467289':64,'467292':68.5,'467293':71.5,'467295':72.5,'467296':72.5,'467305':326,'467314':29,'467317':31,'469223':725,'469224':1075,'469446':481,'47153840':530,'474938':259,'475194':135,'475195':760,'475196':624,'475212':453,'475213':416,'475214':163,'476360':1880,'476392':48,'476420':162,'476422':191,'499125':268,'499126':211,'499127':368,'499128':1570,'499129':518,'499130':1040,'505718':199,'505719':221,'531008':294,'546506':213,'553610':96.5,'553612':26.5,'553630':361,'554618':377,'554666':765,'555665':2845,'555675':1395,'555676':147,'562404':602,'562405':1450,'562480':5650,'562483':859,'562504':461,'562736':235,'706708':53,'706710':65.5,'706718':141,'707293':7025,'708186':444,'708187':266,'716095':916,'716121':378,'716536':665,'716554':1045,'717796':50.5,'717797':51.5,'717801':1790,'717802':665,'742803':3580,'748663':942,'750481':2170,'757528':4350
  };

  // Manuellt verifierade nettopriser för vanliga artiklar som ligger på materialklassrabatt
  // och därför inte har ett explicit NETTOPRIS på egen artikelrad i avtalsfilen.
  const VERIFIED={
    ...AHLSSELL_EXPLICIT,
    '0445707':22.42,'1500136':64.07,'1377701':385.70,'1820444':93.61,'0461543':34.78,
    '1418102':24.05,'0030960':29.04,'0445721E':28.75,'1377703':469.80,'0437372':4.97,'1414471':13.44
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

  window.LiRoPrice={version:112,verified:{...VERIFIED},explicitAhlsell:{...AHLSSELL_EXPLICIT},parseSvNumber:sv,resolveByArt:byArt,resolveRow:rowPrice,readOverrides:read,writeOverrides:write,syncRows};

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