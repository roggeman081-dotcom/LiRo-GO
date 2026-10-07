import {lookupGtin,normalizeGtin} from './lookup.mjs';
const ORIGIN='https://roggeman081-dotcom.github.io';
const cache=new Map();
const rate=new Map();
export async function handleRequest(req, lookup=lookupGtin){
  const origin=req.headers.get('origin');
  const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Content-Type':'application/json','Vary':'Origin','Cache-Control':'no-store'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin && origin!==ORIGIN) return reply({error:'origin_not_allowed'},403);
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(req.method!=='POST') return reply({error:'method_not_allowed'},405);
  if(Number(req.headers.get('content-length')||0)>256) return reply({error:'request_too_large'},413);
  try{
    const text=await req.text();
    if(text.length>256) return reply({error:'request_too_large'},413);
    const input=JSON.parse(text);
    const gtin=normalizeGtin(input.gtin);
    if(!gtin) return reply({error:'invalid_gtin'},400);
    const now=Date.now();
    const previous=cache.get(gtin);
    if(previous && previous.expires>now) return reply(previous.value);
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    for(const [key,value] of rate) if(value.until<now) rate.delete(key);
    const window=rate.get(ip)||{count:0,until:now+60000};
    if(++window.count>20) return reply({error:'rate_limited'},429);
    if(rate.size>=2000 && !rate.has(ip)) return reply({error:'rate_limited'},429);
    rate.set(ip,window);
    const value={match:await lookup(input.gtin)};
    if(cache.size>=2000) cache.delete(cache.keys().next().value);
    cache.set(gtin,{value,expires:now+(value.match?86400000:300000)});
    return reply(value);
  }catch(error){
    const reason=error.message;
    if(reason==='ambiguous') return reply({error:'ambiguous'},409);
    if(reason==='invalid_gtin' || error instanceof SyntaxError) return reply({error:'invalid_gtin'},400);
    return reply({error:'source_unavailable'},503);
  }
}
