/* LiRo GO v103 – snabbare vardagsflöden utan att ta bort funktioner.
   1) Skapa uppdrag direkt från arbetsinfo; sammanfattningen finns kvar som frivillig granskning.
   2) Avslut nås direkt från arbetsläget utan att gå tillbaka via uppdragsöversikten. */
(function(){
  'use strict';
  if(window._liroQuickflowV103) return;
  window._liroQuickflowV103=true;

  const style=document.createElement('style');
  style.textContent=`
    .wiz-footer-v103{gap:8px}
    .wiz-review-v103{width:100%;min-height:38px;text-align:center;font-size:13px;font-weight:700;color:var(--muted)}
    .work103-finish{margin-top:18px;width:100%;min-height:48px;border-radius:16px;background:var(--surface2);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px}
    .work103-finish svg{width:19px;height:19px;color:var(--accent)}
    .ahlsell-import-v119{margin:10px 0 2px;min-height:42px}
  `;
  document.head.appendChild(style);

  const oldFooter=window.vWizFooter;
  if(typeof oldFooter==='function'){
    window.vWizFooter=function(){
      if(st.step===3){
        const m=detailsMissing();
        return `<div class="wiz-footer wiz-footer-v103">
          ${m.length?`<span class="missing">Saknas: ${m.join(', ')}</span>`:''}
          <button class="primary-btn" data-act="wiz-submit" ${m.length?'disabled':''}>Skapa uppdrag</button>
          <button class="wiz-review-v103" data-act="wiz-next" ${m.length?'disabled':''}>Granska allt först</button>
        </div>`;
      }
      return oldFooter();
    };
  }

  const oldPatchWizFooter=window.patchWizFooter;
  if(typeof oldPatchWizFooter==='function'){
    window.patchWizFooter=function(){
      oldPatchWizFooter();
      if(st.step!==3) return;
      const footer=$app.querySelector('.wiz-footer-v103');
      const primary=footer&&footer.querySelector('.primary-btn');
      const review=footer&&footer.querySelector('.wiz-review-v103');
      if(!primary||!review) return;
      if(primary.disabled) review.setAttribute('disabled','');
      else review.removeAttribute('disabled');
    };
  }

  const oldWork=window.vArbetslage;
  if(typeof oldWork==='function'){
    window.vArbetslage=function(job){
      let html=oldWork(job);
      const button=`<button class="work103-finish" data-v103="finish">${ICON.check}<span>Avsluta / fakturaunderlag</span></button>`;
      const screenEnd='        </div>\n      </div>';
      const pos=html.indexOf(screenEnd);
      if(pos>=0){
        html=html.slice(0,pos+screenEnd.indexOf('</div>')+6)+button+html.slice(pos+screenEnd.indexOf('</div>')+6);
      }else{
        html=html.replace('</div>\n      ${st.matPanel',button+'</div>\n      ${st.matPanel');
      }
      return html;
    };
  }

  /* Gör Ahlsells filimport synlig direkt där material registreras. */
  const oldMaterialPanel=window.vMaterialPanel;
  if(typeof oldMaterialPanel==='function'){
    window.vMaterialPanel=function(job){
      let html=oldMaterialPanel(job);
      const mode=st.matPanelMode||'browse';
      if(mode!=='browse' || html.includes('data-v103="ahlsell-prices"')) return html;
      const marker='<div class="mat-search">';
      const button='<button type="button" class="primary-btn ahlsell-import-v119" data-v103="ahlsell-prices">Ahlsell-priser / importera filer</button>';
      if(html.includes(marker)) html=html.replace(marker,button+marker);
      return html;
    };
  }

  /* iOS/PWA-säkring: krysset på första steget får inte vara beroende av att
     history.back() alltid ger ett popstate-event. Försök normal historik först,
     men stäng direkt till startsidan om webbläsaren inte svarar. */
  document.addEventListener('click',function(e){
    const close=e.target.closest&&e.target.closest('[data-act="wiz-back"]');
    if(!close || typeof st==='undefined' || st?.view!=='wizard' || Number(st.step)!==0) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    let fallback=setTimeout(()=>{
      if(st?.view==='wizard' && Number(st.step)===0){
        st={view:'home'};
        try{draft=null;}catch{}
        try{searchQuery='';}catch{}
        if(typeof render==='function') render();
      }
    },120);

    try{
      history.back();
    }catch(err){
      clearTimeout(fallback);
      st={view:'home'};
      try{draft=null;}catch{}
      try{searchQuery='';}catch{}
      if(typeof render==='function') render();
    }
  },true);

  document.addEventListener('click',function(e){
    const el=e.target.closest&&e.target.closest('[data-v103]');
    if(!el) return;
    if(el.dataset.v103==='ahlsell-prices'){
      e.preventDefault();
      e.stopImmediatePropagation();
      settingsOpen=true;
      st.settingsTab='material';
      if(typeof pushNav==='function') pushNav();
      if(typeof render==='function') render();
      return;
    }
    if(el.dataset.v103!=='finish') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    st.view='job';
    st.jobTab='avsluta';
    pushNav();
    render();
  },true);
})();

