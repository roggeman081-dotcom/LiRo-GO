/* LiRo GO v152 – inherited customer markup and stable material prices. */
(function (root, factory) {
  'use strict';
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  if (!root) return;
  const globalPercent = () => getGlobalPriceDefaults().markupPercent;
  const findCustomer = (value) =>
    typeof value === 'object' ? value : customers.find((c) => String(c.id) === String(value));
  const forCustomer = (value) => policy.customer(findCustomer(value), globalPercent());
  const forJob = (job) => policy.resolve(job, findCustomer(job?.customerId), globalPercent());
  function invalidate() {
    root.dispatchEvent(new Event('liro-material-prices-changed'));
  }
  function updateCustomer(id, percent) {
    const value = percent == null ? null : policy.parsePercent(percent);
    return new Promise((resolve, reject) => {
      const transaction = DB.transaction('customers', 'readwrite'),
        store = transaction.objectStore('customers');
      const request = store.get(id);
      let updated;
      request.onsuccess = () => {
        if (!request.result) {
          transaction.abort();
          return;
        }
        updated = { ...request.result, updatedAt: new Date().toISOString() };
        if (value == null) delete updated.materialMarkupPercent;
        else updated.materialMarkupPercent = value;
        store.put(updated);
      };
      transaction.oncomplete = () => {
        const current = findCustomer(id);
        if (current) {
          Object.assign(current, updated);
          if (value == null) delete current.materialMarkupPercent;
        }
        invalidate();
        resolve(updated);
      };
      transaction.onerror = () =>
        reject(transaction.error || new Error('Kundens påslag kunde inte sparas.'));
      transaction.onabort = () =>
        reject(transaction.error || new Error('Kunden hittades inte eller sparningen avbröts.'));
    });
  }
  function updateJob(id, percent) {
    const value = percent == null ? null : policy.parsePercent(percent);
    return new Promise((resolve, reject) => {
      const transaction = DB.transaction(['jobs', 'materials'], 'readwrite');
      const jobStore = transaction.objectStore('jobs'),
        materialStore = transaction.objectStore('materials');
      const jobRequest = jobStore.get(id),
        rowsRequest = materialStore.index('job').getAll(id);
      let updated,
        rows,
        processed = false,
        failure;
      function prepare() {
        if (processed || jobRequest.readyState !== 'done' || rowsRequest.readyState !== 'done')
          return;
        processed = true;
        const previous = jobRequest.result;
        if (!previous || policy.locked(previous)) {
          failure = new Error(
            'Priserna är låsta för avslutade, faktureringsklara och fakturerade uppdrag.'
          );
          transaction.abort();
          return;
        }
        // Legacy rows used the stored job percentage. Freeze that exact basis before changing it.
        rows = rowsRequest.result.map((m) =>
          policy.snapshot(m, { ...previous, markupMode: 'project' }, null, 15)
        );
        for (const row of rows) materialStore.put(row);
        updated = {
          ...previous,
          markupMode: value == null ? 'inherit' : 'project',
          markupPercent: value == null ? forCustomer(previous.customerId).percent : value,
          updatedAt: new Date().toISOString()
        };
        jobStore.put(updated);
      }
      jobRequest.onsuccess = prepare;
      rowsRequest.onsuccess = prepare;
      transaction.oncomplete = () => {
        const current = jobById(id);
        if (current) Object.assign(current, updated);
        for (const m of jobMaterials) {
          const saved = rows.find((row) => row.id === m.id);
          if (saved) Object.assign(m, saved);
        }
        invalidate();
        resolve(updated);
      };
      transaction.onerror = () =>
        reject(transaction.error || failure || new Error('Uppdragets påslag kunde inte sparas.'));
      transaction.onabort = () =>
        reject(
          failure || transaction.error || new Error('Sparningen av uppdragspåslaget avbröts.')
        );
    });
  }
  function updateQuantity(id, value, delta = false) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || (!delta && amount < 0))
      throw new Error('Ange ett giltigt antal.');
    return new Promise((resolve, reject) => {
      const transaction = DB.transaction('materials', 'readwrite'),
        store = transaction.objectStore('materials');
      const request = store.get(id);
      let updated;
      request.onsuccess = () => {
        const saved = request.result;
        if (!saved) {
          transaction.abort();
          return;
        }
        const qty = Math.max(0, delta ? (Number(saved.qty) || 0) + amount : amount);
        updated = qty > 0 ? { ...saved, qty, updatedAt: new Date().toISOString() } : null;
        if (updated) store.put(updated);
        else store.delete(id);
      };
      transaction.oncomplete = () => {
        jobMaterials = jobMaterials.flatMap((m) =>
          m.id === id ? (updated ? [updated] : []) : [m]
        );
        invalidate();
        resolve(updated);
      };
      transaction.onerror = () =>
        reject(transaction.error || new Error('Antalet kunde inte sparas.'));
      transaction.onabort = () =>
        reject(
          transaction.error || new Error('Materialraden hittades inte eller sparningen avbröts.')
        );
    });
  }
  async function applyGlobal(percent) {
    const value = policy.parsePercent(percent);
    setGlobalPriceDefaults({ ...getGlobalPriceDefaults(), markupPercent: value });
    invalidate();
    return 0;
  }
  root.LiRoMaterialPricing = {
    ...policy,
    forCustomer,
    forJob,
    setCustomer: updateCustomer,
    setJob: updateJob,
    applyGlobal,
    updateQuantity,
    matchesCurrent: (row, job) =>
      policy.samePricing(
        row,
        job,
        findCustomer(job?.customerId),
        globalPercent(),
        row.eNr ? root.LiRoPrice?.resolveByArt(row.eNr) : row.unitPrice
      )
  };
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  function parsePercent(value) {
    if (value == null || typeof value === 'boolean' || String(value).trim() === '')
      throw new Error('Ange ett påslag på minst 0 %.');
    const n = Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) throw new Error('Ange ett påslag på minst 0 %.');
    return n;
  }
  function valid(value, fallback) {
    try {
      return parsePercent(value);
    } catch {
      return fallback;
    }
  }
  function customer(record, global) {
    const own = valid(record?.materialMarkupPercent, null);
    return own == null
      ? { percent: valid(global, 15), source: 'global' }
      : { percent: own, source: 'customer' };
  }
  function resolve(job, record, global) {
    if (job?.markupMode === 'inherit') return customer(record, global);
    return {
      percent: valid(job?.markupPercent, 15),
      source: job?.markupMode === 'project' ? 'project' : 'legacy'
    };
  }
  function snapshot(row, job, record, global) {
    return {
      ...row,
      markupPercent: valid(row?.markupPercent, resolve(job, record, global).percent)
    };
  }
  function samePricing(row, job, record, global, buy) {
    if (row?.customerUnitPrice != null) return false;
    const previous = valid(row?.markupPercent, valid(job?.markupPercent, 15));
    return (
      previous === resolve(job, record, global).percent &&
      Math.abs((Number(row?.unitPrice) || 0) - (Number(buy) || 0)) < 0.000001
    );
  }
  function locked(job) {
    return ['done', 'invoice_ready', 'invoiced'].includes(job?.status);
  }
  function money(value) {
    return (
      (Number(value) || 0).toLocaleString('sv-SE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' kr'
    );
  }
  function percentText(row, job) {
    const buy = Number(row?.unitPrice) || 0;
    if (row?.customerUnitPrice != null && buy <= 0) return '–';
    const percent =
      row?.customerUnitPrice != null
        ? (Number(row.customerUnitPrice) / buy - 1) * 100
        : valid(row?.markupPercent, valid(job?.markupPercent, 15));
    return percent.toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + ' %';
  }
  return { parsePercent, customer, resolve, snapshot, samePricing, locked, money, percentText };
});
