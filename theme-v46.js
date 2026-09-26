/* LiRo GO v46 – färgteman.
   Separat lager: påverkar bara CSS-variabler och inställningsvyn. */
(function(){
  const STORAGE_KEY='lirogo_theme';
  const THEMES={
    original:{
      label:'LiRo original',
      note:'Beige och lime',
      preview:['#F7F2E9','#FFFFFF','#A8C93B'],
      vars:{
        '--bg':'#F7F2E9','--surface':'#FFFFFF','--surface2':'#EFE8D9',
        '--text':'#201F1C','--muted':'#8A8272','--accent':'#A8C93B',
        '--ink':'#1C2411','--line':'#E6DFCF'
      },
      colorScheme:'light',themeColor:'#F7F2E9'
    },
    dark:{
      label:'Mörk',
      note:'Mörk bakgrund och lime',
      preview:['#171A16','#22261F','#A8C93B'],
      vars:{
        '--bg':'#171A16','--surface':'#22261F','--surface2':'#30362B',
        '--text':'#F1F3EB','--muted':'#A9B09E','--accent':'#B7D84C',
        '--ink':'#11150D','--line':'#394033'
      },
      colorScheme:'dark',themeColor:'#171A16'
    },
    blue:{
      label:'Blå',
      note:'Ljus och teknisk',
      preview:['#F2F6FA','#FFFFFF','#3D8EBE'],
      vars:{
        '--bg':'#F2F6FA','--surface':'#FFFFFF','--surface2':'#E5EDF4',
        '--text':'#18232B','--muted':'#70808C','--accent':'#3D8EBE',
        '--ink':'#10202B','--line':'#D7E1E8'
      },
      colorScheme:'light',themeColor:'#F2F6FA'
    },
    graphite:{
      label:'Grafit',
      note:'Grafitgrå och lime',
      preview:['#202322','#2B2F2D','#A8C93B'],
      vars:{
        '--bg':'#202322','--surface':'#2B2F2D','--surface2':'#383D3A',
        '--text':'#F3F4F1','--muted':'#AEB5AF','--accent':'#A8C93B',
        '--ink':'#171A16','--line':'#424844'
      },
      colorScheme:'dark',themeColor:'#202322'
    }
  };

  const style=document.createElement('style');
  style.textContent=`
    .theme-grid-v46{display:grid;gap:10px;margin-top:12px}
    .theme-option-v46{width:100%;display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:var(--surface);border:1px solid transparent;text-align:left}
    .theme-option-v46.on{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
    .theme-swatches-v46{display:flex;gap:4px;flex:0 0 auto}
    .theme-swatch-v46{width:18px;height:18px;border-radius:50%;border:1px solid rgba(127,127,127,.22)}
    .theme-option-copy-v46{flex:1;min-width:0}
    .theme-option-title-v46{font-weight:650}
    .theme-option-sub-v46{font-size:12px;color:var(--muted);margin-top:2px}
    html[data-liro-resolved-theme="dark"] .brand-mini,
    html[data-liro-resolved-theme="graphite"] .brand-mini,
    html[data-liro-resolved-theme="dark"] .open-logo,
    html[data-liro-resolved-theme="graphite"] .open-logo{filter:invert(1) brightness(1.08)}
  `;
  document.head.appendChild(style);

  function selectedTheme(){
    const saved=localStorage.getItem(STORAGE_KEY)||'original';
    return ['original','dark','blue','graphite','auto'].includes(saved)?saved:'original';
  }
  function resolvedTheme(selected){
    if(selected!=='auto') return selected;
    return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'original';
  }
  function setMetaThemeColor(color){
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){
      meta=document.createElement('meta');
      meta.name='theme-color';
      document.head.appendChild(meta);
    }
    meta.content=color;
  }
  function applyTheme(selected){
    const resolved=resolvedTheme(selected);
    const theme=THEMES[resolved]||THEMES.original;
    const root=document.documentElement;
    root.dataset.liroTheme=selected;
    root.dataset.liroResolvedTheme=resolved;
    Object.entries(theme.vars).forEach(([k,v])=>root.style.setProperty(k,v));
    root.style.colorScheme=theme.colorScheme;
    setMetaThemeColor(theme.themeColor);
    return resolved;
  }
  function saveTheme(selected){
    localStorage.setItem(STORAGE_KEY,selected);
    applyTheme(selected);
  }

  applyTheme(selectedTheme());

  const mq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  const onSystemTheme=()=>{ if(selectedTheme()==='auto'){ applyTheme('auto'); if(typeof render==='function') render(); } };
  if(mq){
    if(typeof mq.addEventListener==='function') mq.addEventListener('change',onSystemTheme);
    else if(typeof mq.addListener==='function') mq.addListener(onSystemTheme);
  }

  function swatches(theme){
    return '<span class="theme-swatches-v46">'+theme.preview.map(c=>'<span class="theme-swatch-v46" style="background:'+c+'"></span>').join('')+'</span>';
  }
  function vAppearanceV46(){
    const current=selectedTheme();
    const rows=[
      ['original',THEMES.original],
      ['dark',THEMES.dark],
      ['blue',THEMES.blue],
      ['graphite',THEMES.graphite],
      ['auto',{label:'Automatiskt',note:'Följer telefonens ljust/mörkt läge',preview:['#F7F2E9','#171A16','#A8C93B']}]
    ].map(([key,t])=>`
      <button class="theme-option-v46 ${current===key?'on':''}" data-act="set-theme-v46" data-theme="${key}">
        ${swatches(t)}
        <span class="theme-option-copy-v46">
          <span class="theme-option-title-v46">${esc(t.label)}</span>
          <span class="theme-option-sub-v46">${esc(t.note)}</span>
        </span>
        ${current===key?ICON.check:''}
      </button>`).join('');

    return `
      <div class="mat-panel">
        <div class="mat-panel-head">
          <div class="mat-panel-title">
            <button class="iconbtn" data-act="settings-tab-back" aria-label="Tillbaka">${ICON.chevronLeft}</button>
            <h1>Utseende</h1>
            <div style="width:44px"></div>
          </div>
          <div class="mat-panel-sub">Färgtema sparas bara på den här enheten</div>
        </div>
        <div class="settings-body">
          <div class="section" style="margin-top:8px">
            <div class="subsection-title">Färgtema</div>
            <div class="theme-grid-v46">${rows}</div>
            <p class="settings-note" style="margin-top:12px">Temat påverkar bakgrund, kort, accentfärg, diagram och LiRo-vyn. Ingen AI används.</p>
          </div>
        </div>
      </div>`;
  }

  const previousSettingsHub=vSettingsHub;
  vSettingsHub=function(){
    const html=previousSettingsHub();
    const button='<button class="tile row-tile" data-act="open-settings-tab" data-tab="appearance">'+ICON.sparkle+'<span class="t-text">Utseende<span class="t-sub" style="display:block">Färgtema och mörkt läge</span></span>'+ICON.chevronRight+'</button><div style="margin-top:12px"></div>';
    return html.replace('<div class="settings-body">','<div class="settings-body">'+button);
  };

  const previousSettingsPanel=vSettingsPanel;
  vSettingsPanel=function(){
    if(st.settingsTab==='appearance') return vAppearanceV46();
    return previousSettingsPanel();
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act="set-theme-v46"]');
    if(!b) return;
    const theme=b.dataset.theme;
    if(!['original','dark','blue','graphite','auto'].includes(theme)) return;
    saveTheme(theme);
    if(typeof flash==='function') flash('Färgtema sparat');
    if(typeof render==='function') render();
  });
})();