# Project guide (for Claude Code and other contributors)

Pac-Man vs Ghosts: a static browser game for a university AI course. A\* ghosts, Minimax + Alpha-Beta Pac-Man, A\* Step Lab, fuzzy-logic ghost aggression, neural-network Pinky, genetic-algorithm weight tuning, AI Arena. See `README.md` for features.

## Layout
- `index.html`: markup and the ordered list of `<script>` tags.
- `css/style.css`: all styling.
- `js/*.js`: game code, split by responsibility (see the table in `README.md`).
- `tests/headless-test.js`: Node regression test (no dependencies).
- `VIVA_CHEATSHEET.md`: viva notes for the author. Keep numbers in it in sync with real measurements.

## Rules that matter
- Scripts are **classic `<script>` tags**, not ES modules. Top-level `const`/`function` are shared globals across files.
- **Load order is in `index.html`.** Top-level code may only *call* functions defined in files loaded earlier (function *bodies* may reference anything, since they run later). The test loads files in the same order, so it catches ordering mistakes.
- No build step and no dependencies. Keep it that way: it must open from a plain `index.html`.
- Keep algorithm code readable. This code is shown and explained in a viva, so prefer clear names and short comments over clever tricks.
- When changing game logic, run `node tests/headless-test.js` before committing.
- `sim.js` runs headless seeded games (it swaps `Math.random`, `cfg`, `EW`, fuzzy/NN flags and restores them in `simEnd()`). While a batch runs, `busy.on` freezes the normal loop. Anything new that changes game state must be restored there.
- Minimax weights live in `EW` (`minimax.js`); the GA and Arena pass weights through `simBegin()`.
- Report GA/NN/Arena results honestly (see README "Soft-computing results"); do not hard-code claims of improvement.

## Deploy
Vercel project `pacman-vs-ghosts` is a static site. Pushing to `main` deploys it to https://pacman-vs-ghosts.vercel.app.

## Ideas backlog
1. Human-controlled ghost mode (play as a ghost against the Minimax Pac-Man).
2. Power-ups / fruit, maze editor / more mazes.
3. Sound effects, difficulty levels, polish.
