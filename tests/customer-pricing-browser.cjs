const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  http = require('node:http'),
  path = require('node:path');
const { webkit, chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let browser, url;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (/^\/customers-import-\d\.json$/.test(u.pathname)) {
    res.setHeader('Content-Type', 'application/json');
    return res.end('[]');
  }
  const file = path.resolve(
    root,
    '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname))
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (e, b) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.wasm': 'application/wasm'
      }[path.extname(file)] || 'application/octet-stream'
    );
    res.end(b);
  });
});
test.before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = 'http://127.0.0.1:' + server.address().port;
  browser =
    process.env.TEST_EDGE === '1'
      ? await chromium.launch({ channel: 'msedge' })
      : await webkit.launch();
});
test.after(async () => {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
});
async function withApp(fn) {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  await context.addInitScript(() => {
    window.LIRO_RETAIL_FEED_URL = './retail-prices.json';
    localStorage.setItem('lirogo_customer_import_2026_10_03_v1', 'done');
  });
  await context.route('**/*', (r) =>
    new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()
  );
  const page = await context.newPage();
  try {
    await page.goto(url);
    await page.waitForFunction(() => st.view === 'home' && window.LiRoMaterialPricing);
    await page.evaluate(() => LiRoPrice.ready);
    return await fn(page, context);
  } finally {
    await context.close();
  }
}
test('new rows inherit customer markup while existing rows keep their sale price', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      await LiRoMaterialPricing.applyGlobal(15);
      const c = await createCustomer({ name: 'Kund A' });
      const j = await createJob({ customerId: c.id, title: 'Uppdrag A' });
      await addMaterial(j.id, { name: 'Första', unitPrice: 100, qty: 2 });
      await LiRoMaterialPricing.setCustomer(c.id, 25);
      await addMaterial(j.id, { name: 'Andra', unitPrice: 100, qty: 1 });
      const rows = await dbByJob('materials', j.id);
      return {
        mode: j.markupMode,
        source: LiRoMaterialPricing.forJob(j).source,
        percent: rows.map((m) => m.markupPercent),
        total: calculateMaterialTotals(rows, j.markupPercent).total,
        customer: (await dbAll('customers'))[0].materialMarkupPercent
      };
    });
    assert.equal(out.mode, 'inherit');
    assert.equal(out.source, 'customer');
    assert.deepEqual(out.percent, [15, 25]);
    assert(Math.abs(out.total - 355) < 0.001);
    assert.equal(out.customer, 25);
  }));
test('project override freezes legacy rows atomically and never changes customer standard', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Äldre kund' });
      await LiRoMaterialPricing.setCustomer(c.id, 35);
      const j = await createJob({ customerId: c.id, title: 'Äldre jobb' });
      delete j.markupMode;
      j.markupPercent = 15;
      await dbPut('jobs', j);
      await dbPut('materials', {
        id: 'legacy-row',
        jobId: j.id,
        qty: 2,
        unitPrice: 100,
        name: 'Äldre rad'
      });
      await LiRoMaterialPricing.setJob(j.id, 40);
      const old = (await dbByJob('materials', j.id))[0];
      await addMaterial(j.id, { name: 'Ny rad', qty: 1, unitPrice: 100 });
      const rows = await dbByJob('materials', j.id);
      return {
        oldMarkup: old.markupPercent,
        job: LiRoMaterialPricing.forJob(j),
        customer: LiRoMaterialPricing.forCustomer(c),
        total: calculateMaterialTotals(rows, j.markupPercent).total
      };
    });
    assert.equal(out.oldMarkup, 15);
    assert.deepEqual(out.job, { percent: 40, source: 'project' });
    assert.equal(out.customer.percent, 35);
    assert(Math.abs(out.total - 370) < 0.001);
  }));
test('global standard changes only future rows and inherited customers, including zero', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Ärver' }),
        own = await createCustomer({ name: 'Eget nollpåslag' });
      await LiRoMaterialPricing.setCustomer(own.id, 0);
      const j = await createJob({ customerId: c.id, title: 'Ärvande jobb' });
      await addMaterial(j.id, { name: 'Rad', qty: 1, unitPrice: 100 });
      await LiRoMaterialPricing.applyGlobal(30);
      return {
        customer: LiRoMaterialPricing.forCustomer(c),
        own: LiRoMaterialPricing.forCustomer(own),
        job: LiRoMaterialPricing.forJob(j),
        storedRow: (await dbByJob('materials', j.id))[0].markupPercent
      };
    });
    assert.equal(out.customer.percent, 30);
    assert.equal(out.own.percent, 0);
    assert.equal(out.job.percent, 30);
    assert.equal(out.storedRow, 15);
  }));
