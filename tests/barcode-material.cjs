const assert=require('node:assert/strict');
const fs=require('node:fs');
const {webkit,chromium,devices}=require('playwright');
(async()=>{
  const browser=process.env.LIRO_TEST_EDGE==='1'?await chromium.launch({channel:'msedge'}):await webkit.launch();
  try{
    const context=await browser.newContext({...devices['iPhone 15 Pro'],serviceWorkers:'block'});
    await context.addInitScript(()=>{window.LIRO_BARCODE_ENDPOINT='https://lookup.example.test/functions/v1/barcode-lookup';});
    let requests=0;
    const postedGtins=[];
    const liveHandler=process.env.LIRO_LIVE_LOOKUP==='1'?(await import('../server/barcode-lookup/handler.mjs')).handleRequest:null;
    await context.route('**/functions/v1/barcode-lookup',async route=>{
      requests++;
      const gtin=route.request().postDataJSON().gtin;
      postedGtins.push(gtin);
      if(process.env.LIRO_PUBLISHED_LOOKUP_URL){
        const result=await fetch(process.env.LIRO_PUBLISHED_LOOKUP_URL,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://roggeman081-dotcom.github.io'},body:JSON.stringify({gtin})});
        return route.fulfill({status:result.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await result.text()});
      }
      if(liveHandler){
        const result=await liveHandler(new Request('https://lookup.example.test/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gtin})}));
        return route.fulfill({status:result.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await result.text()});
      }
      return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({match:gtin==='04012195931669'?{gtin:'04012195931669',eNumber:'0681600'}:null})});
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.LIRO_TEST_URL||'http://127.0.0.1:4173/');
    await page.waitForFunction(()=>st.view==='home');
    assert.equal(await page.evaluate(()=>LiRoBarcodeLookup.normalizeGtin('0113606481158175')),'13606481158175');
    const priceData=process.env.LIRO_PRIVATE_PRICE_FILE?JSON.parse(fs.readFileSync(process.env.LIRO_PRIVATE_PRICE_FILE,'utf8')):{format:'lirogo-ahlsell-prices-v1',meta:{priced:1},prices:{'0681600':100}};
    const expectedPrice=Number(priceData.prices['0681600']);
    assert(Number.isFinite(expectedPrice)&&expectedPrice>0,'Test article must have a valid contract price');
    const jobId=await page.evaluate(async priceData=>{
      await LiRoPrice.importPreparedPrices(priceData);
      await ensureCatalog();
      const customer=await createCustomer({name:'Skannertest'});
      const job=await createJob({customerId:customer.id,title:'Rätt uppdrag'});
      await loadJobDetail(job.id);st={view:'job',id:job.id,jobTab:'material',matPanel:true};render();return job.id;
    },priceData);
    assert(await page.evaluate(()=>{st.scannerOpen=true;pushNav();return applyBarcodeV96('4012195931669');}));
    const dialog=page.getByRole('dialog',{name:'Registrera skannat material'});
    await dialog.waitFor();
    assert((await dialog.innerText()).includes('0681600'));
    assert((await dialog.innerText()).includes('Rätt uppdrag'));
    await page.getByRole('textbox',{name:'Antal skannat material'}).fill('0,5');
    await page.getByRole('button',{name:'Lägg till på uppdraget'}).click();
    await dialog.waitFor({state:'detached'});
    let materials=await page.evaluate(()=>dbAll('materials'));
    assert.equal(materials.length,1);assert.equal(materials[0].jobId,jobId);
    assert.equal(materials[0].eNr,'0681600');assert.equal(materials[0].qty,0.5);assert.equal(materials[0].unitPrice,expectedPrice);
    assert.deepEqual(postedGtins,['04012195931669'],'Frontend must send canonical GTIN to lookup endpoint');
    await context.setOffline(true);
    assert(await page.evaluate(()=>{st.scannerOpen=true;pushNav();return applyBarcodeV96('4012195931669');}));
    await dialog.waitFor();await page.getByRole('button',{name:'Lägg till på uppdraget'}).click();
    await dialog.waitFor({state:'detached'});
    materials=await page.evaluate(()=>dbAll('materials'));
    assert.equal(materials.length,1);assert.equal(materials[0].qty,1.5);
    assert.equal(requests,1,'Cached GTIN mapping must work offline without requests');
    assert.equal(await page.evaluate(()=>applyBarcodeV96('9780306406157')),false);
    assert.equal((await page.evaluate(()=>dbAll('materials'))).length,1);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(JSON.stringify({ok:true,livePublicRegister:!!liveHandler,priceSource:process.env.LIRO_PRIVATE_PRICE_FILE?'private contract file':'isolated test price',cameraCaptureTested:false,gtinToEnumber:true,gs1Ai01:true,canonicalLookupRequest:true,correctJob:true,decimalQuantity:true,contractPrice:true,offlineCachedLookup:true,unknownBarcodeNotAdded:true}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
