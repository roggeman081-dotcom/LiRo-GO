/* LiRo GO v83 – materialflöde: Fråga LiRo + Snabbsök/Favoriter.
   Fabrikatneutralt först. Exakta produktdata måste verifieras mot vald tillverkare. */
(function(){
  'use strict';
  if(window._liroMaterialAssistantV83) return;
  window._liroMaterialAssistantV83=true;

  const safe=s=>typeof esc==='function'?esc(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const icon=(name,fallback='')=>window.ICON&&ICON[name]?ICON[name]:fallback;

  const style=document.createElement('style');
  style.textContent=`
    .mat83-ways{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0 14px}
    .mat83-way{background:var(--surface2);border-radius:16px;padding:12px;text-align:left;min-height:84px}
    .mat83-way.on{background:var(--accent);color:var(--ink)}
    .mat83-way b{display:block;font-size:14px;margin-top:5px}
    .mat83-way span{display:block;font-size:11px;line-height:1.35;margin-top:3px;color:var(--muted)}
    .mat83-way.on span{color:var(--ink);opacity:.72}
    .mat83-kicker{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:2px 0 8px}
    .mat83-result{display:grid;gap:10px;margin-top:12px}
    .mat83-summary{background:var(--surface);border-radius:18px;padding:14px}
    .mat83-modules{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
    .mat83-stat{background:var(--surface2);border-radius:12px;padding:10px;text-align:center}
    .mat83-stat strong{display:block;font-size:20px;line-height:1.1}
    .mat83-stat span{font-size:10px;color:var(--muted)}
    .mat83-component{background:var(--surface);border-radius:16px;padding:12px}
    .mat83-comp-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .mat83-comp-name{font-weight:700;font-size:14px}
    .mat83-comp-mod{font-weight:700;white-space:nowrap}
    .mat83-note{font-size:11px;color:var(--muted);line-height:1.45;margin-top:5px}
    .mat83-pill{display:inline-block;border-radius:999px;background:var(--surface2);padding:3px 8px;font-size:10px;margin-top:6px}
    .mat83-list{margin:8px 0 0;padding-left:18px;font-size:12px;line-height:1.5}
    .mat83-search{margin-top:8px;width:100%;min-height:36px;border-radius:12px;background:var(--surface2);font-size:12px;font-weight:700;padding:0 10px;text-align:left}
    .mat83-error{background:var(--surface);border-radius:16px;padding:12px;font-size:12px;line-height:1.45}
  `;
  document.head.appendChild(style);

  function normalizePlan(p){
    p=p&&typeof p==='object'?p:{};
    const comps=Array.isArray(p.components)?p.components:[];
    return {
      summary:String(p.summary||'Materialförslag'),
      components:comps.slice(0,30).map(c=>({
        name:String(c?.name||'Komponent'),
        qty:Math.max(1,Number(c?.qty)||1),
        moduleWidth:c?.moduleWidth==null?null:Math.max(0,Number(c.moduleWidth)||0),
        totalModules:c?.totalModules==null?null:Math.max(0,Number(c.totalModules)||0),
        certainty:String(c?.certainty||'estimate'),
        note:String(c?.note||''),
        searchTerm:String(c?.searchTerm||c?.name||'')
      })),
      occupiedModules:p.occupiedModules==null?null:Math.max(0,Number(p.occupiedModules)||0),
      recommendedEnclosureModules:p.recommendedEnclosureModules==null?null:Math.max(0,Number(p.recommendedEnclosureModules)||0),
      reserveModules:p.reserveModules==null?null:Math.max(0,Number(p.reserveModules)||0),
      dinRailHint:String(p.dinRailHint||''),
      extras:Array.isArray(p.extras)?p.extras.map(String).slice(0,20):[],
      verify:Array.isArray(p.verify)?p.verify.map(String).slice(0,20):[]
    };
  }

  function extractJsonObject(raw){
    const text=String(raw??'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    const first=text.indexOf('{');
    if(first<0) return null;
    let depth=0, inString=false, escapeNext=false;
    for(let i=first;i<text.length;i++){
      const ch=text[i];
      if(inString){
        if(escapeNext){ escapeNext=false; continue; }
        if(ch==='\\'){ escapeNext=true; continue; }
        if(ch==='"') inString=false;
        continue;
      }
      if(ch==='"'){ inString=true; continue; }
      if(ch==='{') depth++;
      else if(ch==='}'){
        depth--;
        if(depth===0) return text.slice(first,i+1);
      }
    }
    return text.slice(first);
  }

  function parseMaterialJson(raw){
    const candidate=extractJsonObject(raw);
    if(!candidate) return null;
    const attempts=[
      candidate,
      candidate.replace(/,\s*([}\]])/g,'$1'),
      candidate.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ')
    ];
    for(const text of attempts){
      try{
        const parsed=JSON.parse(text);
        if(parsed&&typeof parsed==='object') return parsed;
      }catch{}
    }
    return null;
  }

  async function repairMaterialJson(raw){
    const repairSystem=[
      'Du reparerar JSON för LiRo GO.',
      'Returnera ENDAST ett giltigt JSON-objekt utan markdown, kommentarer eller förklaringar.',
      'Behåll innebörden i underlaget men rätta endast syntax och struktur.',
      'Tillåtna toppfält: summary, components, occupiedModules, recommendedEnclosureModules, reserveModules, dinRailHint, extras, verify.',
      'components ska vara en array av objekt med name, qty, moduleWidth, totalModules, certainty, note och searchTerm.',
      'Använd null när ett numeriskt värde saknas. Hitta inte på artikelnummer eller exakta produktdata.'
    ].join(' ');
    const repaired=await anthropicMessage({
      max_tokens:1400,
      system:repairSystem,
      messages:[{role:'user',content:'Reparera detta svar till giltig JSON:\n'+String(raw??'')}]
    });
    return parseMaterialJson(repaired);
  }

  async function askMaterialPlan(request){
    if(typeof anthropicMessage!=='function') throw new Error('AI-funktionen är inte tillgänglig');
    const system=[
      'Du är LiRo, materialassistent för en yrkesverksam svensk elektriker.',
      'Användaren beskriver funktioner och komponenter. Börja fabrikatneutralt om inget fabrikat uttryckligen anges.',
      'Målet är att hjälpa användaren välja rimlig kapslingsstorlek, DIN-skenekapacitet och kompletterande material.',
      'Räkna modulbehov endast när du har rimlig grund. Vanlig DIN-modul är cirka 17,5–18 mm, men faktisk bredd kan avvika.',
      'Exakta modulbredder, artikelnummer, brytförmåga, typ/klassning och kompatibilitet får aldrig hittas på.',
      'När en uppgift beror på fabrikat eller produktserie: markera certainty="estimate" och skriv vad som måste verifieras.',
      'Föreslå reservutrymme praktiskt, normalt cirka 20–30 procent och minst några fria moduler, men förklara om annan reserv behövs.',
      'Ta med relevanta kompletteringar som N-/PE-skenor, fasskena/anslutningar, blindmoduler och märkning endast när de är rimliga.',
      'Svara ENDAST med giltig JSON utan markdown, kommentarer eller text före/efter JSON.',
      'Alla strängar måste vara korrekt JSON-escapade. Använd inte radbrytningar inuti strängvärden.',
      'Schema: {"summary":"string","components":[{"name":"string","qty":1,"moduleWidth":2,"totalModules":2,"certainty":"known|estimate|unknown","note":"string","searchTerm":"string"}],"occupiedModules":11,"recommendedEnclosureModules":18,"reserveModules":7,"dinRailHint":"string","extras":["string"],"verify":["string"]}.',
      'Om du inte kan räkna säkert, använd null för modulvärden och lägg orsaken i verify.'
    ].join(' ');
    const raw=await anthropicMessage({
      max_tokens:1400,
      system,
      messages:[{role:'user',content:String(request||'').trim()}]
    });
    let parsed=parseMaterialJson(raw);
    if(!parsed){
      try{ parsed=await repairMaterialJson(raw); }
      catch{}
    }
    if(!parsed) throw new Error('LiRo kunde inte tolka materialförslaget. Försök igen.');
    return normalizePlan(parsed);
  }

  function resultMarkup(){
    if(st.mat83Loading) return '<div class="mat83-error">LiRo räknar på material och modulbehov…</div>';
    if(st.mat83Error) return '<div class="mat83-error"><b>Kunde inte skapa förslaget</b><div class="mat83-note">'+safe(st.mat83Error)+'</div>'+(typeof getAiKey==='function'&&!getAiKey()?'<button class="mat83-search" data-act="open-ai-settings">Öppna AI-inställningar</button>':'')+'</div>';
    const p=st.mat83Plan;
    if(!p) return '';
    const mods=p.occupiedModules==null?'–':p.occupiedModules;
    const enc=p.recommendedEnclosureModules==null?'–':p.recommendedEnclosureModules;
    const reserve=p.reserveModules==null?'–':p.reserveModules;
    const comps=p.components.map(c=>{
      const mod=c.totalModules==null?'?':c.totalModules;
      const certainty=c.certainty==='known'?'Känd uppgift':c.certainty==='unknown'?'Måste verifieras':'Uppskattning';
      return '<div class="mat83-component"><div class="mat83-comp-head"><div><div class="mat83-comp-name">'+safe(c.qty+' × '+c.name)+'</div><div class="mat83-pill">'+safe(certainty)+'</div></div><div class="mat83-comp-mod">'+safe(mod)+' mod</div></div>'+(c.note?'<div class="mat83-note">'+safe(c.note)+'</div>':'')+(c.searchTerm?'<button class="mat83-search" data-mat83="search-term" data-q="'+safe(c.searchTerm)+'">Sök “'+safe(c.searchTerm)+'” i material</button>':'')+'</div>';
    }).join('');
    const extras=p.extras.length?'<div class="mat83-summary"><b>Komplettera med</b><ul class="mat83-list">'+p.extras.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></div>':'';
    const verify=p.verify.length?'<div class="mat83-summary"><b>Verifiera innan beställning</b><ul class="mat83-list">'+p.verify.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></div>':'';
    return '<div class="mat83-result"><div class="mat83-summary"><b>'+safe(p.summary)+'</b><div class="mat83-modules"><div class="mat83-stat"><strong>'+safe(mods)+'</strong><span>upptagna moduler</span></div><div class="mat83-stat"><strong>'+safe(enc)+'</strong><span>föreslagen kapsling</span></div><div class="mat83-stat"><strong>'+safe(reserve)+'</strong><span>reservmoduler</span></div></div>'+(p.dinRailHint?'<div class="mat83-note">DIN-skena: '+safe(p.dinRailHint)+'</div>':'')+'</div>'+comps+extras+verify+'</div>';
  }

  function planPanel(job){
    const hasKey=typeof getAiKey==='function'&&!!getAiKey();
    return `
      <div class="mat-panel">
        <div class="mat-panel-head">
          <div class="mat-panel-title">
            <button class="iconbtn" data-mat83="back" aria-label="Tillbaka">${icon('chevronLeft','‹')}</button>
            <h1>Fråga LiRo</h1>
            <div style="width:44px"></div>
          </div>
          <div class="mat-panel-sub">${safe(job?.title||'Materialhjälp')}</div>
        </div>
        <div class="mat-panel-list">
          <div class="ai-suggest-box">
            <div class="mat83-kicker">Beskriv funktionen – LiRo räknar resten</div>
            <div class="field-mic">
              <textarea placeholder="T.ex. huvudbrytare 40 A 3-pol, JFB 25 A 4-pol, 3-pol 10 A och PSA 16 A. Föreslå kapslingsstorlek och kompletteringar." data-mat83-input="request" autocomplete="off">${safe(st.mat83Request||'')}</textarea>
              <button class="iconbtn mic-inline ${st.dictatingKey==='mat83'?'mic-listening':''}" data-mat83="dictate" aria-label="Diktera" style="top:24px;transform:none">${icon('mic','🎙')}</button>
            </div>
            <div class="mat83-note" style="margin-top:8px">Fabrikatneutralt först. Exakta produktmått och kompatibilitet markeras för verifiering.</div>
            <div style="margin-top:12px"><button class="primary-btn" data-mat83="plan" ${st.mat83Loading?'disabled':''}>${icon('sparkle','')}<span>${st.mat83Loading?'Räknar…':'Skapa materialförslag'}</span></button></div>
            ${!hasKey?'<div class="mat83-error" style="margin-top:10px">AI-nyckel saknas i den här installationen. Du kan stanna här och lägga in nyckeln senare.<button class="mat83-search" data-act="open-ai-settings">Öppna AI-inställningar</button></div>':''}
          </div>
          ${resultMarkup()}
        </div>
        <div class="snabbval" style="grid-template-columns:1fr"><button data-mat83="back">${icon('search','')}<span>Snabbsök & favoriter</span></button></div>
      </div>`;
  }

  const oldPanel=window.vMaterialPanel;
  if(typeof oldPanel==='function'){
    window.vMaterialPanel=function(job){
      if(st.matPanelMode==='liro83') return planPanel(job);
      let html=oldPanel(job);
      if((st.matPanelMode||'browse')==='browse'){
        html=html.replace('<h1>Registrera material</h1>','<h1>Material</h1>');
        const marker='<div class="mat-search">';
        if(html.includes(marker) && !html.includes('data-mat83="open"')){
          const chooser='<div class="mat83-ways"><button class="mat83-way on" data-mat83="open">'+icon('sparkle','')+'<b>Fråga LiRo</b><span>Beskriv vad du behöver – få modul- och kapslingsförslag</span></button><button class="mat83-way" data-mat83="focus-search">'+icon('search','')+'<b>Snabbsök</b><span>Sök direkt eller använd dina favoriter</span></button></div>';
          html=html.replace(marker,chooser+'<div class="mat83-kicker">Snabbsök & favoriter</div>'+marker);
        }
        html=html.replace('data-act="switch-to-ai"','data-mat83="open"').replace('<span>AI-förslag</span>','<span>Fråga LiRo</span>');
      }
      return html;
    };
  }

  document.addEventListener('input',function(e){
    const key=e.target&&e.target.dataset?e.target.dataset.mat83Input:null;
    if(key==='request') st.mat83Request=e.target.value;
  },true);

  document.addEventListener('click',function(e){
    const el=e.target.closest&&e.target.closest('[data-mat83]');
    if(!el) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const act=el.dataset.mat83;

    if(act==='open'){
      st.matPanel=true;
      st.matPanelMode='liro83';
      st.mat83Error=null;
      if(typeof pushNav==='function') pushNav();
      render();
      return;
    }
    if(act==='back'){
      st.matPanelMode='browse';
      render();
      return;
    }
    if(act==='focus-search'){
      const input=document.querySelector('[data-field="mat-search"]');
      if(input){ input.focus(); try{ input.select(); }catch{} }
      return;
    }
    if(act==='dictate'){
      if(typeof toggleDictate!=='function'){
        if(typeof flash==='function') flash('Diktering är inte tillgänglig just nu');
        return;
      }
      toggleDictate('mat83',function(text){ st.mat83Request=text; render(); });
      return;
    }
    if(act==='search-term'){
      st.matPanelMode='browse';
      st.matSearch=el.dataset.q||'';
      st.matTab='recent';
      render();
      if(typeof ensureCatalog==='function') Promise.resolve(ensureCatalog()).then(()=>{ const box=document.getElementById('matPanelList'); if(box&&typeof vMatPanelList==='function') box.innerHTML=vMatPanelList(); }).catch(()=>{});
      return;
    }
    if(act==='plan'){
      const request=String(st.mat83Request||'').trim();
      if(!request){ if(typeof flash==='function') flash('Beskriv vad du behöver först'); return; }
      if(typeof getAiKey==='function'&&!getAiKey()){
        st.mat83Error='Ingen API-nyckel är inlagd i den här installationen.';
        render();
        return;
      }
      st.mat83Loading=true; st.mat83Error=null; st.mat83Plan=null; render();
      askMaterialPlan(request).then(plan=>{
        st.mat83Plan=plan;
        st.mat83Loading=false;
        render();
      }).catch(err=>{
        st.mat83Loading=false;
        st.mat83Error=err?.message==='Failed to fetch'?'Kunde inte nå AI-tjänsten – kontrollera nätet.':(err?.message||'Något gick fel');
        render();
      });
      return;
    }
  },true);

  window.askMaterialPlanV83=askMaterialPlan;
})();