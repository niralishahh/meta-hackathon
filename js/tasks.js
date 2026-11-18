// Task cards, one per page. Organizers edit this file; teams read it on the page.
// A plain script (no modules), so the kit runs from a double-clicked index.html.
(function () {
  'use strict';

  // Two judges score with the test topology loaded: 3 checks and 1 timed question per page, plus 2 site checks.
  const SCORING = [
    ['3D view you can rotate (a 2D page gets 2)', 4],
    ['Every device on screen when the page opens, no scrolling; missing racks show as empty spaces', 4],
    ['Broken links, partly broken links and drained devices look different, with a legend', 4],
  ];
  // The speed questions are secret: judges have them, the kit and the brief do not.
  const SPEED = {
    points: 4,
    prompt: 'Judges ask one secret question about this page\'s data and find the answer using your page. The answer is one number.',
    rule: 'Under 10 seconds: 4 points. 1 point less for every 10 seconds more (40 seconds or more: 0). A wrong answer: 0. Your team stays hands off. A page that writes out the answer (a worst, most or fewest label) gets 0.',
  };
  const SITE_SCORING = [
    ['Opens from index.html and loads the test topology with no errors', 10],
    ['Header unchanged (tabs, topology name, search box)', 10],
  ];

  const TASKS = {
    overview: {
      title: 'Overview',
      file: 'panels/overview.js',
      example: { q: 'How many broken links are there in the whole network?', a: '96' },
      shows: 'The whole network: every site, every tier and every link.',
    },
    backbone: {
      title: 'Backbone',
      file: 'panels/backbone.js',
      example: { q: 'How many backbone circuits are broken?', a: '2' },
      shows: 'Sites, backbone routers and the backbone circuits between sites.',
    },
    site: {
      title: 'Site',
      file: 'panels/site.js',
      example: { q: 'What is the highest number of broken links on one super-spine?', a: '3' },
      shows: 'Super-spines by plane, border routers, and their links up to the backbone routers.',
    },
    pods: {
      title: 'Pods',
      file: 'panels/pods.js',
      example: { q: 'What is the highest number of broken uplinks on one spine?', a: '2' },
      shows: 'Each pod\'s spines and their links up to the super-spines.',
    },
    racks: {
      title: 'Racks',
      file: 'panels/racks.js',
      example: { q: 'What is the highest number of racks with a broken uplink in one pod?', a: '8' },
      shows: 'Racks at their row and col on each hall floor, and their uplinks to the spines.',
    },
  };

  window.MapTasks = { TASKS, SCORING, SPEED, SITE_SCORING };
})();
