// Public, on-demand product lookups. Never download or enumerate the register.
const SITE='https://www.e-nummersok.se';
export function normalizeGtin(value){
  const raw=String(value||'').trim();
  let digits=raw.replace(/[\s-]+/g,'');
  const gs1=digits.match(/^\(01\)(\d{14})/)||digits.match(/^01(\d{14})/);
  if(gs1) digits=gs1[1];
  if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return null;
  let sum=0;
  for(let i=digits.length-2,weight=3;i>=0;i--,weight=weight===3?1:3) sum+=Number(digits[i])*weight;
  if((10-sum%10)%10!==Number(digits.at(-1))) return null;
  return digits.padStart(14,'0');
}
function clean(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
export function verifyProduct(html,gtin,number){
  const enumber=html.match(/data-copy-value="(\d{7})"/)?.[1];
  if(enumber!==number) return false;
  const fields=[...html.matchAll(/<th[^>]*>\s*GTIN\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)];
  return fields.some(field=>normalizeGtin(clean(field[1]))===gtin);
}
export async function lookupGtin(raw,fetcher=fetch){
  const gtin=normalizeGtin(raw);
  if(!gtin) throw new Error('invalid_gtin');
  const matches=new Map();
  const queries=[...new Set([String(raw),gtin.replace(/^0+/, '')])];
  for(const query of queries){
    const response=await fetcher(SITE+'/ApiSearch/Search/',{
      method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({Query:query,ActiveOnly:false,PicsOnly:false,Filter:{},Sort:{SelectedSort:0},Pagination:{Page:1}}),
      signal:AbortSignal.timeout(10000)
    });
    if(!response.ok) throw new Error('source_unavailable');
    const result=await response.json();
    if(result.Status!=='OK' || !Array.isArray(result.Data?.SearchResultRows)) throw new Error('source_unavailable');
    const rows=result.Data.SearchResultRows;
    if(rows.length>5 || Number(result.Data.HitCount)>5) throw new Error('ambiguous');
    for(const row of rows){
      const number=String(row.RSKNummer||'').replace(/\s/g,'');
      if(!/^\d{7}$/.test(number) || !String(row.Url).startsWith('/lista/')) continue;
      const url=new URL(row.Url,SITE);
      if(url.origin!==SITE) continue;
      const detail=await fetcher(url.href,{signal:AbortSignal.timeout(10000)});
      if(!detail.ok) throw new Error('source_unavailable');
      if(!verifyProduct(await detail.text(),gtin,number)) continue;
      matches.set(number,{gtin,eNumber:number,name:clean(row.Name),sourceUrl:url.href});
    }
    if(matches.size) break;
  }
  if(matches.size>1) throw new Error('ambiguous');
  return matches.values().next().value||null;
}
