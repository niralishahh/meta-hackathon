# Team template: how to build your page

Every page file in `panels/` already draws a working 3D view. **`panels/racks.js` is the full reference.** The other four use a generic starter (`S.tierStack`) that you replace with your own layout.

| Page | File | Owner |
|---|---|---|
| Overview + Backbone | `panels/overview.js`, `panels/backbone.js` | A |
| Site + Pods | `panels/site.js`, `panels/pods.js` | B |
| Racks | `panels/racks.js` | C |

Edit only your own files, so there are no merge conflicts.

## The shared block (do not edit inside your panel)
Each panel file has an identical block between `// ==== SHARED v1 BEGIN ====` and `END`. To change it, edit `tools/shared-block.js`, then run `node tools/sync-shared.mjs` (it pastes the block into all 5 files), and tell the team.

What it gives you, inside `mount(el, model, kit)`:

```js
const S = shared(kit, PAGE);
const v = S.view(el, { viewDir: [0, 1.2, 1] }); // 3D scene, orbit controls, auto-fit, hover, click-select, search hooks
v.boxes(items, { pos, size, color, tip });       // many devices in one InstancedMesh; items need an `id`
v.lines(segs);                                   // links: [{a:[x,y,z], b:[x,y,z], state, ids:[idA,idB]}]
v.label('NORTH', [x, y, z], { size: 1.4 });      // text that faces the camera
v.floor(x0, z0, x1, z1);                         // floor plate
v.legend([...extraRows]);                        // the 4 required states + your extras
v.sideTable(title, columns, rows, onRowClick);   // sortable list (sorting is the judge's speed tool)
v.toggle('Healthy links', false, (on) => ...);   // toolbar toggle
S.health(id, links?)  // {broken, partial, drained, up, total, linkWorst, state}; default links = kit.uplinks(id)
S.linkState(l)        // 'ok' | 'partial' | 'broken'
S.uniq(arr, 'pod'), S.groupBy(arr, fn), S.deviceTip(item)
```

The toolbar's filters (All / Broken / Partly broken / Drained / Clear / Fit), the header search (partial match highlights) and the selection pulse all work automatically.

## Hard rules (break one and we lose points)
- All code stays inside `kit.page(...)`. No `import`/`export` lines and no top-level names.
- Only `THREE` and `d3`. No other packages, CDNs or web fonts; judging runs offline.
- Never change the header (tabs, topology name, search box), not even with CSS. Use `kit.onSearch` and `kit.onSelect`.
- Draw from data. Never hard-code the number of sites, planes, pods or racks; loop over `S.uniq(...)`.
- **No answers on the page.** No "worst / most / fewest" labels, no auto-highlighting the top item, and no counts on filter buttons. Per-device numbers in tooltips and a table the judge sorts are fine.
- Every device must be on screen when the page opens (the view auto-fits), and missing racks show as empty spaces.
- Code freeze at minute 30.

## Test before the freeze
Open `index.html` by double-clicking it (no server). Check every tab, and keep the browser console free of red errors.
