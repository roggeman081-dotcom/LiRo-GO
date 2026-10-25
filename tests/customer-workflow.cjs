const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  http = require('node:http'),
  path = require('node:path');
const { webkit, chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const n = new URL(req.url, 'http://localhost').pathname;
  const f = path.resolve(root, '.' + (n === '/' ? '/index.html' : n));
  if (!f.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(f, (e, d) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      'Content-Type',
      { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' }[
        path.extname(f)
      ] || 'application/octet-stream'
    );
    res.end(d);
  });
});
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser =
    process.env.TEST_EDGE === '1'
      ? await chromium.launch({ channel: 'msedge' })
      : await webkit.launch();
  try {
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        serviceWorkers: 'block'
      });
      await context.addInitScript(() => {
        window.LIRO_RETAIL_FEED_URL = './retail-prices.json';
        localStorage.setItem('lirogo_customer_import_2026_10_03_v1', 'done');
      });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
      );
      const page = await context.newPage();
      await page.goto(origin);
      await page.waitForFunction(() => typeof st !== 'undefined' && st.view === 'home');
      assert.equal(
        await page.locator('.bottomnav [data-act="nav-customers"]').count(),
        1,
        'Kunder is the first main navigation destination'
      );
      assert.deepEqual(await page.locator('.bottomnav .bn-tab span').allTextContents(), [
        'Kunder',
        'Uppdrag',
        'Arbete',
        'Fakturaunderlag'
      ]);
      const ids = await page.evaluate(async () => {
        await LiRoPrice.ready;
        const c = await createCustomer({
          name: 'Befintlig Testkund',
          phone: '0701234567',
          email: 'synthetic@example.invalid',
          address: 'Testgatan 1',
          orgNumber: 'SYNTHETIC',
          invoiceReference: 'Bevara referens'
        });
        const j = await createJob({ customerId: c.id, title: 'Testkundens installation' });
        return { customer: c.id, job: j.id };
      });
      const nav = (a) => page.locator('.bottomnav [data-act="' + a + '"]');
      await nav('nav-customers').click();
      await page.getByLabel('Sök kunder', { exact: true }).fill('Befintlig');
      await page.getByRole('button', { name: /Befintlig Testkund/ }).click();
      assert.equal(await page.evaluate(() => st.customerId), ids.customer);
      assert.equal(await page.getByText('synthetic@example.invalid', { exact: true }).count(), 1);
      assert.equal(await page.getByRole('button', { name: /Testkundens installation/ }).count(), 1);
      await page.getByRole('button', { name: 'Ändra', exact: true }).click();
      await page.getByLabel('Kundens materialpåslag', { exact: true }).fill('0');
      await page.getByRole('button', { name: 'Spara kundpåslag', exact: true }).click();
      await page.waitForFunction(
        (id) => LiRoMaterialPricing.forCustomer(id).source === 'customer',
        ids.customer
      );
      assert.equal(
        await page.evaluate((id) => LiRoMaterialPricing.forCustomer(id).percent, ids.customer),
        0
      );
      assert.match(await page.locator('[data-customer-markup-summary]').innerText(), /0\s*%/);
      await page.getByRole('button', { name: 'Ändra', exact: true }).click();
      await page.getByRole('button', { name: 'Använd global standard', exact: true }).click();
      await page.waitForFunction(
        (id) => LiRoMaterialPricing.forCustomer(id).source === 'global',
        ids.customer
      );
      assert.deepEqual(
        await page.evaluate(async (id) => {
          const c = (await dbAll('customers')).find((c) => c.id === id);
          return [c.orgNumber, c.invoiceReference];
        }, ids.customer),
        ['SYNTHETIC', 'Bevara referens']
      );
      await nav('nav-customers').click();
      await page.getByLabel('Generellt materialpåslag', { exact: true }).fill('23');
      await page.getByRole('button', { name: 'Spara generellt påslag', exact: true }).click();
      await page.waitForFunction(() => getGlobalPriceDefaults().markupPercent === 23);
      await page.getByRole('button', { name: 'Ny kund', exact: true }).click();
      await page.getByRole('button', { name: 'Spara kund', exact: true }).click();
      assert.equal(await page.evaluate(() => st.view), 'customer-new');
      await page.getByLabel('Namn', { exact: true }).fill('Ny syntetisk kund');
      await page.getByLabel('Telefon', { exact: true }).fill('0701112233');
      await page.getByLabel('Adress', { exact: true }).fill('Nygatan 2');
      await page.getByLabel('E-post', { exact: true }).fill('new@example.invalid');
      await page.getByRole('button', { name: 'Spara kund', exact: true }).click();
      await page.waitForFunction(() => st.view === 'customer');
      assert.match(await page.locator('[data-customer-markup-summary]').innerText(), /23\s*%/);
      await nav('nav-work').click();
      assert.equal(await page.evaluate(() => st.view), 'worklist');
      await nav('nav-billing').click();
      assert.equal(await page.evaluate(() => st.view), 'billing');
      await nav('nav-projects').click();
      assert.equal(await page.evaluate(() => st.view), 'projects');
      await page.getByRole('button', { name: 'Planerat', exact: true }).click();
      assert.equal(await page.evaluate(() => st.view), 'home');
      assert.equal(
        await page.locator('[data-customer-material-markup],[data-global-material-markup]').count(),
        0
      );
      await page.getByRole('button', { name: 'Radar', exact: true }).click();
      assert.equal(await page.evaluate(() => st.view), 'radar');
      await nav('nav-customers').click();
      if (width < 900) {
        const overlap = await page.evaluate(() => {
          const nav = document.querySelector('.bottomnav').getBoundingClientRect(),
            tools = document.querySelector('.workflow-tools').getBoundingClientRect();
          return { navTop: nav.top, toolsBottom: tools.bottom };
        });
        assert(
          overlap.toolsBottom <= overlap.navTop + 1,
          'Secondary tools must not be covered by main navigation: ' + JSON.stringify(overlap)
        );
      }
      const sizes = await page
        .locator('.bottomnav .bn-tab,.customer-workflow button,.workflow-tools button')
        .evaluateAll((nodes) =>
          nodes
            .filter((n) => n.getClientRects().length)
            .map((n) => {
              const r = n.getBoundingClientRect();
              return {
                text: n.textContent.trim(),
                width: r.width,
                height: r.height,
                left: r.left,
                right: r.right
              };
            })
        );
      assert(
        sizes.every((s) => s.width >= 44 && s.height >= 44 && s.left >= 0 && s.right <= width + 1),
        '44px controls fit ' + JSON.stringify(sizes)
      );
      assert(
        await page
          .locator('.customer-workflow input')
          .evaluateAll((nodes) =>
            nodes.every((n) => parseFloat(getComputedStyle(n).fontSize) >= 16)
          )
      );
      await page.evaluate(async (ids) => {
        await loadJobDetail(ids.job);
        st = { view: 'job', id: ids.job, jobTab: 'priser' };
        render();
      }, ids);
      assert.match(await page.locator('[data-job-markup-summary]').innerText(), /23\s*%/);
      await page.getByLabel('Materialpåslag för uppdraget', { exact: true }).fill('31');
      await page.getByRole('button', { name: 'Spara uppdragspåslag', exact: true }).click();
      await page.waitForFunction(
        (id) => LiRoMaterialPricing.forJob(jobById(id)).percent === 31,
        ids.job
      );
      await page.getByRole('button', { name: 'Använd kundens påslag', exact: true }).click();
      await page.waitForFunction(
        (id) => LiRoMaterialPricing.forJob(jobById(id)).percent === 23,
        ids.job
      );
      await nav('nav-customers').click();
      await page.getByRole('button', { name: /Befintlig Testkund/ }).click();
      await page.getByRole('button', { name: 'Ändra', exact: true }).click();
      await page.goBack();
      await page.waitForFunction(() => st.view === 'customer' && !st.customerPriceEditing);
      await page.goBack();
      await page.waitForFunction(() => st.view === 'customers');
      const micGuard = await page.evaluate(() => {
        st.dictatingKey = 'test-session';
        const html = document.getElementById('app').innerHTML;
        render();
        const unchanged = html === document.getElementById('app').innerHTML;
        st.dictatingKey = null;
        return unchanged;
      });
      assert(micGuard, 'Rendering is suppressed during dictation');
      fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
      await page.screenshot({
        path: path.join(root, 'test-results/customer-workflow-' + width + '.png'),
        fullPage: true
      });
      console.log('Customer workflow and navigation OK ' + width);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.close());
