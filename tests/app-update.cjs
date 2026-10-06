const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {webkit,devices}=require('playwright');
const root=path.resolve(__dirname,'..');
let upgraded=false;
const sockets=new Set();
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/slow-export.js') return; // optional library never responds
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,bytes)=>{
    if(err){res.writeHead(404);return res.end();}
    if(name==='/sw.js'){
      let source=bytes.toString().replace(/const EXPORT_LIBS = \[[\s\S]*?\];/,
        "const EXPORT_LIBS = ['./slow-export.js'];");
      if(upgraded) source=source.replace(/const CACHE = 'lirogo-v\d+'/,"const CACHE = 'lirogo-v999'");
      bytes=Buffer.from(source);
    }
    res.setHeader('Cache-Control','no-store');
    const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.wasm':'application/wasm'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(bytes);
  });
});
server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await webkit.launch();
  try{
    const context=await browser.newContext({...devices['iPhone 15 Pro']});
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:15000});
    await page.evaluate(async()=>{
      await createCustomer({name:'Bevara kund vid uppdatering'});
      await LiRoPrice.importPreparedPrices({format:'lirogo-ahlsell-prices-v1',prices:{'0000220':12.34}});
    });
    upgraded=true;
    await page.evaluate(()=>checkAppUpdate(true));
    await page.locator('#liro-app-update').waitFor({state:'visible',timeout:15000});
    await page.locator('#liro-app-update').click();
    await page.waitForFunction(()=>!document.getElementById('liro-app-update'));
    await page.evaluate(()=>LiRoPrice.ready);
    assert.equal(await page.evaluate(()=>LiRoPrice.resolveByArt('220')),12.34);
    assert(await page.evaluate(async()=>(await dbAll('customers')).some(c=>c.name==='Bevara kund vid uppdatering')));
    assert((await page.evaluate(()=>caches.keys())).includes('lirogo-v999'));
    console.log(JSON.stringify({ok:true,upgrade:true,stalledOptionalLibrary:true,pricesPreserved:true,customersPreserved:true}));
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{for(const socket of sockets) socket.destroy();server.close();});
