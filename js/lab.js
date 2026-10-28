'use strict';
// A* Step Lab: click start/goal and step through A* one node at a time.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- A* Step Lab ---------- */
const lab = { active: false, s: -1, t: -1, L: null, timer: null, hover: -1, wasHidden: false, msg: '' };
const fmt = v => Number.isInteger(v) ? String(v) : v.toFixed(1);
const tileName = i => '(' + (i % W) + ',' + ((i / W) | 0) + ')';
function labFOf(L, i) { return L.mode.gw * L.g.get(i) + L.mode.hw * heur(L.mode.h, i, lab.t); }
function labStop() { if (lab.timer) { clearInterval(lab.timer); lab.timer = null; } }
function labInit() {
  if (lab.s < 0 || lab.t < 0) return;
  lab.L = { mode: ASTAR_MODES[cfg.heur], g: new Map([[lab.s, 0]]), parent: new Map(), open: [lab.s], closed: new Set(), current: -1, done: false, found: false, path: [], expanded: 0 };
  lab.msg = ASTAR_MODES[cfg.heur].label + ': start ' + tileName(lab.s) + ' → goal ' + tileName(lab.t) + '. Press Step to expand the open node with the lowest f.';
  labUI();
}
function labStep() {
  const L = lab.L;
  if (!L) { lab.msg = 'Pick a start tile and a goal tile on the maze first.'; labUI(); return; }
  if (L.done) return;
  if (!L.open.length) { L.done = true; lab.msg = 'Open list is empty: no path exists.'; labStop(); labUI(); return; }
  let bi = 0, bf = Infinity, bh = Infinity;
  L.open.forEach((n, k) => {
    const f = labFOf(L, n), h = heur(L.mode.h, n, lab.t);
    if (f < bf || (f === bf && h < bh)) { bf = f; bh = h; bi = k; }
  });
  const u = L.open.splice(bi, 1)[0];
  L.closed.add(u); L.current = u; L.expanded++;
  const gu = L.g.get(u);
  if (u === lab.t) {
    L.done = true; L.found = true;
    for (let x = u; x !== undefined; x = L.parent.get(x)) L.path.push(x);
    L.path.reverse();
    lab.msg = 'Goal reached! Shortest path = ' + (L.path.length - 1) + ' steps, found after expanding ' + L.expanded + ' nodes.';
    labStop(); labUI(); return;
  }
  let added = 0, improved = 0;
  for (const v of adjP[u]) {
    if (L.closed.has(v)) continue;
    const ng = gu + 1;
    if (!L.g.has(v)) { L.g.set(v, ng); L.parent.set(v, u); L.open.push(v); added++; }
    else if (ng < L.g.get(v)) { L.g.set(v, ng); L.parent.set(v, u); improved++; }
  }
  lab.msg = 'Expanded ' + tileName(u) + ': g=' + gu + ', h=' + fmt(heur(L.mode.h, u, lab.t)) + ', f=' + fmt(labFOf(L, u)) + '. Added ' + added + ' neighbour' + (added === 1 ? '' : 's') + (improved ? ', improved ' + improved : '') + ' to the open list.';
  labUI();
}
function labUI() {
  const L = lab.L;
  $('labMsg').textContent = lab.msg;
  $('labStats').innerHTML = L ? ['Expanded ' + L.expanded, 'Open ' + L.open.length, 'Closed ' + L.closed.size, L.found ? 'Path ' + (L.path.length - 1) : 'Path –'].map(t => '<span class="chip">' + t + '</span>').join('') : '';
  if (L && !L.done && L.open.length) {
    const q = L.open.map(n => [n, labFOf(L, n)]).sort((a, b) => a[1] - b[1]).slice(0, 4);
    $('labQueue').textContent = 'Next up (lowest f first): ' + q.map(p => tileName(p[0]) + ' f=' + fmt(p[1])).join(' · ');
  } else $('labQueue').textContent = '';
  $('labAuto').textContent = lab.timer ? 'Pause' : 'Auto-play';
}
function labAutoToggle() {
  if (lab.timer) { labStop(); labUI(); return; }
  if (!lab.L || lab.L.done) { if (lab.L && lab.L.done) labInit(); else { labStep(); return; } }
  const delay = 1050 - 100 * (+$('labSpeed').value);
  lab.timer = setInterval(() => { if (!lab.L || lab.L.done) { labStop(); labUI(); return; } labStep(); }, delay);
  labUI();
}
function labEnter() {
  lab.active = true; lab.wasHidden = ov.classList.contains('hidden'); ov.classList.add('hidden');
  canvas.style.cursor = 'crosshair'; $('labBox').hidden = false; $('labToggle').textContent = 'Exit Step Lab';
  lab.s = lab.t = -1; lab.L = null; lab.msg = 'Click a start tile on the maze, then click a goal tile. (Or press "Random start / goal".)'; labUI();
}
function labExit() {
  labStop(); lab.active = false; if (!lab.wasHidden) ov.classList.remove('hidden');
  canvas.style.cursor = ''; $('labBox').hidden = true; $('labToggle').textContent = 'Open Step Lab';
}
function tileAt(e) {
  const r = canvas.getBoundingClientRect();
  const c = Math.max(0, Math.min(W - 1, Math.floor((e.clientX - r.left) / r.width * W)));
  const y = Math.max(0, Math.min(H - 1, Math.floor((e.clientY - r.top) / r.height * H)));
  return y * W + c;
}
function drawLab() {
  const L = lab.L;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const px = i => (i % W) * T, py = i => ((i / W) | 0) * T;
  if (L) {
    for (const i of L.closed) { ctx.fillStyle = 'rgba(255,91,138,.30)'; ctx.fillRect(px(i) + 2, py(i) + 2, T - 4, T - 4); }
    for (const i of L.open) { ctx.fillStyle = 'rgba(70,255,150,.34)'; ctx.fillRect(px(i) + 2, py(i) + 2, T - 4, T - 4); }
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const [i, p] of L.parent) {
      const [x, y] = center(i), [qx, qy] = center(p), dx = qx - x, dy = qy - y;
      if (Math.abs(dx) > T * 2) continue;
      ctx.moveTo(x, y + 6); ctx.lineTo(x + dx * 0.3, y + 6 + dy * 0.3);
    }
    ctx.stroke();
    ctx.font = '700 9px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.95)';
    for (const i of L.g.keys()) { const [x, y] = center(i); ctx.fillText(fmt(labFOf(L, i)), x, y - 5); }
    if (L.found) {
      ctx.save(); ctx.strokeStyle = '#3ee6ff'; ctx.lineWidth = 4; ctx.shadowColor = '#3ee6ff'; ctx.shadowBlur = 8; ctx.lineJoin = 'round'; ctx.beginPath();
      let prev = null;
      for (const i of L.path) { const [x, y] = center(i); if (prev && Math.abs(x - prev[0]) > T * 2) ctx.moveTo(x, y); else if (prev) ctx.lineTo(x, y); else ctx.moveTo(x, y); prev = [x, y]; }
      ctx.stroke(); ctx.restore();
    }
    if (L.current >= 0) { ctx.save(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 10; ctx.strokeRect(px(L.current) + 1.5, py(L.current) + 1.5, T - 3, T - 3); ctx.restore(); }
  }
  if (lab.hover >= 0 && pacWalk[lab.hover]) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(px(lab.hover) + 1, py(lab.hover) + 1, T - 2, T - 2); }
  ctx.font = '700 10px Inter, sans-serif';
  if (lab.s >= 0) { const [x, y] = center(lab.s); ctx.fillStyle = '#4a6bff'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText('S', x, y + 0.5); }
  if (lab.t >= 0) { const [x, y] = center(lab.t); ctx.fillStyle = '#ff5b8a'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText('G', x, y + 0.5); }
  ctx.textBaseline = 'alphabetic';
}
$('labToggle').addEventListener('click', () => lab.active ? labExit() : labEnter());
$('labStepBtn').addEventListener('click', () => { labStop(); labStep(); });
$('labAuto').addEventListener('click', labAutoToggle);
$('labFinish').addEventListener('click', () => { labStop(); if (!lab.L) { labStep(); return; } let guard = 0; while (!lab.L.done && guard++ < 2000) labStep(); labUI(); });
$('labRestart').addEventListener('click', () => { labStop(); if (lab.s >= 0 && lab.t >= 0) labInit(); else { lab.msg = 'Click a start tile, then a goal tile.'; labUI(); } });
$('labRandom').addEventListener('click', () => {
  labStop(); let s, t, k = 0;
  do { s = walkList[(Math.random() * walkList.length) | 0]; t = walkList[(Math.random() * walkList.length) | 0]; k++; } while ((dist[s * N + t] < 10 || dist[s * N + t] === 999) && k < 500);
  lab.s = s; lab.t = t; labInit();
});
$('labSpeed').addEventListener('input', () => { if (lab.timer) { labStop(); labAutoToggle(); } });
canvas.addEventListener('click', e => {
  if (!lab.active) return;
  const i = tileAt(e);
  if (!pacWalk[i]) { lab.msg = 'Pick a corridor tile (not a wall or the ghost house).'; labUI(); return; }
  if (lab.s < 0 || lab.t >= 0) { labStop(); lab.s = i; lab.t = -1; lab.L = null; lab.msg = 'Start set at ' + tileName(i) + '. Now click a goal tile.'; labUI(); }
  else if (i !== lab.s) { lab.t = i; labInit(); }
});
canvas.addEventListener('mousemove', e => {
  if (!lab.active) return;
  const i = tileAt(e); lab.hover = i;
  const L = lab.L, el = $('labHover');
  if (!pacWalk[i]) { el.textContent = 'Wall or ghost house.'; return; }
  if (L && L.g.has(i)) {
    const p = L.parent.get(i);
    el.textContent = tileName(i) + ': g=' + L.g.get(i) + ', h=' + fmt(heur(L.mode.h, i, lab.t)) + ', f=' + fmt(labFOf(L, i)) + (p !== undefined ? ', parent ' + tileName(p) : ', start tile') + (L.closed.has(i) ? ' · closed' : ' · open');
  } else el.textContent = tileName(i) + ': not discovered yet.';
});
canvas.addEventListener('mouseleave', () => { lab.hover = -1; });
