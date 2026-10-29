'use strict';
// Genetic Algorithm trainer (Soft Computing: Evolutionary computation).
// Each individual (chromosome) is the set of four evaluation weights Minimax uses to judge a position
// (see EW_DEFAULT in minimax.js). Fitness = average score of that individual in fast, seeded background games.
// Every generation: evaluate everyone, keep the 2 best (elitism), then build the rest with tournament
// selection, arithmetic crossover and log-normal mutation. At the end the champion is validated on games
// it never saw, against the hand-tuned default weights.
// Loaded as a classic <script>; globals are shared between files.

const GA_KEYS = ['food', 'near', 'scared', 'power'];
const GA_LABEL = { food: 'Pellet pull', near: 'Ghost fear', scared: 'Scared-ghost bonus', power: 'Power-pellet pull' };
const GA_BOUNDS = { food: [0.2, 5], near: [0.5, 10], scared: [0, 80], power: [0, 8] };
const ga = {
  running: false, evolved: null, history: [],
  // pop: individuals per generation, gens: generations, seeds: games per individual, maxT: simulated seconds per game,
  // depth: Minimax depth used while training, valSeeds: unseen validation games
  cfg: { pop: 10, gens: 8, seeds: 5, maxT: 40, depth: 3, valSeeds: 12 }
};
try {
  const s = JSON.parse(localStorage.getItem('pacvsghosts-evolved'));
  if (s && s.weights && GA_KEYS.every(k => typeof s.weights[k] === 'number')) { ga.evolved = s; ga.history = s.history || []; }
} catch (e) {}

// Use the evolved weights in the live game only when the player switched them on.
function applyWeights() { EW = Object.assign({}, (cfg.useEvolved && ga.evolved) ? ga.evolved.weights : EW_DEFAULT); }

const gaClamp = w => { const o = {}; for (const k of GA_KEYS) o[k] = Math.min(GA_BOUNDS[k][1], Math.max(GA_BOUNDS[k][0], w[k])); return o; };
const gaGauss = rng => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());   // Box-Muller
function gaJitter(base, rng, sigma) { const o = {}; for (const k of GA_KEYS) o[k] = base[k] * Math.exp(gaGauss(rng) * (sigma || 0.5)); return gaClamp(o); }
function gaCrossover(a, b, rng) { const o = {}; for (const k of GA_KEYS) { const t = rng(); o[k] = t * a[k] + (1 - t) * b[k]; } return o; }
function gaMutate(w, rng) { const o = Object.assign({}, w); for (const k of GA_KEYS) if (rng() < 0.4) o[k] *= Math.exp(gaGauss(rng) * 0.25); return gaClamp(o); }
function gaTournament(sorted, rng, k) { let best = null; for (let i = 0; i < (k || 3); i++) { const c = sorted[(rng() * sorted.length) | 0]; if (!best || c.f > best.f) best = c; } return best; }

// Average score of one weight set over several seeded games. Returns null if cancelled.
async function gaEvaluate(w, seeds, o) {
  let sum = 0;
  for (const s of seeds) {
    const r = await simRunP({ depth: o.depth, weights: w, heur: 'manh' }, s, o.maxT);
    if (!r) return null;
    sum += r.score;
  }
  return sum / seeds.length;
}
const gaMean = a => a.reduce((x, y) => x + y, 0) / a.length;

// Run the whole evolution. Resolves with the evolved record, or null if cancelled.
async function gaRun(opts) {
  const o = Object.assign({}, ga.cfg, opts || {});
  const rng = mulberry32(o.seed != null ? o.seed : ((Date.now() & 0xffff) + 1));
  busyStart('Training…'); ga.running = true; ga.history = [];
  try {
    let pop = [Object.assign({}, EW_DEFAULT)];                       // individual 0 = the hand-tuned weights (a baseline inside the population)
    while (pop.length < o.pop) pop.push(gaJitter(EW_DEFAULT, rng));
    let scored = null;
    for (let g = 0; g < o.gens; g++) {
      const seeds = []; for (let k = 0; k < o.seeds; k++) seeds.push(1000 + g * 10 + k);   // same games for everyone in a generation = fair comparison
      scored = [];
      for (let i = 0; i < pop.length; i++) {
        busy.text = 'Generation ' + (g + 1) + '/' + o.gens + ' · individual ' + (i + 1) + '/' + pop.length;
        const f = await gaEvaluate(pop[i], seeds, o);
        if (f === null) return null;
        busy.p = (g * o.pop + i + 1) / (o.gens * o.pop + o.valSeeds);
        scored.push({ w: pop[i], f });
      }
      scored.sort((a, b) => b.f - a.f);
      ga.history.push({ gen: g + 1, best: scored[0].f, avg: gaMean(scored.map(s => s.f)), worst: scored[scored.length - 1].f, w: Object.assign({}, scored[0].w) });
      if (g < o.gens - 1) {
        const next = [scored[0].w, scored[1].w].map(w => Object.assign({}, w));   // elitism: the 2 best survive unchanged
        while (next.length < o.pop) next.push(gaMutate(gaCrossover(gaTournament(scored, rng).w, gaTournament(scored, rng).w, rng), rng));
        pop = next;
      }
    }
    const champion = Object.assign({}, scored[0].w);
    // Validation on games none of the individuals were selected on.
    const vs = []; for (let k = 0; k < o.valSeeds; k++) vs.push(9000 + k);
    const val = { seeds: o.valSeeds, evolved: [], base: [] };
    for (const s of vs) {
      busy.text = 'Validating on unseen games…';
      const a = await simRunP({ depth: o.depth, weights: champion, heur: 'manh' }, s, o.maxT); if (!a) return null;
      const b = await simRunP({ depth: o.depth, weights: EW_DEFAULT, heur: 'manh' }, s, o.maxT); if (!b) return null;
      val.evolved.push(a.score); val.base.push(b.score);
      busy.p = (o.gens * o.pop + val.evolved.length) / (o.gens * o.pop + o.valSeeds);
    }
    val.evolvedMean = gaMean(val.evolved); val.baseMean = gaMean(val.base);
    ga.evolved = { weights: champion, history: ga.history, validation: val, cfg: { pop: o.pop, gens: o.gens, seeds: o.seeds, maxT: o.maxT, depth: o.depth }, at: Date.now() };
    try { localStorage.setItem('pacvsghosts-evolved', JSON.stringify(ga.evolved)); } catch (e) {}
    return ga.evolved;
  } finally { ga.running = false; busyFinish(); applyWeights(); }
}
function gaForget() {
  ga.evolved = null; ga.history = []; cfg.useEvolved = false; applyWeights();
  try { localStorage.removeItem('pacvsghosts-evolved'); } catch (e) {}
}
