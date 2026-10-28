// Headless regression test. Run with:  node tests/headless-test.js
// Loads the game's <script> files in the same order as index.html, using a tiny DOM stub,
// then checks the AI algorithms and that the game still runs.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function makeEl() {
  return {
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 1, height: 1 }; },
    style: {}, children: [{}, {}, {}, {}], value: '5', hidden: false, textContent: '', innerHTML: '', dataset: {}, width: 0, height: 0,
    getContext() { return new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 0 }) : () => {}), set: () => true }); }
  };
}
const els = {};
global.document = { getElementById: id => els[id] || (els[id] = makeEl()), createElement: makeEl, querySelectorAll: () => [], addEventListener() {}, hidden: false };
global.window = { devicePixelRatio: 1, addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {} };
global.requestAnimationFrame = () => {};

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
if (!files.length) throw new Error('No <script src> tags found in index.html');
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
vm.runInThisContext('globalThis.__pac = { game, pac, ghosts, cfg, update, astar, aiSearch, ASTAR_MODES, dist, adjP, N, W, walkList, startGame, lab, labInit, labStep, foodCells };');
const P = globalThis.__pac;

let failed = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  (' + extra + ')' : '')); if (!ok) failed++; };

// 1. Maze sanity: every pellet is reachable from Pac-Man's start
const s0 = P.pac.r * P.W + P.pac.c;
check('all pellets reachable', P.foodCells.every(f => P.dist[s0 * P.N + f] !== 999));

// 2. A* (Manhattan, Euclidean) and the Step Lab return shortest paths (same length as Dijkstra)
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let bad = 0, runs = 0, labBad = 0;
for (const m of ['manh', 'euclid']) {
  P.cfg.heur = m;
  for (let k = 0; k < 150; k++) {
    const s = P.walkList[(rnd() * P.walkList.length) | 0], t = P.walkList[(rnd() * P.walkList.length) | 0];
    if (s === t) continue;
    const ref = P.astar(s, t, P.ASTAR_MODES.dijkstra, -1, P.adjP).path.length - 1;
    const got = P.astar(s, t, P.ASTAR_MODES[m], -1, P.adjP).path.length - 1;
    P.lab.s = s; P.lab.t = t; P.labInit();
    let g = 0; while (!P.lab.L.done && g++ < 1000) P.labStep();
    runs++;
    if (got !== ref) bad++;
    if (!P.lab.L.found || P.lab.L.path.length - 1 !== ref) labBad++;
  }
}
check('A* path length equals Dijkstra', bad === 0, runs + ' routes');
check('Step Lab path length equals Dijkstra', labBad === 0, runs + ' routes');

// 3. Alpha-Beta gives the same value as plain Minimax with fewer nodes
P.cfg.mode = 'play'; P.startGame(); P.game.state = 'playing';
const ab = P.aiSearch(3, true), mm = P.aiSearch(3, false);
check('Alpha-Beta value matches Minimax', Math.abs(ab.best - mm.best) < 1, ab.best.toFixed(1) + ' vs ' + mm.best.toFixed(1));
check('Alpha-Beta visits fewer nodes', ab.nodes < mm.nodes, ab.nodes + ' vs ' + mm.nodes);

// 4. The AI can play for a minute of game time without errors and scores points
P.cfg.mode = 'ai'; P.startGame();
let t = 0; while (t < 60 && P.game.state !== 'over') { P.update(1 / 60); t += 1 / 60; }
check('Minimax AI plays and scores', P.game.score > 0, 'score ' + P.game.score);

// 5. Game is frozen while the Step Lab is open
P.lab.active = true;
const before = P.game.score, col = P.pac.c;
for (let i = 0; i < 120; i++) P.update(1 / 60);
check('game paused while Step Lab active', P.game.score === before && P.pac.c === col);
P.lab.active = false;

console.log(failed ? '\n' + failed + ' check(s) FAILED' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
