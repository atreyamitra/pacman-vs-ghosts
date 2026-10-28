'use strict';
// Ghost behaviour: each ghost picks a target, then plans its route with A*.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- Ghost AI (A*) ---------- */
function nearestWalk(c, r) {
  c = Math.max(0, Math.min(W - 1, c)); r = Math.max(0, Math.min(H - 1, r));
  const i = r * W + c; if (pacWalk[i]) return i;
  let best = walkList[0], bd = 1e9;
  for (const w of walkList) { const d = Math.abs((w % W) - c) + Math.abs(((w / W) | 0) - r); if (d < bd) { bd = d; best = w; } }
  return best;
}
function ahead(n) {
  let c = pac.c, r = pac.r;
  for (let k = 0; k < n; k++) { const nc = c + pac.fx, nr = r + pac.fy; if (nc < 0 || nc >= W || nr < 0 || nr >= H || !pacWalk[nr * W + nc]) break; c = nc; r = nr; }
  return [c, r];
}
function chaseTarget(g) {
  const pi = pac.r * W + pac.c;
  if (game.phase % 2 === 0) return nearestWalk(g.scatter[0], g.scatter[1]); // scatter phase
  switch (g.name) {
    case 'Blinky': return pi;
    case 'Pinky': { const [c, r] = ahead(4); return r * W + c; }
    case 'Inky': { const b = ghosts[0], [ac, ar] = ahead(2); return nearestWalk(b.c + 2 * (ac - b.c), b.r + 2 * (ar - b.r)); }
    default: { const d = dist[pi * N + (g.r * W + g.c)]; return (d > 8 || d === 999) ? pi : nearestWalk(g.scatter[0], g.scatter[1]); }
  }
}
function stepDir(c, r, ni) {
  const nc = ni % W, nr = (ni / W) | 0;
  let dx = nc - c; if (dx > 1) dx = -1; else if (dx < -1) dx = 1;
  return [dx, nr - r];
}
function ghostPlan(g) {
  const i = g.r * W + g.c, back = (g.dx || g.dy) ? (g.r - g.dy) * W + wrapC(g.c - g.dx) : -1;
  const inHouse = house[i] || i === doorIdx;
  if (g.state === 'fright' && !inHouse) {
    const opts = adjG[i].filter(n => n !== back); const pool = opts.length ? opts : adjG[i];
    const n = pool[(Math.random() * pool.length) | 0]; [g.dx, g.dy] = stepDir(g.c, g.r, n); g.path = []; g.explored = []; return;
  }
  let t;
  if (g.state === 'eaten') t = 9 * W + 9; else if (inHouse) t = 7 * W + 9; else t = chaseTarget(g);
  g.target = [t % W, (t / W) | 0];
  const mode = ASTAR_MODES[cfg.heur];
  let res = astar(i, t, mode, g.state === 'eaten' ? -1 : back);
  if (!res.found || res.path.length < 2) res = astar(i, t, mode, -1);
  g.expanded = res.expanded; g.plen = Math.max(0, res.path.length - 1); g.sumExp += res.expanded; g.plans++;
  g.path = res.path; g.explored = res.explored;
  let n;
  if (res.path.length >= 2) n = res.path[1];
  else { const opts = adjG[i].filter(x => x !== back); const pool = opts.length ? opts : adjG[i]; n = pool[(Math.random() * pool.length) | 0]; }
  [g.dx, g.dy] = stepDir(g.c, g.r, n);
}
function updateGhost(g, dt) {
  if (g.state === 'house') { g.bob += dt * 6; if (game.time >= g.releaseAt) { g.state = game.fright > 0 ? 'fright' : 'normal'; g.dx = g.dy = 0; } return; }
  let move = ghostSpeed(g) * dt;
  while (move > 0) {
    if (!g.dx && !g.dy) { ghostPlan(g); if (!g.dx && !g.dy) break; }
    const need = 1 - g.p;
    if (move >= need) {
      move -= need; g.c = wrapC(g.c + g.dx); g.r += g.dy; g.p = 0;
      if (g.state === 'eaten' && g.c === 9 && g.r === 9) { g.state = 'house'; g.releaseAt = game.time + 0.9; g.dx = g.dy = 0; g.path = []; return; }
      ghostPlan(g);
    } else { g.p += move; move = 0; }
  }
}
function collisions() {
  const px = pac.c + pac.dx * pac.p, py = pac.r + pac.dy * pac.p;
  for (const g of ghosts) {
    if (g.state === 'house' || g.state === 'eaten') continue;
    const gx = g.c + g.dx * g.p, gy = g.r + g.dy * g.p;
    let ddx = Math.abs(((gx - px) % W + W) % W); ddx = Math.min(ddx, W - ddx);
    if (Math.hypot(ddx, gy - py) < 0.6) {
      if (g.state === 'fright') {
        const pts = 200 * Math.pow(2, game.combo++); addScore(pts);
        popups.push({ x: gx, y: gy, text: String(pts), t: 1 });
        g.state = 'eaten'; g.path = [];
      } else { game.state = 'dying'; game.timer = 1.5; return; }
    }
  }
}
