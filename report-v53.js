/* LiRo GO v53 – tydlig rapportknapp och standardmottagare. */
(function(){
  const DEFAULT_REPORT_EMAIL='roger@liroemteknik.se';

  getReportEmail=function(){
    const saved=String(localStorage.getItem('lirogo_report_email')||'').trim();
    return saved||DEFAULT_REPORT_EMAIL;
  };

  const oldReportSettings=vSettingsReport;
  vSettingsReport=function(){
    let html=oldReportSettings();
    html=html.replace(
      'placeholder="din@epost.se"',
      'placeholder="'+DEFAULT_REPORT_EMAIL+'"'
    );
    html=html.replace(
      '<p class="settings-note">Adressen "Skicka rapport" på ett avslutat jobb öppnar din mailapp med ett förifyllt utkast till.</p>',
      '<p class="settings-note">När du trycker <b>Skicka rapport</b> öppnas din mailapp med rapporten färdig att skicka. Standardmottagare är '+DEFAULT_REPORT_EMAIL+'.</p>'
    );
    return html;
  };

  const oldJobInvoice=vJobFaktura;
  vJobFaktura=function(job){
    let html=oldJobInvoice(job);
    const recipient=getReportEmail();

    const tileRx=/<button class="tile row-tile" data-act="send-report" data-id="([^"]+)">[\s\S]*?<\/button>/;
    const match=html.match(tileRx);
    if(match){
      const id=match[1];
      const button='<div class="card" style="margin-top:16px;padding:14px 16px">'
        +'<div class="bold">Skicka rapport</div>'
        +'<div class="muted" style="font-size:12px;margin-top:4px;line-height:1.4">Till '+esc(recipient)+' · timmar, dagbok, material och nyckelinfo</div>'
        +'<button class="primary-btn" style="width:100%;margin-top:12px" data-act="send-report" data-id="'+esc(id)+'">'+ICON.mail+'<span>Öppna och skicka rapport</span></button>'
        +'</div>';
      html=html.replace(tileRx,button);
    }
    return html;
  };
})();