/* LiRo GO kundimport 2026-10-03 – 276 kunder från kundlista.
   Engångsimport, dublettsäker och utan att skriva över befintliga uppgifter. */
(function(){
  'use strict';
  const IMPORT_KEY='lirogo_customer_import_2026_10_03_v1';
  if(localStorage.getItem(IMPORT_KEY)==='done') return;

  const FILES=[
    './customers-import-1.json','./customers-import-2.json','./customers-import-3.json',
    './customers-import-4.json','./customers-import-5.json','./customers-import-6.json'
  ];

  const norm=v=>(v||'').toString().trim().toLowerCase().replace(/\s+/g,' ');
  const digits=v=>(v||'').toString().replace(/\D/g,'');
  const sameCustomer=(a,b)=>{
    if(a.customerNumber&&b.customerNumber&&norm(a.customerNumber)===norm(b.customerNumber)) return true;
    if(a.orgNumber&&b.orgNumber&&digits(a.orgNumber)&&digits(a.orgNumber)===digits(b.orgNumber)) return true;
    if(a.email&&b.email&&norm(a.email)===norm(b.email)) return true;
    if(a.name&&b.name&&norm(a.name)===norm(b.name)){
      if(a.address&&b.address&&norm(a.address)===norm(b.address)) return true;
      const ap=digits(a.mobile||a.phone),bp=digits(b.mobile||b.phone);
      if(ap&&bp&&ap===bp) return true;
    }
    return false;
  };

  const toCustomer=r=>({
    customerNumber:r[0]||null,name:r[1]||'',address:r[2]||null,city:r[3]||null,postalCode:r[4]||null,
    phone:r[5]||r[6]||null,mobile:r[6]||null,orgNumber:r[7]||null,vatNumber:r[8]||null,email:r[9]||null
  });

  const mergeMissing=(existing,incoming)=>{
    const out={...existing};
    ['customerNumber','phone','mobile','email','address','postalCode','city','orgNumber','vatNumber']
      .forEach(k=>{ if(!out[k]&&incoming[k]) out[k]=incoming[k]; });
    if(typeof out.isCompany!=='boolean') out.isCompany=!!(out.orgNumber||out.vatNumber);
    return out;
  };

  async function loadRows(){
    const all=[];
    for(const file of FILES){
      const res=await fetch(file+'?v=104',{cache:'no-store'});
      if(!res.ok) throw new Error('Kundimport kunde inte läsa '+file);
      const part=await res.json();
      all.push(...part);
    }
    return all.map(toCustomer);
  }

  async function run(){
    if(typeof DB==='undefined'||!DB||typeof dbAll!=='function'||typeof dbPut!=='function') return false;
    const rows=await loadRows('customers');
    const existing=await dbAll('customers');
    const now=new Date().toISOString();
    let added=0,enriched=0;

    for(const r of rows){
      if(!r.name) continue;
      const match=existing.find(x=>sameCustomer(x,r));
      if(match){
        const merged=mergeMissing(match,r);
        const changed=JSON.stringify(merged)!==JSON.stringify(match);
        if(changed){
          merged.updatedAt=now;
          await dbPut('customers',merged);
          Object.assign(match,merged);
          enriched++;
        }
        continue;
      }
      const c={
        id:'legacy-'+(r.customerNumber||('row-'+added+'-'+Date.now())),
        customerNumber:r.customerNumber,name:r.name,phone:r.phone,mobile:r.mobile,email:r.email,address:r.address,
        postalCode:r.postalCode,city:r.city,saveAsContact:false,isCompany:!!(r.orgNumber||r.vatNumber),
        orgNumber:r.orgNumber,vatNumber:r.vatNumber,invoiceAddress:null,invoicePostalCode:null,invoiceCity:null,
        invoiceReference:null,glnNumber:null,source:'legacy-customer-list-2026-10-03',createdAt:now,updatedAt:now
      };
      await dbPut('customers',c);
      existing.push(c);
      added++;
    }

    customers=await dbAll('customers');
    localStorage.setItem(IMPORT_KEY,'done');
    console.info('LiRo GO kundimport klar',{added,enriched,total:customers.length});
    try{ if(typeof render==='function') render(); }catch(e){}
    return true;
  }

  let tries=0,busy=false;
  const timer=setInterval(async()=>{
    if(busy) return;
    busy=true;
    tries++;
    try{
      if(await run()) clearInterval(timer);
      else if(tries>80) clearInterval(timer);
    }catch(err){
      console.error('LiRo GO kundimport misslyckades',err);
      if(tries>80) clearInterval(timer);
    }finally{
      busy=false;
    }
  },250);
})();

