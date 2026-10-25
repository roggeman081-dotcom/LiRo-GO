/* LiRo GO customer → assignment → work → billing workflow. */
(function () {
  if (window.LiRoCustomerWorkflow) return;
  const style = document.createElement('style');
  style.textContent = `.customer-workflow{padding:0 16px;box-sizing:border-box}.customer-workflow button,.job-material-pricing button{min-height:44px;min-width:44px}.customer-workflow input,.job-material-pricing input{font-size:16px!important;min-height:44px;box-sizing:border-box;max-width:100%;width:100%}.customer-workflow .card{margin-top:12px;padding:16px}.customer-workflow .workflow-stack{display:grid;gap:10px}.customer-workflow .customer-row{display:block;width:100%;text-align:left;padding:14px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.customer-workflow .customer-row strong,.customer-workflow .customer-row small{display:block}.customer-workflow .customer-row small{margin-top:4px}.customer-workflow .field{display:block;margin-top:12px}.customer-workflow .field>span{display:block;margin-bottom:6px}.customer-workflow .workflow-error{color:var(--pri-urgent);min-height:20px}.job-material-pricing{padding:16px}.job-material-pricing .workflow-stack{display:grid;gap:10px;margin-top:12px}`;
  document.head.appendChild(style);
  const busy = new Set();
  function listening() {
    return !!st?.dictatingKey || (typeof dictationSession !== 'undefined' && !!dictationSession);
  }
  function refresh() {
    if (!listening()) render();
  }
  function customer(id) {
    return customers.find((c) => String(c.id) === String(id));
  }
  function sourceName(source) {
    return (
      {
        customer: 'Kundens påslag',
        global: 'Global standard',
        project: 'Uppdragets avvikelse',
        legacy: 'Tidigare uppdragspåslag'
      }[source] || 'Global standard'
    );
  }
  function summary(value, attr) {
    return `<div ${attr}><strong>${esc(String(value.percent))} % materialpåslag</strong><div class="muted">${sourceName(value.source)}</div></div>`;
  }
  function jobMarkupSummary(job) {
    return `<div class="settings-note">${summary(LiRoMaterialPricing.forJob(job), 'data-job-markup-summary')}<button type="button" class="accent" style="min-height:44px" data-act="open-job-priser">Prisinställningar för uppdraget</button></div>`;
  }
  function field(label, key, value, type = 'text', required = false) {
    return `<label class="field"><span>${label}</span><input type="${type}" data-customer-field="${key}" value="${esc(value || '')}" ${required ? 'required' : ''}></label>`;
  }
  function listHtml(q) {
    q = String(q || '')
      .trim()
      .toLocaleLowerCase('sv');
    const rows = customers
      .filter((c) =>
        [c.name, c.phone, c.email, c.address].some((x) =>
          String(x || '')
            .toLocaleLowerCase('sv')
            .includes(q)
        )
      )
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'sv'));
    return rows.length
      ? rows
          .map(
            (c) =>
              `<button class="customer-row" data-act="customer-open" data-customer-id="${esc(String(c.id))}"><strong>${esc(c.name)}</strong><small class="muted">${esc([c.phone, c.address].filter(Boolean).join(' · '))}</small></button>`
          )
          .join('')
      : '<p class="muted">Inga kunder matchar sökningen.</p>';
  }
  function jobRows(rows) {
    return rows.length
      ? rows
          .map(
            (j) =>
              `<button class="customer-row" data-act="workflow-open-job" data-id="${esc(String(j.id))}"><strong>${esc(j.title)}</strong><small class="muted">${esc(customer(j.customerId)?.name || 'Tillfälligt uppdrag')} · ${esc(statusLabel(j.status).l)}</small></button>`
          )
          .join('')
      : '<p class="muted">Inga uppdrag här ännu.</p>';
  }
  function viewHtml(state) {
    if (!['customers', 'customer', 'customer-new', 'worklist', 'billing'].includes(state.view))
      return null;
    let title = '',
      body = '';
    if (state.view === 'customers') {
      title = 'Kunder';
      body = `<button class="primary-btn" data-act="customer-new">${ICON.plusSmall}<span>Ny kund</span></button><label class="field"><span>Sök kunder</span><input type="search" aria-label="Sök kunder" data-customer-search value="${esc(state.customerSearch || '')}" placeholder="Namn, telefon eller adress"></label><div class="card" data-customer-list>${listHtml(state.customerSearch)}</div><section class="card"><h2 class="subsection-title">Global standard</h2><p class="settings-note">Används när kunden och uppdraget saknar eget materialpåslag. Sparade materialrader behåller sina priser.</p><label class="field"><span>Generellt materialpåslag</span><input type="number" inputmode="decimal" min="0" step="any" aria-label="Generellt materialpåslag" data-global-material-markup value="${esc(String(getGlobalPriceDefaults().markupPercent))}"></label><button class="primary-btn" data-act="apply-global-material-markup">Spara generellt påslag</button></section>`;
    } else if (state.view === 'customer-new') {
      title = 'Ny kund';
      const d = state.customerDraft || {};
      body = `<form data-customer-create novalidate>${field('Namn', 'name', d.name, 'text', true)}${field('Telefon', 'phone', d.phone, 'tel')}${field('Adress', 'address', d.address)}${field('E-post', 'email', d.email, 'email')}<p class="workflow-error" role="alert">${esc(state.customerError || '')}</p><button class="primary-btn" type="submit" data-act="customer-save">Spara kund</button></form>`;
    } else if (state.view === 'customer') {
      const c = customer(state.customerId);
      if (!c) {
        title = 'Kund';
        body = '<p>Kunden kunde inte hittas.</p>';
      } else {
        title = c.name;
        const value = LiRoMaterialPricing.forCustomer(c);
        body = `<section class="card"><h1 class="h1" style="font-size:22px">${esc(c.name)}</h1>${[
          c.phone,
          c.email,
          c.address,
          [c.postalCode, c.city].filter(Boolean).join(' ')
        ]
          .filter(Boolean)
          .map((s) => `<p style="overflow-wrap:anywhere">${esc(s)}</p>`)
          .join(
            ''
          )}${summary(value, 'data-customer-markup-summary')}</section><section class="card"><div class="row between"><h2 class="subsection-title">Prisinställningar</h2>${state.customerPriceEditing ? '' : '<button class="small-btn" data-act="customer-price-edit">Ändra</button>'}</div>${state.customerPriceEditing ? `<label class="field"><span>Kundens materialpåslag</span><input type="number" inputmode="decimal" min="0" step="any" aria-label="Kundens materialpåslag" data-customer-material-markup value="${esc(String(state.customerPriceDraft ?? value.percent))}"></label><div class="workflow-stack"><button class="primary-btn" data-act="customer-price-save">Spara kundpåslag</button><button class="small-btn" data-act="customer-price-reset">Använd global standard</button><button class="small-btn" data-act="customer-back">Avbryt</button></div>` : `<p class="settings-note">${sourceName(value.source)} används för nya materialrader.</p>`}<p class="workflow-error" role="alert">${esc(state.customerError || '')}</p></section><section class="card"><h2 class="subsection-title">Kundens uppdrag</h2>${jobRows(jobs.filter((j) => String(j.customerId) === String(c.id)))}</section>`;
      }
    } else {
      title = state.view === 'worklist' ? 'Arbete' : 'Fakturaunderlag';
      body = `<p class="settings-note">${state.view === 'worklist' ? 'Öppna ett uppdrag för att registrera tid och material.' : 'Färdiga uppdrag och deras fakturaunderlag.'}</p><div class="card">${jobRows(jobs.filter((j) => (state.view === 'billing' ? LiRoMaterialPricing.locked(j) : !LiRoMaterialPricing.locked(j))))}</div>`;
    }
    return `${vWizHeader(title, false, undefined, undefined, 'customer-back')}<div class="customer-workflow">${body}</div>`;
  }
  function jobPricing(job) {
    const p = LiRoMaterialPricing.forJob(job),
      locked = LiRoMaterialPricing.locked(job);
    return `<section class="card job-material-pricing"><h2 class="subsection-title">Materialpåslag</h2>${summary(p, 'data-job-markup-summary')}<p class="settings-note">${locked ? 'Uppdraget är låst.' : 'Ändringen gäller nya materialrader. Sparade rader behåller sina priser.'}</p>${locked ? '' : `<label class="field"><span>Materialpåslag för uppdraget</span><input type="number" inputmode="decimal" min="0" step="any" aria-label="Materialpåslag för uppdraget" data-job-material-markup value="${esc(String(p.percent))}"></label><div class="workflow-stack"><button class="primary-btn" data-act="customer-job-price-save">Spara uppdragspåslag</button><button class="small-btn" data-act="customer-job-price-reset">${job.customerId ? 'Använd kundens påslag' : 'Använd global standard'}</button></div>`}</section>`;
  }
  function back() {
    if (st.view === 'customer' && st.customerPriceEditing) {
      st.customerPriceEditing = false;
      st.customerError = '';
      delete st.customerPriceDraft;
    } else if (st.view === 'customer' || st.view === 'customer-new') {
      st = st.customerReturn || { view: 'customers' };
    } else {
      st = { view: 'home' };
    }
    refresh();
    return true;
  }
  function percent(selector) {
    const text = String(document.querySelector(selector)?.value ?? '')
      .trim()
      .replace(',', '.');
    if (!text || !Number.isFinite(Number(text)) || Number(text) < 0)
      throw new Error('Ange ett materialpåslag som är noll eller högre.');
    return Number(text);
  }
  async function perform(a) {
    if (listening()) return;
    if (a === 'customer-new') {
      pushNav();
      st = { view: 'customer-new', customerDraft: {}, customerReturn: st };
      refresh();
      return;
    }
    if (a === 'customer-back') {
      if (['customer', 'customer-new'].includes(st.view)) history.back();
      else back();
      return;
    }
    if (a === 'customer-price-edit') {
      pushNav();
      st.customerPriceEditing = true;
      st.customerPriceDraft = LiRoMaterialPricing.forCustomer(st.customerId).percent;
      st.customerError = '';
      refresh();
      return;
    }
    const original = st,
      id = st.customerId,
      jobId = st.id,
      key =
        a === 'customer-save'
          ? 'create-customer'
          : a.startsWith('customer-job-price-')
            ? 'job-price:' + jobId
            : 'customer-price:' + id;
    if (busy.has(key)) return;
    busy.add(key);
    let control = document.querySelector(`[data-act="${a}"]`),
      createdId;
    if (control) control.disabled = true;
    try {
      if (a === 'customer-save') {
        const draft = { ...(original.customerDraft || {}) };
        document
          .querySelectorAll('[data-customer-field]')
          .forEach((n) => (draft[n.dataset.customerField] = n.value.trim()));
        original.customerDraft = draft;
        if (!draft.name) throw new Error('Ange kundens namn.');
        const email = document.querySelector('[data-customer-field="email"]');
        if (email && draft.email && !email.validity.valid)
          throw new Error('Ange en giltig e-postadress.');
        const saved = await createCustomer(draft);
        createdId = saved.id;
        if (st === original)
          st = { view: 'customer', customerId: saved.id, customerReturn: original.customerReturn };
      } else if (a === 'customer-price-save' || a === 'customer-price-reset') {
        const value =
          a === 'customer-price-reset' ? null : percent('[data-customer-material-markup]');
        await LiRoMaterialPricing.setCustomer(id, value);
        if (st === original && String(st.customerId) === String(id)) {
          st.customerPriceEditing = false;
          st.customerError = '';
          delete st.customerPriceDraft;
        }
      } else if (a === 'customer-job-price-save' || a === 'customer-job-price-reset') {
        const value =
          a === 'customer-job-price-reset' ? null : percent('[data-job-material-markup]');
        await LiRoMaterialPricing.setJob(jobId, value);
      }
      if (st === original || (createdId && st.view === 'customer' && st.customerId === createdId))
        refresh();
    } catch (error) {
      if (st === original) {
        st.customerError = error.message || 'Sparningen misslyckades.';
        if (st.view === 'job') {
          flash(st.customerError, 3000);
        } else refresh();
      }
    } finally {
      busy.delete(key);
      if (control?.isConnected) control.disabled = false;
    }
  }
  document.addEventListener(
    'input',
    function (e) {
      const t = e.target;
      if (t.matches('[data-customer-field]') && st.view === 'customer-new') {
        st.customerDraft = { ...(st.customerDraft || {}), [t.dataset.customerField]: t.value };
      }
      if (t.matches('[data-customer-material-markup]') && st.view === 'customer')
        st.customerPriceDraft = t.value;
      if (t.matches('[data-customer-search]') && st.view === 'customers') {
        st.customerSearch = t.value;
        if (!listening()) {
          const list = document.querySelector('[data-customer-list]');
          if (list) list.innerHTML = listHtml(t.value);
        }
      }
    },
    true
  );
  async function openWorkflowJob(id) {
    if (listening()) return;
    const origin = st;
    try {
      if (!(await loadJobDetail(id, () => st === origin && !listening()))) return;
      if (st !== origin || listening()) return;
      pushNav();
      st = {
        view: origin.view === 'worklist' ? 'work' : 'job',
        id,
        jobTab: origin.view === 'billing' ? 'faktura' : 'oversikt',
        workflowReturn: origin,
        workflowEntryTab: origin.view === 'billing' ? 'faktura' : 'oversikt',
        workflowDirectWork: origin.view === 'worklist'
      };
      refresh();
    } catch (error) {
      if (st === origin) flash(error.message || 'Uppdraget kunde inte öppnas.');
    }
  }
  const acts = new Set([
    'workflow-open-job',
    'customer-new',
    'customer-back',
    'customer-open',
    'customer-save',
    'customer-price-edit',
    'customer-price-save',
    'customer-price-reset',
    'customer-job-price-save',
    'customer-job-price-reset'
  ]);
  document.addEventListener(
    'click',
    function (e) {
      const b = e.target.closest('[data-act]');
      if (!b || !acts.has(b.dataset.act)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (listening()) return;
      if (b.dataset.act === 'workflow-open-job') {
        void openWorkflowJob(b.dataset.id);
        return;
      }
      if (b.dataset.act === 'customer-open') {
        pushNav();
        st = { view: 'customer', customerId: b.dataset.customerId, customerReturn: st };
        refresh();
        return;
      }
      void perform(b.dataset.act);
    },
    true
  );
  document.addEventListener(
    'submit',
    function (e) {
      if (!e.target.matches('[data-customer-create]')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void perform('customer-save');
    },
    true
  );
  if (typeof closeTopLayer === 'function') {
    const previousClose = closeTopLayer;
    closeTopLayer = function () {
      if (st.workflowReturn && ['job', 'work'].includes(st.view)) {
        if (
          settingsOpen ||
          calendarOpen ||
          st.workNoteOpen ||
          st.workCaptureOpen ||
          st.workAiOpen ||
          st.scannerOpen ||
          st.openPhoto ||
          st.matPanel
        )
          return previousClose.apply(this, arguments);
        if (st.view === 'work' && !st.workflowDirectWork)
          return previousClose.apply(this, arguments);
        const entry = st.workflowEntryTab || 'oversikt';
        if (st.view === 'job' && (st.jobTab || 'oversikt') !== entry) {
          st.jobTab = entry;
          return true;
        }
        st = st.workflowReturn;
        return true;
      }

      if (['customer', 'customer-new', 'customers', 'worklist', 'billing'].includes(st?.view)) {
        if (listening()) return true;
        return back();
      }
      return previousClose.apply(this, arguments);
    };
  }
  vBottomNav = function () {
    let on = '';
    if (['customers', 'customer', 'customer-new'].includes(st?.view)) on = 'nav-customers';
    else if (st?.view === 'worklist' || st?.view === 'work') on = 'nav-work';
    else if (
      st?.view === 'billing' ||
      (st?.view === 'job' && ['faktura', 'invoice'].includes(st.jobTab))
    )
      on = 'nav-billing';
    else if (st?.view === 'projects' || st?.view === 'job') on = 'nav-projects';
    return `<div class="workflow-tools" aria-label="Verktyg"><button data-act="nav-home">Planerat</button><button data-act="open-radar">Radar</button><button data-act="open-settings">Mer</button><button data-act="new-job">Nytt uppdrag</button></div><nav class="bottomnav" aria-label="Huvudnavigering">${[
      ['nav-customers', 'Kunder', ICON.home],
      ['nav-projects', 'Uppdrag', ICON.folder],
      ['nav-work', 'Arbete', ICON.wrench],
      ['nav-billing', 'Fakturaunderlag', ICON.folder]
    ]
      .map(
        ([act, label, icon]) =>
          `<button class="bn-tab ${on === act ? 'on' : ''}" data-act="${act}" ${on === act ? 'aria-current="page"' : ''}>${icon}<span>${label === 'Fakturaunderlag' ? 'Faktura<wbr>underlag' : label}</span></button>`
      )
      .join('')}</nav>`;
  };
  window.LiRoCustomerWorkflow = { viewHtml, jobPricing, jobMarkupSummary };
  const previousRender = render;
  render = function () {
    if (listening()) return;
    return previousRender.apply(this, arguments);
  };
  refresh();
})();
