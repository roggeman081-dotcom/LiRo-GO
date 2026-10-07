/* LiRo GO v61 – lås material till rätt uppdrag.
   Förhindrar att samma E-nummer i olika uppdrag delar antal eller ändras av fel jobb.
   v123: antal kan skrivas med decimal, t.ex. 2,5 m kabel.
   v138: individuellt materialpåslag per rad. Påslaget är internt och visas inte i fakturaunderlaget. */
(function(){
  if(window._liroMaterialScopeV61) return;
  window._liroMaterialScopeV61=true;

  const style=document.createElement('style');
  style.textContent=`
    .qty-input-v123{width:54px;min-width:54px;border:0;background:transparent;text-align:center;font:inherit;font-weight:700;color:inherit;padding:4px 2px;border-radius:8px}
    .qty-input-v123:focus{outline:2px solid var(--accent);background:var(--surface)}
    .line-markup-v138{width:62px;min-width:62px;height:32px;min-height:32px;padding:4px 6px;border-radius:9px;text-align:right;font-size:14px;font-weight:700;background:var(--surface2)}
    .line-markup-v138:focus{background:var(--surface);outline:2px solid var(--accent)}
    @media(max-width:560px){.material-cols{gap:10px}.line-markup-v138{width:56px;min-width:56px}}
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

  /* ---- v138: individuellt påslag per materialrad ---- */
  const baseCalculateMaterialTotalsV138=typeof calculateMaterialTotals==='function'?calculateMaterialTotals:null;
  calculateMaterialTotals=function(rows,markupPercent){
    const arr=Array.isArray(rows)?rows:[];
    const fallback=Math.max(0,toNumber(markupPercent,15));
    let cost=0,markupSum=0;
    for(const m of arr){
      const rowCost=Math.max(0,toNumber(m?.qty,0))*Math.max(0,toNumber(m?.unitPrice,0));
      const lineMarkup=m?.markupPercent!==undefined&&m?.markupPercent!==null&&m?.markupPercent!==''
        ?Math.max(0,toNumber(m.markupPercent,fallback)):fallback;
      cost+=rowCost;
      markupSum+=rowCost*(lineMarkup/100);
    }
    return {cost,markup:fallback,markupSum,total:cost+markupSum,count:arr.length};
  };

  function effectiveLineMarkupV138(m,job){
    if(m&&m.markupPercent!==undefined&&m.markupPercent!==null&&m.markupPercent!=='') return Math.max(0,toNumber(m.markupPercent,0));
    return Math.max(0,toNumber(job?.markupPercent,15));
  }

  function refreshMaterialRowV138(row,m,job){
    if(!row||!m||!job) return;
    const pct=effectiveLineMarkupV138(m,job);
    const base=(Math.max(0,toNumber(m.qty,0))*Math.max(0,toNumber(m.unitPrice,0)));
    const customer=base*(1+pct/100);
    const customerEl=row.querySelector('.mat-customer-val');
    if(customerEl && customerEl.textContent!==fmtKr(customer)) customerEl.textContent=fmtKr(customer);

    const markupVal=row.querySelector('.mat-markup-val');
    const col=markupVal?.parentElement;
    if(col&&!col.querySelector('[data-line-markup-v138]')){
      col.innerHTML='<div class="lbl">Påslag %</div><input class="line-markup-v138" type="text" inputmode="decimal" enterkeyhint="done" aria-label="Påslag procent" data-line-markup-v138="'+esc(m.id)+'" value="'+esc(String(pct).replace('.',','))+'">';
    }else{
      const input=col?.querySelector('[data-line-markup-v138]');
      if(input&&document.activeElement!==input) input.value=String(pct).replace('.',',');
    }
  }

  function applyLineMarkupUiV138(){
    const job=st?.id?jobById(st.id):null;
    if(!job||!Array.isArray(jobMaterials)) return;
    document.querySelectorAll('.material-row[data-mid]').forEach(row=>{
      const m=jobMaterials.find(x=>String(x.id)===String(row.dataset.mid));
      if(m&&m.kind!=='planned') refreshMaterialRowV138(row,m,job);
    });
  }

  async function saveLineMarkupV138(input){
    const m=jobMaterials.find(x=>String(x.id)===String(input.dataset.lineMarkupV138));
    const job=st?.id?jobById(st.id):null;
    if(!m||!job) return;
    const raw=String(input.value||'').trim().replace(',','.');
    const n=Number(raw);
    if(!Number.isFinite(n)||n<0){
      input.value=String(effectiveLineMarkupV138(m,job)).replace('.',',');
      flash('Ange påslag i procent, t.ex. 25');
      return;
    }
    m.markupPercent=n;
    m.updatedAt=new Date().toISOString();
    await dbPut('materials',m);
    const row=input.closest('.material-row');
    refreshMaterialRowV138(row,m,job);
    if(typeof flash==='function') flash('Påslag sparat för materialraden');
  }

  document.addEventListener('change',e=>{
    const input=e.target?.closest?.('[data-line-markup-v138]');
    if(input) saveLineMarkupV138(input);
  },true);

  document.addEventListener('keydown',e=>{
    const input=e.target?.closest?.('[data-line-markup-v138]');
    if(!input||e.key!=='Enter') return;
    e.preventDefault();
    input.blur();
  },true);

  document.addEventListener('input',e=>{
    if(e.target?.dataset?.field==='markup') setTimeout(applyLineMarkupUiV138,0);
  },true);

  const observerV138=new MutationObserver(()=>applyLineMarkupUiV138());
  observerV138.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  setTimeout(applyLineMarkupUiV138,0);

  /* Fakturaunderlaget ska bara visa kundens materialbelopp. Inköpspris och påslag är internt. */
  if(typeof vJobFaktura==='function'){
    const baseJobFakturaV138=vJobFaktura;
    vJobFaktura=function(job){
      let html=baseJobFakturaV138(job);
      const eco=typeof jobEconomySummary==='function'?jobEconomySummary(job):null;
      const count=(jobMaterials||[]).filter(m=>m.jobId===job.id&&m.kind!=='planned').length;
      if(eco?.material){
        const replacement='<div class="row between" style="margin-top:8px"><span class="muted">Material ('+count+' artiklar)</span><span class="bold">'+fmtKr(eco.material.total)+'</span></div>';
        html=html.replace(/<div class="row between" style="margin-top:8px"><span class="muted">Material \([^<]*<\/span><span class="bold">[^<]*<\/span><\/div>\s*<div class="row between" style="margin-top:8px"><span class="muted">Påslag material \([^<]*<\/span><span class="bold">[^<]*<\/span><\/div>/,replacement);
      }
      return html;
    };
  }
})();