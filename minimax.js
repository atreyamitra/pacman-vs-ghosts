'use strict';
// Pac-Man AI: depth-limited Minimax with optional Alpha-Beta pruning.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- Minimax + Alpha-Beta (Pac-Man AI) ---------- */
const S = { p: 0, food: new Uint8Array(N), left: 0, score: 0, ghosts: [], ab: true, nodes: 0, pruned: 0, target: -1 };
const LOSE = d => -100000 - d * 1000;
function evaluate() {
  if (S.left === 0) return S.score + 5000;
  let s = S.score; const base = S.p * N;
  let df = 999; for (const f of foodCells) if (S.food[f]) { const d = dist[base + f]; if (d < df) df = d; }
  s -= df * 1.6;
  let near = 999;
  for (const g of S.ghosts) {
    if (g.dead) continue; const d = dist[base + g.idx];
    if (g.scared) s += 30 / (d + 1);
    else { if (d < near) near = d; if (d <= 1) s -= 500; else if (d < 8) s -= (8 - d) * (8 - d) * 3; }
  }
  if (near <= 5) { let pd = 999; for (const pc of powerCells) if (S.food[pc]) { const d = dist[base + pc]; if (d < pd) pd = d; } if (pd < 999) s -= pd * 2.5; }
  return s;
}
function sortBy(arr, key) { const a = arr.slice(); for (let i = 1; i < a.length; i++) { const v = a[i], k = key(v); let j = i - 1; while (j >= 0 && key(a[j]) > k) { a[j + 1] = a[j]; j--; } a[j + 1] = v; } return a; }
function pacStep(pi, ni, d, a, b) {
  const gs = S.ghosts; let gain = 0, killed = null;
  for (const g of gs) if (!g.dead && g.idx === ni) { if (g.scared) { gain += 200; (killed || (killed = [])).push(g); g.dead = true; } else return LOSE(d); }
  const fv = S.food[ni]; if (fv) { S.food[ni] = 0; S.left--; gain += fv === 2 ? 50 : 10; }
  S.score += gain; S.p = ni;
  const v = minVal(d, 0, a, b);
  S.p = pi; S.score -= gain; if (fv) { S.food[ni] = fv; S.left++; }
  if (killed) for (const g of killed) g.dead = false;
  return v;
}
function maxVal(d, a, b) {
  S.nodes++;
  if (d === 0 || S.left === 0) return evaluate();
  const pi = S.p; let best = -Infinity;
  const moves = S.target >= 0 ? sortBy(adjP[pi], n => dist[n * N + S.target]) : adjP[pi];
  for (const ni of moves) {
    const v = pacStep(pi, ni, d, a, b);
    if (v > best) best = v;
    if (S.ab) { if (best > b) { S.pruned++; break; } if (best > a) a = best; }
  }
  return best === -Infinity ? evaluate() : best;
}
function minVal(d, gi, a, b) {
  const gs = S.ghosts;
  while (gi < gs.length && (gs[gi].dead || gs[gi].scared)) gi++;
  if (gi >= gs.length) return maxVal(d - 1, a, b);
  S.nodes++;
  const g = gs[gi], old = g.idx; let best = Infinity;
  for (const ni of sortBy(adjP[old], n => dist[n * N + S.p])) {
    g.idx = ni;
    const v = ni === S.p ? LOSE(d) : minVal(d, gi + 1, a, b);
    g.idx = old;
    if (v < best) best = v;
    if (S.ab) { if (best < a) { S.pruned++; break; } if (best < b) b = best; }
  }
  return best;
}
function aiSearch(depth, useAB) {
  const t0 = performance.now();
  S.ab = useAB; S.nodes = 0; S.pruned = 0; S.p = pac.r * W + pac.c; S.food.set(game.pellets); S.left = game.left; S.score = 0;
  const act = [];
  for (const g of ghosts) {
    if (g.state === 'house' || g.state === 'eaten') continue;
    let c = g.c, r = g.r; if (g.p >= 0.5) { c = wrapC(c + g.dx); r += g.dy; }
    const idx = r * W + c; if (!pacWalk[idx]) continue;
    act.push({ idx, scared: g.state === 'fright', dead: false, d: dist[S.p * N + idx] });
  }
  const threats = act.filter(g => !g.scared).sort((x, y) => x.d - y.d).slice(0, 2);
  const scared = act.filter(g => g.scared && g.d <= 10);
  S.ghosts = threats.concat(scared);
  S.target = -1; let bd = 999;
  for (const f of foodCells) if (S.food[f]) { const d = dist[S.p * N + f]; if (d < bd) { bd = d; S.target = f; } }
  let a = -Infinity, best = -Infinity, bestMove = null; const scores = [];
  const moves = S.target >= 0 ? sortBy(adjP[S.p], n => dist[n * N + S.target]) : adjP[S.p];
  for (const ni of moves) {
    const dir = stepDir(pac.c, pac.r, ni);
    let v = pacStep(S.p, ni, depth, a, Infinity);
    if (dir[0] === -pac.fx && dir[1] === -pac.fy) v -= 2;
    v += Math.random() * 0.4;
    scores.push({ dir, v });
    if (v > best) { best = v; bestMove = dir; }
    if (useAB && best > a) a = best;
  }
  return { move: bestMove, scores, best, nodes: S.nodes, pruned: S.pruned, ms: performance.now() - t0, ghostsUsed: S.ghosts.length };
}
let lastAI = null;
function aiPick() {
  lastAI = aiSearch(cfg.depth, cfg.ab);
  if (lastAI.move) { pac.qx = lastAI.move[0]; pac.qy = lastAI.move[1]; }
}
