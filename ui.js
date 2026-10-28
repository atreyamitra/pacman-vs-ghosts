'use strict';
// HUD, buttons, keyboard / touch controls and the live algorithm panels.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
const ov = $('overlay');
let ovAction = startGame;
function showOverlay(t, s, b, action) { $('ovTitle').textContent = t; $('ovSub').textContent = s; $('ovBtn').textContent = b; ovAction = action || startGame; ov.classList.remove('hidden'); }
function hideOverlay() { ov.classList.add('hidden'); }
function syncHud(force) {
  $('score').textContent = game.score; $('best').textContent = game.best; $('level').textContent = game.level;
  $('lives').textContent = game.lives > 0 ? '● '.repeat(game.lives).trim() : '–';
  $('modeLabel').textContent = cfg.mode === 'ai' ? 'AI' : 'YOU';
}
function togglePause() {
  if (lab.active) return;
  if (game.state !== 'playing' && game.state !== 'ready') return;
  if (game.paused) { game.paused = false; hideOverlay(); }
  else { game.paused = true; showOverlay('PAUSED', 'Take a breath. The ghosts are waiting.', 'RESUME', () => { game.paused = false; hideOverlay(); }); }
}
$('ovBtn').addEventListener('click', () => ovAction());
function setMode(m) { cfg.mode = m; $('modePlay').classList.toggle('on', m === 'play'); $('modeAI').classList.toggle('on', m === 'ai'); startGame(); }
$('modePlay').addEventListener('click', () => setMode('play'));
$('modeAI').addEventListener('click', () => setMode('ai'));
$('heur').addEventListener('change', e => { cfg.heur = e.target.value; if (lab.active && lab.s >= 0 && lab.t >= 0) { labStop(); labInit(); } });
$('showPaths').addEventListener('change', e => { cfg.showPaths = e.target.checked; });
$('showExp').addEventListener('change', e => { cfg.showExp = e.target.checked; });
$('depth').addEventListener('input', e => { cfg.depth = +e.target.value; $('depthVal').textContent = cfg.depth; });
$('ab').addEventListener('change', e => { cfg.ab = e.target.checked; });

const KEYS = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
window.addEventListener('keydown', e => {
  if (lab.active) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'n' || e.key === 'N') { e.preventDefault(); labStep(); }
    else if (e.key === 'Escape') labExit();
    else if (KEYS[e.key]) e.preventDefault();
    return;
  }
  if (KEYS[e.key]) { e.preventDefault(); setDir(...KEYS[e.key]); }
  else if (e.key === ' ' || e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); }
  else if (e.key === 'Enter' && !ov.classList.contains('hidden')) ovAction();
});
document.querySelectorAll('.dpad button').forEach(b => b.addEventListener('click', () => { const d = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[b.dataset.d]; setDir(d[0], d[1]); }));
let touch = null;
canvas.addEventListener('touchstart', e => { const t = e.touches[0]; touch = [t.clientX, t.clientY]; }, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!touch) return; const t = e.changedTouches[0], dx = t.clientX - touch[0], dy = t.clientY - touch[1]; touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing' && !game.paused) togglePause(); });

const rows = ghosts.map(g => {
  const tr = document.createElement('tr');
  tr.innerHTML = '<td><span class="dot" style="background:' + g.color + '"></span>' + g.name + '</td><td style="color:#8d97c9">' + g.role + '</td><td class="n">–</td><td class="n">–</td>';
  $('ghostRows').appendChild(tr); return tr;
});
function uiPanel() {
  ghosts.forEach((g, i) => { const c = rows[i].children; c[2].textContent = g.plans ? g.expanded + ' (avg ' + Math.round(g.sumExp / g.plans) + ')' : '–'; c[3].textContent = g.plans ? g.plen : '–'; });
  if (lastAI) {
    $('sNodes').textContent = lastAI.nodes.toLocaleString(); $('sPruned').textContent = lastAI.pruned.toLocaleString(); $('sMs').textContent = lastAI.ms.toFixed(1);
    const names = { '0,-1': '↑ Up', '0,1': '↓ Down', '-1,0': '← Left', '1,0': '→ Right' };
    $('chips').innerHTML = lastAI.scores.map(s => '<span class="chip' + (s.dir === lastAI.move ? ' best' : '') + '">' + names[s.dir.join(',')] + ' · ' + s.v.toFixed(0) + '</span>').join('');
  }
  syncHud();
}
