/* Persistent workflow navigation; secondary tools stay available. */
(function () {
  if (window._liroV56) return;
  window._liroV56 = true;
  const style = document.createElement('style');
  style.textContent = `body.liro-v56-nav .bottomnav{z-index:70;height:calc(80px + env(safe-area-inset-bottom,0px));box-sizing:border-box}body.liro-v56-nav .fab-wrap{display:none}body.liro-v56-nav .job-body,body.liro-v56-nav .wiz-body,body.liro-v56-nav .settings-body,body.liro-v56-nav .mat-panel-list,body.liro-v56-nav .customer-workflow{padding-bottom:calc(188px + env(safe-area-inset-bottom,0px))}.workflow-tools{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);width:min(100%,560px);display:flex;gap:4px;padding:6px 8px;background:var(--bg);z-index:69;box-sizing:border-box}.workflow-tools button{min-height:44px;min-width:44px;flex:1;font-size:13px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text)}.bottomnav .bn-tab{min-height:60px;min-width:44px;flex:1;padding:4px 2px;overflow-wrap:normal}.bottomnav .bn-tab svg{width:22px;height:22px}.bottomnav .bn-tab span{font-size:11px;line-height:1.2}`;
  document.head.appendChild(style);
  function active() {
    if (['customers', 'customer', 'customer-new'].includes(st?.view)) return 'nav-customers';
    if (st?.view === 'job' && st.jobTab === 'faktura') return 'nav-billing';
    if (st?.view === 'projects' || st?.view === 'job') return 'nav-projects';
    if (st?.view === 'worklist' || st?.view === 'work') return 'nav-work';
    if (st?.view === 'billing') return 'nav-billing';
    return '';
  }
  function ensure() {
    if (st?.dictatingKey || (typeof dictationSession !== 'undefined' && dictationSession)) return;
    const show = st && !['opening', 'work', 'wizard'].includes(st.view);
    document.body.classList.toggle('liro-v56-nav', !!show);
    if (!show) return;
    const current = $app.querySelector('.bottomnav');
    if (current) {
      current
        .querySelectorAll('.bn-tab')
        .forEach((b) => b.classList.toggle('on', b.dataset.act === active()));
    } else {
      const wrap = document.createElement('div');
      wrap.innerHTML = vBottomNav(active());
      while (wrap.firstChild) $app.appendChild(wrap.firstChild);
    }
  }
  const previous = render;
  render = function () {
    if (st?.dictatingKey || (typeof dictationSession !== 'undefined' && dictationSession)) return;
    const result = previous.apply(this, arguments);
    ensure();
    return result;
  };
  document.addEventListener(
    'click',
    function (e) {
      const b = e.target.closest(
        '.bottomnav [data-act],.workflow-tools [data-act],.fab-wrap [data-act]'
      );
      if (!b) return;
      const a = b.dataset.act;
      const destinations = {
        'nav-customers': 'customers',
        'nav-projects': 'projects',
        'nav-work': 'worklist',
        'nav-billing': 'billing',
        'nav-home': 'home',
        'open-radar': 'radar',
        'open-settings': 'home'
      };
      if (!destinations[a]) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (st?.dictatingKey || (typeof dictationSession !== 'undefined' && dictationSession)) return;
      if (typeof settingsOpen !== 'undefined') settingsOpen = false;
      if (typeof calendarOpen !== 'undefined') calendarOpen = false;
      try {
        if (typeof scannerFrame !== 'undefined' && scannerFrame) {
          cancelAnimationFrame(scannerFrame);
          scannerFrame = null;
        }
        if (typeof scannerStream !== 'undefined' && scannerStream) {
          scannerStream.getTracks().forEach((t) => t.stop());
          scannerStream = null;
        }
      } catch {}
      if (a === 'open-settings' || a === 'open-radar') pushNav();
      st = { view: destinations[a] };
      if (a === 'open-settings') settingsOpen = true;
      render();
    },
    true
  );
  ensure();
})();