test('reset project inheritance uses customer value for new rows and preserves prior overrides', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Återställ' });
      await LiRoMaterialPricing.setCustomer(c.id, 10);
      const j = await createJob({ customerId: c.id, title: 'Återställ jobb' });
      await LiRoMaterialPricing.setJob(j.id, 50);
      await addMaterial(j.id, { name: 'Undantag', qty: 1, unitPrice: 100 });
      await LiRoMaterialPricing.setJob(j.id, null);
      await addMaterial(j.id, { name: 'Ärvt', qty: 1, unitPrice: 100 });
      await LiRoMaterialPricing.setCustomer(c.id, null);
      const rows = await dbByJob('materials', j.id);
      return {
        mode: j.markupMode,
        percent: rows.map((m) => m.markupPercent),
        customer: LiRoMaterialPricing.forCustomer(c),
        total: calculateMaterialTotals(rows, j.markupPercent).total
      };
    });
    assert.equal(out.mode, 'inherit');
    assert.deepEqual(out.percent, [50, 10]);
    assert.equal(out.customer.source, 'global');
    assert.equal(out.total, 260);
  }));
test('same catalog article after markup or buying-price change creates a separate price row', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 100 }
      });
      const c = await createCustomer({ name: 'Katalogkund' }),
        j = await createJob({ customerId: c.id, title: 'Katalogjobb' });
      await loadJobDetail(j.id);
      const article = ['0000220', 0, 'st', 'Testartikel'];
      await bumpMaterialQty(j.id, article, 1, 'used');
      await LiRoMaterialPricing.setCustomer(c.id, 25);
      await bumpMaterialQty(j.id, article, 1, 'used');
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 200 }
      });
      await bumpMaterialQty(j.id, article, 1, 'used');
      const rows = await dbByJob('materials', j.id);
      return {
        rows: rows.map((m) => ({ qty: m.qty, buy: m.unitPrice, pct: m.markupPercent })),
        total: calculateMaterialTotals(rows, j.markupPercent).total
      };
    });
    assert.equal(out.rows.length, 3);
    assert.deepEqual(
      out.rows.map((m) => m.pct),
      [15, 25, 25]
    );
    assert.deepEqual(
      out.rows.map((m) => m.buy),
      [100, 100, 200]
    );
    assert.equal(out.total, 490);
  }));
test('missing purchase price may be resolved once without changing its saved markup', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Saknat pris' }),
        j = await createJob({ customerId: c.id, title: 'Pris saknas' });
      await addMaterial(j.id, { name: 'Artikel', eNr: '0000220', qty: 1 });
      await loadJobDetail(j.id);
      const before = { ...jobMaterials[0] };
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 50 }
      });
      const first = { ...jobMaterials[0] };
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 60 }
      });
      return {
        missing: before.priceMissing,
        first: first.unitPrice,
        after: jobMaterials[0].unitPrice,
        pct: jobMaterials[0].markupPercent
      };
    });
    assert.equal(out.missing, true);
    assert.equal(out.first, 50);
    assert.equal(out.after, 50);
    assert.equal(out.pct, 15);
  }));
test('closed legacy jobs keep their saved buying prices and reject project repricing', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Fakturerad kund' }),
        j = await createJob({ customerId: c.id, title: 'Låst jobb' });
      delete j.markupMode;
      j.markupPercent = 15;
      j.status = 'invoiced';
      await dbPut('jobs', j);
      await dbPut('materials', {
        id: 'closed',
        jobId: j.id,
        eNr: '0000220',
        qty: 1,
        unitPrice: 100,
        name: 'Låst rad'
      });
      await loadJobDetail(j.id);
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 500 }
      });
      await LiRoMaterialPricing.applyGlobal(40);
      await LiRoMaterialPricing.setCustomer(c.id, 80);
      let rejected = false;
      try {
        await LiRoMaterialPricing.setJob(j.id, 90);
      } catch {
        rejected = true;
      }
      return {
        rejected,
        total: materialTotals(j).total,
        buy: jobMaterials[0].unitPrice,
        pct: j.markupPercent
      };
    });
    assert(out.rejected);
    assert.equal(out.buy, 100);
    assert.equal(out.pct, 15);
    assert(Math.abs(out.total - 115) < 0.001);
  }));
