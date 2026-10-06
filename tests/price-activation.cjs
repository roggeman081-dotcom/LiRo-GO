const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
const {webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..');
const data=process.env.LIRO_TEST_PRICE_FILE
  ? JSON.parse(fs.readFileSync(process.env.LIRO_TEST_PRICE_FILE,'utf8'))
  : {format:'lirogo-ahlsell-prices-v1',meta:{priced:3},prices:{'0000220':12.34,'1234567':56.78,'0603023K':9.87}};
const key=crypto.randomBytes(32),iv=crypto.randomBytes(12);
const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
const encrypted=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final(),cipher.getAuthTag()]);
const bundle=JSON.stringify({format:'lirogo-encrypted-prices-v1',iv:iv.toString('base64url'),ciphertext:encrypted.toString('base64url')});
let bundleRequests=0;
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/ahlsell-prices.enc.json'){bundleRequests++;res.setHeader('Content-Type','application/json');return res.end(bundle);}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,bytes)=>{
    if(err){res.writeHead(404);return res.end();}
    const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.png':'image/png'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);
  });
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const chromiumTest=process.env.LIRO_TEST_BROWSER==='chromium';
  const browser=chromiumTest?await chromium.launch({channel:'msedge'}):await webkit.launch();
  try{
    const context=await browser.newContext({...devices['iPhone 15 Pro']});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const expected=data.prices['0000220'];
    await page.goto(url+'#price-key='+key.toString('base64url'));
    await page.locator('[data-price-activation="complete"]').waitFor({timeout:30000});
    assert(!page.url().includes('price-key'),'Activation secret must be removed from the address');
    assert.equal(await page.evaluate(()=>LiRoPrice.contractCount()),Object.keys(data.prices).length);
    await page.getByRole('button',{name:'Börja arbeta',exact:true}).click();
    await page.waitForFunction(()=>st.view==='home');
    const first=await page.evaluate(async()=>{
      const c=await createCustomer({name:'Pristest'});
      const j=await createJob({customerId:c.id,title:'Pristest',siteAddress:'Testgatan 1'});
      const m=await addMaterial(j.id,{eNr:'220',name:'Testmaterial',qty:'2,5',unit:'m',unitPrice:999});
      await loadJobDetail(j.id);
      st={view:'job',id:j.id,jobTab:'material'};render();
      return {id:j.id,m,totals:calculateMaterialTotals([m],0)};
    });
    assert.equal(first.m.unitPrice,expected);
    assert.equal(first.m.qty,2.5);
    assert.equal(first.totals.cost,expected*2.5);
    assert.equal(await page.evaluate(()=>effectivePrice(['0000220',999,'M','Test'])),expected);
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await page.reload();
    await page.evaluate(()=>LiRoPrice.ready);
    const before=bundleRequests;
    await context.setOffline(true);
    if(chromiumTest) await page.reload();
    const offline=await page.evaluate(async()=>{
      await LiRoPrice.ready;
      const j=(await dbAll('jobs')).find(j=>j.title==='Pristest');
      const m=await addMaterial(j.id,{eNr:'220',name:'Offline',qty:'0,5',unit:'m',unitPrice:999});
      return {price:LiRoPrice.resolveByArt('220'),m,count:LiRoPrice.contractCount()};
    });
    assert.equal(offline.price,expected);
    assert.equal(offline.m.unitPrice,expected);
    assert.equal(offline.m.qty,0.5);
    assert.equal(bundleRequests,before,'Normal reopening must never fetch the price bundle');
    await context.setOffline(false);
    // Invalid activation must preserve the complete, previously committed list.
    await page.goto(url+'#price-key='+crypto.randomBytes(32).toString('base64url'));
    await page.locator('[data-price-activation="error"]').waitFor();
    assert.equal(await page.evaluate(()=>LiRoPrice.resolveByArt('220')),expected);
    await page.getByRole('button',{name:'Stäng',exact:true}).click();
    const rejected=await page.evaluate(async()=>{
      const count=LiRoPrice.contractCount();
      let failed=false;
      try{await LiRoPrice.importPreparedPrices({format:'lirogo-ahlsell-prices-v1',prices:{'1234567':-1}});}catch{failed=true;}
      const rows=[{eNr:'99999999999999999999',unitPrice:999,priceMissing:false}];
      LiRoPrice.syncRows(rows);
      return {failed,countAfter:LiRoPrice.contractCount(),count,row:rows[0]};
    });
    assert(rejected.failed);assert.equal(rejected.countAfter,rejected.count);
    assert.equal(rejected.row.unitPrice,0);assert.equal(rejected.row.priceMissing,true);
    await page.evaluate(()=>{st={view:'home'};settingsOpen=false;render();});
    const downloadPromise=page.waitForEvent('download');
    await page.locator('[data-act="backup-now-v64"]').click();
    const download=await downloadPromise;
    const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(Object.keys(backup.ahlsellPrices.prices).length,Object.keys(data.prices).length);
    assert.equal(backup.ahlsellPrices.prices['0000220'],expected);
    assert.deepEqual(errors,[]);
    await context.close();
    const fresh=await browser.newContext({...devices['iPhone 15 Pro'],serviceWorkers:'block'});
    const newPage=await fresh.newPage();await newPage.goto(url);await newPage.evaluate(()=>LiRoPrice.ready);
    assert.equal(await newPage.evaluate(()=>LiRoPrice.contractCount()),0,'A visitor without the private activation link must not receive prices');
    // Restore the actual ready-made file from inside the installed-app UI.
    await newPage.evaluate(()=>{st={view:'home'};settingsOpen=true;st.settingsTab='material';render();});
    await newPage.locator('[data-ahlsell-file="prepared"]').setInputFiles({name:'lirogo-ahlsell-priser.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    await newPage.waitForFunction(count=>LiRoPrice.contractCount()===count,Object.keys(data.prices).length);
    await newPage.reload();await newPage.evaluate(()=>LiRoPrice.ready);
    assert.equal(await newPage.evaluate(()=>LiRoPrice.resolveByArt('220')),expected);
    const restoredContext=await browser.newContext({...devices['iPhone 15 Pro'],serviceWorkers:'block'});
    const restoredPage=await restoredContext.newPage();
    restoredPage.on('dialog',dialog=>dialog.accept());
    await restoredPage.goto(url);await restoredPage.evaluate(()=>LiRoPrice.ready);
    await restoredPage.evaluate(()=>{st={view:'home'};settingsOpen=false;render();});
    await restoredPage.locator('[data-act="restore-backup-v64"]').click();
    await restoredPage.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await restoredPage.waitForFunction(count=>LiRoPrice.contractCount()===count,Object.keys(data.prices).length);
    assert.equal(await restoredPage.evaluate(()=>LiRoPrice.resolveByArt('220')),expected);
    await restoredContext.close();
    await fresh.close();
    console.log(JSON.stringify({ok:true,articles:Object.keys(data.prices).length,activation:true,material:true,offline:true,persistence:true,invalidActivationPreservesPrices:true,publicVisitorHasNoPrices:true,preparedFileImport:true,backupRestoresPrices:true}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
