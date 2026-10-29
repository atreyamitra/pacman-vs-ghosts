'use strict';
// DOM wiring and charts for the Soft Computing cards: fuzzy logic, neural network, genetic algorithm, AI Arena.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

const PAL = { bg: '#0b0f2b', grid: '#1a2050', text: '#8d97c9', yellow: '#ffd23f', pink: '#ff5b8a', cyan: '#3ee6ff', blue: '#4a6bff' };

/* ---------- Small canvas helpers ---------- */
function chartSetup(cv) {
  const w = cv.width, h = cv.height;
  const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  return { c, w, h };
}
function drawLines(cv, series, opt) {
  const { c, w, h } = chartSetup(cv), L = 38, R = 8, T0 = 16, B = 20;
  c.font = '11px Inter, sans-serif'; c.fillStyle = PAL.text; c.strokeStyle = PAL.grid; c.lineWidth = 1;
  const n = Math.max(...series.map(s => s.v.length), 0);
  if (n < 1) { c.textAlign = 'center'; c.fillText(opt.empty || 'No data yet', w / 2, h / 2); return; }
  let lo = opt.min != null ? opt.min : Math.min(...series.flatMap(s => s.v)), hi = opt.max != null ? opt.max : Math.max(...series.flatMap(s => s.v));
  if (hi - lo < 1e-9) hi = lo + 1;
  const X = i => L + (n === 1 ? (w - L - R) / 2 : i / (n - 1) * (w - L - R)), Y = v => T0 + (1 - (v - lo) / (hi - lo)) * (h - T0 - B);
  c.textAlign = 'right';
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); c.beginPath(); c.moveTo(L, y); c.lineTo(w - R, y); c.stroke(); c.fillText(opt.fmt ? opt.fmt(v) : Math.round(v), L - 4, y + 4); }
  c.textAlign = 'center';
  const step = Math.max(1, Math.ceil(n / 8));
  for (let i = 0; i < n; i += step) c.fillText(opt.xlab ? opt.xlab(i) : i + 1, X(i), h - 5);
  for (const s of series) {
    c.strokeStyle = s.color; c.lineWidth = s.w || 2; c.setLineDash(s.dash || []); c.beginPath();
    s.v.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v))); c.stroke(); c.setLineDash([]);
    if (n < 40) { c.fillStyle = s.color; s.v.forEach((v, i) => { c.beginPath(); c.arc(X(i), Y(v), 2.5, 0, 7); c.fill(); }); }
  }
  c.textAlign = 'left'; let lx = L + 6;
  for (const s of series) { c.fillStyle = s.color; c.fillRect(lx, 4, 10, 3); c.fillStyle = PAL.text; c.fillText(s.name, lx + 14, 10); lx += 24 + c.measureText(s.name).width; }
}

/* ---------- Busy bar ---------- */
$('busyCancel').addEventListener('click', () => { busy.cancel = true; $('busyText').textContent = 'Cancelling…'; });
function busyPanel() {
  if (!busy.on) return;
  $('busyText').textContent = busy.cancel ? 'Cancelling…' : busy.text;
  $('busyFill').style.width = Math.round(100 * Math.max(0, Math.min(1, busy.p))) + '%';
}
setInterval(busyPanel, 120);

