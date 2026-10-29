'use strict';
// Headless simulation harness, shared by the Genetic Algorithm trainer (ga.js) and the AI Arena (arena.js).
// It plays complete Minimax-vs-ghost games with a seeded random generator (so every run is repeatable),
// no rendering delays and a fixed time step, then restores the game settings afterwards.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

const busy = { on: false, cancel: false, text: '', p: 0 };   // true while a background batch (training / arena) runs
const sim = { active: false, stepping: false, saved: null, t: 0, maxT: 0, died: false, cleared: false, done: false, nodes: 0, decisions: 0, ms: 0 };

// Small, fast seeded random number generator (mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// setup = { depth, weights, heur }: Minimax depth, evaluation weights, ghost path-finding algorithm.
function simBegin(setup, seed, maxT) {
  sim.saved = { cfg: Object.assign({}, cfg), EW, rand: Math.random, best: game.best, fz: fuzzy.on, nn: nn.enabled };
  sim.active = true; sim.t = 0; sim.maxT = maxT; sim.died = false; sim.cleared = false; sim.done = false;
  sim.nodes = 0; sim.decisions = 0; sim.ms = 0;
  Math.random = mulberry32(seed);
  cfg.mode = 'ai'; cfg.depth = setup.depth; cfg.ab = true; cfg.heur = setup.heur || 'manh';
  EW = Object.assign({}, setup.weights || EW_DEFAULT);
  fuzzy.on = false; nn.enabled = false;
  game.score = 0; game.lives = 1; game.level = 1; game.time = 0; game.paused = false;
  resetLevel(); game.state = 'playing';
}
// Advance the simulation for up to budgetMs of real time. Returns true when the game is finished.
function simStep(budgetMs) {
  const t0 = performance.now();
  sim.stepping = true;
  try {
    while (!sim.done && performance.now() - t0 < budgetMs) {
      update(1 / 30); sim.t += 1 / 30;
      if (game.state === 'dying' || game.state === 'over') { sim.done = true; sim.died = true; }
      else if (game.state === 'levelclear') { sim.done = true; sim.cleared = true; }
      else if (sim.t >= sim.maxT) sim.done = true;
    }
  } finally { sim.stepping = false; }
  return sim.done;
}
function simEnd() {
  const r = { score: game.score, time: sim.t, died: sim.died, cleared: sim.cleared, decisions: sim.decisions, nodes: sim.nodes, ms: sim.ms };
  Math.random = sim.saved.rand; Object.assign(cfg, sim.saved.cfg); EW = sim.saved.EW; game.best = sim.saved.best;
  fuzzy.on = sim.saved.fz; nn.enabled = sim.saved.nn;
  sim.active = false;
  return r;
}
// Synchronous run (used by tests and scripts).
function simRunSync(setup, seed, maxT) {
  simBegin(setup, seed, maxT);
  while (!simStep(1e9)) { /* run to completion */ }
  return simEnd();
}
// Asynchronous run that yields to the browser between slices so the page stays responsive.
function simRunP(setup, seed, maxT) {
  return new Promise(resolve => {
    simBegin(setup, seed, maxT);
    (function tick() {
      if (busy.cancel) { simEnd(); resolve(null); return; }
      if (simStep(30)) resolve(simEnd()); else setTimeout(tick, 0);
    })();
  });
}

function busyStart(text) {
  busy.on = true; busy.cancel = false; busy.text = text || ''; busy.p = 0;
  const o = document.getElementById('overlay'); if (o) o.classList.add('hidden');
  if (document.body) document.body.classList.add('busy');
  const bb = document.getElementById('busyBar'); if (bb) bb.hidden = false;
}
function busyFinish() {
  busy.on = false; busy.cancel = false;
  if (document.body) document.body.classList.remove('busy');
  const bb = document.getElementById('busyBar'); if (bb) bb.hidden = true;
  game.score = 0; game.lives = 3; game.level = 1; game.time = 0; game.paused = false;
  resetLevel(); game.state = 'title'; showTitle(); syncHud();
}
