import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const decode=s=>s.replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,'"').replace(/&amp;/g,'&');
const meta=(html,key)=>decode(html.match(new RegExp('<meta[^>]*itemprop="'+key+'"[^>]*content="([^"]+)"','i'))?.[1]||'');
const positive=n=>Number.isFinite(Number(n))&&Number(n)>0;
export function parsePage(html,source){
  const rows=[];
  if(source.parser==='elbutik'){
    for(const match of html.matchAll(/<span itemprop="offers"[\s\S]*?<!-- END responsive\/variant\/variant-price.htm -->/g)){
      const block=match[0],eNr=meta(block,'sku'),name=meta(block,'name'),gross=Number(meta(block,'price'));
      if(!/^\d{7}$/.test(eNr)||!name||!positive(gross)||meta(block,'priceCurrency')!=='SEK')continue;
      const size=source.unit==='frp'?Number(name.match(/\((\d+)\s*st\)/i)?.[1]):1;
      if(!positive(size))continue;
      const after=html.slice(match.index+block.length,match.index+block.length+6000);
      const gtin=after.match(/id="barcode_[^"]+">(\d{8,14})<\/span>/)?.[1]||null;
      const exText=block.match(/([\d\s]+,\d{2})\s*kr[\s\S]{0,80}?exkl\. moms/);
      const exVat=exText?Number(exText[1].replace(/\s/g,'').replace(',','.')):gross/1.25;
      if(Math.abs(exVat*1.25-gross)>0.03)continue;
      rows.push({eNr,name,gtin,unit:source.unit,packageSize:size,priceExVat:Math.round(exVat*100)/100});
    }
  }else if(source.parser==='bauhaus'){
    const gtin=meta(html,'gtin');
    const price=Number(html.match(/data-price-amount="([\d.]+)"[\s\S]{0,100}?data-price-type="finalPrice"/)?.[1]);
    if(gtin!==source.gtin||!positive(price))throw new Error('Exact GTIN/price not found');
    if(!html.includes('"amountperpackage":"'+source.packageSize+'"'))throw new Error('Package size not confirmed');
    rows.push({eNr:source.eNr,name:'Schneider TC 8–12 vit 100 st',gtin,unit:source.unit,packageSize:source.packageSize,priceExVat:Math.round(price/1.25*100)/100});
  }else{
    // Only an exact product with an explicit SEK offer is eligible.
    const visit=value=>{
      if(!value||typeof value!=='object')return;
      if(value['@type']==='Product'&&String(value.gtin13||value.gtin||'')===source.gtin){
        const offers=Array.isArray(value.offers)?value.offers:[value.offers];
        for(const offer of offers)if(offer?.priceCurrency==='SEK'&&positive(offer.price))rows.push({eNr:source.eNr,name:value.name,gtin:source.gtin,unit:source.unit,packageSize:source.packageSize,priceExVat:Math.round(Number(offer.price)/1.25*100)/100});
      }
      for(const child of Object.values(value))if(typeof child==='object')visit(child);
    };
    for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi))try{visit(JSON.parse(match[1]));}catch{}
  }
  const unique=new Map();
  for(const row of rows){const old=unique.get(row.eNr);if(old&&old.priceExVat!==row.priceExVat)throw new Error('Conflicting variant prices for '+row.eNr);unique.set(row.eNr,row);}
  if(!unique.size)throw new Error('No exact price offers found');
  return [...unique.values()];
}

async function main(){
  const sources=JSON.parse(await fs.readFile('retail-sources.json','utf8'));
  let previous={version:1,items:{}};try{previous=JSON.parse(await fs.readFile('retail-prices.json','utf8'));}catch{}
  const items=previous.items||{},checkedAt=new Date().toISOString(),results=[];
  for(const source of sources){
    try{
      const response=await fetch(source.url,{signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const charset=response.headers.get('content-type')?.match(/charset=([^;]+)/i)?.[1]||'utf-8';
      const html=new TextDecoder(charset).decode(await response.arrayBuffer());
      const rows=parsePage(html,source);
      for(const row of rows){
        const entry=items[row.eNr]||{name:row.name,offers:{}};
        entry.offers[source.store]={...row,url:source.url,checkedAt};items[row.eNr]=entry;
      }
      results.push({store:source.store,url:source.url,count:rows.length,ok:true});
    }catch(error){results.push({store:source.store,url:source.url,ok:false,error:error.message});}
  }
  const output={version:1,updatedAt:checkedAt,items,checks:results};
  await fs.writeFile('retail-prices.json',JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({articles:Object.keys(items).length,results},null,2));
  if(!results.some(r=>r.ok))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
