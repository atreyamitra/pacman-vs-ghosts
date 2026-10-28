# Project guide (for Claude Code and other contributors)

Pac-Man vs Ghosts: a static browser game for a university AI course. A\* ghosts, Minimax + Alpha-Beta Pac-Man, A\* Step Lab. See `README.md` for features.

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

## Deploy
Vercel project `pacman-vs-ghosts` is a static site. Pushing to `main` should deploy it to https://pacman-vs-ghosts.vercel.app (if auto-deploy is not connected, redeploy from the Vercel dashboard).

## Ideas backlog
1. Genetic Algorithm that tunes the Minimax evaluation weights (fitness-vs-generation chart).
2. Fuzzy-logic ghost aggression (membership-function graphs).
3. Small neural network that predicts Pac-Man's next turn for one ghost.
4. Maze editor / more mazes, sound effects, difficulty levels.
