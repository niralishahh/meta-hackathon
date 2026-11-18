// Backbone page. This is your file; nobody else edits it.
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

kit.page('backbone', function () {
  return {
    mount(el, model, kit) {
      // Starter view: replace it with your visualization.
      const circuits = model.links.filter((l) =>
        kit.device(l.a).tier === 'backbone_router' && kit.device(l.b).tier === 'backbone_router');
      kit.starterTable(el, `Backbone circuits: ${circuits.length}`, ['From', 'To', 'Status'],
        circuits.map((l) => [
          `${l.a} (${kit.siteName(kit.device(l.a).site)})`,
          `${l.b} (${kit.siteName(kit.device(l.b).site)})`,
          l.up === l.count ? { text: 'up', cls: 'up' } : { text: 'broken', cls: 'down' },
        ]));
    }
  };
});
