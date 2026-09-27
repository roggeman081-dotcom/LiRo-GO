// LiRo GO v66 — projektbunden dokumentation: foto, mätvärden, anteckning.
// Byggd som ett tunt lager ovanpå befintlig Dokumentation-vy för att inte störa v65-planen.
(function(){
  'use strict';

  const MEASURE_TYPES = [
    {key:'isolation', label:'Isolationsmätning', unit:'MΩ'},
    {key:'continuity', label:'Skyddsledarkontinuitet', unit:'Ω'},
    {key:'rcd_time', label:'JFB utlösningstid', unit:'ms'},
    {key:'rcd_current', label:'JFB utlösningsström', unit:'mA'},
    {key:'voltage', label:'Spänning', unit:'V'},
    {key:'current', label:'Ström', unit:'A'},
    {key:'other', label:'Annat mätvärde', unit:''}
  ];

  const originalDocumentation = typeof vJobDokumentation === 'function' ? vJobDokumentation : null;
  const originalBuildJobReport = typeof buildJobReport === 'function' ? buildJobReport : null;
  if(!originalDocumentation) return;

  function ensureState(){
    st.docV66 = st.docV66 || {mode:null, measureType:'isolation', measureValue:'', measureUnit:'MΩ', measureNote:'', noteText:''};
    return st.docV66;
  }
  function jobMeasures(job){ return Array.isArray(job.measurementsV66) ? job.measurementsV66 : []; }
  function jobNotes(job){ return Array.isArray(job.documentationNotesV66) ? job.documentationNotesV66 : []; }
  function typeMeta(key){ return MEASURE_TYPES.find(x=>x.key===key) || MEASURE_TYPES[MEASURE_TYPES.length-1]; }
  function stamp(iso){
    try{return new Date(iso).toLocaleString('sv-SE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return '';}
  }

  function panel(job){
    const s=ensureState();
    const measures=jobMeasures(job).slice().reverse();
    const notes=jobNotes(job).slice().reverse();
    const type=typeMeta(s.measureType);
    const measureOptions=MEASURE_TYPES.map(t=>`<option value="${esc(t.key)}" ${s.measureType===t.key?'selected':''}>${esc(t.label)}</option>`).join('');
    const measureRows=measures.map(m=>`<div class="checklist-row"><div class="checklist-info"><div class="checklist-name">${esc(m.label||typeMeta(m.type).label)} · ${esc(String(m.value||''))}${m.unit?' '+esc(m.unit):''}</div>${m.note?`<div class="checklist-sub">${esc(m.note)}</div>`:''}<div class="checklist-sub">${esc(stamp(m.createdAt))}</div></div><button class="checklist-del" data-v66="delete-measure" data-id="${esc(m.id)}" aria-label="Ta bort">${ICON.trash}</button></div>`).join('');
    const noteRows=notes.map(n=>`<div class="checklist-row"><div class="checklist-info"><div class="checklist-name" style="white-space:pre-wrap">${esc(n.text||'')}</div><div class="checklist-sub">${esc(stamp(n.createdAt))}</div></div><button class="checklist-del" data-v66="delete-note" data-id="${esc(n.id)}" aria-label="Ta bort">${ICON.trash}</button></div>`).join('');

    let editor='';
    if(s.mode==='measure') editor=`<div class="add-form" style="margin-top:12px"><div class="subsection-title">Nytt mätvärde</div><select data-v66-field="measure-type">${measureOptions}</select><div class="row gap-sm"><input type="text" inputmode="decimal" placeholder="Värde" value="${esc(s.measureValue||'')}" data-v66-field="measure-value"><input type="text" placeholder="Enhet" value="${esc(s.measureUnit||type.unit||'')}" data-v66-field="measure-unit" style="max-width:110px"></div><input type="text" placeholder="Kommentar (valfritt)" value="${esc(s.measureNote||'')}" data-v66-field="measure-note"><div class="row gap-sm"><button class="muted" style="flex:1" data-v66="cancel">Avbryt</button><button class="primary-btn" style="flex:2" data-v66="save-measure">Spara mätvärde</button></div></div>`;
    if(s.mode==='note') editor=`<div class="add-form" style="margin-top:12px"><div class="subsection-title">Ny anteckning</div><div class="field-mic"><textarea placeholder="Skriv eller diktera dokumentationen…" data-v66-field="note-text">${esc(s.noteText||'')}</textarea>${typeof DICTATION_SUPPORTED!=='undefined'&&DICTATION_SUPPORTED?`<button class="iconbtn mic-inline ${st.dictatingKey==='docv66'?'mic-listening':''}" data-v66="dictate-note" aria-label="Diktera" style="top:24px;transform:none">${ICON.mic}</button>`:''}</div><div class="row gap-sm"><button class="muted" style="flex:1" data-v66="cancel">Avbryt</button><button class="primary-btn" style="flex:2" data-v66="save-note">Spara anteckning</button></div></div>`;

    return `<div class="section"><div class="subsection-title">Dokumentera jobb</div><div class="actions-row"><label class="tile" style="position:relative">${ICON.camera}<span>Foto</span><input type="file" accept="image/*" capture="environment" data-photo-input="1" style="position:absolute;inset:0;opacity:0"></label><button class="tile" data-v66="open-measure">${ICON.gauge}<span>Mätvärde</span></button><button class="tile" data-v66="open-note">${ICON.save}<span>Anteckning</span></button></div>${editor}${measures.length?`<div class="subsection-title" style="margin-top:20px">Mätvärden</div><div class="card" style="padding:4px 16px">${measureRows}</div>`:''}${notes.length?`<div class="subsection-title" style="margin-top:20px">Anteckningar</div><div class="card" style="padding:4px 16px">${noteRows}</div>`:''}</div>`;
  }

  vJobDokumentation = function(job){
    const html=originalDocumentation(job);
    const marker='<div class="job-body">';
    return html.includes(marker) ? html.replace(marker, marker+panel(job)) : html+panel(job);
  };

  if(originalBuildJobReport){
    buildJobReport = function(job){
      const report=originalBuildJobReport(job);
      const measures=jobMeasures(job), notes=jobNotes(job);
      if(!measures.length&&!notes.length) return report;
      const extra=[];
      if(measures.length){
        extra.push('','MÄTVÄRDEN');
        measures.forEach(m=>extra.push(`- ${m.label||typeMeta(m.type).label}: ${m.value}${m.unit?' '+m.unit:''}${m.note?' — '+m.note:''}`));
      }
      if(notes.length){
        extra.push('','DOKUMENTATIONSANTECKNINGAR');
        notes.forEach(n=>extra.push(`- ${n.text}`));
      }
      return {subject:report.subject, body:report.body+extra.join('\n')};
    };
  }

  document.addEventListener('input', e=>{
    const f=e.target && e.target.dataset ? e.target.dataset.v66Field : null;
    if(!f) return;
    const s=ensureState();
    if(f==='measure-value') s.measureValue=e.target.value;
    if(f==='measure-unit') s.measureUnit=e.target.value;
    if(f==='measure-note') s.measureNote=e.target.value;
    if(f==='note-text') s.noteText=e.target.value;
  }, true);

  document.addEventListener('change', e=>{
    if(e.target?.dataset?.v66Field!=='measure-type') return;
    const s=ensureState(); s.measureType=e.target.value; s.measureUnit=typeMeta(s.measureType).unit; render();
  }, true);

  document.addEventListener('click', async e=>{
    const el=e.target.closest && e.target.closest('[data-v66]');
    if(!el) return;
    e.preventDefault(); e.stopPropagation();
    const act=el.dataset.v66, s=ensureState();
    const job=st.id ? jobById(st.id) : null;
    if(!job) return;
    if(act==='open-measure'){ s.mode='measure'; render(); return; }
    if(act==='open-note'){ s.mode='note'; render(); return; }
    if(act==='cancel'){ s.mode=null; render(); return; }
    if(act==='dictate-note'){
      if(typeof toggleDictate!=='function') return;
      toggleDictate('docv66', text=>{ s.noteText=[s.noteText,text].filter(Boolean).join(s.noteText?' ':''); render(); });
      return;
    }
    if(act==='save-measure'){
      const val=String(s.measureValue||'').trim();
      if(!val){ if(typeof flash==='function') flash('Fyll i ett mätvärde'); return; }
      const meta=typeMeta(s.measureType);
      job.measurementsV66=jobMeasures(job);
      job.measurementsV66.push({id:uid(),type:s.measureType,label:meta.label,value:val,unit:String(s.measureUnit||'').trim(),note:String(s.measureNote||'').trim(),createdAt:new Date().toISOString()});
      job.updatedAt=new Date().toISOString(); await dbPut('jobs',job);
      s.measureValue=''; s.measureNote=''; s.mode=null; render();
      if(typeof flash==='function') flash('Mätvärde sparat');
      return;
    }
    if(act==='save-note'){
      const text=String(s.noteText||'').trim();
      if(!text){ if(typeof flash==='function') flash('Skriv eller diktera en anteckning'); return; }
      job.documentationNotesV66=jobNotes(job);
      job.documentationNotesV66.push({id:uid(),text,createdAt:new Date().toISOString()});
      job.updatedAt=new Date().toISOString(); await dbPut('jobs',job);
      s.noteText=''; s.mode=null; render();
      if(typeof flash==='function') flash('Anteckning sparad');
      return;
    }
    if(act==='delete-measure'){
      job.measurementsV66=jobMeasures(job).filter(x=>x.id!==el.dataset.id); job.updatedAt=new Date().toISOString(); await dbPut('jobs',job); render(); return;
    }
    if(act==='delete-note'){
      job.documentationNotesV66=jobNotes(job).filter(x=>x.id!==el.dataset.id); job.updatedAt=new Date().toISOString(); await dbPut('jobs',job); render(); return;
    }
  }, true);

  window.LIRO_DOC_V66 = {version:66, measureTypes:MEASURE_TYPES.map(x=>x.key)};
})();