test('explicit zero row sale price survives customer global and project changes', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Fri rad' }),
        j = await createJob({ customerId: c.id, title: 'Undantag' });
      await addMaterial(j.id, { name: 'Fri', qty: 1, unitPrice: 100, customerUnitPrice: 0 });
      await LiRoMaterialPricing.setCustomer(c.id, 20);
      await LiRoMaterialPricing.applyGlobal(30);
      await LiRoMaterialPricing.setJob(j.id, 40);
      return calculateMaterialTotals(await dbByJob('materials', j.id), j.markupPercent).total;
    });
    assert.equal(out, 0);
  }));
test('new fields persist after reload without changing database version or stores', () =>
  withApp(async (page) => {
    const id = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Beständig kund', email: 'synthetic@example.test' });
      await LiRoMaterialPricing.setCustomer(c.id, 0);
      const j = await createJob({ customerId: c.id, title: 'Beständigt jobb' });
      await addMaterial(j.id, { name: 'Beständig rad', qty: 1, unitPrice: 100 });
      return j.id;
    });
    await page.reload();
    await page.waitForFunction(() => st.view === 'home');
    const out = await page.evaluate(async (id) => {
      const j = jobById(id),
        c = customerOf(j);
      return {
        version: DB.version,
        stores: Array.from(DB.objectStoreNames),
        customer: LiRoMaterialPricing.forCustomer(c),
        email: c.email,
        job: j.markupMode,
        row: (await dbByJob('materials', id))[0]
      };
    }, id);
    assert.equal(out.version, 5);
    assert.deepEqual(out.stores.sort(), [
      'checklist',
      'customers',
      'inspection',
      'jobs',
      'materials',
      'photos',
      'radar'
    ]);
    assert.equal(out.customer.percent, 0);
    assert.equal(out.email, 'synthetic@example.test');
    assert.equal(out.job, 'inherit');
    assert.equal(out.row.markupPercent, 0);
  }));
test('customer and project save failures leave stored and in-memory values unchanged', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Sparfel' }),
        j = await createJob({ customerId: c.id, title: 'Sparfeljobb' });
      const original = DB.transaction.bind(DB);
      DB.transaction = function (...args) {
        if (args[1] === 'readwrite')
          throw new DOMException('Simulerat skrivfel', 'QuotaExceededError');
        return original(...args);
      };
      let customerRejected = false,
        jobRejected = false;
      try {
        await LiRoMaterialPricing.setCustomer(c.id, 50);
      } catch {
        customerRejected = true;
      }
      try {
        await LiRoMaterialPricing.setJob(j.id, 60);
      } catch {
        jobRejected = true;
      }
      DB.transaction = original;
      return {
        customerRejected,
        jobRejected,
        customer: LiRoMaterialPricing.forCustomer(c).percent,
        job: LiRoMaterialPricing.forJob(j).percent,
        stored: (await dbAll('jobs'))[0].markupPercent
      };
    });
    assert(out.customerRejected && out.jobRejected);
    assert.equal(out.customer, 15);
    assert.equal(out.job, 15);
    assert.equal(out.stored, 15);
  }));
test('older open jobs and backup rows retain stored cost after price-list replacement', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Legacy öppen' }),
        j = await createJob({ customerId: c.id, title: 'Legacy aktiv' });
      delete j.markupMode;
      j.status = 'active';
      j.markupPercent = 15;
      await dbPut('jobs', j);
      await dbPut('materials', {
        id: 'old-open',
        jobId: j.id,
        name: 'Legacy',
        eNr: '0000220',
        unitPrice: 100,
        qty: 1
      });
      await loadJobDetail(j.id);
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 200 }
      });
      return {
        buy: jobMaterials[0].unitPrice,
        total: materialTotals(j).total,
        memory: projectEconomyMemory(j, { materials: jobMaterials }).material.total
      };
    });
    assert.equal(out.buy, 100);
    assert(Math.abs(out.total - 115) < 0.001);
    assert(Math.abs(out.memory - 115) < 0.001);
  }));
