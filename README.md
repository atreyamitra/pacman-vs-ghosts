# Pac-Man vs Ghosts: AI Search Lab

A playable Pac-Man game built for the **Artificial Intelligence and Soft Computing (CSE3121)** algorithmic-implementation project.

- **Ghosts** plan their routes with **A\* search** (Heuristic Search).
- **Pac-Man** can play itself with **Minimax + Alpha-Beta pruning** (Adversarial Search).
- Built-in tools let you *see* the algorithms working: an **A\* Step Lab**, live search statistics and head-to-head benchmarks.

**Live demo:** https://pacman-vs-ghosts.vercel.app

No frameworks, no build step: plain HTML, CSS and JavaScript on an HTML5 canvas.

## Features

| Feature | What it shows |
|---|---|
| Play yourself (arrow keys / WASD / swipe) | Ghosts hunt you with A\*; four personalities (Blinky, Pinky, Inky, Clyde) = four different A\* targets |
| "AI plays" mode | Minimax with adjustable depth (1-5) and Alpha-Beta on/off; shows nodes visited, branches pruned, ms per decision and the score of each move |
| Ghost algorithm switch | A\* (Manhattan / Euclidean), Weighted A\*, Greedy Best-First, Dijkstra |
| Show planned paths / explored nodes | Visualises each ghost's route and Blinky's search frontier |
| **A\* Step Lab** | Click a start and a goal, then step through A\* one node at a time: open list, closed list, f = g + h on every tile, parent arrows, final path |
| Experiments | Benchmarks A\* vs Dijkstra/Greedy (300 random routes) and Minimax vs Alpha-Beta on the current position |

## Where each algorithm lives

| File | Contents |
|---|---|
| `js/astar.js` | `astar()`: A\* with a binary-heap open list; heuristic modes (Manhattan, Euclidean, zero = Dijkstra, Greedy, Weighted) |
| `js/ghosts.js` | `ghostPlan()`, `chaseTarget()`: choose each ghost's target, then call A\* |
| `js/minimax.js` | `maxVal()`, `minVal()`, `evaluate()`, `aiSearch()`: Minimax + Alpha-Beta with move ordering |
| `js/lab.js` | A\* Step Lab (`labStep()` performs exactly one A\* expansion) |
| `js/maze.js` | Maze layout, graph building, all-pairs BFS distance table used by the evaluation function |
| `js/game.js` | Game state, Pac-Man movement, scoring, main update loop |
| `js/render.js` | Canvas drawing |
| `js/ui.js`, `js/experiments.js`, `js/main.js` | Controls and panels, benchmarks, start-up and game loop |

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Test

```bash
node tests/headless-test.js
```

Checks that A\* and the Step Lab return shortest paths (same length as Dijkstra), that Alpha-Beta matches plain Minimax with fewer nodes, that the Minimax AI can play, and that the game pauses during the Step Lab.

## Measured results (on this maze)

- Average nodes expanded over 300 random routes: Dijkstra 93.3, **A\* Manhattan 29.7**, A\* Euclidean 38.5, Weighted A\* 19.4, Greedy 18.9.
- A\* and Dijkstra found the shortest path in 100% of routes; Weighted A\* in about 80%, Greedy in about 70%.
- Minimax at depth 3 from the start position: 270 nodes without pruning, **117 with Alpha-Beta**, same best value.

## Deployment

Static site hosted on Vercel (no build command, output directory is the repo root).
