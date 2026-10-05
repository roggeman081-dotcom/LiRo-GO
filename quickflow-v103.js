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

  const oldWork=window.vArbetslage;
  if(typeof oldWork==='function'){
    window.vArbetslage=function(job){
      let html=oldWork(job);
      const marker='</div>\n      ${st.matPanel ? vMaterialPanel(job) : \'\'}';
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

  document.addEventListener('click',function(e){
    const el=e.target.closest&&e.target.closest('[data-v103]');
    if(!el||el.dataset.v103!=='finish') return;
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
    const rows=await loadRows();
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

/* LiRo GO prisfix 2026-10-05.
   Verifierade Allcell/Ahlsell-nettopriser ska vinna över katalog-/listpris.
   Körs en gång så att efterföljande manuella prisändringar inte skrivs över. */
(function(){
  'use strict';
  const MIGRATION_KEY='lirogo_verified_net_prices_2026_10_05_v1';
  if(localStorage.getItem(MIGRATION_KEY)==='done') return;

  const verifiedNetPrices={
    '0445707':22.42,
    '1500136':64.07,
    '1377701':385.70,
    '1820444':93.61
  };

  let overrides={};
  try{overrides=JSON.parse(localStorage.getItem('lirogo_price_overrides')||'{}')||{};}catch{overrides={};}
  Object.entries(verifiedNetPrices).forEach(([artnr,price])=>{overrides[artnr]=price;});
  localStorage.setItem('lirogo_price_overrides',JSON.stringify(overrides));
  localStorage.setItem(MIGRATION_KEY,'done');

  try{if(typeof render==='function') render();}catch{}
})();
