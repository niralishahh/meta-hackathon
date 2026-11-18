// Starter kit shell: the four map tabs, task cards and the highlight bus.
// You don't need to edit this file. Your page lives in panels/.
// Everything is a plain script (no modules and no server), so the kit runs from a double-clicked index.html.
// The site draws whatever topology.js holds. To draw a different topology, replace topology.js and reload.
(function () {
  'use strict';
  const { TIERS, indexModel, validateModel } = window.MapCore;
  const { TASKS, SCORING, SPEED, SITE_SCORING } = window.MapTasks;

  const PAGE_FILES = { overview: 'panels/overview.js', backbone: 'panels/backbone.js', site: 'panels/site.js', pods: 'panels/pods.js', racks: 'panels/racks.js' };
  const PAGES = ['overview', 'backbone', 'site', 'pods', 'racks'];
  const PANELS = {};
  const registered = {};
  const fileErrors = {};
  let loadingPage = null;  // set by index.html just before each page file loads

  const SHOW_TASKS = new URLSearchParams(location.search).get('tasks') !== 'off';
  const GENERIC_ERROR = 'the file has an error (the browser console shows the line)';

  const state = {
    model: null,
    index: null,
    loadError: null,
    selected: null,
    page: 'overview',
    mounted: new Set(),
    listeners: [],
    searchListeners: [],
    owner: null,
  };

  // Remember which page file an error came from, so one broken file only breaks its own tab.
  // Browsers hide the details of errors in files opened from a folder, so fall back to the file that was loading.
  window.addEventListener('error', (e) => {
    const file = String(e.filename || '');
    let page = Object.keys(PAGE_FILES).find((p) => file.endsWith(PAGE_FILES[p]));
    if (!page && !file && loadingPage) page = loadingPage;
    if (!page || fileErrors[page]) return;
    fileErrors[page] = file ? `${e.message} (line ${e.lineno})` : GENERIC_ERROR;
  }, true);

  // The helpers every map page gets as its third mount() argument.
  const kit = {
    get model() { return state.model; },
    get selected() { return state.selected; },
    tiers: TIERS,
    loading(name) { loadingPage = name; },
    // Each page file calls kit.page(name, function () { ...; return { mount }; }) once.
    page(name, definition) {
      if (!(name in PAGE_FILES)) { console.error(`kit.page: unknown page "${name}"`); return; }
      registered[name] = definition;
    },
    select(id) {
      state.selected = id;
      for (const l of state.listeners) {
        try { l.fn(id); } catch (err) { console.error(`onSelect handler on the ${l.owner} page failed`, err); }
      }
    },
    onSelect(fn) { state.listeners.push({ owner: state.owner, fn }); },
    onSearch(fn) { state.searchListeners.push({ owner: state.owner, fn }); },
    device(id) { return state.index.byId.get(id); },
    linksOf(id) { return state.index.linksOf.get(id) || []; },
    devicesByTier(tier) { return state.model.devices.filter((d) => d.tier === tier); },
    siteName(code) { return state.model.sites.find((s) => s.code === code)?.name || code; },
    // Links from a device up to the next tier (for a rack: its uplinks to the spines).
    uplinks(id) {
      const rank = window.MapCore.TIER_RANK[state.index.byId.get(id).tier];
      return kit.linksOf(id).filter((l) => window.MapCore.TIER_RANK[state.index.byId.get(l.a === id ? l.b : l.a).tier] > rank);
    },
    // A plain table so a page shows its data before it has a real visualization.
    starterTable(area, title, columns, rows, limit = 40) {
      const cell = (c) => (c && typeof c === 'object' ? el('td', {}, el('span', { class: `pill ${c.cls || ''}` }, c.text)) : el('td', {}, c ?? ''));
      area.replaceChildren(el('div', { class: 'starter' },
        el('h3', {}, title),
        el('table', {}, el('tr', {}, columns.map((c) => el('th', {}, c))), rows.slice(0, limit).map((r) => el('tr', {}, r.map(cell)))),
        rows.length > limit ? el('p', { class: 'note' }, `...and ${rows.length - limit} more`) : ''));
    },
    projectToScreen(position, camera, width, height) {
      const v = position.clone().project(camera);
      return { x: (v.x + 1) / 2 * width, y: (1 - v.y) / 2 * height };
    },
    showPage(page) { showPage(page); },
  };
  window.kit = kit;

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return node;
  }

  // Read the topology that topology.js set, and check it before any page draws.
  function loadTopology() {
    const model = window.TOPOLOGY_DATA;
    const name = document.getElementById('topology-name');
    if (!model) {
      state.loadError = 'No topology loaded: topology.js is missing or damaged. Put a good topology.js in the kit folder, next to index.html, and reload.';
      name.textContent = 'No topology';
      return;
    }
    const problems = validateModel(model);
    if (problems.length) {
      state.loadError = `topology.js was not loaded:\n- ${problems.join('\n- ')}`;
      name.textContent = 'No topology';
      return;
    }
    state.model = model;
    state.index = indexModel(model);
    name.textContent = `Topology: ${model.name || 'Unnamed topology'}`;
  }

  function mountPanel(page) {
    const area = document.getElementById(`area-${page}`);
    area.replaceChildren();
    state.listeners = state.listeners.filter((l) => l.owner !== page);
    state.searchListeners = state.searchListeners.filter((l) => l.owner !== page);
    if (!state.model) {
      area.append(el('pre', { class: 'error' }, state.loadError || 'No topology loaded.'));
      return;
    }
    state.owner = page;
    try {
      PANELS[page].mount(area, state.model, kit);
    } catch (err) {
      console.error(err);
      area.replaceChildren(el('pre', { class: 'error' }, `The ${page} page failed to draw:\n${err && err.stack || err}`));
    } finally {
      state.owner = null;
    }
    state.mounted.add(page);
  }

  function showPage(page) {
    state.page = page;
    for (const p of PAGES) {
      document.getElementById(`page-${p}`).hidden = p !== page;
      document.getElementById(`tab-${p}`).classList.toggle('active', p === page);
    }
    if (!state.mounted.has(page)) mountPanel(page);
    if (typeof PANELS[page].resize === 'function') {
      try { PANELS[page].resize(); } catch (err) { console.error(err); }
    }
  }

  function collapsible(card, page) {
    let collapsed = false;
    try { collapsed = localStorage.getItem(`task-collapsed-${page}`) === '1'; } catch (err) { /* storage off */ }
    const toggle = el('button', { class: 'toggle', title: 'Show or hide the task card' }, collapsed ? 'Task' : 'Hide');
    card.classList.toggle('collapsed', collapsed);
    toggle.addEventListener('click', () => {
      const now = !card.classList.contains('collapsed');
      card.classList.toggle('collapsed', now);
      toggle.textContent = now ? 'Task' : 'Hide';
      try { localStorage.setItem(`task-collapsed-${page}`, now ? '1' : '0'); } catch (err) { /* storage off */ }
      if (PANELS[page] && typeof PANELS[page].resize === 'function') PANELS[page].resize();
    });
    return toggle;
  }

  function taskCard(page) {
    const t = TASKS[page];
    const card = el('aside', { class: 'task' });
    const body = el('div', { class: 'task-body' });
    body.append(
      el('div', { class: 'lane' }, `Your file: ${t.file}`),
      el('h2', {}, t.title),
      el('p', {}, t.shows),
      el('h3', {}, `Points for this page (${SCORING.reduce((n, [, p]) => n + p, 0)})`),
      el('table', { class: 'checks' }, SCORING.map(([label, points]) =>
        el('tr', {}, el('td', {}, label), el('td', { class: 'num' }, String(points))))),
      el('h3', {}, `Speed (${SPEED.points})`),
      el('p', { class: 'question' }, SPEED.prompt),
      el('p', { class: 'note' }, SPEED.rule),
      el('p', {}, el('b', {}, 'Example (practice topology): '), t.example.q, ' Answer: ', t.example.a, '.'),
      el('h3', {}, 'Points for the whole site (20)'),
      el('table', { class: 'checks' }, SITE_SCORING.map(([label, points]) =>
        el('tr', {}, el('td', {}, label), el('td', { class: 'num' }, String(points))))),
    );
    card.append(collapsible(card, page), body);
    return card;
  }

  function buildShell() {
    const app = document.getElementById('app');
    app.replaceChildren();  // drops the "scripts did not load" message in index.html
    const tabs = el('nav', { class: 'tabs' }, PAGES.map((p) =>
      el('button', { id: `tab-${p}`, onclick: () => showPage(p) }, TASKS[p].title)));
    const search = el('input', { id: 'search', type: 'search', placeholder: 'Search a device, press Enter' });
    // An exact device name always selects that device (every page hears it through kit.onSelect).
    // kit.onSearch handlers also get the raw text, for partial matches.
    search.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !state.model) return;
      const q = search.value.trim();
      if (!q) return;
      if (state.index.byId.has(q)) kit.select(q);
      for (const l of state.searchListeners) {
        try { l.fn(q); } catch (err) { console.error(err); }
      }
    });
    app.append(el('header', {},
      el('div', { class: 'brand' }, el('span', { class: 'logo' }), 'Network UI Map'), tabs,
      el('div', { class: 'tools' }, el('span', { id: 'topology-name', class: 'source' }, 'No topology'), search)));
    const main = el('main');
    for (const p of PAGES) {
      const page = el('section', { id: `page-${p}`, class: 'page', hidden: '' });
      if (SHOW_TASKS) page.append(taskCard(p));
      page.append(el('div', { id: `area-${p}`, class: 'area' }));
      main.append(page);
    }
    app.append(main);
  }

  function brokenPanel(file, why) {
    let hint = '';
    if (/already been declared|redeclaration/i.test(why)) {
      hint = '\n\nAnother page file declares the same name outside its kit.page(...) function. Move your helpers inside your kit.page(...) function.';
    } else if (why === GENERIC_ERROR) {
      hint = '\n\nCommon causes: a typo; an import or export line (delete it, d3 and THREE are already loaded as globals); or a name declared outside kit.page(...) that another page file also declares (move it inside).';
    } else if (/import|export|module/i.test(why)) {
      hint = '\n\nThis kit runs without a server, so page files are plain scripts: delete any import lines and the export keyword. d3 and THREE are already loaded as globals.';
    }
    return {
      mount(area) {
        area.replaceChildren(el('pre', { class: 'error' }, `${file} failed to load: ${why}${hint}\nOpen the browser console for details.`));
      },
    };
  }

  function loadPanels() {
    for (const [page, file] of Object.entries(PAGE_FILES)) {
      const def = registered[page];
      if (!def) {
        PANELS[page] = brokenPanel(file, fileErrors[page] || `the file did not call kit.page('${page}', ...)`);
        continue;
      }
      try {
        const panel = typeof def === 'function' ? def() : def;
        if (!panel || typeof panel.mount !== 'function') throw new Error('the function given to kit.page must return { mount }');
        PANELS[page] = panel;
      } catch (err) {
        console.error(err);
        PANELS[page] = brokenPanel(file, String(err && err.message || err));
      }
    }
  }

  function start() {
    loadPanels();
    buildShell();
    loadTopology();
    showPage(PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
  }

  window.addEventListener('hashchange', () => {
    const p = location.hash.slice(1);
    if (PAGES.includes(p)) showPage(p);
  });

  // Page files load after this one; start once every script on the page has run.
  window.addEventListener('load', () => {
    loadingPage = null;
    try {
      start();
    } catch (err) {
      console.error(err);
      document.getElementById('app').append(el('pre', { class: 'error' }, `The kit failed to start:\n${err && err.stack || err}`));
    }
  });
})();
