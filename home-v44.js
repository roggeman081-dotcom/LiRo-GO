/* LiRo GO v44 – smart startsida, lokal LiRo-guide, statistik och meny.
   Medvetet separat från index.html för att minimera risken för övriga flöden. */
(function(){
  const style=document.createElement('style');
  style.textContent=`
    .liro-guide{margin:18px 16px 0;padding:16px;border-radius:22px;background:var(--surface);display:flex;gap:14px;align-items:center}
    .liro-avatar{width:58px;height:58px;border-radius:18px;overflow:hidden;display:block;flex:0 0 58px;background:var(--surface2);box-shadow:0 0 0 1px var(--line)}
    .liro-avatar img{width:100%;height:100%;display:block;object-fit:cover}
    .liro-guide-copy{min-width:0;flex:1}.liro-guide-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
    .liro-guide-title{font-size:17px;font-weight:700;margin-top:2px}.liro-guide-sub{font-size:13px;color:var(--muted);margin-top:4px;line-height:1.4}
    .home-v44-section{padding:0 16px;margin-top:26px}.home-v44-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
    .home-v44-list{background:var(--surface);border-radius:20px;padding:3px 16px}.home-v44-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);width:100%;text-align:left}
    .home-v44-row:last-child{border-bottom:0}.home-v44-row-main{flex:1;min-width:0}.home-v44-row-title{font-weight:650;font-size:15px}.home-v44-row-sub{font-size:12px;color:var(--muted);margin-top:2px}
    .stats-card-v44{background:var(--surface);border-radius:20px;padding:16px}.stats-kpis-v44{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
    .stats-kpi-v44{min-width:0}.stats-kpi-v44 b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stats-kpi-v44 span{font-size:11px;color:var(--muted)}
    .bars-v44{display:flex;align-items:flex-end;gap:7px;height:120px;padding-top:8px}.bar-col-v44{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}
    .bar-v44{width:100%;max-width:28px;min-height:3px;border-radius:7px 7px 3px 3px;background:var(--accent)}.bar-label-v44{font-size:10px;color:var(--muted)}
    .bar-value-v44{font-size:9px;color:var(--muted);white-space:nowrap}.quick-grid-v44{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .quick-v44{background:var(--surface);border-radius:18px;padding:14px;min-height:74px;text-align:left}.quick-v44 svg{color:var(--accent);margin-bottom:7px}.quick-v44 b{display:block;font-size:14px}.quick-v44 span{font-size:11px;color:var(--muted)}
    .stats-empty-v44{font-size:12px;color:var(--muted);padding:8px 0 2px}
    .stats-full-v44{padding:16px 16px 100px}.stats-full-v44 .stats-card-v44{margin-bottom:14px}
  `;
  document.head.appendChild(style);

  let allMaterialsV44=null;
  let statsLoadingV44=false;

  function isSameDayV44(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
  function todayJobsV44(){
    const now=new Date();
    return jobs.filter(j=>j.plannedAt&&isSameDayV44(new Date(j.plannedAt),now)&&!['done','invoice_ready','invoiced'].includes(j.status))
      .sort((a,b)=>new Date(a.plannedAt)-new Date(b.plannedAt));
  }
  function activeJobsV44(){ return jobs.filter(j=>!['done','invoice_ready','invoiced'].includes(j.status)); }
  function recommendationV44(){
    const today=todayJobsV44();
    const rad=activeRadarItems();
    const waiting=activeJobsV44().filter(j=>j.status==='waiting');
    if(today.length){
      const j=today[0];
      return {title:`Nästa: ${j.title}`,sub:`${fmtTimeRange(j.plannedAt)}${customerOf(j)?' · '+customerOf(j).name:''}`};
    }
    if(rad.length) return {title:`${rad.length} ${rad.length===1?'sak':'saker'} att agera på`,sub:rad[0].text};
    if(waiting.length) return {title:`${waiting.length} jobb väntar`,sub:'Kolla om något kan drivas vidare idag.'};
    return {title:'Läget ser lugnt ut',sub:'Inga registrerade saker kräver uppmärksamhet just nu.'};
  }
  function recentJobsV44(){ return jobs.slice().sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'')).slice(0,3); }
  function dayStartV44(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function statsV44(){
    const now=dayStartV44(new Date());
    const days=[];
    for(let i=6;i>=0;i--){ const d=new Date(now);d.setDate(now.getDate()-i);days.push({date:d,key:d.toDateString(),label:['Sön','Mån','Tis','Ons','Tor','Fre','Lör'][d.getDay()],profit:0,cost:0,revenue:0}); }
    const map=new Map(days.map(d=>[d.key,d]));
    for(const m of (allMaterialsV44||[])){
      if(m.kind==='planned') continue;
      const when=new Date(m.updatedAt||m.createdAt||0); const bucket=map.get(when.toDateString()); if(!bucket) continue;
      const job=jobById(m.jobId); const markup=Math.max(0,toNumber(job?.markupPercent,15))/100;
      const cost=Math.max(0,toNumber(m.qty,0))*Math.max(0,toNumber(m.unitPrice,0));
      const profit=cost*markup;
      bucket.cost+=cost; bucket.profit+=profit; bucket.revenue+=cost+profit;
    }
    const total=days.reduce((s,d)=>({profit:s.profit+d.profit,cost:s.cost+d.cost,revenue:s.revenue+d.revenue}),{profit:0,cost:0,revenue:0});
    return {days,total};
  }
  async function loadStatsV44(force){
    if(statsLoadingV44||(!force&&allMaterialsV44)) return;
    statsLoadingV44=true;
    try{ allMaterialsV44=await dbAll('materials'); }
    catch{ allMaterialsV44=[]; }
    statsLoadingV44=false;
    if(st.view==='home'||(settingsOpen&&st.settingsTab==='stats')) render();
  }
  function vStatsMiniV44(){
    const s=statsV44(), max=Math.max(1,...s.days.map(d=>d.profit));
    const bars=s.days.map(d=>`<div class="bar-col-v44"><div class="bar-value-v44">${d.profit?Math.round(d.profit).toLocaleString('sv-SE'):''}</div><div class="bar-v44" style="height:${Math.max(3,Math.round((d.profit/max)*72))}px"></div><div class="bar-label-v44">${d.label}</div></div>`).join('');
    return `<div class="stats-card-v44">
      <div class="stats-kpis-v44"><div class="stats-kpi-v44"><b>${fmtKr(s.total.profit)}</b><span>Materialvinst</span></div><div class="stats-kpi-v44"><b>${fmtKr(s.total.revenue)}</b><span>Materialförsäljning</span></div><div class="stats-kpi-v44"><b>${fmtKr(s.total.cost)}</b><span>Inköpsvärde</span></div></div>
      <div class="bars-v44">${bars}</div>
      ${!allMaterialsV44?'<div class="stats-empty-v44">Laddar registrerat material…</div>':s.total.cost===0?'<div class="stats-empty-v44">Ingen registrerad materialomsättning de senaste 7 dagarna.</div>':''}
    </div>`;
  }
  function vTodayV44(){
    const list=todayJobsV44();
    if(!list.length) return '<div class="stats-empty-v44">Inga jobb planerade idag.</div>';
    return `<div class="home-v44-list">${list.map(j=>{const c=customerOf(j);return `<button class="home-v44-row" data-act="open-job" data-id="${j.id}"><span style="color:var(--accent)">${ICON.clock}</span><span class="home-v44-row-main"><span class="home-v44-row-title">${esc(j.title)}</span><span class="home-v44-row-sub">${esc(fmtTimeRange(j.plannedAt))}${c?' · '+esc(c.name):''}</span></span>${ICON.chevronRight}</button>`}).join('')}</div>`;
  }
  function vActionsV44(){
    const list=activeRadarItems().slice(0,3);
    if(!list.length) return '<div class="stats-empty-v44">Inget akut på Radarn.</div>';
    return `<div class="home-v44-list">${list.map(r=>`<button class="home-v44-row" data-act="open-radar"><span style="color:var(--accent)">${ICON.sparkle}</span><span class="home-v44-row-main"><span class="home-v44-row-title">${esc(r.text)}</span><span class="home-v44-row-sub">På radarn</span></span>${ICON.chevronRight}</button>`).join('')}</div>`;
  }
  function vRecentV44(){
    const list=recentJobsV44();
    if(!list.length) return '<div class="stats-empty-v44">Inga projekt ännu.</div>';
    return `<div class="home-v44-list">${list.map(j=>`<button class="home-v44-row" data-act="open-job" data-id="${j.id}"><span style="color:var(--accent)">${ICON.folder}</span><span class="home-v44-row-main"><span class="home-v44-row-title">${esc(j.title)}</span><span class="home-v44-row-sub">${esc(statusLabel(j.status).l)}</span></span>${ICON.chevronRight}</button>`).join('')}</div>`;
  }

  vBottomNav=function(active){
    return `<div class="fab-wrap"><button class="fab" data-act="new-job" aria-label="Nytt uppdrag">${ICON.plus}</button></div>
    <div class="bottomnav">
      <button class="bn-tab ${active==='hem'?'on':''}" data-act="nav-home">${ICON.home}<span>Hem</span></button>
      <button class="bn-tab ${active==='projekt'?'on':''}" data-act="nav-projects">${ICON.folder}<span>Projekt</span></button>
      <button class="bn-tab ${active==='radar'?'on':''}" data-act="open-radar">${ICON.sparkle}<span>Radar</span></button>
      <button class="bn-tab ${active==='mer'?'on':''}" data-act="open-settings">${ICON.menu}<span>Mer</span></button>
    </div>`;
  };

  vHome=function(){
    const rec=recommendationV44();
    return `<div class="home-header row between"><img src="logo-mark-dark.png" class="brand-mini" alt="LIRO"><div class="row gap-xs">${ICON.sync}<span class="muted" style="font-size:13px">Sparat lokalt</span></div></div>
      <div class="greeting row between"><div><div class="date">${esc(formatDate())}</div><div class="h1">${esc(greeting())}, Rogge</div></div><button class="iconbtn" style="width:48px;height:48px;flex:0 0 48px" aria-label="Kalender" data-act="open-calendar">${ICON.calendar}</button></div>
      <div class="liro-guide"><div class="liro-avatar"><img src="data:image/webp;base64,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" alt="LiRo-assistent"></div><div class="liro-guide-copy"><div class="liro-guide-kicker">LiRo rekommenderar · lokal logik</div><div class="liro-guide-title">${esc(rec.title)}</div><div class="liro-guide-sub">${esc(rec.sub)}</div></div></div>
      <div class="home-v44-section"><div class="home-v44-head"><div class="h2">Idag</div><button class="accent" data-act="open-calendar" style="font-size:13px;font-weight:600">Kalender</button></div>${vTodayV44()}</div>
      <div class="home-v44-section"><div class="home-v44-head"><div class="h2">Att agera på</div><button class="accent" data-act="open-radar" style="font-size:13px;font-weight:600">Visa alla</button></div>${vActionsV44()}</div>
      <div class="home-v44-section"><div class="home-v44-head"><div class="h2">Materialvinst · 7 dagar</div><button class="accent" data-act="open-stats-v44" style="font-size:13px;font-weight:600">Statistik</button></div>${vStatsMiniV44()}</div>
      <div class="home-v44-section"><div class="home-v44-head"><div class="h2">Snabbt</div></div><div class="quick-grid-v44"><button class="quick-v44" data-act="new-job">${ICON.plusSmall}<b>Nytt jobb</b><span>Skapa uppdrag</span></button><button class="quick-v44" data-act="open-radar">${ICON.sparkle}<b>På radarn</b><span>Fånga nästa sak</span></button><button class="quick-v44" data-act="nav-projects">${ICON.folder}<b>Projekt</b><span>Hitta ett jobb</span></button><button class="quick-v44" data-act="open-settings">${ICON.menu}<b>Mer</b><span>Inställningar & statistik</span></button></div></div>
      <div class="home-v44-section" style="margin-bottom:18px"><div class="home-v44-head"><div class="h2">Senaste projekt</div><button class="accent" data-act="nav-projects" style="font-size:13px;font-weight:600">Alla projekt</button></div>${vRecentV44()}</div>
      ${vBottomNav('hem')}`;
  };

  const oldSettingsHub=vSettingsHub;
  vSettingsHub=function(){
    const html=oldSettingsHub();
    return html.replace('<div class="settings-body">','<div class="settings-body"><button class="tile row-tile" data-act="open-settings-tab" data-tab="stats">'+ICON.calc+'<span class="t-text">Statistik<span class="t-sub" style="display:block">Materialvinst och nyckeltal</span></span>'+ICON.chevronRight+'</button><div style="margin-top:12px"></div>');
  };
  const oldSettingsPanel=vSettingsPanel;
  vSettingsPanel=function(){ if(st.settingsTab==='stats') return vStatsPanelV44(); return oldSettingsPanel(); };
  function vStatsPanelV44(){
    const s=statsV44();
    return `<div class="mat-panel"><div class="mat-panel-head"><div class="mat-panel-title"><button class="iconbtn" data-act="settings-tab-back" aria-label="Tillbaka">${ICON.chevronLeft}</button><h1>Statistik</h1><div style="width:44px"></div></div><div class="mat-panel-sub">Registrerat material · senaste 7 dagarna</div></div><div class="settings-body"><div class="stats-full-v44">${vStatsMiniV44()}<div class="stats-card-v44"><div class="subsection-title">Så räknas materialvinst</div><div class="settings-note">Inköpsvärde × projektets materialpåslag. Statistiken bygger på material som är registrerat som använt och senast uppdaterat under perioden.</div><div class="summary-total"><span>Materialvinst</span><span>${fmtKr(s.total.profit)}</span></div></div></div></div></div>`;
  }

  const oldAfterHome=afterHome;
  afterHome=function(){
    try{ oldAfterHome(); }catch{}
    loadStatsV44(false);
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act="open-stats-v44"]');
    if(!b) return;
    settingsOpen=true; st.settingsTab='stats'; pushNav(); render(); loadStatsV44(false);
  });
})();
