/* LiRo GO v56 – persistent bottenmeny.
   Visar huvudnavigeringen i alla vanliga menyer/vyer, men inte öppningsskärmen eller fullskärms arbetsläget. */
(function(){
  if(window._liroV56) return;
  window._liroV56=true;

  const style=document.createElement('style');
  style.textContent=`
    body.liro-v56-nav .bottomnav{z-index:70}
    body.liro-v56-nav .fab-wrap{z-index:71}
    body.liro-v56-no-fab .fab-wrap{display:none!important}
    body.liro-v56-nav .job-body,
    body.liro-v56-nav .wiz-body,
    body.liro-v56-nav .settings-body,
    body.liro-v56-nav .mat-panel-list{
      padding-bottom:calc(122px + env(safe-area-inset-bottom,0px));
    }
    body.liro-v56-nav .mat-panel{padding-bottom:0}
  `;
  document.head.appendChild(style);

  function navActiveV56(){
    if(typeof settingsOpen!=='undefined'&&settingsOpen) return 'mer';
    if(st?.view==='home') return 'hem';
    if(st?.view==='projects') return 'projekt';
    if(st?.view==='radar') return 'radar';
    return '';
  }

  function shouldShowNavV56(){
    if(!st) return false;
    // I flöden där användaren fyller i steg-för-steg ska bottenmenyn inte
    // konkurrera med formulärets egen footer/primärknapp.
    if(st.view==='opening'||st.view==='work'||st.view==='wizard') return false;
    return true;
  }

  function ensureNavV56(){
    const show=shouldShowNavV56();
    const hideFab=st?.view==='job';
    document.body.classList.toggle('liro-v56-nav',show);
    document.body.classList.toggle('liro-v56-no-fab',show&&hideFab);
    if(!show) return;

    const active=navActiveV56();
    const existing=$app.querySelector('.bottomnav');
    const existingFab=$app.querySelector('.fab-wrap');

    if(existing){
      existing.querySelectorAll('.bn-tab').forEach(btn=>btn.classList.remove('on'));
      const act=active==='hem'?'nav-home':active==='projekt'?'nav-projects':active==='radar'?'open-radar':active==='mer'?'open-settings':'';
      if(act) existing.querySelector(`[data-act="${act}"]`)?.classList.add('on');
      return;
    }

    const wrap=document.createElement('div');
    wrap.setAttribute('data-liro-v56-nav','1');
    wrap.innerHTML=vBottomNav(active);
    while(wrap.firstChild) $app.appendChild(wrap.firstChild);

    if(!existingFab && !$app.querySelector('.fab-wrap')){
      // vBottomNav ska normalt skapa FAB. Den här grenen är bara en säker fallback.
    }
  }

  const oldRender=render;
  render=function(){
    const result=oldRender.apply(this,arguments);
    ensureNavV56();
    return result;
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('.bottomnav [data-act], .fab-wrap [data-act]');
    if(!b) return;
    const act=b.dataset.act;

    if(act==='nav-home'){
      // Hem ska alltid vara en genväg hela vägen hem, även från öppna paneler.
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof settingsOpen!=='undefined') settingsOpen=false;
      if(typeof calendarOpen!=='undefined') calendarOpen=false;
      try{
        if(typeof scannerFrame!=='undefined'&&scannerFrame){ cancelAnimationFrame(scannerFrame); scannerFrame=null; }
        if(typeof scannerStream!=='undefined'&&scannerStream){ scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null; }
      }catch{}
      st={view:'home'};
      render();
      return;
    }

    if(['nav-projects','open-radar'].includes(act)){
      if(typeof settingsOpen!=='undefined') settingsOpen=false;
      if(typeof calendarOpen!=='undefined') calendarOpen=false;
      if(st) st.settingsTab=undefined;
    }
  },true);

  // Lägg på menyn direkt om scriptet laddas efter första renderingen.
  ensureNavV56();
})();