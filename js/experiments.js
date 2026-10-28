'use strict';
// Benchmarks: A* vs Dijkstra/Greedy and Minimax vs Alpha-Beta on this maze.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- Experiments ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function benchAstar() {
  const rand = rng(42), pairs = [];
  for (let k = 0; k < 300; k++) pairs.push([walkList[(rand() * walkList.length) | 0], walkList[(rand() * walkList.length) | 0]]);
  const opt = pairs.map(([s, t]) => astar(s, t, ASTAR_MODES.dijkstra, -1, adjP).path.length - 1);
  const out = [];
  for (const key of ['dijkstra', 'manh', 'euclid', 'weighted', 'greedy']) {
    let exp = 0, len = 0, good = 0; const t0 = performance.now();
    pairs.forEach(([s, t], i) => { const r = astar(s, t, ASTAR_MODES[key], -1, adjP); exp += r.expanded; len += r.path.length - 1; if (r.path.length - 1 === opt[i]) good++; });
    out.push({ label: ASTAR_MODES[key].label, exp: exp / pairs.length, len: len / pairs.length, optimal: 100 * good / pairs.length, ms: performance.now() - t0 });
  }
  return out;
}
$('benchA').addEventListener('click', () => {
  const res = benchAstar();
  $('benchOut').innerHTML = '<table><thead><tr><th>Algorithm</th><th style="text-align:right">Avg nodes</th><th style="text-align:right">Avg path</th><th style="text-align:right">Optimal</th></tr></thead><tbody>' +
    res.map(r => '<tr><td>' + r.label + '</td><td class="n">' + r.exp.toFixed(1) + '</td><td class="n">' + r.len.toFixed(2) + '</td><td class="n">' + r.optimal.toFixed(0) + '%</td></tr>').join('') +
    '</tbody></table><p>300 random start/goal pairs on this maze. A* finds the same shortest paths as Dijkstra while expanding fewer nodes; Greedy is fastest but not always optimal.</p>';
});
$('benchM').addEventListener('click', () => {
  const was = game.state; if (was === 'title') resetLevel();
  const d = Math.min(cfg.depth, 4), a = aiSearch(d, true), b = aiSearch(d, false);
  const same = Math.abs(a.best - b.best) < 1 || (a.move && b.move && a.move.join() === b.move.join());
  $('benchOut').innerHTML = '<table><thead><tr><th>Search (depth ' + d + ')</th><th style="text-align:right">Nodes</th><th style="text-align:right">ms</th></tr></thead><tbody>' +
    '<tr><td>Plain Minimax</td><td class="n">' + b.nodes.toLocaleString() + '</td><td class="n">' + b.ms.toFixed(1) + '</td></tr>' +
    '<tr><td>Minimax + Alpha-Beta</td><td class="n">' + a.nodes.toLocaleString() + '</td><td class="n">' + a.ms.toFixed(1) + '</td></tr></tbody></table>' +
    '<p>Alpha-Beta visited ' + (100 * (1 - a.nodes / Math.max(1, b.nodes))).toFixed(0) + '% fewer nodes' + (same ? ' and chose an equally good move.' : '.') + ' (Depth capped at 4 for this comparison; measured from the current game position.)</p>';
});
