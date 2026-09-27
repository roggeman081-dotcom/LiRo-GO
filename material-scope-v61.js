/* LiRo GO v61 – lås material till rätt uppdrag.
   Förhindrar att samma E-nummer i olika uppdrag delar antal eller ändras av fel jobb. */
(function(){
  if(window._liroMaterialScopeV61) return;
  window._liroMaterialScopeV61=true;

  function materialMatchV61(m,jobId,eNr,kind){
    return !!m && m.jobId===jobId && m.eNr===eNr && (m.kind||'used')===(kind||'used');
  }

  bumpMaterialQty=async function(jobId,row,delta,kind){
    kind=kind||'used';
    if(!jobId||!row||!row[0]) return 0;

    const existing=jobMaterials.find(m=>materialMatchV61(m,jobId,row[0],kind));
    if(existing){
      const newQty=(Number(existing.qty)||0)+delta;
      if(newQty<=0){
        await deleteMaterial(existing.id);
        jobMaterials=jobMaterials.filter(m=>m.id!==existing.id);
        return 0;
      }
      existing.qty=newQty;
      existing.updatedAt=new Date().toISOString();
      await dbPut('materials',existing);
      return newQty;
    }

    if(delta>0){
      const m=await addMaterial(jobId,{
        name:row[3],eNr:row[0],unit:row[2],unitPrice:effectivePrice(row),qty:delta,kind
      });
      jobMaterials.push(m);
      return delta;
    }
    return 0;
  };

  vMatQtyRow=function(row,kind){
    kind=kind||'used';
    const jobId=st&&st.id;
    const existing=jobId?jobMaterials.find(m=>materialMatchV61(m,jobId,row[0],kind)):null;
    const qty=existing?existing.qty:0;
    const favs=getFavoriteArtnrs();
    const isFav=favs.includes(row[0]);
    return `
      <div class="mat-item">
        <div class="mat-item-thumb">${ICON.box}</div>
        <div class="mat-item-info">
          <div class="mat-item-name">${esc(row[3])}</div>
          <div class="mat-item-sub">Art.nr ${esc(row[0])} · ${fmtKr(effectivePrice(row))}/${esc(row[2].toLowerCase())}</div>
        </div>
        <button class="mat-fav ${isFav?'on':''}" data-act="toggle-fav" data-artnr="${esc(row[0])}">${isFav?ICON.starFill:ICON.star}</button>
        <div class="stepper">
          <button data-act="bump-qty" data-artnr="${esc(row[0])}" data-delta="-1" data-kind="${kind}" aria-label="Minska">${ICON.minus}</button>
          <span class="qty">${qty}</span>
          <button data-act="bump-qty" data-artnr="${esc(row[0])}" data-delta="1" data-kind="${kind}" aria-label="Öka">${ICON.plusSmall}</button>
        </div>
      </div>`;
  };
})();