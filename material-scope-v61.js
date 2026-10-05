/* LiRo GO v61 – lås material till rätt uppdrag.
   Förhindrar att samma E-nummer i olika uppdrag delar antal eller ändras av fel jobb.
   v123: antal kan skrivas med decimal, t.ex. 2,5 m kabel. */
(function(){
  if(window._liroMaterialScopeV61) return;
  window._liroMaterialScopeV61=true;

  const style=document.createElement('style');
  style.textContent=`
    .qty-input-v123{width:54px;min-width:54px;border:0;background:transparent;text-align:center;font:inherit;font-weight:700;color:inherit;padding:4px 2px;border-radius:8px}
    .qty-input-v123:focus{outline:2px solid var(--accent);background:var(--surface)}
  `;
  document.head.appendChild(style);

  function materialMatchV61(m,jobId,eNr,kind){
    return !!m && m.jobId===jobId && m.eNr===eNr && (m.kind||'used')===(kind||'used');
  }

  function parseQtyV123(v){
    const n=Number(String(v??'').trim().replace(/\s/g,'').replace(',','.'));
    return Number.isFinite(n)?Math.max(0,n):null;
  }

  function formatQtyV123(v){
    const n=Number(v)||0;
    return String(n).replace('.',',');
  }

  bumpMaterialQty=async function(jobId,row,delta,kind){
    kind=kind||'used';
    if(!jobId||!row||!row[0]) return 0;

    const existing=jobMaterials.find(m=>materialMatchV61(m,jobId,row[0],kind));
    if(existing){
      const newQty=Math.max(0,(Number(existing.qty)||0)+(Number(delta)||0));
      if(newQty<=0){
        await deleteMaterial(existing.id);
        jobMaterials=jobMaterials.filter(m=>m.id!==existing.id);
        return 0;
      }
      existing.qty=newQty;
      existing.updatedAt=new Date().toISOString();
      await dbPut('materials',existing);
      return newQty;
    }

    if(Number(delta)>0){
      const m=await addMaterial(jobId,{
        name:row[3],eNr:row[0],unit:row[2],unitPrice:effectivePrice(row),qty:Number(delta),kind
      });
      jobMaterials.push(m);
      return Number(delta);
    }
    return 0;
  };

  async function setMaterialQtyV123(jobId,row,qty,kind){
    kind=kind||'used';
    if(!jobId||!row||!row[0]||qty==null) return 0;
    const existing=jobMaterials.find(m=>materialMatchV61(m,jobId,row[0],kind));

    if(qty<=0){
      if(existing){
        await deleteMaterial(existing.id);
        jobMaterials=jobMaterials.filter(m=>m.id!==existing.id);
      }
      return 0;
    }

    if(existing){
      existing.qty=qty;
      existing.updatedAt=new Date().toISOString();
      await dbPut('materials',existing);
      return qty;
    }

    const m=await addMaterial(jobId,{
      name:row[3],eNr:row[0],unit:row[2],unitPrice:effectivePrice(row),qty,kind
    });
    jobMaterials.push(m);
    return qty;
  }

  vMatQtyRow=function(row,kind){
    kind=kind||'used';
    const jobId=st&&st.id;
    const existing=jobId?jobMaterials.find(m=>materialMatchV61(m,jobId,row[0],kind)):null;
    const qty=existing?existing.qty:0;
    const favs=getFavoriteArtnrs();
    const isFav=favs.includes(row[0]);
    return `
      <div class="mat-item">
        <div class="mat-item-thumb">${ICON.box}</div>
        <div class="mat-item-info">
          <div class="mat-item-name">${esc(row[3])}</div>
          <div class="mat-item-sub">Art.nr ${esc(row[0])} · ${fmtKr(effectivePrice(row))}/${esc(row[2].toLowerCase())}</div>
        </div>
        <button class="mat-fav ${isFav?'on':''}" data-act="toggle-fav" data-artnr="${esc(row[0])}">${isFav?ICON.starFill:ICON.star}</button>
        <div class="stepper">
          <button data-act="bump-qty" data-artnr="${esc(row[0])}" data-delta="-1" data-kind="${kind}" aria-label="Minska">${ICON.minus}</button>
          <input class="qty qty-input-v123" type="text" inputmode="decimal" enterkeyhint="done" value="${esc(formatQtyV123(qty))}" data-qty-v123="1" data-artnr="${esc(row[0])}" data-kind="${esc(kind)}" aria-label="Antal">
          <button data-act="bump-qty" data-artnr="${esc(row[0])}" data-delta="1" data-kind="${kind}" aria-label="Öka">${ICON.plusSmall}</button>
        </div>
      </div>`;
  };

  async function commitQtyV123(el){
    if(!el||el.dataset.qtyBusy==='1') return;
    const qty=parseQtyV123(el.value);
    if(qty==null){
      const existing=jobMaterials.find(m=>materialMatchV61(m,st&&st.id,el.dataset.artnr,el.dataset.kind||'used'));
      el.value=formatQtyV123(existing?existing.qty:0);
      return;
    }
    const row=Array.isArray(catalog)?catalog.find(r=>String(r&&r[0])===String(el.dataset.artnr)):null;
    if(!row||!st?.id) return;
    el.dataset.qtyBusy='1';
    try{
      await setMaterialQtyV123(st.id,row,qty,el.dataset.kind||'used');
      el.value=formatQtyV123(qty);
      if(typeof render==='function') render();
    }finally{
      delete el.dataset.qtyBusy;
    }
  }

  document.addEventListener('change',e=>{
    const el=e.target?.closest?.('[data-qty-v123="1"]');
    if(el) commitQtyV123(el);
  },true);

  document.addEventListener('keydown',e=>{
    const el=e.target?.closest?.('[data-qty-v123="1"]');
    if(!el||e.key!=='Enter') return;
    e.preventDefault();
    el.blur();
  },true);
})();