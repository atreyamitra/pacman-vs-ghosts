'use strict';
// Start-up and the requestAnimationFrame game loop.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- Boot ---------- */
resetLevel(); game.state = 'title';
applyWeights();
syncHud(); showTitle();
let last = 0, acc = 0;
function loop(ts) {
  const dt = Math.min(0.05, ((ts - last) / 1000) || 0); last = ts;
  update(dt); draw(); acc += dt; if (acc > 0.12) { acc = 0; uiPanel(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
