/* LiRo GO v57 – lugn break-even-mätare på startsidan.
   Framsteg = debiterad arbetstid + materialvinst under aktuell månad. */
(function(){
  if(window._liroBreakEvenV57) return;
  window._liroBreakEvenV57=true;

  const style=document.createElement('style');
  style.textContent=`
    .be-v57{margin:18px 16px 0;background:var(--surface);border-radius:24px;padding:18px 16px 16px;text-align:center;box-shadow:0 1px 0 var(--line)}
    .be-head-v57{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;text-align:left}
    .be-kicker-v57{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
    .be-title-v57{font-size:17px;font-weight:700;margin-top:2px}
    .be-edit-v57{font-size:12px;color:var(--muted);padding:8px 10px;border-radius:12px;background:var(--surface2)}
    .be-ring-wrap-v57{display:flex;justify-content:center;margin:6px 0 10px}
    .be-ring-v57{--p:0;width:184px;height:184px;border-radius:50%;position:relative;display:grid;place-items:center;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--surface2) 0);transition:background .7s ease}
    .be-ring-v57::after{content:'';position:absolute;inset:14px;border-radius:50%;background:var(--surface)}
    .be-center-v57{position:relative;z-index:1;padding:12px}
    .be-amount-v57{font-size:28px;font-weight:700;line-height:1.05;letter-spacing:-.02em}
    .be-target-v57{font-size:12px;color:var(--muted);margin-top:5px}
    .be-status-v57{font-size:13px;font-weight:600;margin-top:7px}
    .be-grid-v57{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px;text-align:left}
    .be-chip-v57{background:var(--surface2);border-radius:16px;padding:11px 12px}
    .be-chip-v57 b{display:block;font-size:15px}.be-chip-v57 span{display:block;font-size:11px;color:var(--muted);margin-top:2px}
    .be-foot-v57{font-size:11px;color:var(--muted);margin-top:11px;line-height:1.35}
    .be-v57.reached .be-ring-v57{animation:bePulseV57 .8s ease-out 1}
    @keyframes bePulseV57{0%{transform:scale(1)}45%{transform:scale(1.035)}100%{transform:scale(1)}}
    @media (prefers-reduced-motion:reduce){.be-ring-v57{transition:none}.be-v57.reached .be-ring-v57{animation:none}}
  `;
  document.head.appendChild(style);

  const STORE='lirogo_break_even_target_v57';
  let materialsV57=null;
  let loadingV57=false;

  function targetV57(){
    const n=Number(localStorage.getItem(STORE));
    return Number.isFinite(n)&&n>0?n:100000;
  }
  function monthBoundsV57(){
    const now=new Date();
    return {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth()+1,1)};
  }
  function overlapHoursV57(a,b,start,end){
    const s=Math.max(new Date(a).getTime(),start.getTime());
    const e=Math.min(new Date(b).getTime(),end.getTime());
    return e>s?(e-s)/3600000:0;
  }
  function laborThisMonthV57(job,start,end){
    if(!job||job.isQuote) return 0;
    const base=Math.max(0,toNumber(job.hourlyRate,DEFAULT_PRICE_DEFAULTS.hourlyRate));
    const segments=normalizeWorkSegments(job);
    if(segments.length){
      let total=0;
      for(const seg of segments){
        const segStart=new Date(seg.start),segEnd=new Date(seg.end);
        if(segEnd<=start||segStart>=end) continue;
        const clipStart=new Date(Math.max(segStart.getTime(),start.getTime()));
        const clipEnd=new Date(Math.min(segEnd.getTime(),end.getTime()));
        if(!job.multiRatesEnabled||!(job.rateChannels||[]).length){
          total+=overlapHoursV57(clipStart,clipEnd,start,end)*base;
          continue;
        }
        let t=clipStart.getTime(), stop=clipEnd.getTime();
        while(t<stop){
          const next=Math.min(t+60000,stop);
          const d=new Date(t);
          const ch=channelForMinute(job,d.getHours()*60+d.getMinutes());
          const rate=ch?Math.max(0,toNumber(ch.rate,base)):base;
          total+=rate*((next-t)/3600000);
          t=next;
        }
      }
      return total;
    }
    const updated=new Date(job.updatedAt||job.createdAt||0);
    if(updated>=start&&updated<end) return Math.max(0,effectiveLoggedHours(job))*base;
    return 0;
  }
  function materialProfitThisMonthV57(start,end){
    let total=0;
    for(const m of (materialsV57||[])){
      if(m.kind==='planned') continue;
      const when=new Date(m.updatedAt||m.createdAt||0);
      if(!(when>=start&&when<end)) continue;
      const job=jobById(m.jobId);
      if(!job||job.isQuote) continue;
      const markup=Math.max(0,toNumber(job.markupPercent,15))/100;
      const cost=Math.max(0,toNumber(m.qty,0))*Math.max(0,toNumber(m.unitPrice,0));
      total+=cost*markup;
    }
    return total;
  }
  function totalsV57(){
    const {start,end}=monthBoundsV57();
    const labor=(jobs||[]).reduce((s,j)=>s+laborThisMonthV57(j,start,end),0);
    const material=materialProfitThisMonthV57(start,end);
    const total=labor+material;
    const target=targetV57();
    return {labor,material,total,target,pct:target>0?Math.max(0,(total/target)*100):0};
  }
  function krV57(n){ return Math.round(Number(n)||0).toLocaleString('sv-SE')+' kr'; }
  function cardV57(){
    const t=totalsV57();
    const reached=t.total>=t.target;
    const visual=Math.min(100,t.pct);
    const diff=reached?t.total-t.target:t.target-t.total;
    return `<section class="be-v57 ${reached?'reached':''}" aria-label="Break-even denna månad">
      <div class="be-head-v57">
        <div><div class="be-kicker-v57">Månadens mål</div><div class="be-title-v57">Mot break-even</div></div>
        <button type="button" class="be-edit-v57" data-act="edit-break-even-v57">Ändra mål</button>
      </div>
      <div class="be-ring-wrap-v57"><div class="be-ring-v57" style="--p:${visual.toFixed(2)}">
        <div class="be-center-v57">
          <div class="be-amount-v57">${krV57(t.total)}</div>
          <div class="be-target-v57">av ${krV57(t.target)}</div>
          <div class="be-status-v57">${reached?`+${krV57(diff)} över break-even`:`${Math.round(t.pct)} % · ${krV57(diff)} kvar`}</div>
        </div>
      </div></div>
      <div class="be-grid-v57">
        <div class="be-chip-v57"><b>${krV57(t.labor)}</b><span>Debiterad arbetstid</span></div>
        <div class="be-chip-v57"><b>${krV57(t.material)}</b><span>Materialvinst</span></div>
      </div>
      <div class="be-foot-v57">Exkl. moms. Materialvinst räknas som registrerat inköpsvärde × uppdragets påslag.</div>
    </section>`;
  }

  async function loadV57(force){
    if(loadingV57||(!force&&materialsV57)) return;
    loadingV57=true;
    try{ materialsV57=await dbAll('materials'); }catch{ materialsV57=[]; }
    loadingV57=false;
    if(st?.view==='home') render();
  }

  const oldHome=vHome;
  vHome=function(){
    const html=oldHome();
    const card=cardV57();
    const marker='<div class="liro-guide">';
    if(html.includes(marker)) return html.replace(marker,card+marker);
    return html+card;
  };

  const oldAfter=afterHome;
  afterHome=function(){
    try{ oldAfter(); }catch{}
    loadV57(true);
  };

  window.addEventListener('focus',()=>loadV57(true));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) loadV57(true); });

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act="edit-break-even-v57"]');
    if(!b) return;
    const current=targetV57();
    const raw=prompt('Break-even-mål per månad, exkl. moms:',String(Math.round(current)));
    if(raw===null) return;
    const next=Number(String(raw).replace(/\s/g,'').replace(',','.'));
    if(!Number.isFinite(next)||next<=0){ flash('Ange ett giltigt mål'); return; }
    localStorage.setItem(STORE,String(Math.round(next)));
    render();
  });
})();
