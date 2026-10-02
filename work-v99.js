/* LiRo GO v99 – förenklad arbetsvy för "Under jobbet".
   Behåller befintliga actions/dataflöden men prioriterar vardagsfunktionerna. */
(function(){
  'use strict';
  if(window._liroWorkV99) return;
  window._liroWorkV99=true;

  const style=document.createElement('style');
  style.textContent=`
    .work99-screen{justify-content:flex-start;align-items:stretch;padding:calc(18px + env(safe-area-inset-top,0px)) 16px calc(24px + env(safe-area-inset-bottom,0px));overflow-y:auto}
    .work99-head{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:10px}
    .work99-title{text-align:center;min-width:0}
    .work99-title .name{font-size:20px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .work99-title .sub{font-size:12px;color:var(--muted);margin-top:2px}
    .work99-stats{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}
    .work99-stat{padding:6px 10px;border-radius:999px;background:var(--surface);font-size:12px;color:var(--muted);font-weight:600}
    .work99-label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:24px 0 10px}
    .work99-main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .work99-primary{min-height:94px;border-radius:20px;background:var(--surface);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;padding:16px;text-align:left;font-weight:700}
    .work99-primary svg{width:25px;height:25px;color:var(--accent)}
    .work99-primary span{font-size:14px}
    .work99-primary.wide{grid-column:1/-1;min-height:76px;flex-direction:row;align-items:center}
    .work99-primary.wide span{font-size:15px}
    .work99-photo{position:relative;overflow:hidden}
    .work99-photo input[type="file"]{position:absolute;inset:0;opacity:0}
    .work99-secondary{display:flex;flex-direction:column;gap:8px}
    .work99-secondary button{min-height:50px;border-radius:16px;background:var(--surface2);padding:0 14px;display:flex;align-items:center;gap:10px;text-align:left;font-size:13px;font-weight:700}
    .work99-secondary svg{width:20px;height:20px;color:var(--accent);flex:0 0 auto}
    @media (min-width:700px){
      .work99-screen{max-width:760px;padding-left:28px;padding-right:28px}
      .work99-main{grid-template-columns:repeat(5,minmax(0,1fr))}
      .work99-primary,.work99-primary.wide{grid-column:auto;min-height:110px;flex-direction:column;align-items:flex-start}
      .work99-secondary{display:grid;grid-template-columns:repeat(3,1fr)}
    }
  `;
  document.head.appendChild(style);

  function counts(job){
    const materials=Array.isArray(jobMaterials)?jobMaterials.filter(m=>m.jobId===job.id&&m.kind!=='planned').length:0;
    const photos=Array.isArray(jobPhotos)?jobPhotos.filter(p=>!p.jobId||p.jobId===job.id).length:0;
    let check='Kontroll ej startad';
    try{
      const p=inspectionProgress(job.id);
      if(p&&p.total) check=p.done+' / '+p.total+' kontroll';
    }catch{}
    return {materials,photos,check};
  }

  const oldWorkCapturePanelV99=window.vWorkCapturePanel;
  if(typeof oldWorkCapturePanelV99==='function'){
    window.vWorkCapturePanel=function(job){
      let html=oldWorkCapturePanelV99(job);
      html=html.replace("<h1>Berätta jobbet</h1>","<h1>Logga jobbet</h1>");
      const marker=`<div class="mat-panel-sub">${esc(job.title)}</div>`;
      const extra=marker+`<button type="button" class="tile row-tile" style="margin-top:12px" data-v99="open-quick-note">${ICON.save}<span class="t-text">Snabbanteckning<span class="t-sub" style="display:block">Öppna den enkla anteckningen</span></span>${ICON.chevronRight}</button>`;
      return html.replace(marker,extra);
    };
  }

  document.addEventListener("click",function(e){
    const el=e.target.closest&&e.target.closest("[data-v99]");
    if(!el||el.dataset.v99!=="open-quick-note") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    st.workCaptureOpen=false;
    st.workNoteOpen=true;
    render();
  },true);
  window.vArbetslage=function(job){
    const c=counts(job);
    return `
      <div class="work-screen work99-screen">
        <div class="work99-head">
          <button class="iconbtn" data-act="work-pause" aria-label="Stäng">${ICON.x}</button>
          <div class="work99-title">
            <div class="name">${esc(job.title)}</div>
            <div class="sub">Under jobbet</div>
          </div>
          <div></div>
        </div>

        <div class="work99-stats">
          <span class="work99-stat">${c.materials} material</span>
          <span class="work99-stat">${c.photos} bilder</span>
          <span class="work99-stat">${esc(c.check)}</span>
        </div>

        <div class="work99-label">Registrera</div>
        <div class="work99-main">
          <button class="work99-primary" data-act="open-mat-panel">${ICON.box}<span>Material</span></button>
          <label class="work99-primary work99-photo">
            ${ICON.camera}<span>Foto</span>
            <input type="file" accept="image/*" capture="environment" data-photo-input="1">
          </label>
          <button class="work99-primary" data-act="work-capture">${ICON.mic}<span>Logga jobbet</span></button>
          <button class="work99-primary" data-v67="work-measure">${ICON.gauge}<span>Mätvärde</span></button>
          <button class="work99-primary" data-act="work-goto-kontroll">${ICON.gauge}<span>Kontroll</span></button>
          <button class="work99-primary" data-act="work-ai">${ICON.sparkle}<span>Fråga LiRo</span></button>
        </div>
      </div>
      ${st.matPanel ? vMaterialPanel(job) : ''}
      ${st.workNoteOpen ? vWorkNotePanel() : ''}
      ${st.workCaptureOpen ? vWorkCapturePanel(job) : ''}
      ${st.workAiOpen ? vWorkAiPanel(job) : ''}`;
  };
})();