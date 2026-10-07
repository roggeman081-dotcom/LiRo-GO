const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await webkit.launch();
  try{
    for(const width of [320,390,1280]){
      const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
      await context.addInitScript(()=>{window.LIRO_RETAIL_FEED_URL='./retail-prices.json';localStorage.setItem('lirogo_customer_import_2026_10_03_v1','done');});
      const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:'+server.address().port);
      await page.waitForFunction(()=>typeof st!=='undefined'&&st.view==='home'&&window.LiRoMaterialMarkup);
      const ids=await page.evaluate(async()=>{
        await LiRoPrice.ready;
        const c=await createCustomer({name:'Markup test'});
        const j=await createJob({customerId:c.id,title:'Open markup test'});
        const other=await createJob({customerId:c.id,title:'Other open'});
        const closed=await createJob({customerId:c.id,title:'Finished'});closed.status='invoiced';await dbPut('jobs',closed);
        const a=await addMaterial(j.id,{name:'First',unit:'st',unitPrice:100,qty:2});
        const b=await addMaterial(j.id,{name:'Second',unit:'st',unitPrice:80,qty:1});
        await addMaterial(j.id,{name:'Planned',unit:'st',unitPrice:20,qty:2,kind:'planned'});
        jobs=await dbAll('jobs');await loadJobDetail(j.id);st={view:'job',id:j.id,jobTab:'material'};settingsOpen=true;st.settingsTab='material';render();
        return {job:j.id,other:other.id,closed:closed.id,a:a.id,b:b.id,customer:c.id};
      });
      await page.getByLabel('Generellt materialpåslag',{exact:true}).fill('25');
      await page.getByRole('button',{name:'Spara generellt påslag',exact:true}).click();
      await page.waitForFunction(()=>getGlobalPriceDefaults().markupPercent===25);
      const general=await page.evaluate(async ids=>{
        const rows=await dbAll('jobs');const future=await createJob({customerId:ids.customer,title:'Future'});
        return [rows.find(j=>j.id===ids.job).markupPercent,rows.find(j=>j.id===ids.other).markupPercent,rows.find(j=>j.id===ids.closed).markupPercent,future.markupPercent];
      },ids);
      assert.deepEqual(general,[25,25,15,25]);
      await page.evaluate(()=>{settingsOpen=false;st.settingsTab=null;render();});
      const row=id=>page.locator('.material-row[data-mid="'+id+'"]');
      await row(ids.a).getByRole('button',{name:'Ändra pris',exact:true}).click();
      await page.getByLabel('Artikelpris eller påslag').fill('50');
      await page.locator('.material-price-dialog').getByRole('button',{name:'Spara',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.material-price-dialog'));
      await row(ids.b).getByRole('button',{name:'Ändra pris',exact:true}).click();
      await page.getByLabel('Ändra som',{exact:true}).selectOption('price');
      await page.getByLabel('Artikelpris eller påslag').fill('70');
      await page.locator('.material-price-dialog').getByRole('button',{name:'Spara',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.material-price-dialog'));
      assert.equal(await page.evaluate(()=>materialTotals(jobById(st.id)).total),370);
      await page.getByLabel('Generellt påslag för uppdraget',{exact:true}).fill('30');
      assert.equal(await page.evaluate(()=>materialTotals(jobById(st.id)).total),370,'Article exceptions survive a general change');
      assert.equal(await page.evaluate(()=>quoteMaterialTotals(jobById(st.id)).total),52,'Planned materials follow general markup');
      await page.evaluate(async()=>{await LiRoMaterialMarkup.applyGeneral(40);render();});
      assert.equal(await page.evaluate(()=>materialTotals(jobById(st.id)).total),370);
      await row(ids.a).getByRole('button',{name:'Ändra pris',exact:true}).click();
      await page.getByRole('button',{name:'Återställ till generellt påslag',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.material-price-dialog'));
      assert.equal(await page.evaluate(()=>materialTotals(jobById(st.id)).total),350);
      await page.reload();await page.evaluate(()=>LiRoPrice.ready);
      await page.evaluate(async ids=>{await loadJobDetail(ids.job);st={view:'job',id:ids.job,jobTab:'material'};render();},ids);
      assert.equal(await page.evaluate(()=>materialTotals(jobById(st.id)).total),350,'Prices survive reload');
      const saved=await page.evaluate(async ids=>{const rows=await dbAll('materials');return [rows.find(m=>m.id===ids.a).markupPercent??null,rows.find(m=>m.id===ids.b).customerUnitPrice];},ids);
      assert.deepEqual(saved,[null,70]);
      await row(ids.b).getByRole('button',{name:'Ändra pris',exact:true}).click();
      await page.getByLabel('Artikelpris eller påslag').fill('-1');
      await page.locator('.material-price-dialog').getByRole('button',{name:'Spara',exact:true}).click();
      assert.equal(await page.locator('.material-price-dialog').count(),1,'Negative prices rejected');
      await page.getByLabel('Artikelpris eller påslag').fill('0');
      await page.locator('.material-price-dialog').getByRole('button',{name:'Spara',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.material-price-dialog'));
      assert.equal(await page.evaluate(()=>materialTotals(jobById(st.id)).total),280,'Explicit zero selling price supported');
      const bounds=await row(ids.a).getByRole('button',{name:'Ändra pris',exact:true}).boundingBox();
      assert(bounds.x>=0&&bounds.x+bounds.width<=width,'Edit button fits viewport');
      assert.deepEqual(errors,[]);
      console.log('Markup flow OK at '+width+'px: general, future jobs, article exceptions, totals, planned, reset, persistence and validation');
      await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
