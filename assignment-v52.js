/* LiRo GO v52 – ett gemensamt begrepp: Uppdrag.
   Kundjobb/Projekt tas bort ur skapaflödet. Äldre poster behålls kompatibla. */
(function(){
  const oldEmptyDraft=emptyDraft;
  emptyDraft=function(){
    const d=oldEmptyDraft();
    d.kind='assignment';
    d.method='manual';
    return d;
  };

  vStepKind=function(){
    return `
      ${vWizHeader('Nytt uppdrag', true)}
      <div class="wiz-body">
        <div class="card">
          <div class="bold">Uppdrag</div>
          <div class="muted" style="font-size:13px;margin-top:5px;line-height:1.45">Alla kundjobb och projekt samlas som uppdrag. Typ av arbete väljer du längre fram.</div>
        </div>
        <div style="margin-top:16px">
          <button class="primary-btn" style="width:100%" data-act="set-method" data-method="manual">Skapa uppdrag</button>
        </div>
      </div>`;
  };

  const oldProjects=vProjects;
  vProjects=function(){
    return oldProjects()
      .replace('>Projekt</div>','>Uppdrag</div>')
      .replace('Sök projekt eller kund…','Sök uppdrag eller kund…')
      .replace(/>Projekt<\/span>/g,'>Uppdrag</span>');
  };

  const oldHome=vHome;
  vHome=function(){
    return oldHome()
      .replace(/>Projekt<\/span>/g,'>Uppdrag</span>')
      .replace(/>Projekt<\/b>/g,'>Uppdrag</b>')
      .replace('Senaste projekt','Senaste uppdrag')
      .replace('Alla projekt','Alla uppdrag');
  };

  const oldBottom=vBottomNav;
  vBottomNav=function(active){
    return oldBottom(active).replace(/>Projekt<\/span>/g,'>Uppdrag</span>');
  };
})();