test('project context preserves a saved snapshot even when normalized material objects omit flags', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 100 }
      });
      const c = await createCustomer({ name: 'Kontextkund' }),
        j = await createJob({ customerId: c.id, title: 'Kontextjobb' });
      await addMaterial(j.id, { name: 'Kontextrad', eNr: '0000220', qty: 1 });
      await loadJobDetail(j.id);
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 200 }
      });
      return projectEconomyMemory(j, { materials: jobMaterials }).material.total;
    });
    assert(Math.abs(out - 115) < 0.001);
  }));
test('first resolution of a missing cost while opening another job is persisted before rendering', () =>
  withApp(async (page) => {
    const ids = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Vilande kund' }),
        a = await createJob({ customerId: c.id, title: 'Vilande A' }),
        b = await createJob({ customerId: c.id, title: 'Öppet B' });
      await addMaterial(a.id, { name: 'Pris saknas', eNr: '0000220', qty: 1 });
      await loadJobDetail(b.id);
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 50 }
      });
      await loadJobDetail(a.id);
      st = { view: 'job', id: a.id, jobTab: 'material' };
      render();
      const first = jobMaterials[0].unitPrice;
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 60 }
      });
      return { a: a.id, first };
    });
    assert.equal(ids.first, 50);
    await page.reload();
    await page.waitForFunction(() => st.view === 'home');
    const out = await page.evaluate(async (id) => {
      await loadJobDetail(id);
      st = { view: 'job', id, jobTab: 'material' };
      render();
      return {
        memory: jobMaterials[0].unitPrice,
        saved: (await dbByJob('materials', id))[0].unitPrice
      };
    }, ids.a);
    assert.deepEqual(out, { memory: 50, saved: 50 });
  }));
test('quantity edit concurrent with project markup preserves the committed row price and quantity', () =>
  withApp(async (page) => {
    const id = await page.evaluate(async () => {
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 100 }
      });
      const c = await createCustomer({ name: 'Samtidighet' }),
        j = await createJob({ customerId: c.id, title: 'Samtidigt jobb' });
      delete j.markupMode;
      j.markupPercent = 15;
      await dbPut('jobs', j);
      await dbPut('materials', {
        id: 'concurrent-legacy',
        jobId: j.id,
        name: 'Äldre rad',
        eNr: '0000220',
        unit: 'st',
        unitPrice: 100,
        qty: 1
      });
      await loadJobDetail(j.id);
      const project = LiRoMaterialPricing.setJob(j.id, 40);
      const quantity = bumpMaterialQty(j.id, ['0000220', 100, 'st', 'Äldre rad'], 1, 'used');
      await Promise.all([project, quantity]);
      return j.id;
    });
    const before = await page.evaluate(async (id) => {
      const m = (await dbByJob('materials', id))[0];
      return {
        qty: m.qty,
        pct: m.markupPercent,
        total: calculateMaterialTotals([m], jobById(id).markupPercent).total
      };
    }, id);
    assert.deepEqual(before, { qty: 2, pct: 15, total: 229.99999999999997 });
    await page.reload();
    await page.waitForFunction(() => st.view === 'home');
    const after = await page.evaluate(async (id) => {
      await loadJobDetail(id);
      return {
        qty: jobMaterials[0].qty,
        pct: jobMaterials[0].markupPercent,
        total: materialTotals(jobById(id)).total
      };
    }, id);
    assert.equal(after.qty, 2);
    assert.equal(after.pct, 15);
    assert(Math.abs(after.total - 230) < 0.001);
  }));
test('Mer opens and closes without leaving a freshly loaded app', () =>
  withApp(async (page) => {
    await page.locator('.workflow-tools [data-act="open-settings"]').click();
    await page.locator('[data-act="close-settings"]').first().click();
    await page.waitForTimeout(150);
    assert(page.url().startsWith(url));
    assert(await page.evaluate(() => typeof settingsOpen !== 'undefined' && !settingsOpen));
  }));
