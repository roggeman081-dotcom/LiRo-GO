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
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:20px;
        align-items:start;
      }

      body.liro-desktop-home #app>.home-header,
      body.liro-desktop-home #app>.greeting{
        grid-column:1 / -1;
        padding-left:0;
        padding-right:0;
      }

      body.liro-desktop-home #app>.greeting{padding-top:10px}

      body.liro-desktop-home #app>.be-v57,
      body.liro-desktop-home #app>.backup-v64,
      body.liro-desktop-home #app>.liro-guide,
      body.liro-desktop-home #app>.liro-ask-v50,
      body.liro-desktop-home #app>.home-v44-section{
        margin:0;
      }

      body.liro-desktop-home #app>.home-v44-section{
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
        top:50%!important;
        bottom:auto!important;
        transform:translateY(-50%)!important;
        width:80px!important;
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
        max-width:980px;
        margin:0 auto;
      }

      .settings-body,
      .mat-panel-list{
        max-width:920px;
        width:100%;
        margin:0 auto;
      }

      .job-body{
        max-width:1080px;
        margin:0 auto;
      }

      .wiz-body{
        max-width:900px;
        margin:0 auto;
      }
    }
  `;
  document.head.appendChild(style);

  function syncDesktopClass(){
    document.body.classList.toggle('liro-desktop-home',st?.view==='home'&&!settingsOpen&&!calendarOpen);
  }

  const oldRender=render;
  render=function(){
    const result=oldRender.apply(this,arguments);
    syncDesktopClass();
    return result;
  };

  syncDesktopClass();
})();