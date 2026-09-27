/* LiRo GO v55 – hardened avslutskontroll.
   Per-uppdrag state, jobId-filtrering och tre statuslägen: klart, varning, neutral. */
(function(){
  if(window._liroV55) return;
  window._liroV55=true;

  function safeHours(job, fn){
    try{
      const h=fn(job);
      return Number.isFinite(h)?h:0;
    }catch{
      return 0;
    }
  }

  function safeInspection(jobId, fn){
    try{
      const v=fn(jobId)||{};
      return {
        total:Math.max(0,Number(v.total)||0),
        done:Math.max(0,Number(v.done)||0)
      };
    }catch{
      return {total:0,done:0};
    }
  }

  function safeRot(job, fn){
    try{
      return fn(job)||{complete:false};
    }catch{
      return {complete:false};
    }
  }

  function finishChecksV55(job,deps){
    if(!job||!job.id) return [];

    const d=deps||{};
    const materials=Array.isArray(d.materials)?d.materials:[];
    const photos=Array.isArray(d.photos)?d.photos:[];
    const inspectionFn=typeof d.inspectionProgress==='function'?d.inspectionProgress:()=>({total:0,done:0});
    const hoursFn=typeof d.effectiveLoggedHours==='function'?d.effectiveLoggedHours:()=>0;
    const rotFn=typeof d.rotDetailsState==='function'?d.rotDetailsState:()=>({complete:false});
    const taxFn=typeof d.taxReductionType==='function'?d.taxReductionType:()=>null;
    const fmtFn=typeof d.fmtHours==='function'?d.fmtHours:(h)=>`${h} h`;

    const usedCount=materials.filter(m=>m&&m.jobId===job.id&&m.kind!=='planned').length;
    const photoCount=photos.filter(p=>p&&p.jobId===job.id).length;
    const time=safeHours(job,hoursFn);
    const insp=safeInspection(job.id,inspectionFn);
    const notesOk=typeof job.notes==='string'&&!!job.notes.trim();

    const rows=[
      {
        key:'time',label:'Arbetstid',
        status:time>0?'ok':'warning',
        good:time>0?fmtFn(time):'',
        bad:'Ingen arbetstid registrerad',
        tab:'arbete',action:'Registrera'
      },
      {
        key:'material',label:'Material',
        status:usedCount>0?'ok':'warning',
        good:`${usedCount} ${usedCount===1?'artikel':'artiklar'}`,
        bad:'Inget använt material registrerat',
        tab:'material',action:'Kontrollera'
      },
      {
        key:'photos',label:'Dokumentation',
        status:photoCount>0?'ok':'warning',
        good:`${photoCount} ${photoCount===1?'bild':'bilder'}`,
        bad:'Inga projektbilder sparade',
        tab:'dokumentation',action:'Lägg till'
      },
      {
        key:'inspection',label:'Kontrollpunkter',
        status:insp.total===0?'neutral':(insp.done===insp.total?'ok':'warning'),
        good:insp.total>0?`${insp.done} av ${insp.total} registrerade`:'Ingen kontrollmall vald',
        bad:insp.total?`${Math.max(0,insp.total-insp.done)} punkter kvar`:'Ingen kontroll registrerad',
        neutral:'Ingen kontrollmall vald',
        tab:'kontroll',action:'Kontrollera'
      },
      {
        key:'notes',label:'Dagbok',
        status:notesOk?'ok':'warning',
        good:'Ifylld',
        bad:'Ingen dagboksanteckning',
        tab:'arbete',action:'Fyll i'
      }
    ];

    if(taxFn(job)==='rot'&&!job.isQuote){
      const rs=safeRot(job,rotFn);
      rows.push({
        key:'rot',label:'ROT-uppgifter',
        status:rs.complete?'ok':'warning',
        good:'Registrerade',
        bad:'Saknas eller är ofullständiga',
        tab:'rot',action:'Komplettera'
      });
    }

    return rows.map(r=>Object.assign(r,{ok:r.status==='ok'}));
  }

  function currentDepsV55(){
    return {
      materials:Array.isArray(jobMaterials)?jobMaterials:[],
      photos:Array.isArray(jobPhotos)?jobPhotos:[],
      inspectionProgress:typeof inspectionProgress==='function'?inspectionProgress:()=>({total:0,done:0}),
      effectiveLoggedHours:typeof effectiveLoggedHours==='function'?effectiveLoggedHours:()=>0,
      rotDetailsState:typeof rotDetailsState==='function'?rotDetailsState:()=>({complete:false}),
      taxReductionType:typeof taxReductionType==='function'?taxReductionType:()=>null,
      fmtHours:typeof fmtHours==='function'?fmtHours:(h)=>`${h} h`
    };
  }

  window.finishChecksV55=finishChecksV55;
  window.finishChecksV54=function(job){
    return finishChecksV55(job,currentDepsV55());
  };

  vJobAvsluta=function(job){
    if(!job) return '';

    const rows=finishChecksV55(job,currentDepsV55());
    const okRows=rows.filter(r=>r.status==='ok');
    const warningRows=rows.filter(r=>r.status==='warning');
    const neutralRows=rows.filter(r=>r.status==='neutral');
    const allOk=warningRows.length===0;

    st.finishConfirmV55=st.finishConfirmV55||{};
    const confirm=!!st.finishConfirmV55[job.id];

    const checkRows=rows.map(r=>{
      const isOk=r.status==='ok';
      const isNeutral=r.status==='neutral';
      const symbol=isOk?ICON.check:(isNeutral?'–':'!');
      const text=isOk?r.good:(isNeutral?(r.neutral||r.good):r.bad);
      return `
        <div class="checklist-row" style="align-items:center">
          <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 28px;background:${isOk?'var(--accent)':'var(--surface2)'};color:${isOk?'var(--ink)':'var(--muted)'}">
            ${symbol}
          </div>
          <div class="checklist-info">
            <div class="checklist-name">${esc(r.label)}</div>
            <div class="checklist-sub">${esc(text)}</div>
          </div>
          ${r.status==='warning'?`<button type="button" class="accent" style="font-size:12px;font-weight:700" data-act="open-job-tab" data-tab="${esc(r.tab)}">${esc(r.action)}</button>`:''}
        </div>`;
    }).join('');

    let statusLine=`${okRows.length} klara`;
    if(neutralRows.length) statusLine+=` · ${neutralRows.length} neutral`;
    if(warningRows.length) statusLine+=` · ${warningRows.length} att kolla`;

    const summary=allOk
      ? `<div class="card" style="padding:14px 16px;margin-bottom:14px">
          <div class="row between">
            <div>
              <div class="bold">Klart för avslut</div>
              <div class="muted" style="font-size:12px;margin-top:3px">${esc(statusLine)}. Neutrala punkter blockerar inte avslut.</div>
            </div>
            <span class="pill on">${okRows.length}/${rows.length}</span>
          </div>
        </div>`
      : `<div class="card" style="padding:14px 16px;margin-bottom:14px">
          <div class="row between">
            <div>
              <div class="bold">${warningRows.length} ${warningRows.length===1?'sak behöver':'saker behöver'} kollas</div>
              <div class="muted" style="font-size:12px;margin-top:3px">LiRo blockerar inte uppdraget, men visar vad som saknas innan avslut.</div>
            </div>
            <span class="pill">${okRows.length}/${rows.length}</span>
          </div>
        </div>`;

    const confirmBox=confirm&&!allOk?`
      <div class="card" style="margin-top:16px;padding:14px 16px">
        <div class="bold">Avsluta trots att uppgifter saknas?</div>
        <div class="muted" style="font-size:12px;line-height:1.45;margin-top:5px">${esc(warningRows.map(r=>r.label).join(', '))} är inte komplett. Du kan fortfarande avsluta uppdraget.</div>
        <div class="row gap-xs" style="margin-top:12px">
          <button type="button" class="muted" style="flex:1;text-align:center" data-act="cancel-finish-v55" data-id="${esc(job.id)}">Tillbaka</button>
          <button type="button" class="primary-btn" style="flex:1" data-act="finish-job" data-id="${esc(job.id)}">Avsluta ändå</button>
        </div>
      </div>`: '';

    return `
      ${vWizHeader('Avsluta uppdrag',false,undefined,undefined,'job-tab-back')}
      <div class="job-body">
        ${summary}
        <div class="card" style="padding:4px 16px">${checkRows}</div>
        ${confirmBox}
        ${!confirm?`<div style="margin-top:20px">
          <button type="button" class="primary-btn" style="width:100%" data-act="${allOk?'finish-job':'review-finish-v55'}" data-id="${esc(job.id)}">${allOk?'Avsluta uppdrag':'Granska och avsluta'}</button>
        </div>`:''}
      </div>`;
  };

  if(!window._liroV55Click){
    window._liroV55Click=true;
    document.addEventListener('click',function(e){
      const b=e.target.closest('[data-act]');
      if(!b) return;
      const act=b.dataset.act;
      const id=b.dataset.id;

      if((act==='review-finish-v55'||act==='review-finish-v54')&&id){
        st.finishConfirmV55=st.finishConfirmV55||{};
        st.finishConfirmV55[id]=true;
        render();
        return;
      }

      if((act==='cancel-finish-v55'||act==='cancel-finish-v54')&&id){
        if(st.finishConfirmV55) delete st.finishConfirmV55[id];
        render();
      }
    });
  }

  const oldDetail=vJobDetail;
  vJobDetail=function(id){
    const html=oldDetail(id);
    if(st.jobTab!=='avsluta'&&st.finishConfirmV55&&id){
      delete st.finishConfirmV55[id];
    }
    return html;
  };
})();