test('Radar opens and returns without leaving a freshly loaded app', () =>
  withApp(async (page) => {
    await page.locator('.workflow-tools [data-act="open-radar"]').click();
    await page.locator('[data-act="radar-back"]').first().click();
    await page.waitForTimeout(150);
    assert(page.url().startsWith(url));
    assert.equal(await page.evaluate(() => st.view), 'home');
  }));
test('customer job navigation returns to the customer card and preserves the list search', () =>
  withApp(async (page) => {
    const id = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Returkund' });
      await createJob({ customerId: c.id, title: 'Returkundens jobb' });
      return c.id;
    });
    await page.locator('.bottomnav [data-act="nav-customers"]').click();
    await page.getByLabel('Sök kunder', { exact: true }).fill('Retur');
    await page.getByRole('button', { name: 'Returkund', exact: true }).click();
    await page.getByRole('button', { name: /Returkundens jobb/ }).click();
    await page.waitForFunction(() => st.view === 'job');
    await page.locator('[data-act="job-back"]').first().click();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => st.view), 'customer');
    assert.equal(await page.evaluate(() => st.customerId), id);
    await page.goBack();
    await page.waitForFunction(() => st.view === 'customers');
    assert.equal(await page.getByLabel('Sök kunder', { exact: true }).inputValue(), 'Retur');
  }));
test('work and billing lists open the matching workflow stage and return to their origin', () =>
  withApp(async (page) => {
    await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Flödeskund' });
      await createJob({ customerId: c.id, title: 'Aktivt flödesjobb' });
      const done = await createJob({ customerId: c.id, title: 'Klart flödesjobb' });
      done.status = 'done';
      await dbPut('jobs', done);
    });
    await page.locator('.bottomnav [data-act="nav-work"]').click();
    await page.getByRole('button', { name: /Aktivt flödesjobb/ }).click();
    await page.waitForFunction(() => st.view === 'work' || st.view === 'job');
    assert.equal(await page.evaluate(() => st.view), 'work');
    await page.goBack();
    await page.waitForFunction(() => st.view === 'worklist');
    await page.locator('.bottomnav [data-act="nav-billing"]').click();
    await page.getByRole('button', { name: /Klart flödesjobb/ }).click();
    await page.waitForFunction(() => st.view === 'job');
    assert.equal(await page.evaluate(() => st.jobTab), 'faktura');
    await page.locator('[data-act="job-tab-back"]').first().click();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => st.view), 'billing');
  }));
test('material rows show purchase amount markup percent and selling amount with cents excluding VAT', () =>
  withApp(async (page) => {
    const id = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Öreskund' });
      await LiRoMaterialPricing.setCustomer(c.id, 12.5);
      const j = await createJob({ customerId: c.id, title: 'Öresjobb' });
      const m = await addMaterial(j.id, { name: 'Öresmaterial', qty: 2, unitPrice: 100.25 });
      await loadJobDetail(j.id);
      st = { view: 'job', id: j.id, jobTab: 'material' };
      render();
      return m.id;
    });
    const text = await page.locator('.material-row[data-mid="' + id + '"]').innerText();
    assert.match(text, /200,50/);
    assert.match(text, /12,5\s*%/);
    assert.match(text, /225,56/);
    assert.match(await page.locator('.job-body').innerText(), /exklusive moms/);
  }));
test('quantity save failure preserves the last committed in-memory and stored count', () =>
  withApp(async (page) => {
    const out = await page.evaluate(async () => {
      await LiRoPrice.importPreparedPrices({
        format: 'lirogo-ahlsell-prices-v1',
        prices: { '0000220': 100 }
      });
      const c = await createCustomer({ name: 'Antalsfel' }),
        j = await createJob({ customerId: c.id, title: 'Antalsfeljobb' });
      await loadJobDetail(j.id);
      await bumpMaterialQty(j.id, ['0000220', 100, 'st', 'Artikel'], 1, 'used');
      const original = DB.transaction.bind(DB);
      DB.transaction = function (...args) {
        if (args[0] === 'materials' && args[1] === 'readwrite')
          throw new DOMException('Simulerat sparfel', 'QuotaExceededError');
        return original(...args);
      };
      let rejected = false;
      try {
        await bumpMaterialQty(j.id, ['0000220', 100, 'st', 'Artikel'], 1, 'used');
      } catch {
        rejected = true;
      }
      DB.transaction = original;
      return {
        rejected,
        memory: jobMaterials[0].qty,
        saved: (await dbByJob('materials', j.id))[0].qty
      };
    });
    assert.deepEqual(out, { rejected: true, memory: 1, saved: 1 });
  }));
