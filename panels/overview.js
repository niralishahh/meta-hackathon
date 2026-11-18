// Overview page: the whole network. This is your file; nobody else edits it.
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

kit.page('overview', function () {
  return {
    mount(el, model, kit) {
      // Starter view: replace it with your visualization.
      const rows = model.sites.map((s) => {
        const devices = model.devices.filter((d) => d.site === s.code);
        const count = (tier) => devices.filter((d) => d.tier === tier).length;
        const drained = devices.filter((d) => d.drained).length;
        return [`${s.name} (${s.code})`, count('top_of_rack'), count('spine'), count('super_spine'), count('border'),
          count('backbone_router'), drained ? { text: String(drained), cls: 'drained' } : '0'];
      });
      kit.starterTable(el, `Sites: ${model.sites.length}, devices: ${model.devices.length}, links: ${model.links.length}`,
        ['Site', 'Racks', 'Spines', 'Super-spines', 'Border routers', 'Backbone routers', 'Drained'], rows);
    }
  };
});
