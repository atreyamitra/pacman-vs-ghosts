'use strict';
// Neural-network ghost (Soft Computing: Neural Networks).
// A tiny multilayer perceptron (17 inputs -> 10 tanh hidden units -> 4 outputs) learns online which way
// Pac-Man turns at junctions. Pinky then aims at where the network expects Pac-Man to be, instead of
// the fixed "4 tiles ahead" rule. Training is plain backpropagation with stochastic gradient descent.
// Loaded as a classic <script>; globals are shared between files.
//
// Input features (17): for each of the 4 directions [up, down, left, right]
//   open (is the tile free?), pellet closeness (1 - distance to the nearest pellet / 15),
//   ghost closeness (1 - distance to the nearest dangerous ghost / 12)       -> 12 numbers
// plus a one-hot of Pac-Man's current facing direction (4) and a "ghosts are frightened" flag (1).

const NN_IN = 17, NN_H = 10, NN_OUT = 4;
const nn = {
  enabled: false, lr: 0.1, W1: null, b1: null, W2: null, b2: null,
  samples: 0, hits: 0, baseHits: 0, win: [], winBase: [], hist: [], buf: []
};

function nnInit(seed) {
  const r = mulberry32(seed || 777);
  const lim1 = Math.sqrt(6 / (NN_IN + NN_H)), lim2 = Math.sqrt(6 / (NN_H + NN_OUT));
  nn.W1 = Float64Array.from({ length: NN_H * NN_IN }, () => (r() * 2 - 1) * lim1);
  nn.b1 = new Float64Array(NN_H);
  nn.W2 = Float64Array.from({ length: NN_OUT * NN_H }, () => (r() * 2 - 1) * lim2);
  nn.b2 = new Float64Array(NN_OUT);
  nn.samples = 0; nn.hits = 0; nn.baseHits = 0; nn.win = []; nn.winBase = []; nn.hist = []; nn.buf = [];
}
function nnSave() {
  try {
    localStorage.setItem('pacvsghosts-nn', JSON.stringify({
      v: 1, W1: Array.from(nn.W1), b1: Array.from(nn.b1), W2: Array.from(nn.W2), b2: Array.from(nn.b2),
      samples: nn.samples, hits: nn.hits, baseHits: nn.baseHits, hist: nn.hist.slice(-200)
    }));
  } catch (e) {}
}
function nnLoad() {
  try {
    const s = JSON.parse(localStorage.getItem('pacvsghosts-nn'));
    if (s && s.v === 1 && s.W1.length === NN_H * NN_IN && s.W2.length === NN_OUT * NN_H) {
      nn.W1 = Float64Array.from(s.W1); nn.b1 = Float64Array.from(s.b1); nn.W2 = Float64Array.from(s.W2); nn.b2 = Float64Array.from(s.b2);
      nn.samples = s.samples | 0; nn.hits = s.hits | 0; nn.baseHits = s.baseHits | 0; nn.hist = s.hist || [];
      return true;
    }
  } catch (e) {}
  return false;
}
function nnReset() { nnInit(777); try { localStorage.removeItem('pacvsghosts-nn'); } catch (e) {} }
nnInit(777); nnLoad();

