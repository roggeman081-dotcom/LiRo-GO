/* LiRo GO v51 – ROT-underlag och heads-up.
   Uppgifterna sparas lokalt på uppdraget och skickas inte till AI. */
(function(){
  function rotState(job){
    if(typeof taxReductionType!=='function' || taxReductionType(job)!=='rot') return {required:false,complete:true,missing:[]};
    const missing=[];
    if(!String(job?.rotPersonNumber||'').trim()) missing.push('personnummer');
    const hasProperty=!!String(job?.rotPropertyDesignation||'').trim();
    const hasApartment=!!String(job?.rotHousingOrgNumber||'').trim() && !!String(job?.rotApartmentNumber||'').trim();
    if(!hasProperty && !hasApartment) missing.push('fastighetsbeteckning eller BRF + lägenhetsnummer');
    return {required:!job?.isQuote,complete:missing.length===0,missing};
  }
  window.rotDetailsState=rotState;

  function vRotPanel(job){
    const s=rotState(job);
    if(typeof taxReductionType!=='function' || taxReductionType(job)!=='rot'){
      return `${vWizHeader('ROT-uppgifter',false,undefined,undefined,'job-tab-back')}
        <div class="job-body"><div class="card"><div class="muted">ROT är inte valt för det här uppdraget.</div></div></div>`;
    }
    if(job.isQuote){
      return `${vWizHeader('ROT-uppgifter',false,undefined,undefined,'job-tab-back')}
        <div class="job-body"><div class="card"><div class="bold">Ingen komplettering behövs ännu</div>
        <div class="muted" style="font-size:13px;margin-top:6px;line-height:1.45">ROT är valt i offerten. Person- och fastighetsuppgifter behöver inte fyllas i förrän offerten blir ett faktiskt jobb.</div>
        <button class="accent" style="margin-top:12px;font-weight:700" data-act="accept-quote-v51">Offert accepterad · gör till uppdrag</button></div></div>`;
    }
    return `${vWizHeader('ROT-uppgifter',false,undefined,undefined,'job-tab-back')}
      <div class="job-body">
        <div class="card" style="margin-bottom:16px">
          <div class="row between" style="gap:12px">
            <div><div class="bold">${s.complete?'ROT-uppgifter registrerade':'ROT-uppgifter saknas'}</div>
            <div class="muted" style="font-size:12px;margin-top:3px">${s.complete?'Underlaget är registrerat på uppdraget.':'Fyll i när du har uppgifterna. Jobbet blockeras inte.'}</div></div>
            <span class="pill ${s.complete?'on':''}">${s.complete?'Klart':'Saknas'}</span>
          </div>
        </div>
        <div class="field"><span class="label">Personnummer</span><input type="text" inputmode="numeric" autocomplete="off" placeholder="ÅÅÅÅMMDD-XXXX" value="${esc(job.rotPersonNumber||'')}" data-field="job-rot-personnummer-v51"></div>
        <div class="field"><span class="label">Fastighetsbeteckning</span><input type="text" autocomplete="off" placeholder="Ex. Allerum 1:23" value="${esc(job.rotPropertyDesignation||'')}" data-field="job-rot-property-v51"></div>
        <div class="divider">eller bostadsrätt</div>
        <div class="field"><span class="label">BRF organisationsnummer</span><input type="text" inputmode="numeric" autocomplete="off" placeholder="XXXXXX-XXXX" value="${esc(job.rotHousingOrgNumber||'')}" data-field="job-rot-brf-v51"></div>
        <div class="field"><span class="label">Lägenhetsnummer</span><input type="text" autocomplete="off" placeholder="Lägenhetsnummer" value="${esc(job.rotApartmentNumber||'')}" data-field="job-rot-apartment-v51"></div>
        <div class="settings-note">Uppgifterna sparas lokalt på uppdraget. De skickas inte till AI.</div>
      </div>`;
  }

  const oldDetail=vJobDetail;
  vJobDetail=function(id){
    const job=jobById(id);
    if(job && st.jobTab==='rot') return vRotPanel(job);
    return oldDetail(id);
  };

  const oldCheck=getLiRoProjectCheck;
  getLiRoProjectCheck=function(job,deps){
    if(typeof taxReductionType==='function' && taxReductionType(job)==='rot' && !job.isQuote && !rotState(job).complete){
      return {tone:'info',title:'LiRo-koll',text:'ROT är valt men ROT-uppgifterna saknas eller är ofullständiga.',tab:'rot',action:'Komplettera'};
    }
    return oldCheck(job,deps);
  };

  const oldOffer=vJobOffert;
  vJobOffert=function(job){
    let html=oldOffer(job);
    if(typeof taxReductionType!=='function' || taxReductionType(job)!=='rot') return html;
    const s=rotState(job);
    const note=job.isQuote
      ? '<div class="card" style="margin:12px 0"><div class="bold">ROT valt i offerten</div><div class="muted" style="font-size:12px;margin-top:5px;line-height:1.45">Du behöver inte fylla i ROT-uppgifter nu. När offerten blir ett jobb får du en heads-up om uppgifterna saknas.</div><button class="accent" style="margin-top:10px;font-weight:700" data-act="accept-quote-v51">Offert accepterad · gör till uppdrag</button></div>'
      : '<div class="card" style="margin:12px 0"><div class="bold">'+(s.complete?'ROT-uppgifter registrerade':'ROT-uppgifter saknas')+'</div><button class="accent" style="margin-top:10px;font-weight:700" data-act="open-job-tab" data-tab="rot">Visa ROT-uppgifter</button></div>';
    const marker='<div class="section"><div class="summary-card"';
    return html.includes(marker)?html.replace(marker,note+marker):html+note;
  };

  const oldFinish=vJobAvsluta;
  vJobAvsluta=function(job){
    let html=oldFinish(job);
    if(typeof taxReductionType!=='function' || taxReductionType(job)!=='rot' || job.isQuote) return html;
    const s=rotState(job);
    const note='<div class="card" style="margin:16px 0;padding:14px 16px"><div class="row between" style="gap:12px"><div><div class="bold">ROT-uppgifter</div><div class="muted" style="font-size:12px;margin-top:3px">'+(s.complete?'Registrerade':'Saknas eller är ofullständiga')+'</div></div><button class="accent" data-act="open-job-tab" data-tab="rot">'+(s.complete?'Visa':'Komplettera')+'</button></div></div>';
    const marker='<div style="margin-top:20px">';
    return html.includes(marker)?html.replace(marker,note+marker):html;
  };

  const oldSetStatus=setJobStatus;
  setJobStatus=async function(jobId,status){
    const ok=await oldSetStatus(jobId,status);
    const job=jobById(jobId);
    if(ok && job && job.isQuote && status==='active'){
      job.isQuote=false; job.updatedAt=new Date().toISOString(); await dbPut('jobs',job);
    }
    return ok;
  };

  document.addEventListener('input',function(e){
    const f=e.target?.dataset?.field;
    const map={
      'job-rot-personnummer-v51':'rotPersonNumber',
      'job-rot-property-v51':'rotPropertyDesignation',
      'job-rot-brf-v51':'rotHousingOrgNumber',
      'job-rot-apartment-v51':'rotApartmentNumber'
    };
    if(!map[f]) return;
    const job=jobById(st.id); if(!job) return;
    job[map[f]]=e.target.value;
    job.updatedAt=new Date().toISOString();
    dbPut('jobs',job);
  });

  document.addEventListener('click',async function(e){
    const b=e.target.closest('[data-act="accept-quote-v51"]');
    if(!b) return;
    const job=jobById(st.id); if(!job) return;
    job.isQuote=false;
    if(!job.status || ['later','tomorrow'].includes(job.status)) job.status='planned';
    job.updatedAt=new Date().toISOString();
    await dbPut('jobs',job);
    const missing=typeof taxReductionType==='function' && taxReductionType(job)==='rot' && !rotState(job).complete;
    flash(missing?'Offerten är nu ett uppdrag · ROT-uppgifter saknas':'Offerten är nu ett uppdrag');
    st.jobTab=missing?'rot':undefined;
    render();
  });
})();