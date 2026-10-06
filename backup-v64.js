/* LiRo GO v64 – lokal backup/återställning.
   Skapar en komplett JSON-backup av kända IndexedDB-tabeller + localStorage.
   Återställning verifierar formatet och skriver tillbaka poster utan att först radera befintlig data. */
(function(){
  if(window._liroBackupV64) return;
  window._liroBackupV64=true;

  const BACKUP_VERSION=130;
  const STORE_CANDIDATES=['customers','jobs','photos','materials','checklist','inspection','radar'];
  const SECRET_STORAGE_KEYS=new Set(['lirogo_ai_key']);

  function nowStamp(){
    const d=new Date();
    const p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
  }

  function fileToDataURL(blob){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve({__liroBlob:true,type:blob.type||'',data:String(r.result||'')});
      r.onerror=()=>reject(r.error||new Error('Kunde inte läsa fil/bild'));
      r.readAsDataURL(blob);
    });
  }

  async function encodeValue(v,seen){
    if(v===null||v===undefined) return v;
    if(v instanceof Blob) return fileToDataURL(v);
    if(v instanceof Date) return {__liroDate:true,value:v.toISOString()};
    if(typeof v!=='object') return v;
    seen=seen||new WeakSet();
    if(seen.has(v)) return null;
    seen.add(v);
    if(Array.isArray(v)){
      const out=[]; for(const x of v) out.push(await encodeValue(x,seen)); return out;
    }
    const out={};
    for(const [k,val] of Object.entries(v)) out[k]=await encodeValue(val,seen);
    return out;
  }

  function dataURLToBlob(dataURL,type){
    const s=String(dataURL||'');
    const comma=s.indexOf(',');
    if(comma<0) return new Blob([],{type:type||''});
    const meta=s.slice(0,comma),body=s.slice(comma+1);
    const bytes=meta.includes(';base64')?atob(body):decodeURIComponent(body);
    const arr=new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
    return new Blob([arr],{type:type||''});
  }

  function decodeValue(v){
    if(v===null||v===undefined||typeof v!=='object') return v;
    if(v.__liroBlob) return dataURLToBlob(v.data,v.type);
    if(v.__liroDate) return new Date(v.value);
    if(Array.isArray(v)) return v.map(decodeValue);
    const out={}; for(const [k,val] of Object.entries(v)) out[k]=decodeValue(val); return out;
  }

  async function readStore(name){
    try{
      if(typeof dbAll!=='function') return {name,rows:[],supported:false,error:'dbAll saknas'};
      const rows=await dbAll(name);
      return {name,rows:await encodeValue(Array.isArray(rows)?rows:[]),supported:true};
    }catch(err){
      return {name,rows:[],supported:false,error:String(err&&err.message||err||'okänt fel')};
    }
  }

  function localStorageSnapshot(){
    const out={};
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i); if(!k) continue;
        if(!SECRET_STORAGE_KEYS.has(k)) out[k]=localStorage.getItem(k);
      }
    }catch{}
    return out;
  }

  async function buildBackup(){
    const stores={};
    for(const name of STORE_CANDIDATES){
      const r=await readStore(name);
      if(r.supported) stores[name]=r.rows;
    }
    const counts={}; for(const [k,v] of Object.entries(stores)) counts[k]=Array.isArray(v)?v.length:0;
    const ahlsellPrices=window.LiRoPrice?.exportPreparedPrices
      ? await window.LiRoPrice.exportPreparedPrices() : null;
    return {
      app:'LiRo GO',
      format:'lirogo-backup',
      backupVersion:BACKUP_VERSION,
      createdAt:new Date().toISOString(),
      source:{userAgent:navigator.userAgent||'',href:location.href},
      counts,
      ahlsellPrices,
      stores,
      localStorage:localStorageSnapshot()
    };
  }

  function saveBlob(blob,name){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  async function exportBackup(){
    const backup=await buildBackup();
    const json=JSON.stringify(backup,null,2);
    const file=new File([json],`LiRo_GO_backup_${nowStamp()}.json`,{type:'application/json'});
    try{
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({title:'LiRo GO backup',text:'Komplett lokal säkerhetskopia',files:[file]});
        return {mode:'shared',backup};
      }
    }catch(err){ if(err?.name==='AbortError') return {mode:'cancelled',backup}; }
    saveBlob(file,file.name);
    return {mode:'downloaded',backup};
  }

  async function restoreBackupObject(data){
    if(!data||data.format!=='lirogo-backup'||!data.stores||typeof data.stores!=='object') throw new Error('Ogiltig LiRo GO-backup');
    let restored=0,skipped=0;
    if(typeof dbPut!=='function') throw new Error('Databasen kan inte återställas i denna version');
    // Validate and commit prices before restoring other data; older backups have no price field.
    if(data.ahlsellPrices){
      if(!window.LiRoPrice?.importPreparedPrices) throw new Error('Prisfunktionen kan inte återställas i denna version');
      await window.LiRoPrice.importPreparedPrices(data.ahlsellPrices);
    }
    for(const [store,rows] of Object.entries(data.stores)){
      if(!Array.isArray(rows)) continue;
      for(const raw of rows){
        try{ await dbPut(store,decodeValue(raw)); restored++; }
        catch{ skipped++; }
      }
    }
    if(data.localStorage&&typeof data.localStorage==='object'){
      for(const [k,v] of Object.entries(data.localStorage)){
        if(SECRET_STORAGE_KEYS.has(k)) continue;
        try{ if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,String(v)); }catch{}
      }
    }
    return {restored,skipped,prices:window.LiRoPrice?.contractCount?.()||0};
  }

  function pickRestoreFile(){
    return new Promise((resolve,reject)=>{
      const input=document.createElement('input'); input.type='file'; input.accept='application/json,.json'; input.style.display='none';
      input.onchange=()=>{
        const f=input.files&&input.files[0]; input.remove();
        if(!f){ resolve(null); return; }
        const r=new FileReader();
        r.onload=()=>{ try{ resolve(JSON.parse(String(r.result||''))); }catch(e){ reject(new Error('Backupfilen kunde inte läsas')); } };
        r.onerror=()=>reject(new Error('Backupfilen kunde inte öppnas'));
        r.readAsText(f);
      };
      document.body.appendChild(input); input.click();
    });
  }

  const style=document.createElement('style');
  style.textContent='.backup-v64{margin:16px;background:var(--surface);border-radius:20px;padding:16px}.backup-v64-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.backup-v64 button{min-height:44px;border-radius:16px;background:var(--surface2);font-weight:650;padding:0 12px}.backup-v64 .primary{background:var(--accent);color:var(--ink)}';
  document.head.appendChild(style);

  function card(){
    const last=localStorage.getItem('lirogo_last_backup_v64');
    return `<section class="backup-v64"><div class="bold">Backup till dator</div><div class="muted" style="font-size:12px;line-height:1.45;margin-top:4px">Skapar en lokal backupfil med kunder, jobb, material, bilder, kontroller, checklistor, Radar, Ahlsell-priser och appinställningar. AI-nyckeln tas inte med.</div><div class="backup-v64-actions"><button type="button" class="primary" data-act="backup-now-v64">Skapa backup</button><button type="button" data-act="restore-backup-v64">Återställ backup</button></div><div class="muted" style="font-size:11px;margin-top:10px">${last?`Senaste backup: ${esc(last)}`:'Ingen backup skapad ännu på denna enhet.'}</div></section>`;
  }

  const oldHome=vHome;
  vHome=function(){
    const html=oldHome();
    const marker='<div class="liro-guide">';
    return html.includes(marker)?html.replace(marker,card()+marker):html+card();
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-act]'); if(!b) return;
    if(b.dataset.act==='backup-now-v64'){
      const old=b.textContent; b.disabled=true; b.textContent='Skapar backup…';
      exportBackup().then(r=>{
        if(r.mode==='cancelled') return;
        const stamp=new Date().toLocaleString('sv-SE'); localStorage.setItem('lirogo_last_backup_v64',stamp);
        flash(r.mode==='shared'?'Backup öppnad för delning':'Backupfil skapad'); render();
      }).catch(err=>{ console.error(err); flash('Kunde inte skapa backup'); }).finally(()=>{ b.disabled=false; b.textContent=old; });
      return;
    }
    if(b.dataset.act==='restore-backup-v64'){
      pickRestoreFile().then(async data=>{
        if(!data) return;
        const created=data.createdAt?new Date(data.createdAt).toLocaleString('sv-SE'):'okänt datum';
        const ok=confirm(`Återställa LiRo GO-backup från ${created}? Befintliga poster raderas inte först; poster med samma id uppdateras.`);
        if(!ok) return;
        const r=await restoreBackupObject(data);
        flash(`Återställning klar: ${r.restored} poster${r.skipped?`, ${r.skipped} hoppades över`:''}`);
        setTimeout(()=>location.reload(),700);
      }).catch(err=>{ console.error(err); flash(err.message||'Kunde inte återställa backup'); });
    }
  });
})();
