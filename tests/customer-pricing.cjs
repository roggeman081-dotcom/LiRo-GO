const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const file = path.join(__dirname, '../customer-pricing-v152.js');
const api = fs.existsSync(file) ? require(file) : {};
test('pricing policy is available without a browser', () =>
  assert.equal(typeof api.resolve, 'function'));
test('customer inherits global standard until an override is set', () => {
  assert.deepEqual(api.customer({}, 25), { percent: 25, source: 'global' });
  assert.deepEqual(api.customer({ materialMarkupPercent: 30 }, 25), {
    percent: 30,
    source: 'customer'
  });
});
test('zero is a valid customer override', () =>
  assert.deepEqual(api.customer({ materialMarkupPercent: 0 }, 25), {
    percent: 0,
    source: 'customer'
  }));
test('customer inheritance resumes when override is absent', () =>
  assert.deepEqual(api.customer({ materialMarkupPercent: null }, 18), {
    percent: 18,
    source: 'global'
  }));
test('new inherited jobs resolve current customer standard', () =>
  assert.deepEqual(
    api.resolve({ markupMode: 'inherit', markupPercent: 15 }, { materialMarkupPercent: 22 }, 10),
    { percent: 22, source: 'customer' }
  ));
test('inherited job without customer uses current global standard', () =>
  assert.deepEqual(api.resolve({ markupMode: 'inherit', markupPercent: 15 }, null, 12), {
    percent: 12,
    source: 'global'
  }));
test('project override takes precedence including zero', () =>
  assert.deepEqual(
    api.resolve({ markupMode: 'project', markupPercent: 0 }, { materialMarkupPercent: 22 }, 10),
    { percent: 0, source: 'project' }
  ));
test('legacy jobs preserve stored markup and source', () =>
  assert.deepEqual(api.resolve({ markupPercent: 19 }, { materialMarkupPercent: 35 }, 10), {
    percent: 19,
    source: 'legacy'
  }));
test('old jobs with no stored markup retain historical fallback', () =>
  assert.deepEqual(api.resolve({}, null, 35), { percent: 15, source: 'legacy' }));
test('percent parser accepts Swedish decimal and zero', () => {
  assert.equal(api.parsePercent('12,5'), 12.5);
  assert.equal(api.parsePercent(0), 0);
});
test('percent parser rejects missing negative non-finite or malformed values', () => {
  for (const v of ['', null, undefined, -1, Infinity, NaN, 'abc', '12x'])
    assert.throws(() => api.parsePercent(v));
});
test('new material snapshots effective inherited percent and saved buying price', () => {
  const original = { id: 'm', unitPrice: 100, qty: 2 };
  const row = api.snapshot(
    original,
    { markupMode: 'inherit', markupPercent: 15 },
    { materialMarkupPercent: 25 },
    10
  );
  assert.equal(row.markupPercent, 25);
  assert.equal(row.unitPrice, 100);
  assert.equal(original.markupPercent, undefined);
});
test('existing row overrides and explicit selling prices survive snapshot', () => {
  const row = api.snapshot(
    { unitPrice: 100, markupPercent: 5, customerUnitPrice: 0 },
    { markupPercent: 15 },
    null,
    30
  );
  assert.equal(row.markupPercent, 5);
  assert.equal(row.customerUnitPrice, 0);
});
test('saved row percentage does not track subsequent global or customer changes', () => {
  const row = api.snapshot({ unitPrice: 100 }, { markupMode: 'inherit' }, null, 15);
  assert.equal(row.markupPercent, 15);
  assert.equal(
    api.resolve({ markupMode: 'inherit' }, { materialMarkupPercent: 30 }, 40).percent,
    30
  );
  assert.equal(row.markupPercent, 15);
});
test('same article at a different current markup must become a new row', () => {
  assert.equal(
    api.samePricing(
      { markupPercent: 15, unitPrice: 100 },
      { markupMode: 'inherit', markupPercent: 15 },
      { materialMarkupPercent: 30 },
      15,
      100
    ),
    false
  );
  assert.equal(
    api.samePricing(
      { markupPercent: 30, unitPrice: 100 },
      { markupMode: 'inherit' },
      { materialMarkupPercent: 30 },
      15,
      100
    ),
    true
  );
});
test('changed buying price and old explicit selling exception are not merged into a new default row', () => {
  assert.equal(
    api.samePricing(
      { markupPercent: 15, unitPrice: 100 },
      { markupMode: 'inherit' },
      null,
      15,
      110
    ),
    false
  );
  assert.equal(
    api.samePricing(
      { markupPercent: 15, unitPrice: 100, customerUnitPrice: 120 },
      { markupMode: 'inherit' },
      null,
      15,
      100
    ),
    false
  );
});
test('approved and invoiced job states are protected from repricing', () => {
  for (const status of ['done', 'invoice_ready', 'invoiced'])
    assert.equal(api.locked({ status }), true);
  assert.equal(api.locked({ status: 'active' }), false);
});
test('currency formatting preserves cents and percentage labels avoid floating point noise', () => {
  assert.match(api.money(225.5625), /225,56/);
  assert.equal(
    api.percentText({ unitPrice: 100, customerUnitPrice: 115 }, { markupPercent: 20 }),
    '15 %'
  );
  assert.match(
    api.percentText({ unitPrice: 80, customerUnitPrice: 70 }, { markupPercent: 20 }),
    /^[−-]12,5 %$/
  );
});
