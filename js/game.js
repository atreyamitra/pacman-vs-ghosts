'use strict';
// Game state, Pac-Man movement, scoring and the main update loop.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- Game state ---------- */
const cfg = { mode: 'play', heur: 'manh', showPaths: true, showExp: false, depth: 3, ab: true, useEvolved: false };
const game = { state: 'title', paused: false, score: 0, best: 0, lives: 3, level: 1, pellets: new Uint8Array(N), left: 0,
  time: 0, anim: 0, phase: 0, phaseT: 0, fright: 0, combo: 0, timer: 0, flash: 0 };
try { game.best = +localStorage.getItem('pacvsghosts-best') || 0; } catch (e) {}
const PHASES = [6, 20, 6, 20, 5, 25, 4, Infinity]; // scatter, chase, ...
const pac = { c: 9, r: 15, dx: 0, dy: 0, p: 0, qx: -1, qy: 0, fx: -1, fy: 0 };
const GDEF = [
  { name: 'Blinky', color: '#ff3b3b', role: 'Chaser · targets Pac-Man', scatter: [17, 1], rel: 0 },
  { name: 'Pinky',  color: '#ff8ad8', role: 'Ambusher · 4 tiles ahead', scatter: [1, 1], rel: 2.5 },
  { name: 'Inky',   color: '#3ee6ff', role: 'Flanker · mirrors Blinky', scatter: [17, 19], rel: 5 },
  { name: 'Clyde',  color: '#ffa43b', role: 'Shy · retreats when close', scatter: [1, 19], rel: 8 }
];
const ghosts = GDEF.map(d => Object.assign({ c: 9, r: 9, dx: 0, dy: 0, p: 0, state: 'house', releaseAt: 0, path: [], explored: [],
  expanded: 0, plen: 0, sumExp: 0, plans: 0, target: [0, 0], bob: Math.random() * 6, agg: 0.5, fz: null }, d));
const popups = [];
// With fuzzy aggression on, a ghost's normal speed is scaled by 0.88 .. 1.12 depending on its fuzzy "aggression" (0 .. 1).
const ghostSpeed = g => g.state === 'eaten' ? 11 : g.state === 'fright' ? 3.4
  : Math.min(7.2, 5.6 + 0.3 * (game.level - 1)) * (fuzzy.on ? 0.88 + 0.24 * g.agg : 1);
const pacSpeed = () => 6.8;

function resetPositions() {
  Object.assign(pac, { c: PAC_START[0], r: PAC_START[1], dx: 0, dy: 0, p: 0, qx: -1, qy: 0, fx: -1, fy: 0 });
  const f = Math.pow(0.85, game.level - 1);
  ghosts.forEach((g, i) => {
    const start = i === 0 ? [9, 7] : [[0, 0], [9, 9], [8, 9], [10, 9]][i];
    Object.assign(g, { c: start[0], r: start[1], dx: 0, dy: 0, p: 0, state: i === 0 ? 'normal' : 'house',
      releaseAt: game.time + g.rel * f, path: [], explored: [], wasEaten: false });
  });
  game.fright = 0; game.combo = 0; game.phase = 0; game.phaseT = 0;
  game.state = 'ready'; game.timer = 1.6;
}
function resetLevel() { game.pellets.set(pelletInit); game.left = foodCells.length; popups.length = 0; resetPositions(); }
function startGame() {
  if (busy.on) return; // a training / arena batch owns the game state
  game.score = 0; game.lives = 3; game.level = 1; game.time = 0; game.paused = false;
  resetLevel(); hideOverlay(); syncHud(true);
}