test('a delayed earlier workflow open cannot replace the active job material or photo collections', () =>
  withApp(async (page) => {
    const ids = await page.evaluate(async () => {
      const c = await createCustomer({ name: 'Laddningskund' }),
        a = await createJob({ customerId: c.id, title: 'Långsamt A' }),
        b = await createJob({ customerId: c.id, title: 'Snabbt B' });
      await addMaterial(a.id, { name: 'Material A', unitPrice: 100, qty: 1 });
      await addMaterial(b.id, { name: 'Material B', unitPrice: 300, qty: 1 });
      const original = loadJobDetail;
      const gate = new Promise((resolve) => (window.__releaseOldLoad = resolve));
      loadJobDetail = async function (id, ...args) {
        if (id === a.id) {
          await gate;
          try {
            return await original(id, ...args);
          } finally {
            window.__oldLoadDone = true;
          }
        }
        return original(id, ...args);
      };
      st = { view: 'customer', customerId: c.id };
      render();
      return { a: a.id, b: b.id };
    });
    await page.getByRole('button', { name: /Långsamt A/ }).click();
    await page.getByRole('button', { name: /Snabbt B/ }).click();
    await page.waitForFunction((id) => st.id === id, ids.b);
    await page.evaluate(() => window.__releaseOldLoad());
    await page.waitForFunction(() => window.__oldLoadDone);
    const out = await page.evaluate(() => ({
      active: st.id,
      materials: jobMaterials.map((m) => m.jobId),
      photos: jobPhotos.map((p) => p.jobId)
    }));
    assert.equal(out.active, ids.b);
    assert.deepEqual(out.materials, [ids.b]);
    assert(out.photos.every((id) => id === ids.b));
  }));
test('backup and restore preserve customer inheritance project mode and captured material amounts', () =>
  withApp(async (page) => {
    const ids = await page.evaluate(async () => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      const c = await createCustomer({ name: 'Backupkund', invoiceReference: 'Bevarad referens' }),
        j = await createJob({ customerId: c.id, title: 'Backupjobb' });
      await addMaterial(j.id, { name: 'Backuprad', unitPrice: 100, qty: 1 });
      await LiRoMaterialPricing.setCustomer(c.id, 25);
      return { customer: c.id, job: j.id };
    });
    const pendingDownload = page.waitForEvent('download');
    await page.locator('[data-act="backup-now-v64"]').click();
    const download = await pendingDownload,
      parts = [];
    for await (const chunk of await download.createReadStream()) parts.push(chunk);
    const backup = JSON.parse(Buffer.concat(parts).toString());
    assert.equal(backup.stores.customers[0].materialMarkupPercent, 25);
    assert.equal(backup.stores.jobs[0].markupMode, 'inherit');
    assert.equal(backup.stores.materials[0].markupPercent, 15);
    await page.evaluate(async () => {
      for (const name of [
        'customers',
        'jobs',
        'materials',
        'photos',
        'checklist',
        'inspection',
        'radar'
      ])
        await tx(name, 'readwrite', (s) => s.clear());
    });
    page.once('dialog', (d) => d.accept());
    const chooser = page.waitForEvent('filechooser'),
      reloaded = page.waitForEvent('load');
    await page.locator('[data-act="restore-backup-v64"]').click();
    await (
      await chooser
    ).setFiles({
      name: 'synthetic-customer-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup))
    });
    await reloaded;
    await page.waitForFunction(() => st.view === 'home');
    const out = await page.evaluate(async (ids) => {
      const c = customers.find((c) => c.id === ids.customer),
        j = jobById(ids.job);
      await loadJobDetail(j.id);
      return {
        customer: LiRoMaterialPricing.forCustomer(c),
        mode: j.markupMode,
        reference: c.invoiceReference,
        total: materialTotals(j).total
      };
    }, ids);
    assert.equal(out.customer.percent, 25);
    assert.equal(out.mode, 'inherit');
    assert.equal(out.reference, 'Bevarad referens');
    assert(Math.abs(out.total - 115) < 0.001);
  }));
