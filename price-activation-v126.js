/* Engångsaktivering. Nyckeln finns endast i den privata länkens fragment.
   GitHub innehåller endast AES-256-GCM-krypterad data, aldrig nyckeln.
   Efter aktivering behövs varken nyckeln, nätet eller filval för uppdrag. */
(function(){
  'use strict';
  function activate(){
  const params=new URLSearchParams(location.hash.slice(1));
  const secret=params.get('price-key');
  if(!secret) return;
  params.delete('price-key');
  history.replaceState(history.state,'',location.pathname+location.search+(params.size?'#'+params:''));
  const engine=window.LiRoPrice;
  if(!engine) return;
  const panel=document.createElement('div');
  panel.setAttribute('role','status');
  panel.setAttribute('aria-live','polite');
  panel.dataset.priceActivation='loading';
  panel.style.cssText='position:fixed;inset:0;z-index:2147483647;background:var(--bg,#f7f8fa);color:var(--text,#17212b);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center';
  const content=document.createElement('div');
  panel.append(content);
  content.textContent='Aktiverar dina Ahlsell-priser…';
  document.body.append(panel);
  const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const ready=engine.ready;
  engine.ready=(async()=>{
    try{
      await ready;
      if(!/^[A-Za-z0-9_-]{43}$/.test(secret)) throw new Error('Aktiveringslänken är ogiltig');
      const response=await fetch('./ahlsell-prices.enc.json',{cache:'no-store'});
      if(!response.ok) throw new Error('Prislistan kunde inte hämtas. Kontrollera internetanslutningen och öppna aktiveringslänken igen.');
      const bundle=await response.json();
      if(bundle.format!=='lirogo-encrypted-prices-v1') throw new Error('Prislistan har fel format');
      const key=await crypto.subtle.importKey('raw',decode(secret),{name:'AES-GCM'},false,['decrypt']);
      const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(bundle.iv)},key,decode(bundle.ciphertext));
      const result=await engine.importPreparedPrices(JSON.parse(new TextDecoder().decode(plain)));
      let persistent=false;
      try{persistent=!!(await navigator.storage?.persist?.());}catch{}
      panel.dataset.priceActivation='complete';
      content.textContent=`Klart! Dina priser för ${result.priced.toLocaleString('sv-SE')} artiklar är sparade och används automatiskt i alla uppdrag, även offline.`;
      const button=document.createElement('button');
      button.className='primary-btn';
      button.style.cssText='display:block;margin:24px auto 0';
      button.textContent='Börja arbeta';
      button.onclick=()=>panel.remove();
      content.append(button);
      return {priced:result.priced,persistent};
    }catch(err){
      panel.dataset.priceActivation='error';
      content.textContent='Priserna kunde inte aktiveras. '+(err.name==='OperationError'?'Aktiveringslänken stämmer inte med prislistan.':err.message)+' Dina tidigare sparade priser finns kvar.';
      const button=document.createElement('button');
      button.className='primary-btn';
      button.style.cssText='display:block;margin:24px auto 0';
      button.textContent='Stäng';
      button.onclick=()=>panel.remove();
      content.append(button);
      // A failed activation must not disable previously configured material entry.
      return {error:true};
    }
  })();
  }
  window.addEventListener('hashchange',activate);
  activate();
})();
