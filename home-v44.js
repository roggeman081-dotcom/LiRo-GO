/* LiRo GO v44 – smart startsida, lokal LiRo-guide, statistik och meny.
   Medvetet separat från index.html för att minimera risken för övriga flöden. */
(function(){
  const style=document.createElement('style');
  style.textContent=`
    .liro-guide{margin:18px 16px 0;padding:16px;border-radius:22px;background:var(--surface);display:flex;gap:14px;align-items:center}
    .liro-avatar{width:58px;height:58px;border-radius:20px;background:var(--surface2);display:flex;align-items:center;justify-content:center;flex:0 0 58px;position:relative;font-weight:800;font-size:13px;color:var(--ink)}
    .liro-avatar:before,.liro-avatar:after{content:'';position:absolute;top:18px;width:5px;height:5px;border-radius:50%;background:var(--ink)}
    .liro-avatar:before{left:18px}.liro-avatar:after{right:18px}
    .liro-avatar-smile{position:absolute;left:20px;right:20px;bottom:14px;height:8px;border-bottom:2px solid var(--ink);border-radius:0 0 20px 20px}
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
      <div class="liro-guide"><div class="liro-avatar"><span>LiRo</span><span class="liro-avatar-smile"></span></div><div class="liro-guide-copy"><div class="liro-guide-kicker">LiRo rekommenderar · lokal logik</div><div class="liro-guide-title">${esc(rec.title)}</div><div class="liro-guide-sub">${esc(rec.sub)}</div></div></div>
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