// Build the input vector for Pac-Man standing on tile (c, r) and facing (fx, fy).
function nnFeatures(c, r, fx, fy) {
  const x = new Float64Array(NN_IN), open = [0, 0, 0, 0];
  const ghostTiles = [];
  for (const g of ghosts) {
    if (g.state !== 'normal') continue;
    let gc = g.c, gr = g.r; if (g.p >= 0.5) { gc = wrapC(gc + g.dx); gr += g.dy; }
    const gi = gr * W + gc; if (pacWalk[gi]) ghostTiles.push(gi);
  }
  for (let k = 0; k < 4; k++) {
    const nr = r + DIRS[k][1]; if (nr < 0 || nr >= H) continue;
    const ni = nr * W + wrapC(c + DIRS[k][0]);
    if (!pacWalk[ni]) continue;
    open[k] = 1; x[k * 3] = 1;
    let pd = 999; for (const f of foodCells) if (game.pellets[f]) { const d = dist[ni * N + f]; if (d < pd) pd = d; }
    x[k * 3 + 1] = pd < 999 ? Math.max(0, 1 - pd / 15) : 0;
    let gp = 0; for (const gi of ghostTiles) { const d = dist[ni * N + gi]; gp = Math.max(gp, Math.max(0, 1 - d / 12)); }
    x[k * 3 + 2] = gp;
  }
  for (let k = 0; k < 4; k++) if (DIRS[k][0] === fx && DIRS[k][1] === fy) x[12 + k] = 1;
  x[16] = game.fright > 0 ? 1 : 0;
  return { x, open };
}
// Forward pass. Output = probability for each direction (softmax over the open directions only).
function nnForward(x, open) {
  const h = new Float64Array(NN_H), z = new Float64Array(NN_OUT), p = new Float64Array(NN_OUT);
  for (let j = 0; j < NN_H; j++) { let s = nn.b1[j]; for (let i = 0; i < NN_IN; i++) s += nn.W1[j * NN_IN + i] * x[i]; h[j] = Math.tanh(s); }
  let mx = -Infinity;
  for (let k = 0; k < NN_OUT; k++) { let s = nn.b2[k]; for (let j = 0; j < NN_H; j++) s += nn.W2[k * NN_H + j] * h[j]; z[k] = s; if (open[k] && s > mx) mx = s; }
  let sum = 0;
  for (let k = 0; k < NN_OUT; k++) if (open[k]) { p[k] = Math.exp(z[k] - mx); sum += p[k]; }
  if (sum > 0) for (let k = 0; k < NN_OUT; k++) p[k] /= sum;
  return { h, p };
}
// One backpropagation step on one example (cross-entropy loss). y = index of the direction Pac-Man really took.
function nnTrain(x, open, y) {
  const { h, p } = nnForward(x, open);
  const dz = new Float64Array(NN_OUT);
  for (let k = 0; k < NN_OUT; k++) if (open[k]) dz[k] = p[k] - (k === y ? 1 : 0);
  const dh = new Float64Array(NN_H);
  for (let j = 0; j < NN_H; j++) { let s = 0; for (let k = 0; k < NN_OUT; k++) s += nn.W2[k * NN_H + j] * dz[k]; dh[j] = s * (1 - h[j] * h[j]); }
  for (let k = 0; k < NN_OUT; k++) { for (let j = 0; j < NN_H; j++) nn.W2[k * NN_H + j] -= nn.lr * dz[k] * h[j]; nn.b2[k] -= nn.lr * dz[k]; }
  for (let j = 0; j < NN_H; j++) { for (let i = 0; i < NN_IN; i++) nn.W1[j * NN_IN + i] -= nn.lr * dh[j] * x[i]; nn.b1[j] -= nn.lr * dh[j]; }
  return -Math.log(Math.max(1e-9, p[y]));
}
const nnArgmax = (p, open, skip) => { let b = -1, bv = -1; for (let k = 0; k < 4; k++) if (open[k] && k !== skip && p[k] > bv) { bv = p[k]; b = k; } return b; };
const nnReverse = (fx, fy) => DIRS.findIndex(d => d[0] === -fx && d[1] === -fy);
// The "dumb" comparison: keep going straight if possible, otherwise take the first non-reverse opening.
function nnBaseline(open, fx, fy) {
  const fwd = DIRS.findIndex(d => d[0] === fx && d[1] === fy), rev = nnReverse(fx, fy);
  if (fwd >= 0 && open[fwd]) return fwd;
  for (let k = 0; k < 4; k++) if (open[k] && k !== rev) return k;
  return rev;
}

// Called by pacChoose() just before Pac-Man decides at a tile. Returns null unless it is a real junction.
function nnObserveBefore() {
  const F = nnFeatures(pac.c, pac.r, pac.fx, pac.fy), rev = nnReverse(pac.fx, pac.fy);
  let options = 0; for (let k = 0; k < 4; k++) if (F.open[k] && k !== rev) options++;
  if (options < 2) return null;
  const { p } = nnForward(F.x, F.open);
  return { F, pk: nnArgmax(p, F.open, rev), bk: nnBaseline(F.open, pac.fx, pac.fy) };
}
// ...and just after: compare the prediction with what Pac-Man actually did, then learn from it.
function nnObserveAfter(o) {
  if (!pac.dx && !pac.dy) return;
  const y = DIRS.findIndex(d => d[0] === pac.dx && d[1] === pac.dy); if (y < 0) return;
  const hit = o.pk === y ? 1 : 0, bhit = o.bk === y ? 1 : 0;
  nn.samples++; nn.hits += hit; nn.baseHits += bhit;
  nn.win.push(hit); nn.winBase.push(bhit);
  if (nn.win.length > 100) { nn.win.shift(); nn.winBase.shift(); }
  nn.buf.push({ x: o.F.x, open: o.F.open, y }); if (nn.buf.length > 300) nn.buf.shift();
  nnTrain(o.F.x, o.F.open, y);
  for (let i = 0; i < 3 && nn.buf.length > 5; i++) { const s = nn.buf[(Math.random() * nn.buf.length) | 0]; nnTrain(s.x, s.open, s.y); }
  if (nn.samples % 10 === 0) nn.hist.push({ n: nn.samples, acc: nnWindowAcc(), base: nnWindowBase() });
  if (nn.hist.length > 400) nn.hist.shift();
  if (nn.samples % 25 === 0) nnSave();
}
const nnWindowAcc = () => nn.win.length ? nn.win.reduce((a, b) => a + b, 0) / nn.win.length : 0;
const nnWindowBase = () => nn.winBase.length ? nn.winBase.reduce((a, b) => a + b, 0) / nn.winBase.length : 0;

// Where Pinky should aim: follow the network's predicted direction for up to 4 tiles from the tile Pac-Man will reach next.
function nnTarget() {
  let c = pac.c, r = pac.r;
  if ((pac.dx || pac.dy) && pac.p > 0) { c = wrapC(c + pac.dx); r += pac.dy; }
  const F = nnFeatures(c, r, pac.fx, pac.fy), rev = nnReverse(pac.fx, pac.fy);
  const { p } = nnForward(F.x, F.open);
  let k = nnArgmax(p, F.open, rev); if (k < 0) k = nnArgmax(p, F.open, -1);
  if (k < 0) return pac.r * W + pac.c;
  for (let s = 0; s < 4; s++) {
    const nr = r + DIRS[k][1]; if (nr < 0 || nr >= H) break;
    const ni = nr * W + wrapC(c + DIRS[k][0]); if (!pacWalk[ni]) break;
    c = wrapC(c + DIRS[k][0]); r = nr;
  }
  return r * W + c;
}