/* ---------- Fuzzy logic card ---------- */
ghosts.forEach((g, i) => { const o = document.createElement('option'); o.value = i; o.textContent = g.name; $('fuzzyGhost').appendChild(o); });
let fzDrawn = '';
$('fuzzyOn').addEventListener('change', e => { fuzzy.on = e.target.checked; if (!fuzzy.on) ghosts.forEach(g => { g.agg = 0.5; g.fz = null; }); fzDrawn = ''; });
$('fuzzyGhost').addEventListener('change', e => { fuzzy.ghost = +e.target.value; fzDrawn = ''; });
const fzGraphCv = {};
for (const v in FZ_VARS) { const cv = document.createElement('canvas'); cv.width = 480; cv.height = 96; fzGraphCv[v] = cv; $('fzGraphs').appendChild(cv); }
function drawFuzzyGraph(v, x) {
  const cv = fzGraphCv[v], { c, w, h } = chartSetup(cv), def = FZ_VARS[v], lo = def.range[0], hi = def.range[1], L = 10, R = 10, T0 = 20, B = 18;
  const X = val => L + (val - lo) / (hi - lo) * (w - L - R), Y = m => T0 + (1 - m) * (h - T0 - B);
  c.font = '11px Inter, sans-serif'; c.fillStyle = PAL.text; c.textAlign = 'left'; c.fillText(def.label, L, 12);
  c.strokeStyle = PAL.grid; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - R, Y(0)); c.moveTo(L, Y(1)); c.lineTo(w - R, Y(1)); c.stroke();
  const cols = [PAL.cyan, PAL.yellow, PAL.pink];
  Object.keys(def.sets).forEach((nm, k) => {
    c.strokeStyle = cols[k % 3]; c.lineWidth = 2; c.beginPath();
    let bx = lo, bm = -1;
    for (let s = 0; s <= 120; s++) {
      const val = lo + (hi - lo) * s / 120, m = def.sets[nm](val);
      s ? c.lineTo(X(val), Y(m)) : c.moveTo(X(val), Y(m));
      if (m > bm + 1e-9) { bm = m; bx = val; }
    }
    c.stroke(); c.fillStyle = cols[k % 3]; c.textAlign = 'center';
    c.fillText(nm, Math.min(w - 36, Math.max(36, X(bx))), h - 4);
  });
  if (x != null) {
    const px = X(Math.max(lo, Math.min(hi, x)));
    c.strokeStyle = '#fff'; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(px, T0 - 2); c.lineTo(px, Y(0)); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fff'; c.textAlign = px > w / 2 ? 'right' : 'left';
    c.fillText(Number.isInteger(x) ? String(x) : x.toFixed(2), px + (px > w / 2 ? -4 : 4), T0 + 8);
  }
}
function fuzzyPanel() {
  const g = ghosts[fuzzy.ghost], fz = fuzzy.on ? g.fz : null;
  if (!fz) {
    const key = fuzzy.on ? 'wait' : 'off';
    if (fzDrawn !== key) {
      fzDrawn = key; for (const v in FZ_VARS) drawFuzzyGraph(v, null);
      $('fzRules').innerHTML = FZ_RULES.map(r => '<div class="fzrule"><div>' + fzRuleText(r) + '</div><b>0.00</b></div>').join('');
      $('fuzzyNow').textContent = fuzzy.on ? 'Waiting for ' + g.name + ' to leave the ghost house…' : 'Fuzzy aggression is off. Tick the box and start a game to see live values.';
    }
    return;
  }
  fzDrawn = 'on';
  for (const v in FZ_VARS) drawFuzzyGraph(v, fz.inputs[v]);
  const i = fz.inputs;
  $('fuzzyNow').innerHTML = '<b>' + g.name + '</b>: distance <b>' + i.dist + '</b>, lives <b>' + i.lives + '</b>, pellets left <b>' + Math.round(100 * i.pellets) + '%</b> &rarr; aggression <b style="color:var(--yellow)">' + fz.out.toFixed(2) + '</b> &rarr; speed &times;' + (0.88 + 0.24 * fz.out).toFixed(2);
  $('fzRules').innerHTML = fz.rules.map(r => '<div class="fzrule' + (r.w > 0.001 ? ' act' : '') + '"><div>' + r.text + '<div class="rb"><i style="width:' + Math.round(r.w * 100) + '%"></i></div></div><b>' + r.w.toFixed(2) + '</b></div>').join('');
}

/* ---------- Neural network card ---------- */
$('nnOn').addEventListener('change', e => { nn.enabled = e.target.checked; });
$('nnReset').addEventListener('click', () => { nnReset(); nnPanel(); });
function nnPanel() {
  $('nnSamples').textContent = nn.samples.toLocaleString();
  $('nnAcc').textContent = nn.win.length >= 10 ? Math.round(100 * nnWindowAcc()) + '%' : '–';
  $('nnBase').textContent = nn.winBase.length >= 10 ? Math.round(100 * nnWindowBase()) + '%' : '–';
  const h = nn.hist.slice(-120);
  drawLines($('nnChart'), [
    { name: 'Network', v: h.map(p => p.acc * 100), color: PAL.yellow },
    { name: 'Go straight', v: h.map(p => p.base * 100), color: PAL.cyan, dash: [4, 3], w: 1.5 }
  ], { min: 0, max: 100, fmt: v => Math.round(v) + '%', xlab: i => h[i].n, empty: 'Turn the network on and play (or watch the AI play) to see it learn.' });
}

