'use strict';
// Canvas rendering of the maze, Pac-Man, ghosts, paths and effects.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- Rendering ---------- */
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
canvas.width = W * T * dpr; canvas.height = H * T * dpr;
let mazeCanvas = null;
function buildMaze() {
  mazeCanvas = document.createElement('canvas'); mazeCanvas.width = W * T * dpr; mazeCanvas.height = H * T * dpr;
  const m = mazeCanvas.getContext('2d'); m.setTransform(dpr, 0, 0, dpr, 0, 0);
  m.fillStyle = '#05060f'; m.fillRect(0, 0, W * T, H * T);
  m.fillStyle = '#0a0f3a';
  for (let i = 0; i < N; i++) if (wall[i]) m.fillRect((i % W) * T, ((i / W) | 0) * T, T, T);
  m.strokeStyle = '#4a6bff'; m.lineWidth = 2; m.shadowColor = '#4a6bff'; m.shadowBlur = 7; m.lineCap = 'round';
  m.beginPath();
  for (let i = 0; i < N; i++) {
    if (!wall[i]) continue; const c = i % W, r = (i / W) | 0, x = c * T, y = r * T;
    if (r > 0 && !wall[i - W]) { m.moveTo(x, y); m.lineTo(x + T, y); }
    if (r < H - 1 && !wall[i + W]) { m.moveTo(x, y + T); m.lineTo(x + T, y + T); }
    if (c > 0 && !wall[i - 1]) { m.moveTo(x, y); m.lineTo(x, y + T); }
    if (c < W - 1 && !wall[i + 1]) { m.moveTo(x + T, y); m.lineTo(x + T, y + T); }
  }
  m.stroke();
  const dc = doorIdx % W, dr = (doorIdx / W) | 0;
  m.strokeStyle = '#ff8ad8'; m.shadowColor = '#ff8ad8'; m.lineWidth = 3; m.beginPath(); m.moveTo(dc * T + 3, dr * T + T / 2); m.lineTo(dc * T + T - 3, dr * T + T / 2); m.stroke();
}
function hex2rgba(h, a) { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function center(i) { return [(i % W + 0.5) * T, (((i / W) | 0) + 0.5) * T]; }
function drawPac() {
  const x = (pac.c + pac.dx * pac.p + 0.5) * T, y = (pac.r + pac.dy * pac.p + 0.5) * T;
  const face = Math.atan2(pac.fy, pac.fx);
  let open;
  if (game.state === 'dying') { const k = 1 - Math.max(0, game.timer) / 1.5; open = 0.05 + k * 0.95; } else open = 0.04 + 0.26 * Math.abs(Math.sin(game.anim * 14));
  ctx.save(); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffd23f'; ctx.beginPath();
  if (open >= 0.99) { ctx.restore(); return; }
  ctx.moveTo(x, y); ctx.arc(x, y, T * 0.42, face + open * Math.PI, face + (2 - open) * Math.PI); ctx.closePath(); ctx.fill(); ctx.restore();
}
function drawGhost(g) {
  const bob = g.state === 'house' ? Math.sin(g.bob) * 2 : 0;
  const x = (g.c + g.dx * g.p + 0.5) * T, y = (g.r + g.dy * g.p + 0.5) * T + bob, R = T * 0.42;
  if (g.state !== 'eaten') {
    let col = g.color;
    if (g.state === 'fright') col = (game.fright < 2 && Math.floor(game.fright * 5) % 2 === 0) ? '#ffffff' : '#2a3bff';
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = col; ctx.beginPath();
    ctx.arc(x, y - 1, R, Math.PI, 0); ctx.lineTo(x + R, y + R);
    ctx.lineTo(x + R * 2 / 3, y + R - 4); ctx.lineTo(x + R / 3, y + R); ctx.lineTo(x, y + R - 4);
    ctx.lineTo(x - R / 3, y + R); ctx.lineTo(x - R * 2 / 3, y + R - 4); ctx.lineTo(x - R, y + R);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  if (g.state === 'fright') {
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x - 5, y - 4, 3, 3); ctx.fillRect(x + 2, y - 4, 3, 3);
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 6, y + 5); ctx.lineTo(x - 3, y + 2); ctx.lineTo(x, y + 5); ctx.lineTo(x + 3, y + 2); ctx.lineTo(x + 6, y + 5); ctx.stroke();
  } else {
    const ex = g.dx * 2, ey = g.dy * 2;
    for (const s of [-5, 5]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s, y - 3, 4.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a2cff'; ctx.beginPath(); ctx.arc(x + s + ex, y - 3 + ey, 2, 0, 7); ctx.fill();
    }
  }
}
function draw() {
  if (!mazeCanvas) buildMaze();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(mazeCanvas, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (lab.active) { drawLab(); return; }
  if (game.state === 'levelclear' && Math.floor(game.flash * 5) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(0, 0, W * T, H * T); }
  const pulse = 1 + 0.25 * Math.sin(game.anim * 8 + 1);
  for (const i of foodCells) {
    const v = game.pellets[i]; if (!v) continue; const [x, y] = center(i);
    if (v === 1) { ctx.fillStyle = '#ffd9a8'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
    else { ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 6 * pulse, 0, 7); ctx.fill(); ctx.restore(); }
  }
  if (cfg.showExp && ghosts[0].explored.length) {
    ctx.fillStyle = hex2rgba(ghosts[0].color, 0.2);
    for (const i of ghosts[0].explored) ctx.fillRect((i % W) * T + 3, ((i / W) | 0) * T + 3, T - 6, T - 6);
  }
  if (cfg.showPaths) for (const g of ghosts) {
    if (g.path.length < 2 || g.state === 'house') continue;
    ctx.strokeStyle = hex2rgba(g.color, 0.75); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath();
    let prev = null;
    for (const i of g.path) { const [x, y] = center(i); if (prev && Math.abs(x - prev[0]) > T * 2) ctx.moveTo(x, y); else if (prev) ctx.lineTo(x, y); else ctx.moveTo(x, y); prev = [x, y]; }
    ctx.stroke(); ctx.setLineDash([]);
    const [tx, ty] = center(g.path[g.path.length - 1]); ctx.fillStyle = hex2rgba(g.color, 0.9); ctx.beginPath(); ctx.arc(tx, ty, 4, 0, 7); ctx.fill();
  }
  drawPac();
  if (game.state !== 'dying') for (const g of ghosts) drawGhost(g);
  ctx.font = '700 13px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd23f';
  for (const p of popups) ctx.fillText(p.text, (p.x + 0.5) * T, (p.y + 0.5) * T);
  if (game.state === 'ready') { ctx.font = '14px "Press Start 2P", monospace'; ctx.fillStyle = '#ffd23f'; ctx.fillText('READY!', W * T / 2, 11.65 * T); }
  if (game.state === 'levelclear') { ctx.font = '14px "Press Start 2P", monospace'; ctx.fillStyle = '#ffd23f'; ctx.fillText('LEVEL CLEAR', W * T / 2, 11.65 * T); }
}
