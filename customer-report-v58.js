/* LiRo GO v58 – kundrapport efter avslutat uppdrag.
   Flöde: avsluta -> förhandsgranska/redigera -> skicka.
   Kundversionen innehåller inte inköpspriser, marginal eller andra interna siffror. */
(function(){
  if(window._liroCustomerReportV58) return;
  window._liroCustomerReportV58=true;

  function internalEmail58(){
    const candidates=[
      st?.reportEmail,
      st?.settings?.reportEmail,
      st?.settings?.email,
      localStorage.getItem('lirogo_report_email'),
      localStorage.getItem('reportEmail')
    ];
    const found=candidates.map(v=>String(v||'').trim()).find(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    return found||'roger@liroelteknik.se';
  }

  const style=document.createElement('style');
  style.textContent=`
    .cr58-body{padding:18px 16px 120px}
    .cr58-card{background:var(--surface);border-radius:20px;padding:16px;margin-bottom:14px}
    .cr58-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
    .cr58-title{font-size:18px;font-weight:700;margin-top:2px}
    .cr58-meta{font-size:12px;color:var(--muted);line-height:1.45;margin-top:5px}
    .cr58-textarea{min-height:320px;line-height:1.45;background:var(--surface2);border:1px solid transparent;margin-top:12px}
    .cr58-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .cr58-secondary{min-height:44px;border-radius:18px;background:var(--surface2);font-weight:650;padding:0 14px;display:flex;align-items:center;justify-content:center;gap:7px}
    .cr58-send{margin-top:10px}
    .cr58-info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .cr58-chip{background:var(--surface2);border-radius:15px;padding:10px 12px}
    .cr58-chip b{display:block;font-size:14px}.cr58-chip span{display:block;font-size:11px;color:var(--muted);margin-top:2px}
  `;
  document.head.appendChild(style);

  function fmtDate58(value){
    const d=value?new Date(value):new Date();
    return Number.isFinite(d.getTime())?d.toLocaleDateString('sv-SE',{year:'numeric',month:'long',day:'numeric'}):'';
  }
  function customer58(job){ try{return customerOf(job)||null;}catch{return null;} }
  function usedMaterials58(job){ return (jobMaterials||[]).filter(m=>m.jobId===job.id&&m.kind!=='planned'); }
  function photos58(job){ return (jobPhotos||[]).filter(p=>p.jobId===job.id); }
  function checks58(job){
    const rows=(inspection||[]).filter(x=>x.jobId===job.id);
    const done=rows.filter(x=>x.done||x.checked||x.completed).length;
    return {total:rows.length,done};
  }
  function site58(job,c){
    const parts=[];
    if(job.siteUsesCustomerAddress!==false){
      if(c?.address) parts.push(c.address);
      if(c?.postalCode||c?.city) parts.push([c?.postalCode,c?.city].filter(Boolean).join(' '));
    }else{
      if(job.siteAddress) parts.push(job.siteAddress);
      if(job.sitePostalCode||job.siteCity) parts.push([job.sitePostalCode,job.siteCity].filter(Boolean).join(' '));
    }
    return parts.filter(Boolean).join(', ');
  }
  function cleanLine58(v){ return String(v||'').replace(/\s+/g,' ').trim(); }
  function reportText58(job){
    const c=customer58(job),mats=usedMaterials58(job),pics=photos58(job),chk=checks58(job),site=site58(job,c),finished=fmtDate58(job.finishedAt||new Date());
    const summary=cleanLine58(job.summary||job.notes||job.description||'Arbetet är utfört enligt uppdraget.');
    const materialLines=mats.length?mats.map(m=>`- ${cleanLine58(m.name||m.description||m.eNr||'Material')} · ${toNumber(m.qty,0).toLocaleString('sv-SE')} ${cleanLine58(m.unit||'st')}`).join('\n'):'- Inget material specificerat i kundrapporten';
    const controlLine=chk.total?`${chk.done} av ${chk.total} registrerade kontrollpunkter markerade som klara.`:'Ingen särskild kontrollmall registrerad för uppdraget.';
    const photoLine=pics.length?`${pics.length} ${pics.length===1?'bild finns':'bilder finns'} dokumenterade i uppdraget.`:'Inga bilder registrerade i uppdraget.';
    return ['KUNDRAPPORT – LIRO ELTEKNIK','',`Kund: ${cleanLine58(c?.name||'')}`,site?`Arbetsplats: ${site}`:'',`Uppdrag: ${cleanLine58(job.title||'')}`,`Avslutat: ${finished}`,'','UTFÖRT ARBETE',summary,'','ANVÄNT MATERIAL',materialLines,'','DOKUMENTATION OCH KONTROLL',photoLine,controlLine,'',job.changes?`Övrigt / ändringar:\n${cleanLine58(job.changes)}`:'','','Tack för förtroendet.','LiRo Elteknik AB'].filter((line,i,arr)=>line!==''||arr[i-1]!=='').join('\n').trim();
  }
  function drafts58(){ st.customerReportDraftV58=st.customerReportDraftV58||{}; return st.customerReportDraftV58; }
  function draft58(job){ const d=drafts58(); if(!Object.prototype.hasOwnProperty.call(d,job.id)) d[job.id]=reportText58(job); return d[job.id]; }
  function subject58(job){ return `Kundrapport – ${cleanLine58(job.title||'utfört uppdrag')}`; }

  function vCustomerReport58(job){
    const c=customer58(job),to=cleanLine58(c?.email||''),pics=photos58(job).length,mats=usedMaterials58(job).length,text=draft58(job),internal=internalEmail58();
    return `${vWizHeader('Kundrapport',false,undefined,undefined,'job-tab-back')}<div class="cr58-body"><div class="cr58-card"><div class="cr58-kicker">Uppdrag avslutat</div><div class="cr58-title">Förhandsgranska kundrapport</div><div class="cr58-meta">${to?`Till ${esc(to)} · intern kopia ${esc(internal)}`:`Kundens e-post saknas · rapporten öppnas till ${esc(internal)}`}</div><div class="cr58-info"><div class="cr58-chip"><b>${mats}</b><span>materialrader</span></div><div class="cr58-chip"><b>${pics}</b><span>${pics===1?'bild':'bilder'} dokumenterade</span></div></div></div><div class="cr58-card"><div class="bold">Rapporttext</div><div class="cr58-meta">Du kan redigera texten före skickning. Inköpspris och materialmarginal tas inte med.</div><textarea class="cr58-textarea" data-field="customer-report-v58" data-id="${esc(job.id)}">${esc(text)}</textarea><div class="cr58-actions"><button type="button" class="cr58-secondary" data-act="reset-customer-report-v58" data-id="${esc(job.id)}">Återställ</button><button type="button" class="cr58-secondary" data-act="copy-customer-report-v58" data-id="${esc(job.id)}">Kopiera text</button></div><button type="button" class="primary-btn cr58-send" data-act="send-customer-report-v58" data-id="${esc(job.id)}">${ICON.mail}<span>Skicka rapport</span></button>${pics?'<div class="cr58-meta">Obs: e-postutkast via mailto kan inte bifoga uppdragsbilder automatiskt. Bilderna ligger kvar i LiRo GO.</div>':''}</div><button type="button" class="cr58-secondary" style="width:100%" data-act="open-faktura">Gå till fakturaunderlag</button></div>`;
  }

  const oldDetail=vJobDetail;
  vJobDetail=function(id){ const job=jobById(id); if(job&&st.jobTab==='kundrapport-v58') return vCustomerReport58(job); return oldDetail(id); };
  document.addEventListener('input',function(e){ const t=e.target; if(t?.dataset?.field!=='customer-report-v58') return; const id=t.dataset.id; if(id) drafts58()[id]=t.value; });
  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act]'); if(!b) return;
    const act=b.dataset.act,id=b.dataset.id,job=id?jobById(id):null;
    if(act==='reset-customer-report-v58'&&job){ drafts58()[job.id]=reportText58(job); render(); return; }
    if(act==='copy-customer-report-v58'&&job){ const text=draft58(job); if(navigator.clipboard?.writeText){ navigator.clipboard.writeText(text).then(()=>flash('Rapporttext kopierad')).catch(()=>flash('Kunde inte kopiera automatiskt')); }else flash('Kopiering stöds inte här'); return; }
    if(act==='send-customer-report-v58'&&job){ const c=customer58(job),customerEmail=cleanLine58(c?.email||''),internal=internalEmail58(),to=customerEmail||internal,qs=[]; qs.push('subject='+encodeURIComponent(subject58(job))); qs.push('body='+encodeURIComponent(draft58(job))); if(customerEmail&&customerEmail.toLowerCase()!==internal.toLowerCase()) qs.push('bcc='+encodeURIComponent(internal)); window.location.href=`mailto:${encodeURIComponent(to)}?${qs.join('&')}`; return; }
  });
  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act="finish-job"]'); if(!b) return;
    const id=b.dataset.id,job=id?jobById(id):null; if(!job) return;
    e.preventDefault(); e.stopPropagation(); if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
    (async()=>{ await setJobStatus(job.id,'done'); if(st.finishConfirmV55&&st.finishConfirmV55[job.id]) delete st.finishConfirmV55[job.id]; if(st.finishConfirm&&st.finishConfirm[job.id]) delete st.finishConfirm[job.id]; st.jobTab='kundrapport-v58'; draft58(job); pushNav(); flash('Uppdrag avslutat · kundrapport skapad'); render(); })().catch(()=>flash('Kunde inte avsluta uppdraget'));
  },true);
})();