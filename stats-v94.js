/* LiRo GO v94 – fördjupad statistik & rapportvy.
   Mobil: kompakt. Desktop: full dashboard. Bygger endast på registrerad LiRo GO-data. */
(function(){
  'use strict';
  if(window._liroStatsV94) return;
  window._liroStatsV94=true;

  const style=document.createElement('style');
  style.textContent=`
    .stats94{display:grid;gap:14px}
    .stats94-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:4px}
    .stats94-ranges{display:flex;gap:7px;flex-wrap:wrap}
    .stats94-range{padding:8px 12px;border-radius:999px;background:var(--surface);font-size:12px;font-weight:650;color:var(--muted)}
    .stats94-range.on{background:var(--accent);color:var(--ink)}
    .stats94-export{padding:8px 12px;border-radius:12px;background:var(--surface2);font-size:12px;font-weight:650}
    .stats94-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .stats94-kpi{background:var(--surface);border-radius:18px;padding:14px;min-width:0}
    .stats94-kpi b{font-size:21px;display:block;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .stats94-kpi span{font-size:11px;color:var(--muted);display:block;margin-top:5px}
    .stats94-grid{display:grid;gap:14px}
    .stats94-card{background:var(--surface);border-radius:20px;padding:16px;min-width:0}
    .stats94-card h3{font-size:15px;margin:0 0 12px;font-weight:700}
    .stats94-sub{font-size:11px;color:var(--muted);line-height:1.45}
    .stats94-bars{display:flex;align-items:flex-end;gap:8px;height:150px;margin-top:8px}
    .stats94-barcol{flex:1;min-width:0;display:flex;height:100%;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}
    .stats94-bar{width:100%;max-width:42px;min-height:3px;border-radius:8px 8px 3px 3px;background:var(--accent)}
    .stats94-barval{font-size:9px;color:var(--muted);white-space:nowrap}
    .stats94-barlabel{font-size:10px;color:var(--muted)}
    .stats94-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
    .stats94-row:last-child{border-bottom:0}
    .stats94-row-main{min-width:0}
    .stats94-row-main b{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .stats94-row-main span{display:block;color:var(--muted);font-size:11px;margin-top:2px}
    .stats94-value{font-size:13px;font-weight:700;white-space:nowrap}
    .stats94-statusgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .stats94-status{background:var(--surface2);padding:10px 12px;border-radius:14px}
    .stats94-status b{font-size:18px;display:block}
    .stats94-status span{font-size:10px;color:var(--muted)}
    .stats94-note{font-size:11px;color:var(--muted);line-height:1.45}
    @media (min-width:900px){
      .stats94-shell{max-width:1280px!important}
      .stats94{gap:18px}
      .stats94-kpis{grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
      .stats94-kpi{padding:18px}
      .stats94-kpi b{font-size:24px}
      .stats94-grid{grid-template-columns:minmax(0,1.45fr) minmax(320px,.75fr);gap:18px}
      .stats94-card{padding:20px}
      .stats94-bars{height:220px}
      .stats94-statusgrid{grid-template-columns:repeat(3,minmax(0,1fr))}
    }
  `;
  document.head.appendChild(style);

  function rangeKey(){ return st?.statsRangeV94||'month'; }
  function bounds(){
    const now=new Date();
    const end=new Date(now); end.setHours(23,59,59,999);
    let start;
    const key=rangeKey();
    if(key==='7d'){ start=new Date(now); start.setDate(start.getDate()-6); start.setHours(0,0,0,0); }
    else if(key==='90d'){ start=new Date(now); start.setDate(start.getDate()-89); start.setHours(0,0,0,0); }
    else if(key==='year'){ start=new Date(now.getFullYear(),0,1); }
    else { start=new Date(now.getFullYear(),now.getMonth(),1); }
    return {start,end,key};
  }
  function inRange(v,start,end){
    const d=new Date(v||0); return !Number.isNaN(d.getTime())&&d>=start&&d<=end;
  }
  function fmtN(n){ return Math.round(Number(n)||0).toLocaleString('sv-SE'); }
  function kr(n){ return fmtN(n)+' kr'; }
  function hrs(n){ return (Math.round((Number(n)||0)*10)/10).toLocaleString('sv-SE')+' h'; }

  function segmentHours(job,start,end){
    let total=0;
    const segs=typeof normalizeWorkSegments==='function'?normalizeWorkSegments(job):Array.isArray(job?.workSegments)?job.workSegments:[];
    if(segs.length){
      for(const seg of segs){
        const a=new Date(seg.start),b=new Date(seg.end);
        if(Number.isNaN(a)||Number.isNaN(b)) continue;
        const s=Math.max(a.getTime(),start.getTime()),e=Math.min(b.getTime(),end.getTime());
        if(e>s) total+=(e-s)/3600000;
      }
      return total;
    }
    const manual=Math.max(0,Number(typeof effectiveLoggedHours==='function'?effectiveLoggedHours(job):job?.loggedHours)||0);
    const when=job?.finishedAt||job?.updatedAt||job?.createdAt;
    return inRange(when,start,end)?manual:0;
  }

  function materialRows(){
    return Array.isArray(window.allMaterialsV94)?window.allMaterialsV94:[];
  }
  async function ensureMaterials(){
    try{ window.allMaterialsV94=await dbAll('materials'); }catch{ window.allMaterialsV94=[]; }
  }

  function periodData(){
    const {start,end,key}=bounds();
    const mats=materialRows();
    let labor=0,hours=0,materialCost=0,materialRevenue=0,materialProfit=0;
    const projectMap=new Map();
    const customerMap=new Map();

    for(const job of (jobs||[])){
      if(!job||job.isQuote) continue;
      const h=segmentHours(job,start,end);
      const rate=Math.max(0,Number(job.hourlyRate)||0);
      const laborValue=h*rate;
      hours+=h; labor+=laborValue;
      if(laborValue>0){
        const p=projectMap.get(job.id)||{job,labor:0,material:0,total:0};
        p.labor+=laborValue;p.total+=laborValue;projectMap.set(job.id,p);
        const cust=typeof customerOf==='function'?customerOf(job):null;
        if(cust){const x=customerMap.get(cust.id)||{name:cust.name,total:0,jobs:new Set()};x.total+=laborValue;x.jobs.add(job.id);customerMap.set(cust.id,x);}
      }
    }

    for(const m of mats){
      if(!m||m.kind==='planned') continue;
      const when=m.createdAt||m.updatedAt;
      if(!inRange(when,start,end)) continue;
      const job=typeof jobById==='function'?jobById(m.jobId):null;
      if(!job||job.isQuote) continue;
      const cost=Math.max(0,Number(m.qty)||0)*Math.max(0,Number(m.unitPrice)||0);
      const markup=Math.max(0,Number(job.markupPercent)||0)/100;
      const revenue=calculateMaterialTotals([m],job.markupPercent).total,profit=revenue-cost;
      materialCost+=cost; materialProfit+=profit; materialRevenue+=revenue;
      const p=projectMap.get(job.id)||{job,labor:0,material:0,total:0};
      p.material+=revenue;p.total+=revenue;projectMap.set(job.id,p);
      const cust=typeof customerOf==='function'?customerOf(job):null;
      if(cust){const x=customerMap.get(cust.id)||{name:cust.name,total:0,jobs:new Set()};x.total+=revenue;x.jobs.add(job.id);customerMap.set(cust.id,x);}
    }

    let invoiced=0,invoiceReady=0;
    for(const job of (jobs||[])){
      if(!job||job.isQuote) continue;
      const allRows=mats.filter(m=>m.jobId===job.id&&m.kind!=='planned');
      let matTotal=0;
      if(typeof calculateMaterialTotals==='function') matTotal=calculateMaterialTotals(allRows,job.markupPercent).total||0;
      else {
        for(const m of allRows){const c=(Number(m.qty)||0)*(Number(m.unitPrice)||0);matTotal+=c*(1+(Number(job.markupPercent)||0)/100);}
      }
      const total=(typeof laborCost==='function'?laborCost(job):Math.max(0,Number(job.loggedHours)||0)*Math.max(0,Number(job.hourlyRate)||0))
        +matTotal+(typeof travelCost==='function'?travelCost(job):0)+Math.max(0,Number(job.otherCosts)||0);
      if(job.status==='invoiced'&&inRange(job.invoicedAt,start,end)) invoiced+=total;
      if(job.status==='invoice_ready') invoiceReady+=total;
    }

    const statuses={planned:0,active:0,waiting:0,done:0,invoice_ready:0,invoiced:0};
    for(const job of (jobs||[])){
      const s=job?.status||'planned';
      if(s in statuses) statuses[s]++;
      else if(s==='ongoing') statuses.active++;
    }

    const topProjects=[...projectMap.values()].sort((a,b)=>b.total-a.total).slice(0,6);
    const topCustomers=[...customerMap.values()].sort((a,b)=>b.total-a.total).slice(0,6);
    return {start,end,key,labor,hours,materialCost,materialRevenue,materialProfit,invoiced,invoiceReady,statuses,topProjects,topCustomers,performed:labor+materialRevenue};
  }

  function trendBuckets(data){
    const {start,end,key}=data;
    const buckets=[];
    const monthly=key==='year'||key==='90d';
    if(monthly){
      let d=new Date(start.getFullYear(),start.getMonth(),1);
      while(d<=end){
        const next=new Date(d.getFullYear(),d.getMonth()+1,1);
        buckets.push({start:new Date(d),end:new Date(next.getTime()-1),label:d.toLocaleDateString('sv-SE',{month:'short'}),value:0});
        d=next;
      }
    }else{
      let d=new Date(start);d.setHours(0,0,0,0);
      while(d<=end){
        const next=new Date(d);next.setDate(next.getDate()+1);
        buckets.push({start:new Date(d),end:new Date(next.getTime()-1),label:d.toLocaleDateString('sv-SE',{day:'numeric',month:'short'}),value:0});
        d=next;
      }
    }
    for(const b of buckets){
      for(const job of (jobs||[])){
        if(!job||job.isQuote) continue;
        b.value+=segmentHours(job,b.start,b.end)*Math.max(0,Number(job.hourlyRate)||0);
      }
      for(const m of materialRows()){
        if(!m||m.kind==='planned'||!inRange(m.createdAt||m.updatedAt,b.start,b.end)) continue;
        const job=typeof jobById==='function'?jobById(m.jobId):null;if(!job||job.isQuote) continue;
        const cost=Math.max(0,Number(m.qty)||0)*Math.max(0,Number(m.unitPrice)||0);
        b.value+=calculateMaterialTotals([m],job.markupPercent).total;
      }
    }
    return buckets;
  }

  function rangeLabel(){
    return rangeKey()==='7d'?'7 dagar':rangeKey()==='90d'?'90 dagar':rangeKey()==='year'?'I år':'Denna månad';
  }

  function panel(){
    const d=periodData(),trend=trendBuckets(d),max=Math.max(1,...trend.map(x=>x.value));
    const bars=trend.map(x=>`<div class="stats94-barcol"><div class="stats94-barval">${x.value?fmtN(x.value):''}</div><div class="stats94-bar" style="height:${Math.max(3,Math.round((x.value/max)*155))}px"></div><div class="stats94-barlabel">${x.label}</div></div>`).join('');
    const projectRows=d.topProjects.length?d.topProjects.map(p=>`<div class="stats94-row"><div class="stats94-row-main"><b>${esc(p.job.title||'Uppdrag')}</b><span>${esc((typeof customerOf==='function'?customerOf(p.job)?.name:'')||'')}</span></div><div class="stats94-value">${kr(p.total)}</div></div>`).join(''):'<div class="stats94-note">Ingen registrerad aktivitet i perioden.</div>';
    const customerRows=d.topCustomers.length?d.topCustomers.map(x=>`<div class="stats94-row"><div class="stats94-row-main"><b>${esc(x.name||'Kund')}</b><span>${x.jobs.size} uppdrag</span></div><div class="stats94-value">${kr(x.total)}</div></div>`).join(''):'<div class="stats94-note">Ingen kundaktivitet i perioden.</div>';
    const rangeButton=(k,l)=>`<button class="stats94-range ${rangeKey()===k?'on':''}" data-stats94-range="${k}">${l}</button>`;
    return `<div class="mat-panel"><div class="mat-panel-head stats94-shell"><div class="mat-panel-title"><button class="iconbtn" data-act="settings-tab-back" aria-label="Tillbaka">${ICON.chevronLeft}</button><h1>Statistik & rapporter</h1><div style="width:44px"></div></div><div class="mat-panel-sub">Fördjupad företagsöversikt · bygger på registrerad data i LiRo GO</div></div>
      <div class="settings-body stats94-shell"><div class="stats94">
        <div class="stats94-toolbar"><div class="stats94-ranges">${rangeButton('7d','7 dagar')}${rangeButton('month','Månad')}${rangeButton('90d','90 dagar')}${rangeButton('year','År')}</div><button class="stats94-export" data-stats94-export="1">Exportera CSV</button></div>
        <div class="stats94-kpis">
          <div class="stats94-kpi"><b>${kr(d.performed)}</b><span>Utfört värde · ${rangeLabel()}</span></div>
          <div class="stats94-kpi"><b>${kr(d.invoiced)}</b><span>Fakturerat i perioden</span></div>
          <div class="stats94-kpi"><b>${hrs(d.hours)}</b><span>Registrerad arbetstid</span></div>
          <div class="stats94-kpi"><b>${kr(d.materialProfit)}</b><span>Materialvinst</span></div>
          <div class="stats94-kpi"><b>${kr(d.invoiceReady)}</b><span>Klart att fakturera</span></div>
          <div class="stats94-kpi"><b>${d.statuses.waiting}</b><span>Uppdrag som väntar</span></div>
        </div>
        <div class="stats94-grid">
          <div class="stats94-card"><h3>Utfört värde över tid</h3><div class="stats94-sub">Arbetstid × uppdragets timpris + registrerat använt material inklusive påslag.</div><div class="stats94-bars">${bars}</div></div>
          <div class="stats94-card"><h3>Uppdragsstatus</h3><div class="stats94-statusgrid">
            <div class="stats94-status"><b>${d.statuses.planned}</b><span>Planerade</span></div>
            <div class="stats94-status"><b>${d.statuses.active}</b><span>Pågående</span></div>
            <div class="stats94-status"><b>${d.statuses.waiting}</b><span>Väntar</span></div>
            <div class="stats94-status"><b>${d.statuses.done}</b><span>Avslutade</span></div>
            <div class="stats94-status"><b>${d.statuses.invoice_ready}</b><span>Fakturaklara</span></div>
            <div class="stats94-status"><b>${d.statuses.invoiced}</b><span>Fakturerade</span></div>
          </div></div>
          <div class="stats94-card"><h3>Största uppdrag i perioden</h3>${projectRows}</div>
          <div class="stats94-card"><h3>Kunder med mest registrerat värde</h3>${customerRows}</div>
          <div class="stats94-card"><h3>Material</h3>
            <div class="stats94-row"><div class="stats94-row-main"><b>Materialförsäljning</b><span>Använt material inklusive påslag</span></div><div class="stats94-value">${kr(d.materialRevenue)}</div></div>
            <div class="stats94-row"><div class="stats94-row-main"><b>Inköpsvärde</b><span>Registrerat inköpspris × antal</span></div><div class="stats94-value">${kr(d.materialCost)}</div></div>
            <div class="stats94-row"><div class="stats94-row-main"><b>Materialvinst</b><span>Påslaget på registrerat material</span></div><div class="stats94-value">${kr(d.materialProfit)}</div></div>
          </div>
          <div class="stats94-card"><h3>Datakvalitet</h3><div class="stats94-note">Statistiken är operativ, inte bokföring. Arbetstid bygger på registrerade arbetspass/timmar, material på använda materialrader och fakturering på status + fakturadatum i LiRo GO. Klickbara bokföringsrapporter kan kopplas på senare via Fortnox.</div></div>
        </div>
      </div></div></div>`;
  }

  const oldPanel=vSettingsPanel;
  vSettingsPanel=function(){
    if(st?.settingsTab==='stats') return panel();
    return oldPanel();
  };

  function csv(){
    const d=periodData();
    const rows=[
      ['Period',rangeLabel()],
      ['Utfört värde',Math.round(d.performed)],
      ['Fakturerat',Math.round(d.invoiced)],
      ['Arbetstid timmar',Math.round(d.hours*10)/10],
      ['Materialförsäljning',Math.round(d.materialRevenue)],
      ['Inköpsvärde material',Math.round(d.materialCost)],
      ['Materialvinst',Math.round(d.materialProfit)],
      ['Klart att fakturera',Math.round(d.invoiceReady)],
      [],
      ['Uppdrag','Kund','Registrerat värde']
    ];
    d.topProjects.forEach(p=>rows.push([p.job.title||'',typeof customerOf==='function'?(customerOf(p.job)?.name||''):'',Math.round(p.total)]));
    return rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
  }
  function saveCsv(){
    const blob=new Blob(['\ufeff'+csv()],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='LiRo_GO_statistik_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }

  document.addEventListener('click',function(e){
    const r=e.target.closest('[data-stats94-range]');
    if(r){ e.preventDefault();e.stopImmediatePropagation();st.statsRangeV94=r.dataset.stats94Range;render();return; }
    const ex=e.target.closest('[data-stats94-export]');
    if(ex){ e.preventDefault();saveCsv();if(typeof flash==='function')flash('Statistikfil skapad');return; }
  },true);

  // Ladda material när statistik öppnas, så vyn aldrig bygger på gammal cache.
  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act="open-stats-v44"],[data-act="open-settings-tab"][data-tab="stats"]');
    if(!b) return;
    setTimeout(()=>ensureMaterials().then(()=>{if(settingsOpen&&st.settingsTab==='stats')render();}),0);
  },true);

  ensureMaterials();
})();
