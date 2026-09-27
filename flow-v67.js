/* LiRo GO v67 – förenklat uppdragsflöde.
   Startsidan lämnas orörd. Inne i uppdraget prioriteras Före / Under / Efter
   och befintliga detaljvyer finns kvar bakom "Mer detaljer". */
(function(){
  'use strict';
  if(window._liroFlowV67) return;
  window._liroFlowV67=true;

  const style=document.createElement('style');
  style.textContent=`
    .flow67{margin-bottom:18px}
    .flow67-grid{display:grid;grid-template-columns:1fr;gap:10px}
    .flow67-card{background:var(--surface);border-radius:20px;padding:15px 16px;text-align:left;width:100%}
    .flow67-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
    .flow67-title{font-size:17px;font-weight:700;margin-top:2px}
    .flow67-sub{font-size:12px;color:var(--muted);line-height:1.4;margin-top:3px}
    .flow67-actions{display:flex;gap:8px;margin-top:11px}
    .flow67-actions button{min-height:40px;border-radius:14px;background:var(--surface2);padding:0 12px;font-size:12px;font-weight:700;flex:1}
    .flow67-main{background:var(--accent)!important;color:var(--ink)}
    .flow67-details{width:100%;text-align:center;margin:14px 0 4px;font-size:13px;font-weight:700;color:var(--muted)}
    .flow67-job:not(.flow67-more) .section-cards{display:none}
    .flow67-work-measure{position:relative}
  `;
  document.head.appendChild(style);

  function phaseMarkup(job){
    const finished=job.status==='done'||job.status==='invoice_ready'||job.status==='invoiced';
    const afterLabel=job.status==='invoiced'||job.status==='invoice_ready'?'Visa fakturaunderlag':job.status==='done'?'Skapa fakturaunderlag':'Granska avslut';
    const afterAct=finished?'open-faktura':'open-job-tab';
    const afterExtra=finished?'':' data-tab="avsluta"';
    const more=!!st.flowV67More;
    return `
      <section class="flow67">
        <div class="flow67-grid">
          <div class="flow67-card">
            <div class="flow67-kicker">Före jobbet</div>
            <div class="flow67-title">Förbered uppdraget</div>
            <div class="flow67-sub">Tid, material och att göra innan du kör igång.</div>
            <div class="flow67-actions">
              <button type="button" data-act="open-job-tab" data-tab="material">Material</button>
              <button type="button" data-act="open-job-tab" data-tab="arbete">Arbete & att göra</button>
            </div>
          </div>

          <div class="flow67-card">
            <div class="flow67-kicker">Under jobbet</div>
            <div class="flow67-title">Jobba med uppdraget</div>
            <div class="flow67-sub">Material, foto, anteckning, mätvärden och kontroll samlat nära arbetsläget.</div>
            <div class="flow67-actions">
              <button type="button" class="flow67-main" data-act="enter-work">Jobba med uppdraget</button>
            </div>
          </div>

          <div class="flow67-card">
            <div class="flow67-kicker">Efter jobbet</div>
            <div class="flow67-title">Avsluta och lämna över</div>
            <div class="flow67-sub">Kontrollera att inget saknas och skapa rapport/fakturaunderlag.</div>
            <div class="flow67-actions">
              <button type="button" class="flow67-main" data-act="${afterAct}"${afterExtra}>${afterLabel}</button>
            </div>
          </div>
        </div>
        <button type="button" class="flow67-details" data-v67="toggle-more">${more?'Dölj detaljer':'Mer detaljer'}</button>
      </section>`;
  }

  const oldOverview=window.vJobOversikt;
  if(typeof oldOverview==='function'){
    window.vJobOversikt=function(job){
      let html=oldOverview(job);
      // Den gamla separata huvudknappen tas bort här för att inte dubblera
      // "Jobba med uppdraget". Funktionerna finns kvar i det nya trefasflödet.
      html=html.replace(/<div style="margin-top:20px">[\s\S]*?<\/div>\s*(?=\s*<div class="section">|\s*<div class="card"|\s*<div class="section-cards">)/,'');
      const cls=st.flowV67More?'job-body flow67-job flow67-more':'job-body flow67-job';
      html=html.replace('<div class="job-body">','<div class="'+cls+'">');
      const marker='<div class="card">';
      const idx=html.indexOf(marker);
      if(idx>=0){
        const end=html.indexOf('</div>',idx);
        // Lägg flödet direkt efter job-body-start för maximal tydlighet.
        html=html.replace('<div class="'+cls+'">','<div class="'+cls+'">'+phaseMarkup(job));
      }else{
        html=html.replace('</div>',phaseMarkup(job)+'</div>');
      }
      return html;
    };
  }

  const oldWork=window.vArbetslage;
  if(typeof oldWork==='function'){
    window.vArbetslage=function(job){
      let html=oldWork(job);
      const target='<button class="work-btn" data-act="work-goto-kontroll">';
      if(html.includes(target) && !html.includes('data-v67="work-measure"')){
        const btn='<button class="work-btn flow67-work-measure" data-v67="work-measure">'+(ICON.gauge||'')+'<span>Mätvärde</span></button>';
        html=html.replace(target,btn+target);
      }
      return html;
    };
  }

  document.addEventListener('click',function(e){
    const el=e.target.closest&&e.target.closest('[data-v67]');
    if(!el) return;
    const act=el.dataset.v67;

    if(act==='toggle-more'){
      e.preventDefault();
      st.flowV67More=!st.flowV67More;
      render();
      return;
    }

    if(act==='work-measure'){
      e.preventDefault();
      const id=st.id;
      if(!id||!jobById(id)) return;
      st.view='job';
      st.jobTab='dokumentation';
      st.docV66=st.docV66||{};
      st.docV66.mode='measure';
      render();
    }
  },true);
})();