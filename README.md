# Network UI Map: starter kit

Build the coolest map of this data center network. At judging you swap in a test topology you have never seen (1,424 devices), and your map has to draw it with no code changes.

## Start

1. Unzip the kit and double-click index.html. Nothing to install. It works offline in Chrome, Edge, Firefox or Safari.
2. One person per page, each editing only its file in panels/: overview.js, backbone.js, site.js, pods.js or racks.js (a team of 4: one person takes two).
3. Each page starts as a table of its devices. Replace it with your visual. d3 and three.js (THREE, with THREE.OrbitControls) are already loaded. AI tools are allowed.

Edit your file in a code editor (not TextEdit or Word), save, and reload the browser tab.

## Topology

The site draws topology.js, which holds the practice topology. The test topology is in test-topology.zip in this folder, locked with a password. At minute 30 we give you the password: open the zip, move its topology.js into this folder in place of the old one, and reload.

The format is one JSON object:

- sites: code, name
- devices: id, site, tier, pod, plane, rack, row, col, drained
- links: a, b, count (parallel links), up (how many of them work), speed_gbps

Tiers, lowest to highest: top_of_rack, spine, super_spine, border, backbone_router. Links between backbone routers at different sites are the backbone circuits. Drained devices are out of service on purpose.

## Points (100 + 10 bonus)

| Whole site | Points |
|---|---|
| Opens from index.html and loads the test topology with no errors | 10 |
| Header unchanged (tabs, topology name, search box) | 10 |

| Each page (5 pages) | Points |
|---|---|
| 3D view you can rotate (a 2D page gets 2) | 4 |
| Every device on screen when the page opens, no scrolling; missing racks show as empty spaces | 4 |
| Broken links, partly broken links and drained devices look different, with a legend | 4 |

| Speed: seconds for a judge to answer a secret question, using your page | Points |
|---|---|
| Overview: ? | 4 |
| Backbone: ? | 4 |
| Site: ? | 4 |
| Pods: ? | 4 |
| Racks: ? | 4 |

Speed: for each page, a judge reads a secret question about the test topology, then finds the answer using your page while your team stays hands off. Each answer is one number. Under 10 seconds is 4 points, then 1 point less for every 10 seconds more (40 seconds or more is 0). A wrong answer is 0. Build ways to find answers fast: search, sort, filter, highlight.

| Example questions (practice topology; the real ones are different) | Answer |
|---|---|
| Overview: How many broken links are there in the whole network? | 96 |
| Backbone: How many backbone circuits are broken? | 2 |
| Site: What is the highest number of broken links on one super-spine? | 3 |
| Pods: What is the highest number of broken uplinks on one spine? | 2 |
| Racks: What is the highest number of racks with a broken uplink in one pod? | 8 |

20 for the site, 12 per page and 20 for speed. Ties go to the team with more 3D pages.

| Bonus: judges' favorite UI, by vote | Points |
|---|---|
| End your demo on the page you like best. A judge photographs it, and after all demos every judge votes once from the photos. A tie gives each tied team 10. | 10 |

## Rules

- Draw from the data. Don't hard-code how many sites, planes, pods or racks there are.
- Don't change the header (tabs, topology name, search box), even from your page's code or CSS.
- Don't write answers on the page: no summary that names a worst, most or fewest device, pod, row or site. Judges find answers with your tools; a page that names the answer gets 0 for its speed question.
- Keep all your code inside your file's kit.page(...) function, with no import or export lines.
- Use only d3 and three.js (included). No other packages or internet links: judging runs offline.
- No code changes after the freeze at minute 30.
