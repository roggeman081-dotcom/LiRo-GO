/* LiRo GO v92 – desktop layout.
   Mobilen lämnas oförändrad; breda skärmar får en riktig dashboard-layout. */
(function(){
  if(window._liroDesktopV92) return;
  window._liroDesktopV92=true;

  const style=document.createElement('style');
  style.textContent=`
    @media (min-width:900px){
      body{padding-left:116px}
      #app{max-width:1280px;margin:0 auto;min-height:100vh;padding:28px 32px 72px}

      body.liro-desktop-home #app{
        display:block;
      }

      body.liro-desktop-home #app>.home-header,
      body.liro-desktop-home #app>.greeting{
        padding-left:0;
        padding-right:0;
      }

      body.liro-desktop-home #app>.greeting{padding-top:10px}

      body.liro-desktop-home .desktop-grid-v92{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:20px;
        align-items:start;
      }

      body.liro-desktop-home .desktop-col-v92{
        display:flex;
        flex-direction:column;
        gap:20px;
        min-width:0;
      }

      body.liro-desktop-home .desktop-col-v92>.be-v57,
      body.liro-desktop-home .desktop-col-v92>.backup-v64,
      body.liro-desktop-home .desktop-col-v92>.liro-guide,
      body.liro-desktop-home .desktop-col-v92>.liro-ask-v50,
      body.liro-desktop-home .desktop-col-v92>.home-v44-section{
        margin:0;
      }

      body.liro-desktop-home .desktop-col-v92>.home-v44-section{
        padding:0;
      }

      body.liro-desktop-home .be-v57,
      body.liro-desktop-home .backup-v64,
      body.liro-desktop-home .liro-guide,
      body.liro-desktop-home .liro-ask-v50,
      body.liro-desktop-home .stats-card-v44,
      body.liro-desktop-home .home-v44-list{
        box-shadow:0 1px 0 var(--line),0 10px 28px rgba(0,0,0,.035);
      }

      body.liro-desktop-home .be-ring-v57{width:164px;height:164px}
      body.liro-desktop-home .quick-grid-v44{grid-template-columns:repeat(2,minmax(0,1fr))}

      body.liro-v56-nav .bottomnav{
        position:fixed!important;
        left:18px!important;
        right:auto!important;
        top:50%!important;
        bottom:auto!important;
        transform:translateY(-50%)!important;
        width:80px!important;
        max-width:none!important;
        margin:0!important;
        min-height:330px;
        height:auto!important;
        border-radius:26px!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        gap:8px!important;
        padding:10px 8px!important;
        z-index:90!important;
        box-shadow:0 12px 32px rgba(0,0,0,.09)!important;
      }

      body.liro-v56-nav .bottomnav .bn-tab{
        width:64px!important;
        min-height:66px!important;
        flex:0 0 auto!important;
        border-radius:18px!important;
      }

      body.liro-v56-nav .fab-wrap{
        position:fixed!important;
        left:auto!important;
        right:28px!important;
        bottom:28px!important;
        top:auto!important;
        transform:none!important;
        max-width:none!important;
        margin:0!important;
        width:auto!important;
        z-index:91!important;
      }

      body.liro-v56-nav .fab{
        width:58px!important;
        height:58px!important;
        box-shadow:0 10px 28px rgba(0,0,0,.18)!important;
      }

      body.liro-v56-nav .job-body,
      body.liro-v56-nav .wiz-body,
      body.liro-v56-nav .settings-body,
      body.liro-v56-nav .mat-panel-list{
        padding-bottom:48px!important;
      }

      .mat-panel{
        left:116px!important;
        right:0!important;
        top:0!important;
        bottom:0!important;
        max-width:none!important;
        width:auto!important;
        margin:0!important;
        padding:24px 32px 56px;
        background:var(--bg);
      }

      .mat-panel-head,
      .settings-body,
      .mat-panel-list{
        max-width:1280px;
        width:100%;
        margin:0 auto;
      }

      .mat-panel-head{
        padding:0 0 18px!important;
      }

      .settings-body,
      .mat-panel-list{
        padding-left:0!important;
        padding-right:0!important;
      }

      .job-body{
        max-width:1180px;
        margin:0 auto;
        padding-left:0!important;
        padding-right:0!important;
      }

      .wiz-header,
      .wiz-steps,
      .wiz-body{
        max-width:920px;
        width:100%;
        margin-left:auto!important;
        margin-right:auto!important;
      }

      .wiz-body{padding-left:0!important;padding-right:0!important}

      .wiz-footer{
        left:calc(50% + 58px)!important;
        right:auto!important;
        transform:translateX(-50%)!important;
        max-width:920px!important;
        width:calc(100% - 180px)!important;
        padding-left:0!important;
        padding-right:0!important;
      }

      .work-screen{
        left:116px!important;
        right:0!important;
        max-width:none!important;
      }
    }
  `;
  document.head.appendChild(style);

  function syncDesktopClass(){
    const desktopHome=st?.view==='home'&&!settingsOpen&&!calendarOpen;
    document.body.classList.toggle('liro-desktop-home',desktopHome);
    if(!desktopHome || window.innerWidth<900) return;

    if($app.querySelector('.desktop-grid-v92')) return;

    const children=[...$app.children];
    const header=children.find(el=>el.classList.contains('home-header'));
    const greeting=children.find(el=>el.classList.contains('greeting'));
    const nav=children.find(el=>el.classList.contains('bottomnav'));
    const fab=children.find(el=>el.classList.contains('fab-wrap'));

    const breakEven=children.find(el=>el.classList.contains('be-v57'));
    const backup=children.find(el=>el.classList.contains('backup-v64'));
    const guide=children.find(el=>el.classList.contains('liro-guide'));
    const ask=children.find(el=>el.classList.contains('liro-ask-v50'));
    const sections=children.filter(el=>el.classList.contains('home-v44-section'));

    const byHeading=needle=>sections.find(el=>(el.querySelector('.h2')?.textContent||'').trim().toLowerCase().includes(needle));
    const today=byHeading('idag');
    const actions=byHeading('agera');
    const stats=byHeading('materialvinst');
    const quick=byHeading('snabbt');
    const recent=byHeading('senaste');

    const grid=document.createElement('div');
    grid.className='desktop-grid-v92';
    const left=document.createElement('div');
    left.className='desktop-col-v92 desktop-col-left-v92';
    const right=document.createElement('div');
    right.className='desktop-col-v92 desktop-col-right-v92';

    [breakEven,today,stats,recent].filter(Boolean).forEach(el=>left.appendChild(el));
    [backup,guide,ask,actions,quick].filter(Boolean).forEach(el=>right.appendChild(el));

    // Fånga eventuella nya startsideskort som inte fanns när v92 byggdes.
    const claimed=new Set([header,greeting,nav,fab,breakEven,backup,guide,ask,today,actions,stats,quick,recent].filter(Boolean));
    children.filter(el=>!claimed.has(el)).forEach(el=>right.appendChild(el));

    grid.append(left,right);
    const anchor=greeting?.nextSibling||null;
    $app.insertBefore(grid,anchor);

    if(nav) $app.appendChild(nav);
    if(fab) $app.appendChild(fab);
  }

  const oldRender=render;
  render=function(){
    const result=oldRender.apply(this,arguments);
    syncDesktopClass();
    return result;
  };

  window.addEventListener('resize',()=>{ if(st?.view==='home') render(); });
  syncDesktopClass();
})();