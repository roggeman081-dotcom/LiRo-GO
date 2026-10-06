/* LiRo GO v110 – robust streckkodsläsare för Material.
   Livekamera + foto-fallback + manuell kod. Optimerad för Ahlsell/E-nummer på iPhone. */
(function(){
  'use strict';
  if(window._liroBarcodeV96) return;
  window._liroBarcodeV96=true;

  const style=document.createElement('style');
  style.textContent=`
    .scanner96{position:fixed;inset:0;background:#050505;z-index:140;display:flex;flex-direction:column}
    .scanner96-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}
    .scanner96-shade{position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.35),transparent 22%,transparent 70%,rgba(0,0,0,.62));pointer-events:none}
    .scanner96-top{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:calc(14px + env(safe-area-inset-top,0px)) 16px 10px;color:#fff}
    .scanner96-title{font-size:16px;font-weight:700}
    .scanner96-frame{position:absolute;z-index:2;left:9%;right:9%;top:31%;height:30%;border:2px solid rgba(255,255,255,.92);border-radius:18px;box-shadow:0 0 0 9999px rgba(0,0,0,.10);pointer-events:none}
    .scanner96-frame:before,.scanner96-frame:after{content:"";position:absolute;left:7%;right:7%;height:2px;background:var(--accent);top:50%;border-radius:2px}
    .scanner96-bottom{position:relative;z-index:3;margin-top:auto;padding:16px 16px calc(18px + env(safe-area-inset-bottom,0px));color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.88) 24%)}
    .scanner96-msg{text-align:center;font-size:13px;line-height:1.4;margin:0 0 12px}
    .scanner96-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:520px;margin:0 auto}
    .scanner96-action{min-height:46px;border-radius:14px;background:rgba(255,255,255,.14);color:#fff;font-weight:700;padding:10px}
    .scanner96-action.primary{background:var(--accent);color:var(--ink)}
    .scanner96-manual{display:grid;grid-template-columns:1fr auto;gap:8px;max-width:520px;margin:10px auto 0}
    .scanner96-manual input{background:#fff;color:#111}
    .scanner96-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
    @media(min-width:900px){
      .scanner96{left:116px}
      .scanner96-frame{left:25%;right:25%;top:28%;height:32%}
      .scanner96-bottom{padding-left:32px;padding-right:32px}
    }
  `;
  document.head.appendChild(style);

  let detectBusyV96=false;
  let lastDetectV110=0;
  let scanNoV110=0;
  let scanStartedV137=0;
  let readingV137={code:'',count:0,since:0};
  const cropCanvasV110=document.createElement('canvas');

  function stopScannerV96(){
    try{ if(scannerFrame){cancelAnimationFrame(scannerFrame);scannerFrame=null;} }catch{}
    try{ if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null;} }catch{}
    detectBusyV96=false;
    lastDetectV110=0;
    scanNoV110=0;
    readingV137={code:'',count:0,since:0};
  }

  function scannerFormatsV96(){
    return ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','code_93','codabar','itf','qr_code','data_matrix','pdf417'];
  }

  async function createDetectorV96(){
    const ok=await ensureBarcodeDetector();
    if(!ok || !window.BarcodeDetector) throw new Error('detector-unavailable');
    let formats=scannerFormatsV96();
    try{
      if(typeof BarcodeDetector.getSupportedFormats==='function'){
        const supported=await BarcodeDetector.getSupportedFormats();
        if(Array.isArray(supported)&&supported.length){
          const set=new Set(supported);
          const filtered=formats.filter(f=>set.has(f));
          if(filtered.length) formats=filtered;
        }
      }
    }catch{}
    try{return new BarcodeDetector({formats});}
    catch{
      try{return new BarcodeDetector();}
      catch(err){throw err;}
    }
  }

  function scannerMessageV96(){
    if(st.scannerLoading) return 'Startar kameran…';
    if(st.scannerError) return st.scannerError;
    return 'Rikta streckkoden innanför ramen. För E-nummer läser LiRo även koder som slutar på E.';
  }

  vBarcodeScanner=function(){
    return `
      <div class="scanner96">
        <video id="scannerVideo" class="scanner96-video" playsinline muted autoplay></video>
        <div class="scanner96-shade"></div>
        <div class="scanner96-top">
          <button class="iconbtn" data-act="close-scanner" aria-label="Avbryt" style="color:#fff;background:rgba(0,0,0,.35)">${ICON.x}</button>
          <div class="scanner96-title">Skanna material</div>
          <div style="width:44px"></div>
        </div>
        <div class="scanner96-frame"></div>
        <div class="scanner96-bottom">
          <p class="scanner96-msg" id="scanner96Msg">${esc(scannerMessageV96())}</p>
          <div class="scanner96-actions">
            <button class="scanner96-action primary" data-barcode-photo-v96="1">Ta bild av streckkod</button>
            <button class="scanner96-action" data-barcode-retry-v96="1">Starta om kamera</button>
          </div>
          <div class="scanner96-manual">
            <input type="text" inputmode="text" autocapitalize="characters" placeholder="E-nummer / kod manuellt" data-barcode-manual-v96 autocomplete="off">
            <button class="scanner96-action primary" data-barcode-use-v96="1">Sök</button>
          </div>
          <input class="scanner96-file" type="file" accept="image/*" capture="environment" data-barcode-file-v96>
        </div>
      </div>`;
  };

  function setScannerMsgV96(text,isError=false){
    st.scannerError=isError?text:null;
    const el=document.getElementById('scanner96Msg');
    if(el){el.textContent=text;el.style.color=isError?'#ffaaaa':'#fff';}
  }

  function barcodeCandidatesV110(raw){
    const original=String(raw||'').trim().toUpperCase();
    if(!original) return [];
    const compact=original.replace(/[\s-]+/g,'');
    const out=[original,compact];
    // Map explicit article numbers in QR links, never truncate GTIN/EAN codes.
    try{
      const url=new URL(String(raw||'').trim());
      for(const key of ['artnr','artikelnummer','e-nummer','enummer']){
        const value=url.searchParams.get(key);
        if(value&&/^E?\d{5,7}E?$/i.test(value)) out.push(...barcodeCandidatesV110(value));
      }
      const last=url.pathname.split('/').filter(Boolean).pop()||'';
      if(/^\d{7}E?$/i.test(last)) out.push(...barcodeCandidatesV110(last));
    }catch{}
    if(/^\d{1,7}$/.test(compact)) out.push(compact.padStart(7,'0'));
    // Ahlsell/E-nummer förekommer på etiketter som t.ex. 1500136E medan
    // katalogens artikelnummer är 1500136.
    if(/^\d{5,10}E$/.test(compact)) out.push(compact.slice(0,-1));
    if(/^E\d{5,10}$/.test(compact)) out.push(compact.slice(1));
    // Om en skanner lägger in start/slut-tecken från Code39.
    const noStars=compact.replace(/^\*+|\*+$/g,'');
    if(noStars!==compact) out.push(noStars);
    if(/^\d{5,10}E$/.test(noStars)) out.push(noStars.slice(0,-1));
    return [...new Set(out.filter(Boolean))];
  }

  async function resolveBarcodeV110(raw){
    const candidates=barcodeCandidatesV110(raw);
    try{ if(typeof ensureCatalog==='function') await ensureCatalog(); }catch{}
    for(const code of candidates){
      try{
        const row=typeof catalogRow==='function'?catalogRow(code):null;
        if(row) return {raw:String(raw||'').trim(),code,row,matched:true};
      }catch{}
    }
    return {raw:String(raw||'').trim(),code:candidates[0]||String(raw||'').trim(),row:null,matched:false};
  }

  async function applyBarcodeV96(raw,requireMatch=false){
    const resolved=await resolveBarcodeV110(raw);
    if(!resolved.code) return false;
    if(requireMatch&&!resolved.matched){
      setScannerMsgV96('Kod '+resolved.raw+' saknar artikelträff. Rikta kameran mot etikettens E-nummer/streckkod eller skriv E-numret manuellt.',true);
      return false;
    }
    st.matSearch=resolved.code;
    st.scannerLastCodeV96=resolved.raw;
    st.scannerMatchedV96=resolved.matched;
    closeBarcodeScanner();
    setTimeout(()=>{
      if(typeof flash!=='function') return;
      if(resolved.matched){
        const changed=resolved.raw.toUpperCase()!==resolved.code.toUpperCase();
        flash(changed?`Streckkod ${resolved.raw} → artikel ${resolved.code}`:'Streckkod avläst – artikel hittad',3200);
      }else{
        flash('Kod avläst: '+resolved.raw+' · ingen direkt träff i prislistan',3200);
      }
    },80);
    return true;
  }
  window.applyBarcodeV96=applyBarcodeV96;
  window.barcodeCandidatesV110=barcodeCandidatesV110;
  window.resolveBarcodeV110=resolveBarcodeV110;

  async function decodeSourceV96(source){
    const detector=await createDetectorV96();
    const found=await detector.detect(source);
    if(found&&found.length&&found[0].rawValue) return String(found[0].rawValue);
    return '';
  }

  async function improveCameraFocusV110(stream){
    try{
      const track=stream.getVideoTracks?.()[0];
      if(!track?.getCapabilities || !track?.applyConstraints) return;
      const caps=track.getCapabilities();
      const advanced={};
      if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('continuous')) advanced.focusMode='continuous';
      if(Object.keys(advanced).length) await track.applyConstraints({advanced:[advanced]});
    }catch{}
  }

  async function startLiveV96(){
    stopScannerV96();
    st.scannerLoading=true;st.scannerError=null;
    setScannerMsgV96('Startar kameran…');
    try{
      if(!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('mediaDevices unavailable'),{name:'NotSupportedError'});
      const stream=await navigator.mediaDevices.getUserMedia({
        video:{
          facingMode:{ideal:'environment'},
          width:{ideal:1920},
          height:{ideal:1080}
        },
        audio:false
      });
      if(!st.scannerOpen){stream.getTracks().forEach(t=>t.stop());return;}
      scannerStream=stream;
      await improveCameraFocusV110(stream);
      const video=document.getElementById('scannerVideo');
      if(!video) throw new Error('scanner-video-missing');
      video.srcObject=stream;
      await new Promise(resolve=>{
        if(video.readyState>=2) return resolve();
        const done=()=>{video.removeEventListener('loadedmetadata',done);resolve();};
        video.addEventListener('loadedmetadata',done,{once:true});
        setTimeout(done,1800);
      });
      await video.play().catch(()=>{});
      const detector=await createDetectorV96();
      st.scannerLoading=false;
      setScannerMsgV96('Rikta streckkoden innanför ramen. LiRo söker automatiskt när koden blir skarp.');
      scanStartedV137=performance.now();
      scanLoopV96(video,detector);
    }catch(err){
      const expectedPermissionError=err && ['NotAllowedError','SecurityError','NotFoundError','NotReadableError','NotSupportedError'].includes(err.name);
      if(!expectedPermissionError) console.error('barcode v110 camera',err);
      st.scannerLoading=false;
      const msg=typeof cameraErrorText==='function'?cameraErrorText(err):'Kunde inte starta kameran.';
      setScannerMsgV96(msg+' Du kan använda “Ta bild” istället.',true);
    }
  }

  async function detectFrameV110(video,detector){
    const vw=video.videoWidth||0, vh=video.videoHeight||0;
    if(vw<40||vh<40) return [];
    // Läs först bara mitten där ramen ligger. Det ger betydligt färre pixlar
    // till ZXing på iPhone och bättre träff på små materialetiketter.
    const sx=Math.round(vw*0.07), sy=Math.round(vh*0.27);
    const sw=Math.round(vw*0.86), sh=Math.round(vh*0.42);
    cropCanvasV110.width=sw; cropCanvasV110.height=sh;
    const ctx=cropCanvasV110.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,sx,sy,sw,sh,0,0,sw,sh);
    let codes=await detector.detect(cropCanvasV110);
    // Var sjätte läsning testar vi hela bilden också, för etiketter utanför ramen.
    if((!codes||!codes.length) && (++scanNoV110%6===0)) codes=await detector.detect(video);
    return codes||[];
  }

  function scanLoopV96(video,detector){
    const tick=async now=>{
      if(!st.scannerOpen) return;
      scannerFrame=requestAnimationFrame(tick);
      if(detectBusyV96||!video||video.readyState<2) return;
      if(now-lastDetectV110<110) return;
      lastDetectV110=now;
      detectBusyV96=true;
      try{
        const codes=await detectFrameV110(video,detector);
        if(now-scanStartedV137<900) return;
        const detected=(codes||[]).filter(entry=>entry?.rawValue);
        const known=detected.find(entry=>barcodeCandidatesV110(entry.rawValue).some(candidate=>
          typeof catalogRow==='function'&&catalogRow(candidate)));
        const code=String((known||detected[0])?.rawValue||'').trim();
        if(!code){readingV137={code:'',count:0,since:0};return;}
        if(readingV137.code!==code) readingV137={code,count:1,since:now};
        else readingV137.count++;
        if(readingV137.count<3||now-readingV137.since<600) return;
        await applyBarcodeV96(code,true);
        readingV137={code:'',count:0,since:now};
      }catch(err){
        if(!st.scannerError){
          console.error('barcode v110 detect',err);
          setScannerMsgV96('Kameran är igång men liveavläsningen strular. Prova “Ta bild av streckkod”.',true);
        }
      }finally{detectBusyV96=false;}
    };
    scannerFrame=requestAnimationFrame(tick);
  }

  openBarcodeScanner=async function(){
    st.scannerOpen=true;st.scannerLoading=true;st.scannerError=null;
    pushNav();render();
    await Promise.resolve();
    if(st.scannerOpen) startLiveV96();
  };

  const oldClose=closeBarcodeScanner;
  closeBarcodeScanner=function(){
    stopScannerV96();
    return oldClose();
  };

  document.addEventListener('click',async function(e){
    const photo=e.target.closest('[data-barcode-photo-v96]');
    if(photo){
      e.preventDefault();e.stopImmediatePropagation();
      document.querySelector('[data-barcode-file-v96]')?.click();
      return;
    }
    const retry=e.target.closest('[data-barcode-retry-v96]');
    if(retry){
      e.preventDefault();e.stopImmediatePropagation();
      startLiveV96();return;
    }
    const use=e.target.closest('[data-barcode-use-v96]');
    if(use){
      e.preventDefault();e.stopImmediatePropagation();
      const input=document.querySelector('[data-barcode-manual-v96]');
      if(!await applyBarcodeV96(input?.value)) setScannerMsgV96('Skriv in en kod först.',true);
    }
  },true);

  document.addEventListener('keydown',async function(e){
    if(e.key==='Enter'&&e.target?.matches('[data-barcode-manual-v96]')){
      e.preventDefault();await applyBarcodeV96(e.target.value);
    }
  });

  document.addEventListener('change',async function(e){
    const input=e.target.closest?.('[data-barcode-file-v96]');
    if(!input||!input.files?.[0]) return;
    setScannerMsgV96('Läser bilden…');
    try{
      const code=await decodeSourceV96(input.files[0]);
      if(code) await applyBarcodeV96(code,true);
      else setScannerMsgV96('Ingen streckkod hittades i bilden. Prova närmare och med bättre ljus.',true);
    }catch(err){
      console.error('barcode v110 photo',err);
      setScannerMsgV96('Kunde inte läsa bilden. Prova igen eller skriv koden manuellt.',true);
    }finally{input.value='';}
  });

  document.addEventListener('click',function(e){
    if(e.target.closest('.bottomnav [data-act]')&&st?.scannerOpen) stopScannerV96();
  },true);
})();