/* Desktop comparison; retailer prices are entered per unit excluding VAT. */
(function(){
  'use strict';
  const stores=['Hornbach','Bauhaus','Elbutiken'];
  const storageKey='lirogo-retail-comparison-v128';
  const number=value=>Number(String(value).replace(/\s/g,'').replace(',','.'));
  function compare(selling,prices){
    const valid=prices.filter(p=>Number.isFinite(p)&&p>0);
    if(!Number.isFinite(selling)||selling<=0||!valid.length)return null;
    const highest=Math.max(...valid);
    return {highest,percent:(highest/selling-1)*100,above:selling>=highest};
  }
  window.LiRoRetailComparison={compare};
  function load(){try{return JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{return {};}}
  const style=document.createElement('style');
  style.textContent='.retail-v128{display:none}@media(min-width:900px){.retail-v128{display:block;min-width:110px}.retail-v128 button{font:inherit;cursor:pointer;border:1px solid var(--line);border-radius:8px;background:var(--surface);padding:7px 9px;white-space:nowrap}.retail-v128 .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#777}.retail-v128 .red{background:#c33636}.retail-v128 .green{background:#248547}}.retail-dialog-v128{max-width:440px;width:calc(100% - 48px);border:1px solid #aaa;border-radius:16px;padding:24px}.retail-dialog-v128::backdrop{background:#0006}.retail-dialog-v128 label{display:grid;grid-template-columns:1fr 130px;align-items:center;gap:12px;margin:12px 0}.retail-dialog-v128 input{width:100%;box-sizing:border-box}.retail-dialog-v128 footer{display:flex;justify-content:flex-end;gap:12px;margin-top:20px}';
  document.head.append(style);
  function refresh(){
    const data=load();
    document.querySelectorAll('.retail-v128').forEach(cell=>{
      const row=cell.closest('.material-row');
      const qty=Number(cell.dataset.qty);
      const text=row.querySelector('.mat-customer-val')?.textContent||'';
      const total=number(text.replace(/[^\d,\.\s-]/g,''));
      const result=compare(qty>0?total/qty:0,stores.map(s=>Number(data[cell.dataset.key]?.prices?.[s])));
      const button=cell.querySelector('button');
      const nextText=result?(result.percent>0?'↑ ':result.percent<0?'↓ ':'')+Math.abs(result.percent).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'Saknas';
      const nextState=result?(result.above?'green':'red'):'missing';
      if(button.dataset.state===nextState && button.textContent===nextText)return;
      button.dataset.state=nextState;
      button.replaceChildren();
      const dot=document.createElement('span');dot.className='dot'+(result?(result.above?' green':' red'):'');dot.setAttribute('aria-hidden','true');
      button.append(dot,document.createTextNode(result?(result.percent>0?'↑ ':result.percent<0?'↓ ':'')+Math.abs(result.percent).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'Saknas'));
      button.title=result?(result.above?'Kundpriset är vid eller över högsta butikspris.':'Möjlig höjning till högsta butikspris.')+' Klicka för priser.':'Lägg in jämförelsepriser för samma produkt och enhet.';
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
      cell.innerHTML='<div class="lbl">Till butikspris</div><button type="button" data-retail-v128>Saknas</button>';
      row.querySelector('.material-cols')?.append(cell);
    });
    return template.innerHTML;
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-retail-v128]');if(!button)return;
    const cell=button.closest('.retail-v128');const data=load();const entry=data[cell.dataset.key]||{};
    const dialog=document.createElement('dialog');dialog.className='retail-dialog-v128';
    const form=document.createElement('form');const heading=document.createElement('h3');heading.textContent=cell.dataset.name;
    const description=document.createElement('p');description.textContent='Samma produkt. Pris per '+cell.dataset.unit+' exklusive moms. Ange verifierade butikspriser; lämna tomt när pris saknas. Priserna sparas på denna enhet.';
    form.append(heading,description);
    stores.forEach(store=>{const label=document.createElement('label');label.append(document.createTextNode(store));const input=document.createElement('input');input.name=store;input.type='text';input.inputMode='decimal';input.value=entry.prices?.[store]||'';input.placeholder='Saknas';label.append(input);form.append(label);});
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