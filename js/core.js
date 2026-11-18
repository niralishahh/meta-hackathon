// Shared helpers for the starter kit: tier order, a lookup index and the topology check.
// You don't need to edit this file. It is a plain script (no modules), so the kit runs from a double-clicked index.html.
(function () {
  'use strict';

  const TIERS = ['top_of_rack', 'spine', 'super_spine', 'border', 'backbone_router'];
  const TIER_RANK = Object.fromEntries(TIERS.map((t, i) => [t, i]));

  function indexModel(model) {
    const byId = new Map(model.devices.map((d) => [d.id, d]));
    const linksOf = new Map();
    for (const l of model.links) {
      for (const end of [l.a, l.b]) {
        if (!linksOf.has(end)) linksOf.set(end, []);
        linksOf.get(end).push(l);
      }
    }
    return { byId, linksOf };
  }

  function validateModel(model) {
    const problems = [];
    if (!model || typeof model !== 'object' || Array.isArray(model)) return ['The topology must be a JSON object'];
    for (const key of ['sites', 'devices', 'links']) {
      if (!Array.isArray(model[key])) problems.push(`"${key}" must be a list`);
    }
    if (problems.length) return problems;
    const codes = new Set();
    for (const s of model.sites) {
      if (!s || typeof s.code !== 'string' || typeof s.name !== 'string') { problems.push('every site needs a code and a name'); break; }
      codes.add(s.code);
    }
    const ids = new Set();
    for (const d of model.devices) {
      if (!d || typeof d.id !== 'string') { problems.push('every device needs a string id'); break; }
      if (ids.has(d.id)) problems.push(`duplicate device id ${d.id}`);
      ids.add(d.id);
      if (!(d.tier in TIER_RANK)) problems.push(`${d.id}: unknown tier "${d.tier}"`);
      if (!codes.has(d.site)) problems.push(`${d.id}: unknown site "${d.site}"`);
      if (typeof d.drained !== 'boolean') problems.push(`${d.id}: drained must be true or false`);
      if (problems.length > 20) break;
    }
    for (const l of model.links) {
      if (!ids.has(l.a) || !ids.has(l.b)) problems.push(`link ${l.a} - ${l.b}: unknown device`);
      if (!Number.isInteger(l.count) || l.count < 1) problems.push(`link ${l.a} - ${l.b}: count must be 1 or more`);
      if (!Number.isInteger(l.up) || l.up < 0 || l.up > l.count) problems.push(`link ${l.a} - ${l.b}: up must be 0 to count`);
      if (problems.length > 20) break;
    }
    return problems.slice(0, 20);
  }

  window.MapCore = { TIERS, TIER_RANK, indexModel, validateModel };
})();