/* ---------- Pac-Man movement ---------- */
function canMove(c, r, dx, dy) {
  if (!dx && !dy) return false;
  const nr = r + dy; if (nr < 0 || nr >= H) return false;
  return !!pacWalk[nr * W + wrapC(c + dx)];
}
function pacChoose() {
  // The neural-network ghost watches every junction decision: predict first, then learn from what Pac-Man really did.
  const watch = nn.enabled && pac.p === 0 ? nnObserveBefore() : null;
  if (cfg.mode === 'ai') aiPick();
  if (canMove(pac.c, pac.r, pac.qx, pac.qy)) { pac.dx = pac.qx; pac.dy = pac.qy; }
  else if ((pac.dx || pac.dy) && !canMove(pac.c, pac.r, pac.dx, pac.dy)) { pac.dx = 0; pac.dy = 0; }
  if (pac.dx || pac.dy) { pac.fx = pac.dx; pac.fy = pac.dy; }
  if (watch) nnObserveAfter(watch);
}
function setDir(dx, dy) {
  if (cfg.mode !== 'play') return;
  pac.qx = dx; pac.qy = dy;
  if ((pac.dx || pac.dy) && dx === -pac.dx && dy === -pac.dy && pac.p > 0) {
    pac.c = wrapC(pac.c + pac.dx); pac.r += pac.dy; pac.p = 1 - pac.p; pac.dx = -pac.dx; pac.dy = -pac.dy;
    pac.fx = pac.dx; pac.fy = pac.dy;
  }
}
function eatAt(i) {
  const v = game.pellets[i]; if (!v) return;
  game.pellets[i] = 0; game.left--; addScore(v === 2 ? 50 : 10);
  if (v === 2) startFright();
}
function addScore(n) {
  game.score += n;
  if (game.score > game.best) { game.best = game.score; if (!sim.active) { try { localStorage.setItem('pacvsghosts-best', game.best); } catch (e) {} } }
}
function startFright() {
  game.fright = Math.max(3, 7 - 0.5 * (game.level - 1)); game.combo = 0;
  for (const g of ghosts) g.wasEaten = false;
  for (const g of ghosts) if (g.state === 'normal') {
    g.state = 'fright';
    if ((g.dx || g.dy) && g.p > 0) { g.c = wrapC(g.c + g.dx); g.r += g.dy; g.p = 1 - g.p; g.dx = -g.dx; g.dy = -g.dy; }
  }
}
function updatePac(dt) {
  let move = pacSpeed() * dt;
  while (move > 0) {
    if (!pac.dx && !pac.dy) { pacChoose(); if (!pac.dx && !pac.dy) break; }
    const need = 1 - pac.p;
    if (move >= need) { move -= need; pac.c = wrapC(pac.c + pac.dx); pac.r += pac.dy; pac.p = 0; eatAt(pac.r * W + pac.c); pacChoose(); if (game.left === 0) break; }
    else { pac.p += move; move = 0; }
  }
}

/* ---------- Update loop ---------- */
function update(dt) {
  if (lab.active || (busy.on && !sim.stepping)) return; // frozen by the Step Lab or by a background batch (the batch steps it itself)
  if (game.state === 'title' || game.state === 'over' || game.paused) return;
  game.anim += dt;
  if (game.state === 'ready') { game.timer -= dt; if (game.timer <= 0) game.state = 'playing'; return; }
  if (game.state === 'dying') {
    game.timer -= dt;
    if (game.timer <= 0) { game.lives--; if (game.lives <= 0) { game.state = 'over'; showOverlay('GAME OVER', 'Score ' + game.score + (game.score >= game.best ? ' · new best!' : ''), 'PLAY AGAIN'); } else resetPositions(); syncHud(true); }
    return;
  }
  if (game.state === 'levelclear') { game.timer -= dt; game.flash += dt; if (game.timer <= 0) { game.level++; resetLevel(); syncHud(true); } return; }
  game.time += dt;
  game.phaseT += dt; if (game.phaseT >= PHASES[game.phase]) { game.phaseT = 0; game.phase = Math.min(game.phase + 1, PHASES.length - 1); }
  if (game.fright > 0) {
    game.fright -= dt;
    if (game.fright <= 0) { game.fright = 0; for (const g of ghosts) if (g.state === 'fright') g.state = 'normal'; }
  }
  updatePac(dt);
  if (game.left === 0) { game.state = 'levelclear'; game.timer = 1.8; game.flash = 0; return; }
  for (const g of ghosts) updateGhost(g, dt);
  collisions();
  for (let i = popups.length - 1; i >= 0; i--) { popups[i].t -= dt; popups[i].y -= dt * 0.8; if (popups[i].t <= 0) popups.splice(i, 1); }
}
