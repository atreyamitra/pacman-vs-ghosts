'use strict';
// A* search (plus Dijkstra / Greedy / Weighted variants) with a binary-heap open list.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- A* ---------- */
const ASTAR_MODES = {
  manh:     { label: 'A* · Manhattan',        h: 'manh',   gw: 1, hw: 1 },
  euclid:   { label: 'A* · Euclidean',        h: 'euclid', gw: 1, hw: 1 },
  weighted: { label: 'Weighted A* (w=2.5)',   h: 'manh',   gw: 1, hw: 2.5 },
  greedy:   { label: 'Greedy Best-First',     h: 'manh',   gw: 0, hw: 1 },
  dijkstra: { label: 'Dijkstra (h=0)',        h: 'zero',   gw: 1, hw: 0 }
};
const gScore = new Float32Array(N), parent = new Int16Array(N), closed = new Uint8Array(N);
const hKey = [], hIdx = [];
function hPush(k, i) { let n = hKey.length; hKey.push(k); hIdx.push(i); while (n > 0) { const p = (n - 1) >> 1; if (hKey[p] <= k) break; hKey[n] = hKey[p]; hIdx[n] = hIdx[p]; n = p; } hKey[n] = k; hIdx[n] = i; }
function hPop() {
  const top = hIdx[0], lk = hKey.pop(), li = hIdx.pop(), len = hKey.length;
  if (len) { let n = 0; for (;;) { let c = 2 * n + 1; if (c >= len) break; if (c + 1 < len && hKey[c + 1] < hKey[c]) c++; if (hKey[c] >= lk) break; hKey[n] = hKey[c]; hIdx[n] = hIdx[c]; n = c; } hKey[n] = lk; hIdx[n] = li; }
  return top;
}
function heur(kind, a, b) {
  if (kind === 'zero') return 0;
  let dx = Math.abs((a % W) - (b % W)); dx = Math.min(dx, W - dx);
  const dy = Math.abs(((a / W) | 0) - ((b / W) | 0));
  return kind === 'euclid' ? Math.hypot(dx, dy) : dx + dy;
}
function astar(s, t, mode, ban, graph) {
  const adj = graph || adjG;
  gScore.fill(Infinity); parent.fill(-1); closed.fill(0); hKey.length = 0; hIdx.length = 0;
  gScore[s] = 0; hPush(mode.hw * heur(mode.h, s, t), s);
  const explored = []; let found = false;
  while (hKey.length) {
    const u = hPop(); if (closed[u]) continue;
    closed[u] = 1; explored.push(u);
    if (u === t) { found = true; break; }
    for (const v of adj[u]) {
      if (u === s && v === ban) continue;
      if (closed[v]) continue;
      const ng = gScore[u] + 1;
      if (ng < gScore[v]) { gScore[v] = ng; parent[v] = u; hPush(mode.gw * ng + mode.hw * heur(mode.h, v, t), v); }
    }
  }
  const path = [];
  if (found) for (let u = t; u !== -1; u = parent[u]) path.push(u);
  path.reverse();
  return { found, path, expanded: explored.length, explored };
}
