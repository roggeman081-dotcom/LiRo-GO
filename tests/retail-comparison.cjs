const assert = require('node:assert/strict');
const { webkit } = require('playwright');

(async () => {
  const browser = await webkit.launch();
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      // Daily bot commits do not trigger Pages. The app reads the latest main feed directly.
      await page.route('https://raw.githubusercontent.com/**',route=>route.abort());
      await page.route('http://liro.test/retail-prices.json',route=>route.fulfill({json:{version:1,items:{}}}));
      await page.route('http://liro.test/', route => route.fulfill({
        contentType: 'text/html',
        body: `<style>
          .material-row{display:flex;align-items:center;gap:10px}
          .material-info{flex:1}
          .material-cols{display:flex;gap:16px;text-align:right}
        </style><div id="app"></div><script>
          let jobMaterials=[{id:'m1',eNr:'1234567',name:'Testartikel',qty:2,unit:'st'}];
          window.vJobMaterial=()=>'<div class="material-row" data-myprice="100" data-mid="m1"><div class="material-info">Testartikel</div><div class="material-cols"><div>Inköp 100 kr</div><div>Påslag 20 kr</div><div class="mat-customer-val">120 kr</div></div><button>Ta bort</button></div>';
        </script>`
      }));
      await page.goto('http://liro.test/');
      await page.addScriptTag({ path: 'retail-comparison-v128.js' });
      await page.evaluate(() => document.querySelector('#app').innerHTML = vJobMaterial({}));
      const button = page.locator('[data-retail-v128]');
      await button.waitFor({ state: 'visible' });
      assert.equal(await button.innerText(), 'Saknas');
      await button.click();
      await page.locator('input[name="Hornbach"]').fill('90');
      await page.getByText('Spara', { exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-retail-v128]').dataset.state === 'red');
      assert.match(await button.innerText(), /50 %/);
      const bounds = await button.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width, 'Indicator fits the viewport');
      if (width < 900) assert(bounds.height >= 44, 'Mobile touch target');
      await button.click();
      await page.locator('input[name="Hornbach"]').fill('50');
      await page.getByText('Spara', { exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-retail-v128]').dataset.state === 'green');
      await page.reload();
      await page.addScriptTag({ path: 'retail-comparison-v128.js' });
      await page.evaluate(() => document.querySelector('#app').innerHTML = vJobMaterial({}));
      await page.waitForFunction(() => document.querySelector('[data-retail-v128]').dataset.state === 'green');
      console.log('Retail comparison OK at ' + width + 'px: visibility, red/green, percentage, editing and persistence');
      // A shared exact price must appear without any manual price entry.
      const checkedAt=new Date().toISOString();
      const offer={unit:'frp',packageSize:100,priceExVat:79.2,checkedAt,url:'https://www.elbutik.se/product.html/schneider-tc-clips'};
      const feed={version:1,items:{'1234567':{offers:{Elbutiken:{...offer,unit:'st',packageSize:1,priceExVat:90}}}}};
      await page.unroute('https://raw.githubusercontent.com/**');
      await page.route('https://raw.githubusercontent.com/**',route=>route.fulfill({json:feed}));
      await page.evaluate(()=>localStorage.clear());
      await page.unroute('http://liro.test/retail-prices.json');
      await page.route('http://liro.test/retail-prices.json',route=>route.fulfill({json:feed}));
      await page.reload();
      await page.addScriptTag({path:'retail-comparison-v128.js'});
      await page.evaluate(async()=>{await LiRoRetailComparison.ready;document.querySelector('#app').innerHTML=vJobMaterial({});});
      await page.waitForFunction(()=>document.querySelector('[data-retail-v128]').dataset.state==='red');
      assert.match(await button.innerText(),/50 %/);
      assert.match(await page.locator('.retail-source-v145').innerText(),/1\/3 butiker/);
      await button.click();
      assert.equal(await page.locator('input[name="Elbutiken"]').inputValue(),'90');
      assert.equal(await page.locator('a', {hasText:'Visa produkt'}).getAttribute('href'),offer.url);
      await page.getByText('Stäng',{exact:true}).click();
      const conversions=await page.evaluate(offer=>{
        const f=LiRoRetailComparison.automaticOffer;
        return [f(offer,'frp'),f(offer,'st'),f(offer,'m'),f({...offer,checkedAt:new Date(Date.now()-8*86400000).toISOString()},'frp')];
      },offer);
      assert.deepEqual(conversions,[79.2,0.792,null,null]);
      await page.unroute('http://liro.test/retail-prices.json');
      await page.route('http://liro.test/retail-prices.json',route=>route.abort());
      await page.unroute('https://raw.githubusercontent.com/**');
      await page.route('https://raw.githubusercontent.com/**',route=>route.abort());
      await page.reload();
      await page.addScriptTag({path:'retail-comparison-v128.js'});
      await page.evaluate(async()=>{await LiRoRetailComparison.ready;document.querySelector('#app').innerHTML=vJobMaterial({});});
      await page.waitForFunction(()=>document.querySelector('[data-retail-v128]').dataset.state==='red');
      console.log('Automatic retail feed OK: exact article, source, expiry, pack conversion and offline cache');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

