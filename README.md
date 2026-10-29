# Pac-Man vs Ghosts: AI Search Lab

A playable Pac-Man game built for the **Artificial Intelligence and Soft Computing (CSE3121)** algorithmic-implementation project.

- **Ghosts** plan their routes with **A\* search** (Heuristic Search).
- **Pac-Man** can play itself with **Minimax + Alpha-Beta pruning** (Adversarial Search).
- **Fuzzy logic** sets each ghost's aggression, a small **neural network** predicts Pac-Man's turns for Pinky, and a **genetic algorithm** evolves the weights Minimax uses to judge positions.
- Built-in tools let you *see* the algorithms working: an **A\* Step Lab**, live fuzzy membership graphs and rule firing, a neural-net learning curve, a GA fitness chart, an **AI Arena** and head-to-head benchmarks.

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
| **Fuzzy-logic ghosts** | 3 inputs (distance, lives, pellets left) fuzzified, 11 IF-THEN rules (AND = min), Sugeno-style defuzzification to an aggression value (0-1) that scales ghost speed (x0.88 to x1.12) and skips scatter mode when very high. Live membership graphs, input markers and rule strengths |
| **Neural-network ghost** | A 17-10-4 MLP (tanh, softmax) trained online by backpropagation predicts which way Pac-Man turns at junctions; Pinky ambushes the predicted tile. Shows accuracy against a "keep going straight" baseline |
| **Genetic Algorithm trainer** | Evolves the 4 Minimax evaluation weights (elitism, tournament selection, crossover, mutation) over fast seeded background games, plots best/average fitness per generation, then validates the champion on unseen games and says honestly whether the gain is real |
| **AI Arena** | Compares two Minimax setups (depth, default vs evolved weights) on identical seeded games with a paired statistical comparison |
| Experiments | Benchmarks A\* vs Dijkstra/Greedy (300 random routes) and Minimax vs Alpha-Beta on the current position |

## Where each algorithm lives

| File | Contents |
|---|---|
| `js/astar.js` | `astar()`: A\* with a binary-heap open list; heuristic modes (Manhattan, Euclidean, zero = Dijkstra, Greedy, Weighted) |
| `js/ghosts.js` | `ghostPlan()`, `chaseTarget()`: choose each ghost's target, then call A\* |
| `js/minimax.js` | `maxVal()`, `minVal()`, `evaluate()`, `aiSearch()`: Minimax + Alpha-Beta with move ordering |
| `js/fuzzy.js` | Membership functions, rule base, `fuzzyEval()` (fuzzification, rule firing, defuzzification) |
| `js/nn.js` | MLP forward pass, backpropagation (`nnTrain()`), online junction observation, `nnTarget()` for Pinky |
| `js/ga.js` | Genetic algorithm: `gaRun()`, selection, crossover, mutation, validation |
| `js/sim.js` | Seeded, headless game simulation used by the GA and the Arena (restores all game state afterwards) |
| `js/arena.js` | Paired comparison of two AI setups |
| `js/panels.js` | Charts and controls for the cards above |
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

Checks that A\* and the Step Lab return shortest paths (same length as Dijkstra), that Alpha-Beta matches plain Minimax with fewer nodes, that the Minimax AI can play, that the game pauses during the Step Lab, that fuzzy output stays within 0-1, that seeded simulations are repeatable and restore global state, that the neural network's softmax is valid and backpropagation lowers the loss, that the Arena statistics behave, and that a small genetic-algorithm run finishes with in-bounds weights and is repeatable.

## Measured results (on this maze)

- Average nodes expanded over 300 random routes: Dijkstra 93.3, **A\* Manhattan 29.7**, A\* Euclidean 38.5, Weighted A\* 19.4, Greedy 18.9.
- A\* and Dijkstra found the shortest path in 100% of routes; Weighted A\* in about 80%, Greedy in about 70%.
- Minimax at depth 3 from the start position: 270 nodes without pruning, **117 with Alpha-Beta**, same best value.

### Soft-computing results (be honest about these)

- **Genetic algorithm.** Game scores are very noisy (one maze, random-looking ghost choices), so a GA run can over-fit. In one 12-game validation on unseen seeds (population 10, 8 generations, 6 games per individual, depth 3, 40 s games) the evolved weights averaged 4007 against 3398 for the hand-tuned weights, but with per-game scores from 830 to 6460 the gap is within noise. The app prints this verdict itself after every run.
- **Neural network.** Over about 5,000 junction decisions made by the Minimax Pac-Man, the network predicted the next turn correctly about 50% of the time against about 47% for the "keep going straight" baseline. It is learning, but only a little better than the baseline; do not claim more.
- **Fuzzy logic.** Examples: ghost 2 tiles away with 1 life left gives aggression 1.00; 15 tiles away with 3 lives and 90% of pellets left gives 0.20.

## Deployment

Static site hosted on Vercel (no build command, output directory is the repo root).
