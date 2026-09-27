/* LiRo GO v54 – smart avslutskontroll.
   Ger tydliga heads-up och genvägar utan att påstå att en installation är säkerhetscertifierad. */
(function(){
  function finishChecksV54(job){
    const insp=inspectionProgress(job.id);
    const usedCount=(jobMaterials||[]).filter(m=>m.kind!=='planned').length;
    const photoCount=(jobPhotos||[]).length;
    const time=effectiveLoggedHours(job);
    const notes=!!String(job.notes||'').trim();
    const rows=[
      {
        key:'time',label:'Arbetstid',ok:time>0,
        good:time>0?fmtHours(time):'',
        bad:'Ingen arbetstid registrerad',
        tab:'arbete',action:'Registrera'
      },
      {
        key:'material',label:'Material',ok:usedCount>0,
        good:usedCount+' '+(usedCount===1?'artikel':'artiklar'),
        bad:'Inget använt material registrerat',
        tab:'material',action:'Kontrollera'
      },
      {
        key:'photos',label:'Dokumentation',ok:photoCount>0,
        good:photoCount+' '+(photoCount===1?'bild':'bilder'),
        bad:'Inga projektbilder sparade',
        tab:'dokumentation',action:'Lägg till'
      },
      {
        key:'inspection',label:'Kontrollpunkter',ok:insp.total>0&&insp.done===insp.total,
        good:insp.total>0?insp.done+' av '+insp.total+' registrerade':'',
        bad:insp.total?((insp.total-insp.done)+' punkter kvar'):'Ingen kontroll registrerad',
        tab:'kontroll',action:'Kontrollera'
      },
      {
        key:'notes',label:'Dagbok',ok:notes,
        good:'Ifylld',
        bad:'Ingen dagboksanteckning',
        tab:'arbete',action:'Fyll i'
      }
    ];
    if(typeof taxReductionType==='function' && taxReductionType(job)==='rot' && !job.isQuote){
      const rs=typeof rotDetailsState==='function'?rotDetailsState(job):{complete:false};
      rows.push({
        key:'rot',label:'ROT-uppgifter',ok:!!rs.complete,
        good:'Registrerade',
        bad:'Saknas eller är ofullständiga',
        tab:'rot',action:'Komplettera'
      });
    }
    return rows;
  }
  window.finishChecksV54=finishChecksV54;

  vJobAvsluta=function(job){
    const rows=finishChecksV54(job);
    const done=rows.filter(r=>r.ok).length;
    const missing=rows.filter(r=>!r.ok);
    const allOk=missing.length===0;
    const confirm=!!st.finishConfirmV54;

    const checkRows=rows.map(r=>`
      <div class="checklist-row" style="align-items:center">
        <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 28px;background:${r.ok?'var(--accent)':'var(--surface2)'};color:${r.ok?'var(--ink)':'var(--muted)'}">
          ${r.ok?ICON.check:'!'}
        </div>
        <div class="checklist-info">
          <div class="checklist-name">${esc(r.label)}</div>
          <div class="checklist-sub">${esc(r.ok?r.good:r.bad)}</div>
        </div>
        ${!r.ok?`<button class="accent" style="font-size:12px;font-weight:700" data-act="open-job-tab" data-tab="${r.tab}">${esc(r.action)}</button>`:''}
      </div>`).join('');

    const summary=allOk
      ? `<div class="card" style="padding:14px 16px;margin-bottom:14px"><div class="row between"><div><div class="bold">Klart för avslut</div><div class="muted" style="font-size:12px;margin-top:3px">Alla ${rows.length} registrerade kontrollområden ser kompletta ut.</div></div><span class="pill on">${done}/${rows.length}</span></div></div>`
      : `<div class="card" style="padding:14px 16px;margin-bottom:14px"><div class="row between"><div><div class="bold">${missing.length} ${missing.length===1?'sak behöver':'saker behöver'} kollas</div><div class="muted" style="font-size:12px;margin-top:3px">LiRo blockerar inte jobbet, men visar vad som saknas innan du avslutar.</div></div><span class="pill">${done}/${rows.length}</span></div></div>`;

    const confirmBox=confirm&&!allOk?`
      <div class="card" style="margin-top:16px;padding:14px 16px">
        <div class="bold">Avsluta trots att uppgifter saknas?</div>
        <div class="muted" style="font-size:12px;line-height:1.45;margin-top:5px">${esc(missing.map(r=>r.label).join(', '))} är inte komplett. Du kan fortfarande avsluta uppdraget.</div>
        <div class="row gap-xs" style="margin-top:12px">
          <button class="muted" style="flex:1;text-align:center" data-act="cancel-finish-v54">Tillbaka</button>
          <button class="primary-btn" style="flex:1" data-act="finish-job" data-id="${job.id}">Avsluta ändå</button>
        </div>
      </div>`: '';

    return `
      ${vWizHeader('Avsluta uppdrag',false,undefined,undefined,'job-tab-back')}
      <div class="job-body">
        ${summary}
        <div class="card" style="padding:4px 16px">${checkRows}</div>
        ${confirmBox}
        ${!confirm?`<div style="margin-top:20px">
          <button class="primary-btn" style="width:100%" data-act="${allOk?'finish-job':'review-finish-v54'}" data-id="${job.id}">${allOk?'Avsluta uppdrag':'Granska och avsluta'}</button>
        </div>`:''}
      </div>`;
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act]');
    if(!b) return;
    if(b.dataset.act==='review-finish-v54'){
      st.finishConfirmV54=true;
      render();
    }
    if(b.dataset.act==='cancel-finish-v54'){
      st.finishConfirmV54=false;
      render();
    }
  });

  const oldDetail=vJobDetail;
  vJobDetail=function(id){
    if(st.jobTab!=='avsluta') st.finishConfirmV54=false;
    return oldDetail(id);
  };
})();