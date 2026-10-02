/* LiRo GO v103 – snabbare vardagsflöden utan att ta bort funktioner.
   1) Skapa uppdrag direkt från arbetsinfo; sammanfattningen finns kvar som frivillig granskning.
   2) Avslut nås direkt från arbetsläget utan att gå tillbaka via uppdragsöversikten. */
(function(){
  'use strict';
  if(window._liroQuickflowV103) return;
  window._liroQuickflowV103=true;

  const style=document.createElement('style');
  style.textContent=`
    .wiz-footer-v103{gap:8px}
    .wiz-review-v103{width:100%;min-height:38px;text-align:center;font-size:13px;font-weight:700;color:var(--muted)}
    .work103-finish{margin-top:18px;width:100%;min-height:48px;border-radius:16px;background:var(--surface2);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px}
    .work103-finish svg{width:19px;height:19px;color:var(--accent)}
  `;
  document.head.appendChild(style);

  const oldFooter=window.vWizFooter;
  if(typeof oldFooter==='function'){
    window.vWizFooter=function(){
      if(st.step===3){
        const m=detailsMissing();
        return `<div class="wiz-footer wiz-footer-v103">
          ${m.length?`<span class="missing">Saknas: ${m.join(', ')}</span>`:''}
          <button class="primary-btn" data-act="wiz-submit" ${m.length?'disabled':''}>Skapa uppdrag</button>
          <button class="wiz-review-v103" data-act="wiz-next" ${m.length?'disabled':''}>Granska allt först</button>
        </div>`;
      }
      return oldFooter();
    };
  }

  const oldWork=window.vArbetslage;
  if(typeof oldWork==='function'){
    window.vArbetslage=function(job){
      let html=oldWork(job);
      const marker='</div>\n      ${st.matPanel ? vMaterialPanel(job) : \'\'}';
      const button=`<button class="work103-finish" data-v103="finish">${ICON.check}<span>Avsluta / fakturaunderlag</span></button>`;
      const screenEnd='        </div>\n      </div>';
      const pos=html.indexOf(screenEnd);
      if(pos>=0){
        html=html.slice(0,pos+screenEnd.indexOf('</div>')+6)+button+html.slice(pos+screenEnd.indexOf('</div>')+6);
      }else{
        html=html.replace('</div>\n      ${st.matPanel',button+'</div>\n      ${st.matPanel');
      }
      return html;
    };
  }

  document.addEventListener('click',function(e){
    const el=e.target.closest&&e.target.closest('[data-v103]');
    if(!el||el.dataset.v103!=='finish') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    st.view='job';
    st.jobTab='avsluta';
    pushNav();
    render();
  },true);
})();