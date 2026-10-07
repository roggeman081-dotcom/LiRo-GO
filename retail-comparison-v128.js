/* Exact retail comparison, with shared fetched prices and optional local overrides. */
(function(){
  'use strict';
  const stores=['Hornbach','Bauhaus','Elbutiken'];
  const storageKey='lirogo-retail-comparison-v128';
  const sharedKey='lirogo-retail-fetched-v145';
  let shared={items:{}};
  try{shared=JSON.parse(localStorage.getItem(sharedKey)||'{"items":{}}');}catch{}
  const normalizeUnit=unit=>String(unit||'').toLowerCase().replace(/\./g,'').trim().replace(/^(fp|förp|förpackning)$/,'frp');
  function automaticOffer(offer,unit){
    if(!offer||!Number.isFinite(offer.priceExVat)||offer.priceExVat<=0)return null;
    const age=Date.now()-Date.parse(offer.checkedAt);
    if(!Number.isFinite(age)||age< -300000||age>7*86400000)return null;
    const from=normalizeUnit(offer.unit),to=normalizeUnit(unit);
    if(from===to)return offer.priceExVat;
    if(from==='frp'&&to==='st'&&Number.isFinite(offer.packageSize)&&offer.packageSize>0)return offer.priceExVat/offer.packageSize;
    return null;
  }
  function entryFor(cell){
    const local=load()[cell.dataset.key]||{},prices={},sources={};
    const id=String(JSON.parse(cell.dataset.key)[0]||'').replace(/^E[-\s]*/i,'').replace(/\s/g,'');
    const offers=shared.items?.[id]?.offers||{};
    for(const store of stores){
      const offer=offers[store],price=automaticOffer(offer,cell.dataset.unit);
      const manual=Number(local.prices?.[store]);
      if(Number.isFinite(manual)&&manual>0&&(!price||Date.parse(local.updatedAt)>Date.parse(offer.checkedAt))){
        prices[store]=manual;sources[store]={checkedAt:local.updatedAt,manual:true};
      }else if(price){prices[store]=price;sources[store]=offer;}
    }
    return {prices,sources,updatedAt:local.updatedAt};
  }
  const feedUrl=window.LIRO_RETAIL_FEED_URL||'https://raw.githubusercontent.com/roggeman081-dotcom/LiRo-GO/main/retail-prices.json';
  const ready=fetch(feedUrl,{cache:'no-store',signal:AbortSignal.timeout(8000)}).then(response=>{
    if(!response.ok)throw new Error('Latest price list unavailable');
    return response;
  }).catch(()=>fetch('./retail-prices.json',{cache:'no-store',signal:AbortSignal.timeout(8000)})).then(response=>{
    if(!response.ok)throw new Error('Price list unavailable');
    return response.json();
  }).then(data=>{
    if(data.version!==1||!data.items||typeof data.items!=='object')throw new Error('Invalid price list');
    shared=data;try{localStorage.setItem(sharedKey,JSON.stringify(data));}catch{}
    refresh();
  }).catch(()=>{refresh();});
  const number=value=>Number(String(value).replace(/\s/g,'').replace(',','.'));
  function compare(selling,prices){
    const valid=prices.filter(p=>Number.isFinite(p)&&p>0);
    if(!Number.isFinite(selling)||selling<=0||!valid.length)return null;
    const highest=Math.max(...valid);
    return {highest,percent:(highest/selling-1)*100,above:selling>=highest};
  }
  window.LiRoRetailComparison={compare,automaticOffer,ready};
  function load(){try{return JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{return {};}}
  const style=document.createElement('style');
  style.textContent='.retail-v128{display:block;min-width:110px}.retail-v128 button{font:inherit;cursor:pointer;border:1px solid var(--line);border-radius:8px;background:var(--surface);padding:7px 9px;white-space:nowrap}.retail-v128 .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#777}.retail-v128 .red{background:#c33636}.retail-v128 .green{background:#248547}@media(max-width:899px){.material-row[data-myprice]{flex-wrap:wrap}.material-row[data-myprice] .material-info{flex:1 1 calc(100% - 44px);min-width:0}.material-row[data-myprice] .material-cols{order:2;flex:1 1 100%;flex-wrap:wrap;justify-content:space-between;gap:12px;text-align:left}.retail-v128 button{min-height:44px;min-width:110px}.retail-dialog-v128{box-sizing:border-box;max-height:85dvh;overflow:auto;padding:20px}.retail-dialog-v128 input{font-size:16px;min-height:44px}.retail-dialog-v128 footer button{min-height:44px}}.retail-dialog-v128{max-width:440px;width:calc(100% - 48px);border:1px solid #aaa;border-radius:16px;padding:24px}.retail-dialog-v128::backdrop{background:#0006}.retail-dialog-v128 label{display:grid;grid-template-columns:1fr 130px;align-items:center;gap:12px;margin:12px 0}.retail-dialog-v128 input{width:100%;box-sizing:border-box}.retail-dialog-v128 footer{display:flex;justify-content:flex-end;gap:12px;margin-top:20px}';
  document.head.append(style);
  function refresh(){
    document.querySelectorAll('.retail-v128').forEach(cell=>{
      const row=cell.closest('.material-row');
      const qty=Number(cell.dataset.qty);
      const text=row.querySelector('.mat-customer-val')?.textContent||'';
      const total=number(text.replace(/[^\d,\.\s-]/g,''));
      const entry=entryFor(cell);
      const result=compare(qty>0?total/qty:0,stores.map(s=>Number(entry.prices[s])));
      const count=Object.keys(entry.prices).length;
      const sourceText=count?count+'/3 butiker · tryck för källor':'Ingen verifierad prisuppgift';
      const sourceLabel=cell.querySelector('.retail-source-v145');
      if(sourceLabel&&sourceLabel.textContent!==sourceText)sourceLabel.textContent=sourceText;
      const button=cell.querySelector('button');
      const nextText=result?(result.percent>0?'↑ ':result.percent<0?'↓ ':'')+Math.abs(result.percent).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'Saknas';
      const nextState=result?(result.above?'green':'red'):'missing';
      if(button.dataset.state===nextState && button.textContent===nextText)return;
      button.dataset.state=nextState;
      button.replaceChildren();
      const dot=document.createElement('span');dot.className='dot'+(result?(result.above?' green':' red'):'');dot.setAttribute('aria-hidden','true');
      button.append(dot,document.createTextNode(result?(result.percent>0?'↑ ':result.percent<0?'↓ ':'')+Math.abs(result.percent).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'Saknas'));
      button.title=result?(result.above?'Kundpriset är vid eller över högsta butikspris.':'Möjlig höjning till högsta butikspris.')+' Klicka för priser.':'Verifierat butikspris saknas för samma produkt och enhet.';
      button.setAttribute('aria-label',button.title+' '+button.textContent);
    });
  }
  const original=window.vJobMaterial;
  if(typeof original!=='function')return;
  window.vJobMaterial=function(job){
    const template=document.createElement('template');template.innerHTML=original.apply(this,arguments);
    template.content.querySelectorAll('.material-row[data-myprice]').forEach(row=>{
      const material=typeof jobMaterials!=='undefined'?jobMaterials.find(m=>String(m.id)===row.dataset.mid):null;
      if(!material)return;
      const cell=document.createElement('div');cell.className='retail-v128';
      cell.dataset.key=JSON.stringify([material.eNr||material.name,material.unit||'st']);
      cell.dataset.qty=String(material.qty||0);cell.dataset.name=material.name;cell.dataset.unit=material.unit||'st';
      cell.innerHTML='<div class="lbl">Till butikspris</div><button type="button" data-retail-v128>Saknas</button><div class="retail-source-v145" style="font-size:11px;color:var(--muted);margin-top:4px;max-width:150px;white-space:normal"></div>';
      row.querySelector('.material-cols')?.append(cell);
    });
    return template.innerHTML;
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-retail-v128]');if(!button)return;
    const cell=button.closest('.retail-v128');const data=load();const entry=entryFor(cell);
    const dialog=document.createElement('dialog');dialog.className='retail-dialog-v128';
    const form=document.createElement('form');const heading=document.createElement('h3');heading.textContent=cell.dataset.name;
    const description=document.createElement('p');description.textContent='Samma produkt. Pris per '+cell.dataset.unit+' exklusive moms. Verifierade priser hämtas automatiskt. Jämförelsen använder högsta tillgängliga pris från samma produkt. Du kan justera priserna vid behov.';
    form.append(heading,description);
    stores.forEach(store=>{const label=document.createElement('label');label.append(document.createTextNode(store));const input=document.createElement('input');input.name=store;input.type='text';input.inputMode='decimal';input.value=entry.prices?.[store]||'';input.placeholder='Saknas';label.append(input);form.append(label);});
    for(const store of stores){
      const source=entry.sources[store];
      const detail=document.createElement('p');
      if(!source){detail.textContent=store+': verifierat pris saknas';}
      else{
        detail.textContent=store+' · '+(source.manual?'Eget pris':'Hämtat pris')+' · '+new Date(source.checkedAt).toLocaleDateString('sv-SE')+' ';
        if(source.url){
          const url=new URL(source.url);
          if(['www.elbutik.se','www.hornbach.se','www.bauhaus.se'].includes(url.hostname)){
            const link=document.createElement('a');link.href=url.href;link.textContent='Visa produkt';link.target='_blank';link.rel='noopener noreferrer';detail.append(link);
          }
        }
      }
      form.append(detail);
    }
    if(entry.updatedAt){const updated=document.createElement('p');updated.textContent='Senast sparat: '+new Date(entry.updatedAt).toLocaleDateString('sv-SE');form.append(updated);}
    const footer=document.createElement('footer');const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Stäng';cancel.onclick=()=>dialog.close();const save=document.createElement('button');save.type='submit';save.textContent='Spara';footer.append(cancel,save);form.append(footer);
    form.onsubmit=event=>{event.preventDefault();const prices={};for(const input of form.querySelectorAll('input')){input.setCustomValidity('');if(input.value.trim()){const p=number(input.value);if(!Number.isFinite(p)||p<=0){input.setCustomValidity('Ange ett pris större än noll.');input.reportValidity();return;}prices[input.name]=p;}}data[cell.dataset.key]={prices,updatedAt:new Date().toISOString()};try{localStorage.setItem(storageKey,JSON.stringify(data));}catch{save.textContent='Kunde inte spara';return;}dialog.close();refresh();};
    dialog.append(form);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  });
  let pending=false;
  new MutationObserver(records=>{
    if(!records.some(r=>!r.target.closest?.('.retail-v128')&&!r.target.parentElement?.closest('.retail-v128')))return;
    if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refresh();});
  }).observe(document.getElementById('app'),{childList:true,subtree:true,characterData:true});
  window.addEventListener('storage',event=>{if(event.key===storageKey)refresh();});
  // The next normal render installs cells, without interrupting dictation.
})();
