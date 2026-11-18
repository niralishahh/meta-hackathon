// Site page: Super-spines by plane, border routers, and their links up to the backbone routers.
// STARTER: a generic 3D tier stack from the shared block. Replace the layout with your own design.
// See panels/racks.js for the full reference (custom layout, missing-slot ghosts, toggles, sortable table).
//
// Hackathon rules this file follows (keep them true when you edit):
// - All code stays inside kit.page(...). No import/export lines, no globals.
// - Only THREE and d3 (already loaded). No other packages, no internet links.
// - Never touch the header (tabs, topology name, search box), even from CSS. We only listen via kit.onSearch.
// - Draw from the data: no hard-coded number of sites, planes, pods or racks.
// - Never write the answer: no "worst / most / fewest" label. Sorting the table is the judge's tool.

kit.page("site", function () {
  const PAGE = "site";

  // ==== SHARED v1 BEGIN ====  (identical in every panel file. Edit tools/shared-block.js, then run: node tools/sync-shared.mjs)
  // Everything here lives inside kit.page(...), so nothing leaks into the global scope (hackathon rule).
  // Uses only the globals THREE (with THREE.OrbitControls) and d3. No imports, no network, no header changes.
  function shared(kit, PAGE) {
    // ---------- colors and states (one source of truth for every page's legend) ----------
    const C = {
      bg: '#0d1117', text: '#e6edf3', muted: '#8b949e', line: '#30363d',
      ok: '#3fb950', partial: '#e3b341', broken: '#ff4d4f', drained: '#c86bff',
      body: '#4b5a6e', empty: '#3a4250', dim: '#1a1f27', select: '#58a6ff', okLine: '#2f6f45',
    };
    const STATE_LABEL = { ok: 'Healthy', partial: 'Partly broken link', broken: 'Broken link', drained: 'Drained device' };

    // A link is broken when none of its parallel cables work, partly broken when some do.
    const linkState = (l) => (l.up === 0 ? 'broken' : l.up < l.count ? 'partial' : 'ok');
    const otherEnd = (l, id) => (l.a === id ? l.b : l.a);

    // Health of a device over a set of links (default: its uplinks to the next tier).
    function health(id, links) {
      links = links || kit.uplinks(id);
      const d = kit.device(id);
      let broken = 0, partial = 0, up = 0, total = 0;
      for (const l of links) {
        const s = linkState(l);
        if (s === 'broken') broken++; else if (s === 'partial') partial++;
        up += l.up; total += l.count;
      }
      const linkWorst = broken ? 'broken' : partial ? 'partial' : 'ok';
      return { id, d, drained: !!(d && d.drained), broken, partial, up, total, links: links.length, linkWorst,
        state: d && d.drained ? 'drained' : linkWorst };
    }

    const uniq = (arr, f) => {
      const get = typeof f === 'function' ? f : (x) => x[f];
      return [...new Set(arr.map(get))].filter((v) => v != null).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    };
    const groupBy = (arr, f) => {
      const m = new Map();
      for (const x of arr) { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
      return m;
    };
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const h = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

    // ---------- styles, scoped to this page's area only (never header / tabs / search) ----------
    function injectStyle() {
      const id = `nm-style-${PAGE}`;
      if (document.getElementById(id)) return;
      const R = `#area-${PAGE} .nm`;
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `
${R}{position:absolute;inset:0;display:flex;background:${C.bg};color:${C.text};font:12px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
${R} .nm-stage{position:relative;flex:1;min-width:0;overflow:hidden}
${R} canvas{display:block;width:100%;height:100%;outline:none}
${R} .nm-box{position:absolute;background:rgba(13,17,23,.9);border:1px solid ${C.line};border-radius:10px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.35)}
${R} .nm-tip{pointer-events:none;max-width:300px;z-index:5}
${R} .nm-tip b{color:#fff}
${R} .nm-tip .k{color:${C.muted}}
${R} .nm-legend{left:10px;bottom:10px}
${R} .nm-legend div{display:flex;align-items:center;gap:7px;margin:2px 0;white-space:nowrap}
${R} .nm-sw{width:12px;height:12px;border-radius:3px;flex:none}
${R} .nm-sw.ln{height:3px;border-radius:2px;width:16px}
${R} .nm-sw.ghost{background:transparent;border:1px dashed ${C.muted}}
${R} .nm-bar{left:10px;top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px}
${R} .nm-bar button{background:#161b22;color:${C.text};border:1px solid ${C.line};border-radius:7px;padding:4px 9px;font:inherit;cursor:pointer}
${R} .nm-bar button:hover{border-color:${C.muted}}
${R} .nm-bar button.on{background:${C.select};border-color:${C.select};color:#0d1117;font-weight:600}
${R} .nm-bar .sep{width:1px;height:18px;background:${C.line}}
${R} .nm-msg{color:${C.muted};padding:0 4px}
${R} .nm-side{width:330px;flex:none;border-left:1px solid ${C.line};display:flex;flex-direction:column;background:#0f141b;min-height:0}
${R} .nm-side.closed{width:34px}
${R} .nm-side.closed .nm-tbl,${R} .nm-side.closed .nm-side-title{display:none}
${R} .nm-side-head{display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid ${C.line}}
${R} .nm-side-head button{background:none;border:1px solid ${C.line};color:${C.text};border-radius:6px;cursor:pointer;padding:1px 7px}
${R} .nm-side-title{font-weight:600}
${R} .nm-tbl{overflow:auto;flex:1}
${R} .nm-tbl table{border-collapse:collapse;width:100%}
${R} .nm-tbl th{position:sticky;top:0;background:#161b22;color:${C.muted};font-weight:600;text-align:left;padding:6px;cursor:pointer;user-select:none;white-space:nowrap}
${R} .nm-tbl th:hover{color:${C.text}}
${R} .nm-tbl td{padding:4px 6px;border-bottom:1px solid #1c222b;white-space:nowrap}
${R} .nm-tbl td.num,${R} .nm-tbl th.num{text-align:right;font-variant-numeric:tabular-nums}
${R} .nm-tbl tr:hover td{background:#1b2330;cursor:pointer}
${R} .nm-tbl tr.sel td{background:#1f3350}
${R} .nm-tbl td.bad{color:${C.broken};font-weight:600}
${R} .nm-tbl td.warn{color:${C.partial};font-weight:600}
`;
      document.head.appendChild(s);
    }

    // ---------- the 3D view: renderer, camera, orbit controls, picking, overlays ----------
    function view(el, opts = {}) {
      injectStyle();
      const root = h('div', 'nm');
      const stage = h('div', 'nm-stage');
      root.appendChild(stage);
      el.appendChild(root);

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      stage.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(C.bg);
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
      controls.screenSpacePanning = true;
      scene.add(new THREE.HemisphereLight(0xc9d8ff, 0x1a1f2a, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(0.6, 1, 0.8);
      scene.add(sun);
      const world = new THREE.Group();
      scene.add(world);

      const layers = [];       // everything that recolors on filter / focus
      const pickables = [];    // layers that respond to hover / click
      const frameFns = [];
      const ui = { filter: 'all', focus: null };  // focus: Set of device ids, or null
      const tip = h('div', 'nm-box nm-tip');
      tip.hidden = true;
      stage.appendChild(tip);

      // A device is dimmed when a filter or a search/selection focus excludes it.
      function passes(item) {
        if (ui.focus && !(item.id && ui.focus.has(item.id)) && !(item.ids && item.ids.some((i) => ui.focus.has(i)))) return false;
        if (ui.filter === 'all') return true;
        if (item.ghost) return false;
        if (item.lineState) return item.lineState === ui.filter || (ui.filter === 'drained' && item.ids && item.ids.some((i) => kit.device(i)?.drained));
        if (ui.filter === 'broken') return item.broken > 0;
        if (ui.filter === 'partial') return item.partial > 0;
        if (ui.filter === 'drained') return item.drained;
        return true;
      }
      function repaint() { for (const L of layers) L.paint(); }

      // Boxes: one InstancedMesh for many devices (fast for 1000s of racks).
      // items: objects with optional id; o.pos(item) -> [x,y,z] (y = floor), o.size [w,h,d] or fn, o.color(item) -> css color
      function boxes(items, o) {
        const n = Math.max(items.length, 1);
        const mat = new THREE.MeshLambertMaterial({ transparent: o.opacity != null, opacity: o.opacity ?? 1, wireframe: !!o.wireframe, depthWrite: o.opacity == null });
        const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n);
        mesh.count = items.length;
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
        const centers = [], sizes = [];
        items.forEach((it, i) => {
          const p = o.pos(it), s = typeof o.size === 'function' ? o.size(it) : o.size;
          const c = new THREE.Vector3(p[0], p[1] + s[1] / 2, p[2]);
          centers.push(c); sizes.push(s);
          mesh.setMatrixAt(i, m4.compose(c, q, new THREE.Vector3(s[0], s[1], s[2])));
          mesh.setColorAt(i, col.set(C.body));
        });
        mesh.instanceMatrix.needsUpdate = true;
        world.add(mesh);
        const L = {
          mesh, items, centers, sizes, tip: o.tip, onClick: o.onClick,
          paint() {
            if (!items.length) return;
            items.forEach((it, i) => mesh.setColorAt(i, col.set(passes(it) ? o.color(it) : C.dim)));
            mesh.instanceColor.needsUpdate = true;
          },
          find(id) { const i = items.findIndex((it) => it.id === id); return i < 0 ? null : { item: items[i], center: centers[i], size: sizes[i] }; },
        };
        L.paint();
        layers.push(L);
        if (o.pick !== false) pickables.push(L);
        return L;
      }

      // Lines: segs [{a:[x,y,z], b:[x,y,z], state:'ok'|'partial'|'broken', ids:[idA,idB]}]
      function lines(segs, o = {}) {
        const pos = new Float32Array(segs.length * 6), cols = new Float32Array(segs.length * 6);
        segs.forEach((s, i) => { pos.set(s.a, i * 6); pos.set(s.b, i * 6 + 3); s.lineState = s.state; });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: o.opacity != null, opacity: o.opacity ?? 1 });
        const mesh = new THREE.LineSegments(geo, mat);
        world.add(mesh);
        const col = new THREE.Color();
        const colorOf = o.color || ((s) => (s.state === 'ok' ? C.okLine : C[s.state]));
        const L = {
          mesh, items: segs,
          paint() {
            segs.forEach((s, i) => { col.set(passes(s) ? colorOf(s) : C.dim); col.toArray(cols, i * 6); col.toArray(cols, i * 6 + 3); });
            geo.attributes.color.needsUpdate = true;
          },
          find() { return null; },
        };
        L.paint();
        layers.push(L);
        return L;
      }

      // Text label that always faces the camera. size = height in world units.
      function label(text, pos, o = {}) {
        const fs = 64, pad = 18;
        const cv = document.createElement('canvas');
        const ctx = cv.getContext('2d');
        ctx.font = `600 ${fs}px system-ui, sans-serif`;
        cv.width = Math.ceil(ctx.measureText(text).width + pad * 2);
        cv.height = fs + pad * 2;
        ctx.font = `600 ${fs}px system-ui, sans-serif`;
        if (o.bg !== false) { ctx.fillStyle = 'rgba(13,17,23,0.72)'; ctx.fillRect(0, 0, cv.width, cv.height); }
        ctx.fillStyle = o.color || C.text;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, pad, cv.height / 2);
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: o.depthTest ?? false, transparent: true }));
        const size = o.size || 1;
        sp.scale.set(size * cv.width / cv.height, size, 1);
        sp.position.set(pos[0], pos[1], pos[2]);
        sp.renderOrder = 10;
        world.add(sp);
        return sp;
      }

      function floor(x0, z0, x1, z1, o = {}) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0),
          new THREE.MeshLambertMaterial({ color: o.color || '#161c25', transparent: true, opacity: o.opacity ?? 1 }));
        g.rotation.x = -Math.PI / 2;
        g.position.set((x0 + x1) / 2, o.y || 0, (z0 + z1) / 2);
        world.add(g);
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(g.geometry), new THREE.LineBasicMaterial({ color: o.edge || C.line }));
        edge.rotation.copy(g.rotation); edge.position.copy(g.position); edge.position.y += 0.001;
        world.add(edge);
        return g;
      }

      // ---------- camera framing ----------
      const dir = new THREE.Vector3(...(opts.viewDir || [0, 1.2, 1])).normalize();
      function frame(box, d = dir) {
        if (box.isEmpty()) return;
        const sph = box.getBoundingSphere(new THREE.Sphere());
        const vf = THREE.MathUtils.degToRad(camera.fov);
        const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
        const dist = (sph.radius / Math.sin(Math.min(vf, hf) / 2)) * (opts.fitMargin || 1.0);
        camera.near = Math.max(0.05, dist / 200); camera.far = dist * 20; camera.updateProjectionMatrix();
        return { target: sph.center.clone(), pos: sph.center.clone().addScaledVector(d, dist) };
      }
      // fit(): every device on screen. Called automatically once the canvas has a size.
      function fit() {
        const f = frame(new THREE.Box3().setFromObject(world));
        if (!f) return;
        camera.position.copy(f.pos); controls.target.copy(f.target); controls.update();
      }
      let tween = null;
      function flyTo(center, radius) {
        const box = new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(radius, radius, radius).multiplyScalar(2));
        const offset = camera.position.clone().sub(controls.target).normalize();
        const f = frame(box, offset);
        if (!f) return;
        tween = { t0: performance.now(), from: camera.position.clone(), fromT: controls.target.clone(), to: f.pos, toT: f.target };
      }

      // ---------- selection marker (pulsing outline, idea from nVisual) ----------
      const marker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: C.select, wireframe: true, depthTest: false, transparent: true }));
      marker.renderOrder = 20; marker.visible = false; marker.raycast = () => {};
      scene.add(marker);
      const markSize = new THREE.Vector3();
      function mark(center, size) {
        if (!center) { marker.visible = false; return; }
        marker.position.copy(center); markSize.set(size[0] + 0.25, size[1] + 0.25, size[2] + 0.25); marker.visible = true;
      }
      function findAny(id) { for (const L of layers) { const f = L.find(id); if (f) return f; } return null; }

      // ---------- hover tooltip + click to select ----------
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let hoverDirty = false, mouse = null, down = null;
      const canvas = renderer.domElement;
      function pick() {
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(pickables.map((p) => p.mesh), false)[0];
        if (!hit) return null;
        const L = pickables.find((p) => p.mesh === hit.object);
        return { L, item: L.items[hit.instanceId] };
      }
      canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
        ndc.set((mouse.x / r.width) * 2 - 1, -(mouse.y / r.height) * 2 + 1);
        hoverDirty = true;
      });
      canvas.addEventListener('pointerleave', () => { mouse = null; tip.hidden = true; });
      canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
      canvas.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
        const p = pick();
        if (!p) return;
        if (p.L.onClick) p.L.onClick(p.item);
        else if (p.item.id && kit.device(p.item.id)) kit.select(p.item.id);
      });
      function hover() {
        hoverDirty = false;
        const p = mouse && pick();
        if (!p || !p.L.tip) { tip.hidden = true; canvas.style.cursor = ''; return; }
        tip.innerHTML = p.L.tip(p.item);
        tip.hidden = false;
        canvas.style.cursor = 'pointer';
        const w = stage.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
        tip.style.left = `${Math.min(mouse.x + 14, w - tw - 6)}px`;
        tip.style.top = `${Math.max(6, mouse.y - th - 10)}px`;
      }

      // ---------- overlays: toolbar, legend, sortable side table ----------
      const bar = h('div', 'nm-box nm-bar');
      stage.appendChild(bar);
      const msg = h('span', 'nm-msg');
      function setFilter(f) { ui.filter = f; for (const b of bar.querySelectorAll('[data-f]')) b.classList.toggle('on', b.dataset.f === f); repaint(); }
      function setFocus(ids, text) { ui.focus = ids && ids.size ? ids : null; msg.textContent = text || ''; repaint(); }
      function button(text, fn, data) { const b = h('button', '', esc(text)); if (data) b.dataset.f = data; b.addEventListener('click', fn); bar.appendChild(b); return b; }
      // Filter chips never show counts: counting is the judge's job (no answers on the page).
      for (const [f, t] of [['all', 'All'], ['broken', 'Broken'], ['partial', 'Partly broken'], ['drained', 'Drained']]) button(t, () => setFilter(f), f);
      bar.appendChild(h('span', 'sep'));
      button('Clear', () => { setFilter('all'); setFocus(null); mark(null); table && table.clearSel(); });
      button('Fit', () => fit());
      bar.appendChild(msg);
      setFilter('all');
      function toggle(text, on, fn) {
        const b = button(text, () => { on = !on; b.classList.toggle('on', on); fn(on); });
        b.classList.toggle('on', on);
        bar.insertBefore(b, msg);
        return b;
      }

      function legend(extra = []) {
        const lg = h('div', 'nm-box nm-legend');
        const row = (sw, text) => lg.insertAdjacentHTML('beforeend', `<div>${sw}<span>${esc(text)}</span></div>`);
        row(`<span class="nm-sw" style="background:${C.body};box-shadow:inset 0 -3px 0 ${C.ok}"></span>`, 'Healthy device');
        row(`<span class="nm-sw" style="background:${C.drained}"></span>`, STATE_LABEL.drained);
        row(`<span class="nm-sw" style="background:${C.partial}"></span>`, 'Has a partly broken link');
        row(`<span class="nm-sw" style="background:${C.broken}"></span>`, 'Has a broken link');
        row(`<span class="nm-sw ln" style="background:${C.okLine}"></span>`, 'Link: all cables up');
        row(`<span class="nm-sw ln" style="background:${C.partial}"></span>`, 'Link: some cables down');
        row(`<span class="nm-sw ln" style="background:${C.broken}"></span>`, 'Link: all cables down');
        for (const [sw, text] of extra) row(sw, text);
        stage.appendChild(lg);
        return lg;
      }

      let table = null;
      // columns: [{key, label, num}]; rows: plain objects; onRow(row) when clicked. Sorted only when a header is clicked.
      function sideTable(title, columns, rows, onRow, o = {}) {
        const side = h('div', 'nm-side');
        const head = h('div', 'nm-side-head');
        const btn = h('button', '', '⟩');
        btn.title = 'Show or hide the list';
        head.append(btn, h('span', 'nm-side-title', esc(title)));
        const wrap = h('div', 'nm-tbl');
        side.append(head, wrap);
        root.appendChild(side);
        btn.addEventListener('click', () => { side.classList.toggle('closed'); btn.textContent = side.classList.contains('closed') ? '⟨' : '⟩'; });
        let sortKey = null, asc = true, selRow = null;
        const cls = o.cellClass || (() => '');
        function draw() {
          const list = rows.slice();
          if (sortKey) list.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1); });
          const thead = `<tr>${columns.map((c) => `<th data-k="${esc(c.key)}" class="${c.num ? 'num' : ''}">${esc(c.label)}${sortKey === c.key ? (asc ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr>`;
          const body = list.map((r) => `<tr data-i="${rows.indexOf(r)}" class="${r === selRow ? 'sel' : ''}">${columns.map((c) => `<td class="${c.num ? 'num ' : ''}${cls(c.key, r[c.key], r)}">${esc(r[c.key])}</td>`).join('')}</tr>`).join('');
          wrap.innerHTML = `<table>${thead}${body}</table>`;
        }
        wrap.addEventListener('click', (e) => {
          const th = e.target.closest('th');
          if (th) { const k = th.dataset.k; if (sortKey === k) asc = !asc; else { sortKey = k; asc = !columns.find((c) => c.key === k).num; } draw(); return; }
          const tr = e.target.closest('tr[data-i]');
          if (tr) { selRow = rows[+tr.dataset.i]; draw(); onRow && onRow(selRow); }
        });
        draw();
        table = { clearSel() { selRow = null; draw(); }, redraw: draw };
        return table;
      }

      // ---------- shared header search box + selection (we only listen; the header is untouched) ----------
      kit.onSelect((id) => {
        if (opts.onSelect && opts.onSelect(id) === true) return;
        const f = findAny(id);
        if (!f) { mark(null); return; }
        mark(f.center, f.size);
        setFocus(new Set([id]), id);
        flyTo(f.center, Math.max(...f.size) * 6);
      });
      kit.onSearch((q) => {
        if (kit.device(q)) return;  // exact names are handled by onSelect
        const needle = q.toLowerCase();
        const ids = new Set();
        for (const L of layers) for (const it of L.items) if (it.id && String(it.id).toLowerCase().includes(needle)) ids.add(it.id);
        setFocus(ids, ids.size ? `matches "${q}"` : `no match for "${q}"`);
      });
      root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setFilter('all'); setFocus(null); mark(null); } });
      canvas.tabIndex = 0;

      // ---------- render loop: only runs work while this page is visible ----------
      let alive = true, fitted = false, lastW = 0, lastH = 0;
      function resize() {
        const w = stage.clientWidth, hh = stage.clientHeight;
        if (!w || !hh) return false;
        if (w !== lastW || hh !== lastH) {
          lastW = w; lastH = hh;
          renderer.setSize(w, hh, false);
          camera.aspect = w / hh; camera.updateProjectionMatrix();
          if (!fitted) { fitted = true; fit(); }
        }
        return true;
      }
      function loop(t) {
        if (!alive) return;
        requestAnimationFrame(loop);
        if (!root.isConnected) { dispose(); return; }
        if (root.offsetParent === null || !resize()) return;
        if (tween) {
          const k = Math.min(1, (t - tween.t0) / 550), e = 1 - Math.pow(1 - k, 3);
          camera.position.lerpVectors(tween.from, tween.to, e);
          controls.target.lerpVectors(tween.fromT, tween.toT, e);
          if (k >= 1) tween = null;
        }
        controls.update();
        if (marker.visible) { const s = 1 + 0.12 * Math.sin(t / 160); marker.scale.copy(markSize).multiplyScalar(s); }
        for (const fn of frameFns) fn(t);
        if (hoverDirty) hover();
        renderer.render(scene, camera);
      }
      function dispose() {
        alive = false;
        controls.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      }
      requestAnimationFrame(loop);

      return {
        THREE, scene, camera, controls, renderer, world, stage, root, C,
        boxes, lines, label, floor, legend, sideTable, toggle, button,
        fit, flyTo, mark, setFocus, setFilter, repaint, findAny,
        onFrame: (fn) => frameFns.push(fn),
        resize: () => { lastW = 0; resize(); },
        dispose,
      };
    }

    // ---------- starter layout: devices stacked by tier, one column per site (replace with your own) ----------
    function tierStack(v, tiers, o = {}) {
      const devs = kit.model.devices.filter((d) => tiers.includes(d.tier));
      const sites = uniq(devs, 'site');
      const ids = new Set(devs.map((d) => d.id));
      const posOf = new Map();
      const items = [];
      const gap = o.gap || 1.4, tierGap = o.tierGap || 5;
      let x0 = 0;
      for (const site of sites) {
        let width = 0;
        const perTier = tiers.map((t) => devs.filter((d) => d.site === site && d.tier === t));
        const cols = Math.max(...perTier.map((list) => Math.ceil(Math.sqrt(list.length * 4))), 1);
        perTier.forEach((list, ti) => {
          list.forEach((d, i) => {
            const c = i % cols, r = Math.floor(i / cols);
            const p = [x0 + c * gap, (tiers.length - 1 - ti) * tierGap, r * gap];
            posOf.set(d.id, p);
            items.push(Object.assign(health(d.id, kit.linksOf(d.id)), { pos: p }));
            width = Math.max(width, c * gap);
          });
        });
        v.label(kit.siteName(site), [x0 + width / 2, tiers.length * tierGap, 0], { size: 1.6 });
        x0 += width + gap * 6;
      }
      const bodyColor = (it) => (it.drained ? C.drained : it.linkWorst === 'ok' ? C.body : C[it.linkWorst]);
      const L = v.boxes(items, { pos: (it) => it.pos, size: [0.9, 0.9, 0.9], color: bodyColor, tip: deviceTip });
      const segs = kit.model.links.filter((l) => ids.has(l.a) && ids.has(l.b)).map((l) => {
        const a = posOf.get(l.a), b = posOf.get(l.b);
        return { a: [a[0], a[1] + 0.45, a[2]], b: [b[0], b[1] + 0.45, b[2]], state: linkState(l), ids: [l.a, l.b], link: l };
      });
      const lines = v.lines(segs);
      return { items, boxes: L, lines, segs, posOf };
    }

    function deviceTip(it) {
      const d = it.d || kit.device(it.id);
      const where = [kit.siteName(d.site), d.pod != null && `pod ${d.pod}`, d.plane != null && `plane ${d.plane}`,
        d.row != null && `row ${d.row} col ${d.col}`].filter(Boolean).join(' · ');
      return `<b>${esc(d.id)}</b><br><span class="k">${esc(d.tier.replace(/_/g, ' '))} · ${esc(where)}</span>`
        + `<br>${d.drained ? `<span style="color:${C.drained}">● Drained</span><br>` : ''}`
        + `<span class="k">Links checked:</span> ${it.links} · <span class="k">cables up</span> ${it.up}/${it.total}`
        + `<br><span style="color:${C.broken}">Broken links: ${it.broken}</span> · <span style="color:${C.partial}">Partly broken: ${it.partial}</span>`;
    }

    return { C, STATE_LABEL, linkState, otherEnd, health, uniq, groupBy, esc, view, tierStack, deviceTip };
  }
  // ==== SHARED v1 END ====

  let v = null;
  return {
    mount(el, model, kit) {
      const S = shared(kit, PAGE);
      v = S.view(el, { viewDir: [0.5, 0.6, 1] });

      // Devices stacked by tier (top = highest tier), one block per site, links colored by state.
      const stack = S.tierStack(v, ["backbone_router","border","super_spine"]);
      v.legend();

      // Sortable device list: per-device facts only, sorted when the judge clicks a header.
      v.sideTable("Devices", [
        { key: "id", label: "Device" }, { key: "tier", label: "Tier" },
        { key: "broken", label: "Broken", num: true }, { key: "partial", label: "Partly", num: true }, { key: "drained", label: "Drained" },
      ], stack.items.map((it) => ({ id: it.id, tier: it.d.tier.replace(/_/g, " "), broken: it.broken, partial: it.partial, drained: it.drained ? "yes" : "" })),
      (row) => kit.select(row.id),
      { cellClass: (k, val) => (k === "broken" && val > 0 ? "bad" : k === "partial" && val > 0 ? "warn" : "") });
    },
    resize() { if (v) v.resize(); },
  };
});
