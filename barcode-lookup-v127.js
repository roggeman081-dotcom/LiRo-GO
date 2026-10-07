(function(){
  'use strict';
  // Set to the verified deployment URL before publishing this layer.
  const ENDPOINT=window.LIRO_BARCODE_ENDPOINT||'https://lirogo-barcode-lookup.roggeman081.workers.dev';
  const KEY='lirogo_gtin_enumber_v1';
  function normalize(value){
    const code=String(value||'').trim();
    if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return null;
    let sum=0;
    for(let i=code.length-2,w=3;i>=0;i--,w=w===3?1:3) sum+=Number(code[i])*w;
    return (10-sum%10)%10===Number(code.at(-1))?code.padStart(14,'0'):null;
  }
  function readCache(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return {};}}
  async function resolve(raw){
    const gtin=normalize(raw);
    if(!gtin) return null;
    const cache=readCache();
    const cached=cache[gtin];
    if(cached && /^\d{7}$/.test(cached.eNumber)) return cached;
    if(!navigator.onLine) throw new Error('Den här streckkoden är inte sparad än. Anslut till internet för första uppslaget.');
    if(!ENDPOINT) throw new Error('Streckkodsuppslaget är ännu inte aktiverat. Du kan söka på E-nummer.');
    let response;
    try{response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gtin:String(raw)}),signal:AbortSignal.timeout(15000)});}
    catch{throw new Error('Kunde inte slå upp streckkoden just nu. Försök igen med internetanslutning.');}
    const result=await response.json().catch(()=>({}));
    if(response.status===409) throw new Error('Streckkoden har flera möjliga artiklar. Välj med E-nummer för att undvika fel material.');
    if(!response.ok) throw new Error('Streckkodsregistret är inte tillgängligt just nu. Du kan söka på E-nummer.');
    const match=result.match;
    if(!match) return null;
    if(match.gtin!==gtin || !/^\d{7}$/.test(match.eNumber)) throw new Error('Streckkodsregistret gav en ogiltig träff.');
    cache[gtin]={gtin,eNumber:match.eNumber};
    const entries=Object.entries(cache).slice(-1000);
    try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(entries)));}catch{}
    return cache[gtin];
  }
  async function confirmMaterial(row,jobId){
    await window.LiRoPrice?.ready;
    if(st.id!==jobId || !jobs.some(job=>job.id===jobId)) return;
    document.querySelector('[data-scan-material-confirm]')?.remove();
    const panel=document.createElement('div');
    panel.dataset.scanMaterialConfirm='1';
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Registrera skannat material');
    panel.style.cssText='position:fixed;inset:0;z-index:150;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px';
    const card=document.createElement('div');
    card.style.cssText='background:var(--surface,#fff);color:var(--text,#111);padding:24px;border-radius:20px;width:100%;max-width:420px';
    panel.append(card);
    const title=document.createElement('h2');title.textContent=row[3];card.append(title);
    const info=document.createElement('p');
    const price=window.LiRoPrice?.resolveByArt(row[0]);
    info.textContent='E-nummer '+row[0]+' · '+(price?fmtKr(price)+'/'+row[2]:'Pris saknas');card.append(info);
    const job=document.createElement('p');job.textContent='Uppdrag: '+jobs.find(job=>job.id===jobId).title;card.append(job);
    const label=document.createElement('label');label.textContent='Antal ('+row[2]+')';
    const quantity=document.createElement('input');quantity.type='text';quantity.inputMode='decimal';quantity.value='1';quantity.setAttribute('aria-label','Antal skannat material');label.append(quantity);card.append(label);
    const error=document.createElement('p');error.setAttribute('role','alert');card.append(error);
    const save=document.createElement('button');save.className='primary-btn';save.textContent='Lägg till på uppdraget';save.style.marginTop='16px';card.append(save);
    const cancel=document.createElement('button');cancel.className='primary-btn';cancel.textContent='Avbryt';cancel.style.cssText='margin-top:10px;background:var(--surface2,#eee)';cancel.onclick=()=>panel.remove();card.append(cancel);
    const saveMaterial=async()=>{
      if(save.disabled) return;
      const count=Number(quantity.value.trim().replace(',','.'));
      if(!Number.isFinite(count)||count<=0){error.textContent='Ange ett antal större än noll.';return;}
      if(st.id!==jobId){error.textContent='Uppdraget har ändrats. Skanna igen i rätt uppdrag.';return;}
      save.disabled=true;cancel.disabled=true;
      try{
        await bumpMaterialQty(jobId,row,count,'used');
        pushRecentArtnr(row[0]);
        panel.remove();render();flash('Materialet är sparat på uppdraget');
      }catch{error.textContent='Materialet kunde inte sparas. Försök igen.';save.disabled=false;cancel.disabled=false;}
    };
    save.onclick=saveMaterial;
    quantity.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();saveMaterial();}if(event.key==='Escape')panel.remove();};
    document.body.append(panel);quantity.focus();quantity.select();
  }
  window.LiRoBarcodeLookup={normalizeGtin:normalize,resolve,confirmMaterial};
})();
