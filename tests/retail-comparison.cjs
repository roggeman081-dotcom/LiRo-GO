const assert = require('node:assert/strict');
const { webkit } = require('playwright');

(async () => {
  const browser = await webkit.launch();
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
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
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
