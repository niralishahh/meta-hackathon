// Racks page: every rack at its row and col on each site's hall floor, with its uplinks to the spines.
// REFERENCE PAGE for the team template: copy its patterns (S.view, v.boxes, v.lines, v.legend, v.sideTable).
//
// Hackathon rules this file follows (keep them true when you edit):
// - All code stays inside kit.page(...). No import/export lines, no globals.
// - Only THREE and d3 (already loaded). No other packages, no internet links.
// - Never touch the header (tabs, topology name, search box), even from CSS. We only listen via kit.onSearch.
// - Draw from the data: no hard-coded number of sites, pods, rows, cols or racks.
// - Never write the answer: no "worst / most / fewest" label. Sorting the table is the judge's tool.

kit.page('racks', function () {
  const PAGE = 'racks';

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
      const { C, esc } = S;
      const V3 = THREE.Vector3;

      // ---------- layout constants (spacing only; all counts come from the data) ----------
      const PX = 1.0;          // col pitch
      const PZ = 1.7;          // row pitch
      const POD_GAP = 1.6;     // extra aisle between pods
      const RACK = [0.78, 1.5, 1.1];
      const SPINE_Y = 6;
      const VIEW_DIR = [0, 1.45, 0.9];

      let userMoved = false;
      let selLines = null;
      v = S.view(el, { viewDir: VIEW_DIR, onSelect: (id) => selectDevice(id) });
      v.controls.addEventListener('start', () => { userMoved = true; });
      injectPageStyle();

      const tors = kit.devicesByTier('top_of_rack');
      const spines = kit.devicesByTier('spine');
      const siteCodes = model.sites.map((s) => s.code).filter((c) => tors.some((d) => d.site === c));

      // ---------- pass 1: each site's hall in local coordinates ----------
      const halls = siteCodes.map((site) => {
        const racks = tors.filter((d) => d.site === site);
        const placed = racks.filter((d) => d.row != null && d.col != null);
        const maxCol = Math.max(1, ...placed.map((d) => d.col));
        const minRow = Math.min(1, ...placed.map((d) => d.row));
        let maxRow = Math.max(minRow, ...placed.map((d) => d.row));
        const rc = new Map(placed.map((d) => [d.id, { row: d.row, col: d.col }]));
        // Racks without row/col (should not happen) go on extra rows at the back, so nothing is lost.
        racks.filter((d) => !rc.has(d.id)).forEach((d, i) => rc.set(d.id, { row: maxRow + 1 + Math.floor(i / maxCol), col: 1 + (i % maxCol) }));
        maxRow = Math.max(maxRow, ...[...rc.values()].map((p) => p.row));

        // Which pod owns each row. A row with no racks at all belongs to the pod before it.
        const rowPod = new Map();
        for (const d of racks) { const r = rc.get(d.id).row; if (!rowPod.has(r)) rowPod.set(r, d.pod); }
        for (let r = minRow, last; r <= maxRow; r++) { if (rowPod.has(r)) last = rowPod.get(r); else if (last !== undefined) rowPod.set(r, last); }
        const rowZ = new Map();
        let z = 0, prevPod;
        for (let r = minRow; r <= maxRow; r++) {
          const p = rowPod.get(r);
          if (r > minRow && p !== undefined && prevPod !== undefined && p !== prevPod) z += POD_GAP;
          rowZ.set(r, z);
          z += PZ;
          if (p !== undefined) prevPod = p;
        }
        return { site, racks, rc, minRow, maxRow, maxCol, rowPod, rowZ, w: (maxCol - 1) * PX, d: rowZ.get(maxRow) + RACK[2] };
      });

      // ---------- pass 2: arrange halls in a grid that best fits the screen (works for any number of sites) ----------
      const aspect = (v.stage.clientWidth || 1100) / (v.stage.clientHeight || 800);
      const cellW = Math.max(...halls.map((h) => h.w), 1) + 7;
      const cellD = Math.max(...halls.map((h) => h.d), 1) + 9;
      let perRow = 1, best = -1;
      for (let k = 1; k <= Math.max(1, halls.length); k++) {
        const score = Math.min(aspect / (k * cellW), 1 / (Math.ceil(halls.length / k) * cellD * 0.8));
        if (score > best + 1e-9) { best = score; perRow = k; }
      }
      halls.forEach((h, i) => { h.ox = (i % perRow) * cellW; h.oz = Math.floor(i / perRow) * cellD; });

      // ---------- pass 3: devices, empty slots, pods ----------
      const rackItems = [], ghosts = [], spineItems = [], pods = [];
      const posOf = new Map();
      const recOf = new Map();
      const content = new THREE.Box3();
      const grow = (x, y, z) => content.expandByPoint(new V3(x, y, z));

      for (const H of halls) {
        const at = (row, col) => [H.ox + (col - 1) * PX, 0, H.oz + H.rowZ.get(row)];
        const taken = new Set(H.racks.map((d) => { const p = H.rc.get(d.id); return `${p.row},${p.col}`; }));
        for (let r = H.minRow; r <= H.maxRow; r++) {
          for (let c = 1; c <= H.maxCol; c++) {
            if (!taken.has(`${r},${c}`)) ghosts.push({ ghost: true, site: H.site, row: r, col: c, pod: H.rowPod.get(r), pos: at(r, c) });
          }
        }
        for (const d of H.racks) {
          const p = H.rc.get(d.id);
          const it = Object.assign(S.health(d.id), { pos: at(p.row, p.col), site: d.site, pod: d.pod, row: p.row, col: p.col });
          rackItems.push(it);
          posOf.set(d.id, it.pos);
          recOf.set(d.id, it);
        }
        const x0 = H.ox, x1 = H.ox + H.w, z0 = H.oz, z1 = H.oz + H.d;
        grow(x0 - RACK[0], 0, z0 - RACK[2]); grow(x1 + RACK[0], RACK[1], z1);

        // Hall floor, site title, row numbers.
        v.floor(x0 - 1.4, z0 - 1.4, x1 + 1.4, z1 + 0.6, { color: '#111720', edge: '#2b3442' });
        const titleSize = Math.max(1.3, (H.w + 2) * 0.085);
        v.label(`${kit.siteName(H.site)} (${H.site})`, [(x0 + x1) / 2, SPINE_Y + 2.6, z0 - 1.5], { size: titleSize });
        grow((x0 + x1) / 2, SPINE_Y + 2.6 + titleSize, z0 - 1.5);
        for (let r = H.minRow; r <= H.maxRow; r++) {
          v.label(`r${r}`, [x1 + 1.05, 0.3, H.oz + H.rowZ.get(r)], { size: 0.42, bg: false, color: '#6e7681' });
        }
        grow(x1 + 1.6, 0, z0);

        // Pods: label, spines floating above the pod, a hoverable floor plate.
        for (const [pod, list] of S.groupBy(H.racks, (d) => d.pod)) {
          const xs = list.map((d) => posOf.get(d.id)[0]), zs = list.map((d) => posOf.get(d.id)[2]);
          const podRowsSet = new Set([...H.rowPod].filter(([, p]) => p === pod).map(([r]) => r));
          const podZs = [...podRowsSet].map((r) => H.oz + H.rowZ.get(r));
          const minX = x0, maxX = x1;
          const minZ = Math.min(...zs, ...podZs), maxZ = Math.max(...zs, ...podZs), midZ = (minZ + maxZ) / 2;
          if (pod != null) v.label(`pod ${pod}`, [minX - 2.2, 0.5, midZ], { size: 0.62, color: '#c9d1d9' });
          grow(minX - 3.4, 0, midZ);
          const podSpines = spines.filter((s) => s.site === H.site && s.pod === pod)
            .sort((a, b) => (a.plane ?? 0) - (b.plane ?? 0) || (a.id < b.id ? -1 : 1));
          podSpines.forEach((s, i) => {
            const x = podSpines.length === 1 ? (minX + maxX) / 2 : minX + 1 + (i * (maxX - minX - 2)) / (podSpines.length - 1);
            const it = Object.assign(S.health(s.id, kit.linksOf(s.id)), { pos: [x, SPINE_Y, midZ] });
            spineItems.push(it);
            posOf.set(s.id, it.pos);
            grow(x, SPINE_Y + 0.5, midZ);
          });
          pods.push({
            site: H.site, pod, rows: podRowsSet, spineIds: podSpines.map((s) => s.id),
            pos: [(minX + maxX) / 2, 0.005, midZ], size: [maxX - minX + 1.2, 0.02, maxZ - minZ + RACK[2] + 0.5],
            center: [(minX + maxX) / 2, 1, midZ], span: Math.max(maxX - minX, maxZ - minZ) + 2,
          });
          void xs;
        }
      }

      // ---------- per-rack facts used by the table, tooltips and filters ----------
      const spineDrained = (id) => !!kit.device(id)?.drained;
      for (const it of rackItems) {
        const ups = kit.uplinks(it.id);
        it.toDrained = ups.filter((l) => spineDrained(S.otherEnd(l, it.id))).length;
        it.siteName = kit.siteName(it.site);
      }

      // ---------- draw ----------
      const rackBody = (it) => (it.drained ? C.drained : it.linkWorst === 'ok' ? C.body : C[it.linkWorst]);
      v.boxes(rackItems, { pos: (it) => it.pos, size: RACK, color: rackBody, tip: rackTip });
      // Status "LED" cap on each rack (nVisual idea): uplink health, visible even on drained racks.
      v.boxes(rackItems, { pos: (it) => [it.pos[0], RACK[1], it.pos[2]], size: [RACK[0] * 0.92, 0.14, RACK[2] * 0.92], color: (it) => C[it.linkWorst], pick: false });
      v.boxes(spineItems, {
        pos: (it) => it.pos, size: [0.8, 0.5, 0.8], tip: S.deviceTip,
        color: (it) => (it.drained ? C.drained : it.linkWorst === 'ok' ? '#6e8bb0' : C[it.linkWorst]),
      });
      // Empty slots: hoverable translucent base + dashed full-height outline, so missing racks read as gaps.
      v.boxes(ghosts, {
        pos: (g) => g.pos, size: [RACK[0], 0.05, RACK[2]], color: () => '#2a3340', opacity: 0.6,
        tip: (g) => `<b>Empty slot (missing rack)</b><br><span class="k">${esc(kit.siteName(g.site))} · row ${g.row} col ${g.col}${g.pod != null ? ` · pod ${esc(g.pod)}` : ''}</span>`,
      });
      drawGhostOutlines();
      // Pod floor plates: hover for pod totals, click to focus the pod.
      v.boxes(pods, {
        pos: (p) => p.pos, size: (p) => p.size, color: () => '#18202b', tip: podTip, onClick: (p) => focusPod(p),
      });

      // Uplinks rack -> spine. Problem links always drawn; links to a drained spine in purple; healthy ones optional.
      const segs = [];
      for (const it of rackItems) {
        for (const l of kit.uplinks(it.id)) {
          const other = S.otherEnd(l, it.id), to = posOf.get(other);
          if (!to) continue;
          let state = S.linkState(l);
          if (state === 'ok' && spineDrained(other)) state = 'drained';
          segs.push({ a: [it.pos[0], RACK[1] + 0.14, it.pos[2]], b: [to[0], to[1], to[2]], state, ids: [l.a, l.b] });
        }
      }
      v.lines(segs.filter((s) => s.state !== 'ok'));
      const okLines = v.lines(segs.filter((s) => s.state === 'ok'), { opacity: 0.22 });
      okLines.mesh.visible = false;
      v.toggle('Healthy uplinks', false, (on) => { okLines.mesh.visible = on; });

      // Tight "Fit": replaces the toolbar's sphere fit; also used on open and whenever the page is resized.
      const bar = v.stage.querySelector('.nm-bar');
      const oldFit = [...bar.querySelectorAll('button')].find((b) => b.textContent === 'Fit');
      if (oldFit) { const nb = oldFit.cloneNode(true); oldFit.replaceWith(nb); nb.addEventListener('click', () => { userMoved = false; fitTight(); }); }
      const clearBtn = [...bar.querySelectorAll('button')].find((b) => b.textContent === 'Clear');
      if (clearBtn) clearBtn.addEventListener('click', () => clearSelection());
      v.root.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearSelection(); });
      let lw = 0, lh = 0;
      v.onFrame(() => {
        const w = v.stage.clientWidth, h = v.stage.clientHeight;
        if (w !== lw || h !== lh) { lw = w; lh = h; if (!userMoved) fitTight(); }
      });

      // ---------- side panel: legend + group-by table (the judge's speed tool) ----------
      const card = document.createElement('div');
      card.className = 'nm-box rk-card';
      card.hidden = true;
      v.stage.appendChild(card);
      buildSidePanel();

      // =====================================================================
      function rackTip(it) {
        const ups = kit.uplinks(it.id).map((l) => {
          const s = S.linkState(l), o = S.otherEnd(l, it.id);
          const col = s === 'ok' ? (spineDrained(o) ? C.drained : C.ok) : C[s];
          return `<br><span style="color:${col}">●</span> ${esc(o)} <span class="k">${l.up}/${l.count} up${spineDrained(o) ? ' · spine drained' : ''}</span>`;
        }).join('');
        return `<b>${esc(it.id)}</b><br><span class="k">${esc(it.siteName)} · pod ${esc(it.pod)} · row ${it.row} col ${it.col}</span>`
          + `${it.drained ? `<br><span style="color:${C.drained}">● Drained rack</span>` : ''}`
          + `<br><span style="color:${C.broken}">Broken uplinks: ${it.broken}</span> · <span style="color:${C.partial}">Partly broken: ${it.partial}</span>${ups}`;
      }

      function podStats(p) {
        const rs = rackItems.filter((r) => r.site === p.site && r.pod === p.pod);
        const empty = ghosts.filter((g) => g.site === p.site && p.rows.has(g.row)).length;
        return aggregate(rs, empty);
      }
      function podTip(p) {
        const s = podStats(p);
        return `<b>${esc(kit.siteName(p.site))} · pod ${esc(p.pod)}</b>`
          + `<br><span class="k">Racks</span> ${s.racks} · <span class="k">Empty slots</span> ${s.empty}`
          + `<br><span style="color:${C.broken}">Racks with a broken uplink: ${s.brokenRacks}</span>`
          + `<br><span class="k">Broken uplinks</span> ${s.brokenLinks} · <span class="k">Racks with 2+ broken</span> ${s.multi}`
          + `<br><span style="color:${C.partial}">Racks with a partly broken uplink: ${s.partialRacks}</span>`
          + `<br><span style="color:${C.drained}">Drained racks: ${s.drained} · Racks wired to a drained spine: ${s.toDrained}</span>`
          + `<br><span class="k">Click to focus this pod</span>`;
      }

      function aggregate(rs, empty) {
        return {
          racks: rs.length, empty,
          brokenRacks: rs.filter((r) => r.broken > 0).length,
          brokenLinks: rs.reduce((n, r) => n + r.broken, 0),
          multi: rs.filter((r) => r.broken > 1).length,
          partialRacks: rs.filter((r) => r.partial > 0).length,
          drained: rs.filter((r) => r.drained).length,
          toDrained: rs.filter((r) => r.toDrained > 0).length,
        };
      }

      function drawGhostOutlines() {
        if (!ghosts.length) return;
        const [w, hgt, d] = RACK, hx = w / 2, hz = d / 2;
        const corners = [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz], [-hx, hgt, -hz], [hx, hgt, -hz], [hx, hgt, hz], [-hx, hgt, hz]];
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        const pos = new Float32Array(ghosts.length * edges.length * 6);
        let k = 0;
        for (const g of ghosts) {
          for (const [a, b] of edges) {
            for (const c of [corners[a], corners[b]]) { pos[k++] = g.pos[0] + c[0]; pos[k++] = c[1]; pos[k++] = g.pos[2] + c[2]; }
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const lines = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({ color: '#9aa7b8', dashSize: 0.12, gapSize: 0.09 }));
        lines.computeLineDistances();
        v.world.add(lines);
      }

      // Camera distance from the projected corners of everything drawn, keeping clear of the toolbar.
      function fitTight() {
        const W = v.stage.clientWidth, Hh = v.stage.clientHeight;
        if (!W || !Hh || content.isEmpty()) return;
        const cam = v.camera;
        cam.aspect = W / Hh; cam.updateProjectionMatrix();
        const pts = [];
        for (const x of [content.min.x, content.max.x]) for (const y of [content.min.y, content.max.y]) for (const z of [content.min.z, content.max.z]) pts.push(new V3(x, y, z));
        const dir = new V3(...VIEW_DIR).normalize();
        const topLim = 1 - (2 * (bar.offsetHeight + 22)) / Hh, botLim = -1 + 0.05, sideLim = 1 - 0.04;
        const target = content.getCenter(new V3());
        const tmp = new V3();
        const bounds = (dist) => {
          cam.position.copy(target).addScaledVector(dir, dist);
          cam.lookAt(target); cam.updateMatrixWorld();
          let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
          for (const p of pts) { tmp.copy(p).project(cam); x0 = Math.min(x0, tmp.x); x1 = Math.max(x1, tmp.x); y0 = Math.min(y0, tmp.y); y1 = Math.max(y1, tmp.y); }
          return { x0, x1, y0, y1 };
        };
        const fits = (b) => b.x0 >= -sideLim && b.x1 <= sideLim && b.y0 >= botLim && b.y1 <= topLim;
        let dist = 1;
        for (let pass = 0; pass < 3; pass++) {
          let lo = 1, hi = 20000;
          for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fits(bounds(mid))) hi = mid; else lo = mid; }
          dist = hi;
          // Re-center the projected box inside the free area, then search again.
          const b = bounds(dist);
          const dx = (b.x0 + b.x1) / 2, dy = (b.y0 + b.y1) / 2 - (topLim + botLim) / 2;
          const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * dist;
          const right = new V3().setFromMatrixColumn(cam.matrixWorld, 0), up = new V3().setFromMatrixColumn(cam.matrixWorld, 1);
          target.addScaledVector(right, dx * halfH * cam.aspect).addScaledVector(up, dy * halfH);
        }
        bounds(dist);
        cam.near = Math.max(0.05, dist / 200); cam.far = dist * 20; cam.updateProjectionMatrix();
        v.controls.target.copy(target);
        v.controls.update();
      }

      // ---------- selection: a rack shows its uplinks and spines; a spine shows its racks ----------
      function clearSelection() {
        if (selLines) { v.scene.remove(selLines); selLines.geometry.dispose(); selLines.material.dispose(); selLines = null; }
        card.hidden = true;
      }
      function selectDevice(id) {
        clearSelection();
        const d = kit.device(id);
        if (!d || !posOf.has(id)) return false;
        const links = d.tier === 'top_of_rack' ? kit.uplinks(id) : kit.linksOf(id).filter((l) => posOf.has(S.otherEnd(l, id)) && kit.device(S.otherEnd(l, id)).tier === 'top_of_rack');
        const p = posOf.get(id);
        const top = d.tier === 'top_of_rack' ? RACK[1] + 0.14 : 0;
        const ids = new Set([id]);
        const pos = [], col = [];
        const c = new THREE.Color();
        const others = [];
        for (const l of links) {
          const o = S.otherEnd(l, id), q = posOf.get(o);
          if (!q) continue;
          ids.add(o); others.push(q);
          const s = S.linkState(l);
          c.set(s === 'ok' ? (spineDrained(d.tier === 'top_of_rack' ? o : id) ? C.drained : C.ok) : C[s]);
          const qTop = kit.device(o).tier === 'top_of_rack' ? RACK[1] + 0.14 : 0;
          pos.push(p[0], p[1] + top, p[2], q[0], q[1] + qTop, q[2]);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        selLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
        selLines.renderOrder = 15;
        v.scene.add(selLines);

        const size = d.tier === 'top_of_rack' ? RACK : [0.8, 0.5, 0.8];
        v.mark(new V3(p[0], p[1] + size[1] / 2, p[2]), size);
        v.setFocus(ids, id);
        const box = new THREE.Box3().setFromPoints([new V3(...p), ...others.map((q) => new V3(...q))]);
        const sz = box.getSize(new V3());
        v.flyTo(box.getCenter(new V3()), Math.max(4, sz.x, sz.z, sz.y) * 0.75);

        const h = d.tier === 'top_of_rack' ? recOf.get(id) : S.health(id, links);
        card.innerHTML = d.tier === 'top_of_rack'
          ? `<button class="rk-x" title="Close">×</button>${rackTip(h)}`
          : `<button class="rk-x" title="Close">×</button><b>${esc(id)}</b><br><span class="k">spine · ${esc(kit.siteName(d.site))} · pod ${esc(d.pod)} · plane ${esc(d.plane)}</span>`
            + `${d.drained ? `<br><span style="color:${C.drained}">● Drained spine</span>` : ''}`
            + `<br><span class="k">Racks wired to it</span> ${links.length}`
            + `<br><span style="color:${C.broken}">Broken rack links: ${links.filter((l) => S.linkState(l) === 'broken').length}</span>`
            + ` · <span style="color:${C.partial}">Partly broken: ${links.filter((l) => S.linkState(l) === 'partial').length}</span>`;
        card.hidden = false;
        card.querySelector('.rk-x').addEventListener('click', () => { clearSelection(); v.setFocus(null); v.mark(null); });
        return true;
      }

      function focusGroup(ids, text, pts) {
        clearSelection();
        v.mark(null);
        v.setFocus(new Set(ids), text);
        if (!pts.length) return;
        const box = new THREE.Box3().setFromPoints(pts.map((q) => new V3(...q)));
        const sz = box.getSize(new V3());
        v.flyTo(box.getCenter(new V3()), Math.max(4, sz.x, sz.z) * 0.62);
      }
      function focusPod(p) {
        const rs = rackItems.filter((r) => r.site === p.site && r.pod === p.pod);
        focusGroup([...rs.map((r) => r.id), ...p.spineIds], `${kit.siteName(p.site)} pod ${p.pod}`, [...rs.map((r) => r.pos), ...p.spineIds.map((s) => posOf.get(s))]);
      }

      function buildSidePanel() {
        const side = document.createElement('div');
        side.className = 'nm-side rk-side';
        side.innerHTML = '<div class="nm-side-head"><button title="Show or hide the table">⟩</button><span class="nm-side-title">Find answers</span></div>';
        const lg = v.legend([
          ['<span class="nm-sw ghost"></span>', 'Empty slot (missing rack)'],
          ['<span class="nm-sw" style="background:#6e8bb0"></span>', 'Spine (above its pod)'],
          [`<span class="nm-sw ln" style="background:${C.drained}"></span>`, 'Uplink to a drained spine'],
          ['<span class="nm-sw" style="background:#18202b;border:1px solid #2b3442"></span>', 'Pod floor: hover for totals'],
        ]);
        lg.classList.add('rk-legend');
        side.appendChild(lg);
        const groupsBar = document.createElement('div');
        groupsBar.className = 'rk-groups';
        groupsBar.innerHTML = '<span class="k">Group by</span>';
        side.appendChild(groupsBar);
        const wrap = document.createElement('div');
        wrap.className = 'nm-tbl rk-tbl';
        side.appendChild(wrap);
        const note = document.createElement('div');
        note.className = 'rk-key';
        note.textContent = 'Click a column to sort, click a row to show it in 3D. Search any device name in the header.';
        side.appendChild(note);
        v.root.appendChild(side);
        side.querySelector('.nm-side-head button').addEventListener('click', (e) => {
          side.classList.toggle('rk-closed');
          e.target.textContent = side.classList.contains('rk-closed') ? '⟨' : '⟩';
        });

        const N = (key, label, title) => ({ key, label, title, num: true });
        const STATS = [
          N('racks', 'Racks', 'Racks in this group'),
          N('empty', 'Empty slots', 'Empty rack slots (missing racks)'),
          N('brokenRacks', 'Racks w/ broken uplink', 'Racks with at least one broken uplink'),
          N('brokenLinks', 'Broken uplinks', 'Broken rack-to-spine links'),
          N('multi', 'Racks 2+ broken', 'Racks with two or more broken uplinks'),
          N('partialRacks', 'Racks w/ partial', 'Racks with a partly broken uplink'),
          N('drained', 'Drained racks', 'Drained racks'),
          N('toDrained', 'Racks → drained spine', 'Racks with an uplink to a drained spine'),
        ];
        const siteRow = (site, rs, empty) => Object.assign({ siteName: kit.siteName(site), site }, aggregate(rs, empty));
        const GROUPS = {
          Site: {
            cols: [{ key: 'siteName', label: 'Site' }, ...STATS],
            rows: () => siteCodes.map((s) => Object.assign(siteRow(s, rackItems.filter((r) => r.site === s), ghosts.filter((g) => g.site === s).length), {
              _ids: rackItems.filter((r) => r.site === s).map((r) => r.id), _text: kit.siteName(s) })),
          },
          Pod: {
            cols: [{ key: 'siteName', label: 'Site' }, N('pod', 'Pod'), ...STATS],
            rows: () => pods.map((p) => Object.assign({ siteName: kit.siteName(p.site), pod: p.pod }, podStats(p), { _pod: p })),
          },
          Row: {
            cols: [{ key: 'siteName', label: 'Site' }, N('row', 'Row'), N('pod', 'Pod'), ...STATS],
            rows: () => halls.flatMap((H) => {
              const out = [];
              for (let r = H.minRow; r <= H.maxRow; r++) {
                const rs = rackItems.filter((x) => x.site === H.site && x.row === r);
                const gs = ghosts.filter((g) => g.site === H.site && g.row === r);
                out.push(Object.assign({ siteName: kit.siteName(H.site), row: r, pod: H.rowPod.get(r) ?? '' }, aggregate(rs, gs.length),
                  { _ids: rs.map((x) => x.id), _pts: [...rs.map((x) => x.pos), ...gs.map((g) => g.pos)], _text: `${kit.siteName(H.site)} row ${r}` }));
              }
              return out;
            }),
          },
          Rack: {
            cols: [{ key: 'id', label: 'Rack' }, { key: 'siteName', label: 'Site' }, N('pod', 'Pod'), N('row', 'Row'), N('col', 'Col'),
              N('up', 'Cables up'), N('total', 'Cables'), N('broken', 'Broken uplinks'), N('partial', 'Partly broken'),
              { key: 'drainedTxt', label: 'Drained' }, N('toDrained', 'Uplinks → drained spine')],
            rows: () => rackItems.map((r) => ({ id: r.id, siteName: r.siteName, pod: r.pod, row: r.row, col: r.col, up: r.up, total: r.total,
              broken: r.broken, partial: r.partial, drainedTxt: r.drained ? 'yes' : '', toDrained: r.toDrained })),
          },
        };

        let group = 'Pod', rows = [], sortKey = null, asc = true, selRow = null;
        const bad = new Set(['brokenRacks', 'brokenLinks', 'multi', 'broken']);
        const warn = new Set(['partialRacks', 'partial']);
        const purple = new Set(['drained', 'toDrained', 'drainedTxt']);
        function cellClass(k, val) {
          if (!val || val === 0) return '';
          return bad.has(k) ? 'bad' : warn.has(k) ? 'warn' : purple.has(k) ? 'rk-purple' : k === 'empty' ? 'rk-empty' : '';
        }
        function setGroup(g) {
          group = g; rows = GROUPS[g].rows(); sortKey = null; asc = true; selRow = null;
          for (const b of groupsBar.querySelectorAll('button')) b.classList.toggle('on', b.dataset.g === g);
          draw();
        }
        function draw() {
          const cols = GROUPS[group].cols;
          const list = rows.slice();
          if (sortKey) list.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1); });
          const head = `<tr>${cols.map((c) => `<th data-k="${esc(c.key)}" class="${c.num ? 'num' : ''}" title="${esc(c.title || c.label)} (click to sort)">${esc(c.label)}${sortKey === c.key ? (asc ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr>`;
          const body = list.map((r) => `<tr data-i="${rows.indexOf(r)}" class="${r === selRow ? 'sel' : ''}">${cols.map((c) => `<td class="${c.num ? 'num ' : ''}${cellClass(c.key, r[c.key])}">${esc(r[c.key])}</td>`).join('')}</tr>`).join('');
          wrap.innerHTML = `<table>${head}${body}</table>`;
        }
        for (const g of Object.keys(GROUPS)) {
          const b = document.createElement('button');
          b.textContent = g; b.dataset.g = g;
          b.addEventListener('click', () => setGroup(g));
          groupsBar.appendChild(b);
        }
        wrap.addEventListener('click', (e) => {
          const th = e.target.closest('th');
          if (th) {
            const k = th.dataset.k, col = GROUPS[group].cols.find((c) => c.key === k);
            if (sortKey === k) asc = !asc; else { sortKey = k; asc = !col.num; }
            draw(); return;
          }
          const tr = e.target.closest('tr[data-i]');
          if (!tr) return;
          selRow = rows[+tr.dataset.i];
          draw();
          if (group === 'Rack') kit.select(selRow.id);
          else if (group === 'Pod') focusPod(selRow._pod);
          else focusGroup(selRow._ids, selRow._text, selRow._pts || selRow._ids.map((i) => posOf.get(i)));
        });
        setGroup('Pod');
      }

      function injectPageStyle() {
        if (document.getElementById('rk-style')) return;
        const R = '#area-racks .nm';
        const s = document.createElement('style');
        s.id = 'rk-style';
        s.textContent = `
${R} .rk-side{width:470px}
${R} .rk-side.rk-closed{width:250px}
${R} .rk-side.rk-closed .rk-groups,${R} .rk-side.rk-closed .rk-tbl,${R} .rk-side.rk-closed .rk-key{display:none}
${R} .rk-legend{position:static;box-shadow:none;border:0;border-bottom:1px solid ${C.line};border-radius:0;background:none;display:grid;grid-template-columns:1fr 1fr;gap:0 12px;padding:8px 10px}
${R} .rk-side.rk-closed .rk-legend{grid-template-columns:1fr}
${R} .rk-groups{display:flex;gap:5px;align-items:center;padding:8px;border-bottom:1px solid ${C.line}}
${R} .rk-groups .k{color:${C.muted};margin-right:4px}
${R} .rk-groups button{background:#161b22;color:${C.text};border:1px solid ${C.line};border-radius:7px;padding:4px 11px;font:inherit;cursor:pointer}
${R} .rk-groups button.on{background:${C.select};border-color:${C.select};color:#0d1117;font-weight:600}
${R} .rk-tbl th{white-space:normal;vertical-align:bottom;font-size:11px;line-height:1.2;min-width:34px}
${R} .rk-tbl td{font-size:12px}
${R} .rk-tbl th,${R} .rk-tbl td{padding:4px 3px}
${R} .rk-tbl td.rk-purple{color:${C.drained};font-weight:600}
${R} .rk-tbl td.rk-empty{color:#c9d1d9;font-weight:600}
${R} .rk-key{color:${C.muted};padding:6px 10px;font-size:11px;border-top:1px solid ${C.line}}
${R} .rk-card{right:10px;top:10px;max-width:330px;z-index:4}
${R} .rk-card .k{color:${C.muted}}
${R} .rk-x{float:right;background:none;border:0;color:${C.muted};font-size:16px;cursor:pointer;margin:-4px -4px 0 6px}
`;
        document.head.appendChild(s);
      }
    },
    resize() { if (v) v.resize(); },
  };
});
