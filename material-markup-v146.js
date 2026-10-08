/* General material markup and individual selling-price exceptions. */
(function(){
  'use strict';
  const css=document.createElement('style');
  css.textContent='.material-price-dialog{box-sizing:border-box;width:calc(100% - 32px);max-width:440px;max-height:85dvh;overflow:auto;padding:20px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--text)}.material-price-dialog::backdrop{background:#0006}.material-price-dialog input,.material-price-dialog select,.material-price-dialog button{font-size:16px;min-height:44px}.material-price-dialog footer{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}html,body{max-width:100%;overflow-x:hidden}#app,.mat-panel{width:100%;max-width:520px;overflow-x:hidden}.mat-panel-head,.mat-panel-list,.snabbval{width:100%;min-width:0}.snabbval.cols4{grid-template-columns:repeat(4,minmax(0,1fr))}.snabbval button{min-width:0;overflow:hidden}.snabbval button span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
  document.head.append(css);
  function invalidate(){window.dispatchEvent(new Event('liro-material-prices-changed'));}
  async function applyGeneral(percent){
    if(!Number.isFinite(percent)||percent<0)throw new Error('Ange ett påslag på minst 0 %.');
    const all=await dbAll('jobs'),now=new Date().toISOString();
    const changed=all.filter(j=>!['done','invoice_ready','invoiced'].includes(j.status));
    for(const j of changed){j.markupPercent=percent;j.updatedAt=now;}
    await new Promise((resolve,reject)=>{
      const tx=DB.transaction('jobs','readwrite');
      for(const j of changed)tx.objectStore('jobs').put(j);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
    setGlobalPriceDefaults({...getGlobalPriceDefaults(),markupPercent:percent});
    for(const j of jobs){const saved=changed.find(x=>x.id===j.id);if(saved)Object.assign(j,saved);}
    invalidate();
    return changed.length;
  }
  function editPrice(id){
    const m=jobMaterials.find(x=>x.id===id),job=jobById(st.id);if(!m||!job)return;
    const dialog=document.createElement('dialog');dialog.className='material-price-dialog';
    dialog.innerHTML=`<form><h3>${esc(m.name)}</h3><p>Inköpspris ${fmtKr(m.unitPrice)} per ${esc(m.unit)}. Kundpris exklusive moms.</p><label class="field"><span class="label">Ändra som</span><select name="mode" aria-label="Ändra som"><option value="markup">Påslag (%)</option><option value="price">Kundpris per ${esc(m.unit)} (kr)</option></select></label><label class="field"><span class="label" data-price-label>Värde</span><input name="value" type="text" inputmode="decimal" required aria-label="Artikelpris eller påslag"></label><footer><button type="button" data-reset>Återställ till generellt påslag</button><button type="button" data-close>Stäng</button><button type="submit" class="primary-btn">Spara</button></footer><p role="status"></p></form>`;
    const form=dialog.querySelector('form'),mode=form.elements.mode,input=form.elements.value;
    mode.value=m.customerUnitPrice!=null?'price':'markup';
    function fill(){input.value=String(mode.value==='price'?materialSellingUnitPrice(m,job.markupPercent):(m.markupPercent??job.markupPercent??15)).replace('.',',');dialog.querySelector('[data-price-label]').textContent=mode.value==='price'?'Kundpris per '+m.unit+' (kr)':'Påslag (%)';input.setCustomValidity('');}
    fill();mode.onchange=fill;input.oninput=()=>input.setCustomValidity('');
    async function save(reset){
      const value=Number(input.value.trim().replace(',','.'));
      if(!reset&&(!input.value.trim()||!Number.isFinite(value)||value<0)){input.setCustomValidity('Ange ett värde på minst 0.');input.reportValidity();return;}
      const next={...m,updatedAt:new Date().toISOString()};delete next.customerUnitPrice;delete next.markupPercent;
      if(!reset)next[mode.value==='price'?'customerUnitPrice':'markupPercent']=value;
      try{
        await dbPut('materials',next);Object.assign(m,next);delete m.customerUnitPrice;delete m.markupPercent;
        if(next.customerUnitPrice!=null)m.customerUnitPrice=next.customerUnitPrice;
        if(next.markupPercent!=null)m.markupPercent=next.markupPercent;
        invalidate();dialog.close();if(!st.dictatingKey)render();
      }catch(error){dialog.querySelector('[role="status"]').textContent='Kunde inte spara: '+error.message;}
    }
    form.onsubmit=e=>{e.preventDefault();save(false);};
    dialog.querySelector('[data-reset]').onclick=()=>save(true);
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  }
  document.addEventListener('click',async e=>{
    const button=e.target.closest?.('[data-act="apply-global-material-markup"],[data-act="edit-material-selling"]');if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(st.dictatingKey){flash('Stoppa dikteringen innan du ändrar priser.');return;}
    if(button.dataset.act==='edit-material-selling'){editPrice(button.dataset.id);return;}
    const input=document.querySelector('[data-global-material-markup]');
    const percent=Number(input?.value.trim().replace(',','.'));
    if(!input?.value.trim()||!Number.isFinite(percent)||percent<0){input?.setCustomValidity('Ange ett påslag på minst 0 %.');input?.reportValidity();return;}
    input.setCustomValidity('');button.disabled=true;
    try{await applyGeneral(percent);flash('Generellt påslag sparat.');if(!st.dictatingKey)render();}
    catch(error){flash('Kunde inte spara: '+error.message);button.disabled=false;}
  },true);
  document.addEventListener('input',e=>{if(e.target.matches?.('[data-global-material-markup]'))e.target.setCustomValidity('');});
  window.LiRoMaterialMarkup={applyGeneral};
})();