/* ---------- Genetic Algorithm card ---------- */
const numIn = id => { const el = $(id); return Math.max(+el.min, Math.min(+el.max, Math.round(+el.value) || +el.min)); };
const fmtW = w => GA_KEYS.map(k => '<span class="chip">' + GA_LABEL[k] + ' ' + w[k].toFixed(2) + '</span>').join('');
function gaPanel() {
  const hist = ga.history;
  drawLines($('gaChart'), [
    { name: 'Best', v: hist.map(h => h.best), color: PAL.yellow },
    { name: 'Average', v: hist.map(h => h.avg), color: PAL.cyan, dash: [4, 3], w: 1.5 }
  ], { min: 0, fmt: v => Math.round(v), xlab: i => 'G' + (i + 1), empty: 'Press Train to evolve the evaluation weights.' });
  $('gaUseRow').hidden = !ga.evolved;
  $('gaUse').checked = !!cfg.useEvolved;
  if (!ga.evolved) { $('gaOut').innerHTML = '<p>Default (hand-tuned) weights:</p><div class="chips">' + fmtW(EW_DEFAULT) + '</div>'; return; }
  const e = ga.evolved, v = e.validation;
  const cmp = arenaCompare({ scores: v.evolved }, { scores: v.base });
  const verdict = cmp.clear
    ? (cmp.mean > 0 ? 'On unseen games the evolved weights are better: +' + Math.round(cmp.mean) + ' points per game on average (± ' + Math.round(cmp.se) + ' standard error), a clear gain.'
      : 'On unseen games the evolved weights did <b>worse</b> than the defaults (' + Math.round(cmp.mean) + ' points per game, ± ' + Math.round(cmp.se) + '). The GA over-fitted its training games.')
    : 'On unseen games the difference is ' + (cmp.mean >= 0 ? '+' : '') + Math.round(cmp.mean) + ' points per game (± ' + Math.round(cmp.se) + ' standard error), which is <b>within noise</b>. This run did not prove an improvement; try more games per individual or more generations.';
  $('gaOut').innerHTML = '<p>Evolved weights:</p><div class="chips">' + fmtW(e.weights) + '</div><p>Default weights:</p><div class="chips">' + fmtW(EW_DEFAULT) + '</div>' +
    '<div class="stat" style="grid-template-columns:repeat(2,1fr)"><div><b>' + Math.round(v.evolvedMean) + '</b><span>evolved · mean of ' + v.seeds + ' unseen games</span></div><div><b>' + Math.round(v.baseMean) + '</b><span>default · same ' + v.seeds + ' games</span></div></div>' +
    '<div class="verdict ' + (cmp.clear && cmp.mean > 0 ? 'good' : 'meh') + '">' + verdict + '</div>';
}
$('gaRun').addEventListener('click', async () => {
  if (busy.on || lab.active) return;
  $('gaOut').innerHTML = '<p>Training…</p>';
  await gaRun({ pop: numIn('gaPop'), gens: numIn('gaGens'), seeds: numIn('gaSeeds'), valSeeds: numIn('gaVal') });
  gaPanel();
});
$('gaForget').addEventListener('click', () => { if (busy.on) return; gaForget(); gaPanel(); });
$('gaUse').addEventListener('change', e => { cfg.useEvolved = e.target.checked; applyWeights(); });

/* ---------- AI Arena card ---------- */
function arenaSetup(p) {
  const useEv = $('ar' + p + '_w').value === 'evolved' && !!ga.evolved, d = $('ar' + p + '_depth').value;
  return { depth: +d, weights: useEv ? ga.evolved.weights : EW_DEFAULT, heur: cfg.heur, name: 'depth ' + d + (useEv ? ', evolved weights' : ', default weights') };
}
$('arRun').addEventListener('click', async () => {
  if (busy.on || lab.active) return;
  if (($('arA_w').value === 'evolved' || $('arB_w').value === 'evolved') && !ga.evolved) { $('arOut').innerHTML = '<p>Train the Genetic Algorithm first to get evolved weights.</p>'; return; }
  const A = arenaSetup('A'), B = arenaSetup('B'), n = numIn('arN'), maxT = numIn('arT');
  $('arOut').innerHTML = '<p>Running…</p>';
  const res = await arenaRun(A, B, n, maxT);
  if (!res) { $('arOut').innerHTML = '<p>Cancelled.</p>'; return; }
  const row = (nm, s) => '<tr><td>' + nm + '</td><td class="n">' + Math.round(s.mean) + ' ± ' + Math.round(s.se) + '</td><td class="n">' + Math.round(100 * s.survived) + '%</td><td class="n">' + Math.round(s.nodesPerDecision).toLocaleString() + '</td><td class="n">' + s.msPerDecision.toFixed(2) + '</td></tr>';
  const c = res.cmp;
  const text = c.clear ? 'Setup ' + c.winner + ' is clearly better: ' + Math.abs(Math.round(c.mean)) + ' points per game on the same seeds (± ' + Math.round(c.se) + '), more than 2 standard errors.'
    : 'No clear winner: the paired difference is ' + (c.mean >= 0 ? '+' : '') + Math.round(c.mean) + ' points per game (± ' + Math.round(c.se) + '), within 2 standard errors, so it could be luck. Try more games.';
  $('arOut').innerHTML = '<table><thead><tr><th>Setup</th><th style="text-align:right">Score ± SE</th><th style="text-align:right">Survived</th><th style="text-align:right">Nodes/move</th><th style="text-align:right">ms/move</th></tr></thead><tbody>' +
    row('A · ' + A.name, res.A) + row('B · ' + B.name, res.B) + '</tbody></table><div class="verdict ' + (c.clear ? 'good' : 'meh') + '">' + text +
    '</div><p>' + n + ' games, each limited to ' + maxT + ' simulated seconds and one life. "Survived" = Pac-Man was still alive when time ran out (or cleared the maze).</p>';
});

/* ---------- Called from uiPanel() about 8 times a second ---------- */
let panelTick = 0;
function uiExtra() {
  if (busy.on) return;
  fuzzyPanel(); nnPanel();
  if (++panelTick % 8 === 1) gaPanel();
}
gaPanel();
