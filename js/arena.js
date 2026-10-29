'use strict';
// AI Arena: runs two AI setups (A and B) on exactly the same seeded games, one after the other, and compares them.
// A setup = Minimax depth + evaluation weights (default or evolved) + the ghosts' path-finding algorithm.
// Because both setups face identical random seeds, differences are paired, which removes a lot of luck.
// (Games run one after another in the background, not side by side.)
// Loaded as a classic <script>; globals are shared between files.

const arenaSd = a => { if (a.length < 2) return 0; const m = gaMean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };

function arenaSummarize(rs) {
  const n = rs.length, scores = rs.map(r => r.score);
  const dec = rs.reduce((s, r) => s + r.decisions, 0) || 1;
  return {
    n, scores, mean: gaMean(scores), se: arenaSd(scores) / Math.sqrt(n),
    survived: rs.filter(r => !r.died).length / n,
    time: gaMean(rs.map(r => r.time)),
    nodesPerDecision: rs.reduce((s, r) => s + r.nodes, 0) / dec,
    msPerDecision: rs.reduce((s, r) => s + r.ms, 0) / dec
  };
}
// Paired comparison of A against B over the same games.
function arenaCompare(a, b) {
  const d = a.scores.map((s, i) => s - b.scores[i]);
  const mean = gaMean(d), se = arenaSd(d) / Math.sqrt(d.length);
  const clear = Math.abs(mean) > 2 * se && d.length >= 3;
  return { mean, se, clear, winner: clear ? (mean > 0 ? 'A' : 'B') : null };
}
// A, B = { depth, weights, heur }. Resolves with { A, B, cmp } or null if cancelled.
async function arenaRun(A, B, n, maxT) {
  busyStart('AI Arena…');
  try {
    const ra = [], rb = [];
    for (let k = 0; k < n; k++) {
      busy.text = 'Game ' + (k + 1) + '/' + n + ' · setup A';
      const a = await simRunP(A, 5000 + k, maxT); if (!a) return null;
      busy.text = 'Game ' + (k + 1) + '/' + n + ' · setup B';
      const b = await simRunP(B, 5000 + k, maxT); if (!b) return null;
      ra.push(a); rb.push(b); busy.p = (k + 1) / n;
    }
    const sa = arenaSummarize(ra), sb = arenaSummarize(rb);
    return { A: sa, B: sb, cmp: arenaCompare(sa, sb) };
  } finally { busyFinish(); }
}
