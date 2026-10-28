'use strict';
// Maze layout, graph construction and all-pairs BFS distance table.
// Loaded as a classic <script> (see index.html for load order); globals are shared between files.

/* ---------- Maze ---------- */
const MAP = [
"###################",
"#........#........#",
"#o##.###.#.###.##o#",
"#.................#",
"#.##.#.#####.#.##.#",
"#....#...#...#....#",
"####.### # ###.####",
"####.#       #.####",
"####.# ##-## #.####",
"    .  #GGG#  .    ",
"####.# ##### #.####",
"####.#       #.####",
"####.# ##### #.####",
"#........#........#",
"#.##.###.#.###.##.#",
"#o.#.....P.....#.o#",
"##.#.#.#####.#.#.##",
"#....#...#...#....#",
"#.######.#.######.#",
"#.................#",
"###################"];
const W = 19, H = 21, T = 28, N = W * H;
const DIRS = [[0,-1],[0,1],[-1,0],[1,0]];
const dpr = Math.min(2, window.devicePixelRatio || 1);
const wall = new Uint8Array(N), house = new Uint8Array(N), pelletInit = new Uint8Array(N);
let doorIdx = -1, PAC_START = [9, 15];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const ch = MAP[r][c], i = r * W + c;
  if (ch === '#') wall[i] = 1;
  else if (ch === '-') doorIdx = i;
  else if (ch === 'G') house[i] = 1;
  else if (ch === '.') pelletInit[i] = 1;
  else if (ch === 'o') pelletInit[i] = 2;
  else if (ch === 'P') PAC_START = [c, r];
}
const pacWalk = new Uint8Array(N);
for (let i = 0; i < N; i++) pacWalk[i] = (!wall[i] && !house[i] && i !== doorIdx) ? 1 : 0;
const adjG = [], adjP = [];
for (let i = 0; i < N; i++) {
  adjG.push([]); adjP.push([]);
  if (wall[i]) continue;
  const c = i % W, r = (i / W) | 0;
  for (const [dx, dy] of DIRS) {
    const nr = r + dy; if (nr < 0 || nr >= H) continue;
    const ni = nr * W + ((c + dx + W) % W);
    if (wall[ni]) continue;
    adjG[i].push(ni);
    if (pacWalk[i] && pacWalk[ni]) adjP[i].push(ni);
  }
}
const walkList = []; for (let i = 0; i < N; i++) if (pacWalk[i]) walkList.push(i);
const foodCells = [], powerCells = [];
for (let i = 0; i < N; i++) { if (pelletInit[i]) foodCells.push(i); if (pelletInit[i] === 2) powerCells.push(i); }
// all-pairs BFS distances over Pac-walkable graph (used by Minimax evaluation)
const dist = new Uint16Array(N * N).fill(999);
(function () {
  const q = new Int16Array(N);
  for (const s of walkList) {
    const base = s * N; let h = 0, t = 0; q[t++] = s; dist[base + s] = 0;
    while (h < t) { const u = q[h++]; for (const v of adjP[u]) if (dist[base + v] === 999) { dist[base + v] = dist[base + u] + 1; q[t++] = v; } }
  }
})();
const wrapC = c => (c + W) % W;
