// Racks page. This is your file; nobody else edits it.
// What to build and how it is scored are on the page's task card.
//
// The kit runs straight from its folder: double-click index.html, nothing to install. So this file is a plain
// script, not a module. Do not add import or export lines: d3 and THREE (three.js r169, with THREE.OrbitControls)
// are already loaded as globals, and they are the only libraries: no other packages or internet links (judging
// runs offline). Keep ALL your code, helpers too, inside the function below, so your names
// cannot clash with your teammates' files. After you save, reload the page in the browser.
//
// mount(el, model, kit) runs when your page opens and again when a new topology is loaded.
//   el     an empty <div> that fills your page. Draw anything into it: SVG, canvas or three.js.
//   model  { sites, devices, links }, read from topology.js. The format is in README.md.
//   kit    helpers: kit.device(id), kit.linksOf(id), kit.uplinks(id) (links up to the next tier),
//          kit.devicesByTier(tier), kit.siteName(code), kit.select(id), kit.selected,
//          kit.onSelect(fn): fn(id) runs when a device is selected. The search box selects any exact device name.
// Optional: also return resize(), and the kit calls it when your page is shown.
//
// 2D example: const svg = d3.select(el).append('svg');
// 3D example: const renderer = new THREE.WebGLRenderer(); const controls = new THREE.OrbitControls(camera, renderer.domElement);

kit.page('racks', function () {
  return {
    mount(el, model, kit) {
      // Starter view: replace it with your visualization.
      const racks = kit.devicesByTier('top_of_rack');
      kit.starterTable(el, `Top-of-rack switches: ${racks.length}`, ['Device', 'Site', 'Row', 'Col', 'Uplinks up'],
        racks.map((d) => {
          const ups = kit.uplinks(d.id);
          const up = ups.reduce((n, l) => n + l.up, 0);
          const total = ups.reduce((n, l) => n + l.count, 0);
          return [d.id, kit.siteName(d.site), d.row, d.col, { text: `${up} of ${total}`, cls: up < total ? 'down' : 'up' }];
        }));
    }
  };
});
