/* LiRo GO v100 – samlad förberedelsevy för "Före jobbet".
   Visar befintlig projektdata och länkar vidare till rätt detalj utan att ändra datamodellen. */
(function(){
  'use strict';
  if(window._liroBeforeV100) return;
  window._liroBeforeV100=true;

  const style=document.createElement('style');
  style.textContent=`
    .before100-panel{z-index:55}
    .before100-list{display:flex;flex-direction:column;gap:10px}
    .before100-card{background:var(--surface);border-radius:18px;padding:14px 16px}
    .before100-card button{width:100%;text-align:left}
    .before100-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .before100-title{font-size:15px;font-weight:700}
    .before100-value{font-size:13px;color:var(--muted);margin-top:4px;line-height:1.4}
    .before100-arrow{color:var(--accent);font-weight:800}
    .before100-ready{margin-top:18px}
    .before100-note{font-size:12px;color:var(--muted);line-height:1.45;margin-top:10px;text-align:center}
  `;
  document.head.appendChild(style);

  function plannedMaterials(job){
    try{return jobMaterials.filter(m=>m.jobId===job.id&&m.kind==='planned');}catch{return [];}
  }
  function checklistState(job){
    try{
      const p=checklistProgress(job.id);
      if(!p) return {count:0,text:'Ingen att-göra-lista ännu'};
      return {count:p.items.length,text:p.done+' av '+p.target+' klara'};
    }catch{return {count:0,text:'Ingen att-göra-lista ännu'};}
  }
  function price(job){
    try{
      return typeof priceText==='function'
        ? priceText(Number(job.hourlyRate)||0,job.travelMode||'fixed',job.travelMode==='km'?(Number(job.travelPerKm)||0):(Number(job.travelFixedFee)||0))
        : '';
    }catch{return '';}
  }

  function beforePanel(job){
    const planned=plannedMaterials(job);
    const todo=checklistState(job);
    return `
      <div class="mat-panel before100-panel">
        <div class="mat-panel-head">
          <div class="mat-panel-title">
            <button class="iconbtn" data-v100="close" aria-label="Stäng">${ICON.x}</button>
            <h1>Före jobbet</h1>
            <div style="width:44px"></div>
          </div>
          <div class="mat-panel-sub">${esc(job.title)}</div>
        </div>
        <div class="mat-panel-list">
          <div class="before100-list">
            <div class="before100-card">
              <button data-act="open-job-tab" data-tab="arbete" data-v100="leave">
                <div class="before100-head"><span class="before100-title">Tid & arbete</span><span class="before100-arrow">›</span></div>
                <div class="before100-value">${esc(fmtDateTime(job.plannedAt))}</div>
              </button>
            </div>

            <div class="before100-card">
              <button data-act="open-job-tab" data-tab="material" data-v100="leave">
                <div class="before100-head"><span class="before100-title">Planerat material</span><span class="before100-arrow">›</span></div>
                <div class="before100-value">${planned.length?planned.length+' planerade artiklar':'Inget planerat material ännu'}</div>
              </button>
            </div>

            <div class="before100-card">
              <button data-act="open-job-tab" data-tab="arbete" data-v100="leave">
                <div class="before100-head"><span class="before100-title">Att göra</span><span class="before100-arrow">›</span></div>
                <div class="before100-value">${esc(todo.text)}</div>
              </button>
            </div>

            <div class="before100-card">
              <button data-act="open-job-priser" data-v100="leave">
                <div class="before100-head"><span class="before100-title">Pris & debitering</span><span class="before100-arrow">›</span></div>
                <div class="before100-value">${esc(price(job)||'Öppna prisinställningar')}</div>
              </button>
            </div>
          </div>

          <div class="before100-ready">
            <button class="primary-btn" data-act="enter-work" data-v100="start">Börja jobba</button>
            <div class="before100-note">All befintlig projektdata ligger kvar. Den här vyn samlar bara förberedelserna på ett ställe.</div>
          </div>
        </div>
      </div>`;
  }

  const oldOverview=window.vJobOversikt;
  if(typeof oldOverview==='function'){
    window.vJobOversikt=function(job){
      let html=oldOverview(job);
      const startMarker='<div class="flow67-card">\n            <div class="flow67-kicker">Före jobbet</div>';
      const nextMarker='\n\n          <div class="flow67-card">';
      const start=html.indexOf(startMarker);
      if(start>=0){
        const end=html.indexOf(nextMarker,start+startMarker.length);
        if(end>start){
          const replacement=`<div class="flow67-card">
            <div class="flow67-kicker">Före jobbet</div>
            <div class="flow67-title">Förbered uppdraget</div>
            <div class="flow67-sub">Tid, material, att göra och pris samlat före start.</div>
            <div class="flow67-actions">
              <button type="button" class="flow67-main" data-v100="open">Förbered jobbet</button>
            </div>
          </div>`;
          html=html.slice(0,start)+replacement+html.slice(end);
        }
      }
      if(st.beforeV100Open) html+=beforePanel(job);
      return html;
    };
  }

  document.addEventListener('click',function(e){
    const el=e.target.closest&&e.target.closest('[data-v100]');
    if(!el) return;
    const act=el.dataset.v100;
    if(act==='open'){
      e.preventDefault();
      e.stopImmediatePropagation();
      st.beforeV100Open=true;
      render();
      return;
    }
    if(act==='close'){
      e.preventDefault();
      e.stopImmediatePropagation();
      st.beforeV100Open=false;
      render();
      return;
    }
    if(act==='leave'||act==='start'){
      st.beforeV100Open=false;
    }
  },true);
})();