/* LiRo GO v149 – Projektnummer och beställarens referens.
   Varje uppdrag får ett eget löpnummer per år (t.ex. 26-014). Numret räknas
   lokalt i telefonen, så det fungerar offline. Befintliga uppdrag numreras
   automatiskt i den ordning de skapades. Beställarens projekt-/AO-nummer
   sparas som fritt fält på uppdraget. */
(function(){
  const NUM_RE=/^(\d{2})-(\d{3,})$/;

  function yearOf(job){
    const d=new Date(job?.createdAt||Date.now());
    return String((Number.isFinite(d.getTime())?d:new Date()).getFullYear()).slice(-2);
  }
  function maxSeq(yy){
    let max=0;
    for(const j of jobs){
      const m=NUM_RE.exec(String(j?.jobNumber||''));
      if(m && m[1]===yy) max=Math.max(max,Number(m[2])||0);
    }
    return max;
  }
  function formatNumber(yy,seq){ return yy+'-'+String(seq).padStart(3,'0'); }

  function assignNumber(job){
    if(!job || NUM_RE.test(String(job.jobNumber||''))) return false;
    const yy=yearOf(job);
    job.jobNumber=formatNumber(yy,maxSeq(yy)+1);
    return true;
  }

  // Numrera uppdrag som saknar nummer, äldst först.
  function ensureJobNumbers(){
    if(!Array.isArray(jobs) || !jobs.length) return;
    const missing=jobs.filter(j=>!NUM_RE.test(String(j?.jobNumber||'')));
    if(!missing.length) return;
    missing.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    for(const j of missing){
      if(assignNumber(j)){ try{ dbPut('jobs',j); }catch(err){ console.error('Kunde inte spara projektnummer',err); } }
    }
  }

  function jobNumberText(job){ return String(job?.jobNumber||''); }
  function jobClientRef(job){ return String(job?.clientRef||'').trim(); }
  window.jobNumberText=jobNumberText;
  window.jobClientRef=jobClientRef;

  // Sök: titel, kund, eget nummer och beställarens nummer.
  window.jobMatchesSearch=function(job,q){
    q=String(q||'').trim().toLowerCase();
    if(!q) return true;
    const c=customerOf(job);
    return [job.title, c&&c.name, job.jobNumber, job.clientRef]
      .some(v=>String(v||'').toLowerCase().includes(q));
  };

  const oldCreate=createJob;
  createJob=async function(input){
    const job=await oldCreate(input);
    if(assignNumber(job)) await dbPut('jobs',job);
    return job;
  };

  const oldRender=render;
  render=function(){
    try{ ensureJobNumbers(); }catch(err){ console.error(err); }
    return oldRender.apply(this,arguments);
  };

  // Projektlistan: numret före titeln.
  vProjectListInner=function(filtered, q){
    const rows = filtered.map(j=>{
      const c = customerOf(j); const s = statusLabel(j.status);
      const prog = checklistProgress(j.id);
      const ref = jobClientRef(j);
      return `
      <button class="row gap-sm" style="width:100%;text-align:left;padding:12px 0;border-bottom:1px solid var(--line);align-items:flex-start" data-act="open-job" data-id="${j.id}">
        <div class="icon-circle" style="width:40px;height:40px;flex:0 0 40px">${ICON.wrench}</div>
        <div style="flex:1;min-width:0">
          <div class="jobnr149-list">${esc(jobNumberText(j))}</div>
          <div style="font-weight:600;font-size:15px">${esc(j.title)}</div>
          <div class="muted" style="font-size:12px;margin-top:2px">${[c?esc(c.name):'', ref?'Best. '+esc(ref):''].filter(Boolean).join(' · ')}</div>
          ${prog ? `<div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:${prog.percent}%"></div></div>` : ''}
        </div>
        <span class="pill ${s.on?'on':''}" style="flex:0 0 auto">${s.l}</span>
      </button>`;
    }).join('');
    return filtered.length ? `<div class="card" style="padding:2px 16px">${rows}</div>` : `<p class="empty" style="padding-left:0">${q?'Inga uppdrag matchade sökningen.':'Inga uppdrag ännu.'}</p>`;
  };

  // Översikten: stort projektnummer + fält för beställarens nummer.
  function numberCard(job){
    return `<div class="card jobnr149-card">
      <div class="row between" style="gap:12px;align-items:flex-end">
        <div>
          <div class="muted" style="font-size:12px">Projektnummer</div>
          <div class="jobnr149-big">${esc(jobNumberText(job))}</div>
        </div>
      </div>
      <div class="field" style="margin:12px 0 0">
        <span class="label">Beställarens projekt-/AO-nr</span>
        <input type="text" autocomplete="off" placeholder="Ex. AO 4512 (valfritt)" value="${esc(job.clientRef||'')}" data-field="job-clientref-v149">
      </div>
    </div>`;
  }
  const oldOverview=window.vJobOversikt;
  window.vJobOversikt=function(job){
    let html=oldOverview(job);
    return html.replace(/(<div class="job-body[^"]*">)/, '$1'+numberCard(job));
  };

  document.addEventListener('input',function(e){
    if(e.target?.dataset?.field!=='job-clientref-v149') return;
    const job=jobById(st.id); if(!job) return;
    job.clientRef=e.target.value;
    job.updatedAt=new Date().toISOString();
    dbPut('jobs',job);
  });

  const style=document.createElement('style');
  style.textContent=`
    .jobnr149-list{font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--accent,#f07c22);font-variant-numeric:tabular-nums}
    .jobnr149-card{margin-bottom:16px}
    .jobnr149-big{font-size:30px;font-weight:300;letter-spacing:.02em;font-variant-numeric:tabular-nums;line-height:1.1;margin-top:2px}
  `;
  document.head.appendChild(style);
})();