/* LiRo GO v125 – material på iPhone.
   - Direkt decimalinmatning utan att raden växer.
   - Tangentbordet får inte ligga ovanpå materialnavigeringen.
   - Saknat Ahlsell-pris visas som saknat, aldrig som 0 kr. */
(function(){
  'use strict';
  if(window._liroMaterialMobileV125) return;
  window._liroMaterialMobileV125=true;

  const css=document.createElement('style');
  css.textContent=`
    .stepper{gap:8px}
    .stepper button{width:38px;height:38px;flex:0 0 38px}
    .stepper .qty-input-v125{width:58px;min-width:58px;max-width:58px;height:38px;min-height:38px;padding:0 4px;border:1px solid transparent;border-radius:10px;background:transparent;text-align:center;font-weight:700;font-size:15px;line-height:38px;-webkit-appearance:none;appearance:none}
    .stepper .qty-input-v125:focus{background:var(--surface);border-color:var(--accent);outline:2px solid color-mix(in srgb,var(--accent) 35%,transparent);outline-offset:1px}
    .mat-price-missing-v125{color:var(--pri-high);font-weight:600}
    body.liro-keyboard-open .bottomnav,
    body.liro-keyboard-open .fab-wrap,
    body.liro-keyboard-open .snabbval{display:none!important}
    body.liro-keyboard-open .mat-panel-list{padding-bottom:18px}
    .mat-panel{height:var(--liro-vvh,100dvh);bottom:auto}
  `;
  document.head.appendChild(css);

  const oldQtyRow=window.vMatQtyRow;
  if(typeof oldQtyRow==='function'){
    window.vMatQtyRow=function(row,kind){
      kind=kind||'used';
      const existing=jobMaterials.find(m=>m.eNr===row[0] && (m.kind||'used')===kind);
      const qty=existing?existing.qty:0;
      const favs=getFavoriteArtnrs();
      const isFav=favs.includes(row[0]);
      const p=(window.LiRoPrice&&typeof window.LiRoPrice.resolveByArt==='function')?window.LiRoPrice.resolveByArt(row[0]):effectivePrice(row);
      const priceHtml=(Number(p)>0)
        ? `${fmtKr(p)}/${esc(String(row[2]||'st').toLowerCase())}`
        : `<span class="mat-price-missing-v125">Pris saknas</span>`;
      return `
      <div class="mat-item">
        <div class="mat-item-icon">${ICON.box||ICON.package||''}</div>
        <div class="mat-item-info">
          <div class="mat-item-name">${esc(row[3])}</div>
          <div class="mat-item-sub">Art.nr ${esc(row[0])} · ${priceHtml}</div>
        </div>
        <button class="mat-fav ${isFav?'on':''}" data-act="toggle-fav" data-artnr="${esc(row[0])}">${isFav?ICON.starFill:ICON.star}</button>
        <div class="stepper">
          <button data-act="bump-qty" data-artnr="${esc(row[0])}" data-delta="-1" data-kind="${kind}" aria-label="Minska">${ICON.minus}</button>
          <input class="qty-input-v125" type="text" inputmode="decimal" enterkeyhint="done" value="${esc(String(qty).replace('.',','))}" data-direct-qty="1" data-artnr="${esc(row[0])}" data-kind="${kind}" aria-label="Antal">
          <button data-act="bump-qty" data-artnr="${esc(row[0])}" data-delta="1" data-kind="${kind}" aria-label="Öka">${ICON.plusSmall}</button>
        </div>
      </div>`;
    };
  }

  function parseQty(v){
    const n=Number(String(v??'').trim().replace(/\s/g,'').replace(',','.'));
    return Number.isFinite(n)?Math.max(0,n):null;
  }

  async function commitQty(el){
    if(!el||el.dataset.qtyBusy==='1') return;
    const row=typeof catalogRow==='function'?catalogRow(el.dataset.artnr):null;
    if(!row) return;
    const desired=parseQty(el.value);
    if(desired===null){
      const current=jobMaterials.find(m=>m.eNr===row[0]&&(m.kind||'used')===(el.dataset.kind||'used'));
      el.value=String(current?.qty||0).replace('.',',');
      return;
    }
    const kind=el.dataset.kind||'used';
    const current=jobMaterials.find(m=>m.eNr===row[0]&&(m.kind||'used')===kind);
    const old=Number(current?.qty)||0;
    const delta=desired-old;
    if(Math.abs(delta)<1e-9) return;
    el.dataset.qtyBusy='1';
    try{
      await bumpMaterialQty(st.id,row,delta,kind);
      if(desired>0 && typeof pushRecentArtnr==='function') pushRecentArtnr(row[0]);
      if(typeof render==='function') render();
    }finally{
      delete el.dataset.qtyBusy;
    }
  }

  document.addEventListener('focusin',e=>{
    const el=e.target.closest&&e.target.closest('[data-direct-qty="1"]');
    if(!el) return;
    document.body.classList.add('liro-keyboard-open');
    setTimeout(()=>{
      try{el.select();}catch{}
      try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch{}
    },80);
  },true);

  document.addEventListener('keydown',e=>{
    const el=e.target.closest&&e.target.closest('[data-direct-qty="1"]');
    if(!el) return;
    if(e.key==='Enter'){
      e.preventDefault();
      commitQty(el).finally(()=>{try{el.blur();}catch{}});
    }
  },true);

  document.addEventListener('change',e=>{
    const el=e.target.closest&&e.target.closest('[data-direct-qty="1"]');
    if(!el) return;
    e.stopImmediatePropagation();
    commitQty(el);
  },true);

  document.addEventListener('focusout',e=>{
    const el=e.target.closest&&e.target.closest('[data-direct-qty="1"]');
    if(!el) return;
    setTimeout(()=>{
      if(!document.activeElement?.closest?.('[data-direct-qty="1"]')) document.body.classList.remove('liro-keyboard-open');
    },100);
  },true);

  function updateViewport(){
    const vv=window.visualViewport;
    const h=vv?vv.height:window.innerHeight;
    document.documentElement.style.setProperty('--liro-vvh',Math.max(320,Math.round(h))+'px');
  }
  updateViewport();
  window.addEventListener('resize',updateViewport,{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',updateViewport,{passive:true});
    window.visualViewport.addEventListener('scroll',updateViewport,{passive:true});
  }
})();
