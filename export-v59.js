/* LiRo GO v59 – skapa kund-PDF + intern Excel (.xlsx) efter avslutat uppdrag. */
(function(){
  if(window._liroExportV59) return;
  window._liroExportV59=true;

  const LIBS={
    jspdf:'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    xlsx:'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
  };

  function loadScript(src,ready){
    if(ready()) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const old=[...document.scripts].find(s=>s.src===src);
      if(old){ old.addEventListener('load',resolve,{once:true}); old.addEventListener('error',reject,{once:true}); return; }
      const s=document.createElement('script'); s.src=src; s.async=true; s.onload=resolve; s.onerror=()=>reject(new Error('Kunde inte ladda exportbibliotek')); document.head.appendChild(s);
    });
  }
  async function ensureLibs(){
    await Promise.all([
      loadScript(LIBS.jspdf,()=>!!window.jspdf?.jsPDF),
      loadScript(LIBS.xlsx,()=>!!window.XLSX)
    ]);
  }
  function clean(v){ return String(v??'').replace(/\s+/g,' ').trim(); }
  function safeName(v){ return clean(v||'uppdrag').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'_').slice(0,80)||'uppdrag'; }
  function currentReportText(job){
    const t=document.querySelector('textarea[data-field="customer-report-v58"]');
    if(t?.value) return t.value;
    return st?.customerReportDraftV58?.[job.id]||`Kundrapport – ${clean(job.title)}`;
  }
  function usedMats(job){ return (jobMaterials||[]).filter(m=>m.jobId===job.id&&m.kind!=='planned'); }
  function internalRows(job){
    const markup=Math.max(0,toNumber(job.markupPercent,15))/100;
    return usedMats(job).map(m=>{
      const qty=Math.max(0,toNumber(m.qty,0));
      const buy=Math.max(0,toNumber(m.unitPrice,0));
      const sell=buy*(1+markup);
      return {
        Artikelnummer:clean(m.eNr||''),
        Material:clean(m.name||m.description||'Material'),
        Antal:qty,
        Enhet:clean(m.unit||'st'),
        'Inköpspris/st':buy,
        'Påslag %':markup*100,
        'Kundpris/st':sell,
        'Inköp totalt':buy*qty,
        'Försäljning totalt':sell*qty,
        Materialvinst:(sell-buy)*qty
      };
    });
  }
  function makePdf(job){
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4'});
    const margin=16, maxW=178;
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('Kundrapport – LiRo Elteknik',margin,18);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const lines=doc.splitTextToSize(currentReportText(job),maxW);
    let y=28;
    for(const line of lines){
      if(y>280){ doc.addPage(); y=18; }
      doc.text(line,margin,y); y+=5;
    }
    return doc.output('blob');
  }
  function makeXlsx(job){
    const rows=internalRows(job);
    const wb=XLSX.utils.book_new();
    const matWs=XLSX.utils.json_to_sheet(rows.length?rows:[{Material:'Inget registrerat material'}]);
    XLSX.utils.book_append_sheet(wb,matWs,'Material');

    const hours=Math.max(0,effectiveLoggedHours(job));
    const rate=Math.max(0,toNumber(job.hourlyRate,DEFAULT_PRICE_DEFAULTS.hourlyRate));
    const labor=laborCost(job);
    const travel=travelCost(job);
    const other=Math.max(0,toNumber(job.otherCosts,0));
    const matBuy=rows.reduce((s,r)=>s+r['Inköp totalt'],0);
    const matSell=rows.reduce((s,r)=>s+r['Försäljning totalt'],0);
    const matProfit=rows.reduce((s,r)=>s+r.Materialvinst,0);
    const summary=[
      ['Uppdrag',clean(job.title)],
      ['Timmar',hours],
      ['Grundtimpris',rate],
      ['Arbete totalt',labor],
      ['Material inköp',matBuy],
      ['Material försäljning',matSell],
      ['Materialvinst',matProfit],
      ['Framkörning/resor',travel],
      ['Övrigt',other],
      ['Fakturaunderlag exkl. moms',labor+matSell+travel+other],
      ['Moms 25 %',(labor+matSell+travel+other)*0.25],
      ['Totalt inkl. moms',(labor+matSell+travel+other)*1.25]
    ];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Summering');
    const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    return new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function download(file){
    const url=URL.createObjectURL(file); const a=document.createElement('a'); a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function exportFiles(job){
    await ensureLibs();
    const base=safeName(job.title);
    const pdf=new File([makePdf(job)],`Kundrapport_${base}.pdf`,{type:'application/pdf'});
    const xlsx=new File([makeXlsx(job)],`Fakturaunderlag_${base}.xlsx`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    if(navigator.share&&navigator.canShare?.({files:[pdf,xlsx]})){
      await navigator.share({title:`LiRo GO – ${clean(job.title)}`,text:'Kundrapport och internt fakturaunderlag',files:[pdf,xlsx]});
      return 'shared';
    }
    download(pdf); download(xlsx); return 'downloaded';
  }

  const oldDetail=vJobDetail;
  vJobDetail=function(id){
    let html=oldDetail(id);
    const job=jobById(id);
    if(job&&st.jobTab==='kundrapport-v58'){
      const marker='<button type="button" class="cr58-secondary" style="width:100%" data-act="open-faktura">Gå till fakturaunderlag</button>';
      const box='<div class="cr58-card" style="margin-top:14px">'
        +'<div class="bold">PDF + Excel</div>'
        +'<div class="cr58-meta">Skapar en kundsäker PDF och en intern Excel-fil med material, tider, inköp, påslag, kundpris, materialvinst och totalsummor.</div>'
        +'<button type="button" class="primary-btn cr58-send" data-act="export-pdf-xlsx-v59" data-id="'+esc(job.id)+'">Skapa PDF + Excel</button>'
        +'</div>';
      html=html.includes(marker)?html.replace(marker,box+marker):html+box;
    }
    return html;
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act="export-pdf-xlsx-v59"]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    const job=jobById(b.dataset.id); if(!job) return;
    const old=b.innerHTML; b.disabled=true; b.textContent='Skapar filer…';
    exportFiles(job).then(mode=>{
      flash(mode==='shared'?'PDF och Excel öppnade för delning':'PDF och Excel skapade');
    }).catch(err=>{
      if(err?.name!=='AbortError'){ console.error(err); flash('Kunde inte skapa PDF/Excel'); }
    }).finally(()=>{ b.disabled=false; b.innerHTML=old; });
  },true);
})();