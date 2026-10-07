import assert from 'node:assert/strict';
import {lookupGtin,normalizeGtin,verifyProduct} from '../server/barcode-lookup/lookup.mjs';
const gtin='4012195931669',canonical='04012195931669',number='0681600';
assert.equal(normalizeGtin(gtin),canonical);
assert.equal(normalizeGtin(canonical),canonical);
assert.equal(normalizeGtin('4012195931668'),null);
assert.equal(normalizeGtin('../admin'),null);
const html=n=>`<button data-copy-value="${n}"></button><table><tr><th>GTIN</th><td>${gtin}</td></tr></table>`;
assert(verifyProduct(html(number),canonical,number));
assert(!verifyProduct(html('0000001'),canonical,number));
const row=n=>({RSKNummer:n,Name:'Testmaterial',Url:'/lista/test/'+n});
const fixture=rows=>async url=>String(url).includes('/ApiSearch/')
  ? new Response(JSON.stringify({Status:'OK',Data:{SearchResultRows:rows,HitCount:rows.length}}))
  : new Response(html(String(url).split('/').at(-1)));
const match=await lookupGtin(gtin,fixture([row(number)]));
assert.equal(match.eNumber,number);assert.equal(match.gtin,canonical);
assert.equal(await lookupGtin(gtin,fixture([])),null);
await assert.rejects(lookupGtin(gtin,fixture([row(number),row('0000001')])),/ambiguous/);
await assert.rejects(lookupGtin(gtin,async()=>new Response('',{status:503})),/source_unavailable/);
const wrongGtin=async url=>String(url).includes('/ApiSearch/')
  ? new Response(JSON.stringify({Status:'OK',Data:{SearchResultRows:[row(number)],HitCount:1}}))
  : new Response(html(number).replace(gtin,'4012195931668'));
assert.equal(await lookupGtin(gtin,wrongGtin),null,'A search result must not be accepted without an exact published GTIN');
if(process.env.LIRO_LIVE_LOOKUP==='1'){
  const live=await lookupGtin(gtin);assert.equal(live.eNumber,number);console.log('Live public GTIN lookup verified:',live.eNumber);
}
console.log('Barcode lookup: checksum, exact GTIN, exact E-number, ambiguity and upstream failure passed');

