# Pac-Man vs Ghosts: Viva Cheat-Sheet (CSE3121 AISC)

**One-line pitch:** A Pac-Man game where the ghosts plan routes with **A\* search** (Heuristic Search) and Pac-Man can play itself with **Minimax + Alpha-Beta pruning** (Adversarial Search). Both are in your handout's rubric list.

## 1. Where each algorithm lives (open index.html and point to these)
| Algorithm | Function in code | What it does in the game |
|---|---|---|
| A* | `astar()` | Every ghost plans a shortest path to its target each time it reaches a tile |
| Heuristic | `heur()` | Manhattan (default), Euclidean, or zero (= Dijkstra) |
| Minimax | `maxVal()` / `minVal()` | Pac-Man = MAX, ghosts = MIN |
| Alpha-Beta | the `if (S.ab) {...}` lines in both | Cuts branches that cannot change the decision |
| Evaluation function | `evaluate()` | Scores a game state for the depth cutoff |

## 2. A\* in 30 seconds
- Keeps a priority queue ordered by **f(n) = g(n) + h(n)**.
  - g = steps from the start, h = estimated steps to the goal.
- Picks the node with the lowest f, expands its neighbours, repeats until it reaches the goal.
- **Optimal** if h is *admissible* (never overestimates). Manhattan distance on a grid with 4-direction moves is admissible and consistent.
- **Complete** on a finite graph. Time and memory are the weakness (all explored nodes stay in memory).
- Ghost personalities are just different **targets** fed to the same A\*:
  - Blinky: Pac-Man's tile.
  - Pinky: 4 tiles ahead of Pac-Man.
  - Inky: reflects Blinky's position around a point 2 tiles ahead of Pac-Man.
  - Clyde: chases when far, retreats to his corner when within 8 tiles.
- Ghosts are not allowed to reverse (the `ban` argument), as in the original game.

## 3. Minimax + Alpha-Beta in 30 seconds
- Game tree: Pac-Man moves (MAX), then each nearby ghost moves (MIN). One "ply round" = Pac-Man move + all ghost moves.
- Depth = how many rounds ahead. Leaf states are scored by `evaluate()`:
  - plus points for score and pellets eaten
  - minus the distance to the nearest pellet
  - big penalty when a dangerous ghost is close, near-death states are very negative
  - plus a bonus for chasing scared ghosts
- **Alpha-Beta** keeps two bounds: alpha (best MAX can already guarantee) and beta (best MIN can already guarantee). If beta <= alpha, the rest of that branch is skipped. It returns the **same answer as plain Minimax**, only faster.
- Best case with perfect move ordering: O(b^(d/2)) instead of O(b^d). The code sorts moves (nearest-to-pellet first) to improve pruning.
- Why only the 2 nearest ghosts? To keep the branching factor small enough to search depth 3-5 in real time. This is a deliberate approximation.

## 4. Numbers you can quote (measured on this maze)
- Average over 300 random start/goal pairs: **Dijkstra 93.3 nodes, A\* Manhattan 29.7, A\* Euclidean 38.5, Weighted A\* 19.4, Greedy 18.9**.
- A\* (both heuristics) and Dijkstra found the shortest path in **100%** of cases. Weighted A\* was optimal in 80%, Greedy in ~70%.
- Minimax at depth 3 from the start position: **270 nodes without pruning, 117 with Alpha-Beta**, same best value.
- Use the two **Experiments** buttons on the site to reproduce these live in the viva (numbers on screen may differ slightly from the above).

## 5. Likely viva questions
**Q: Why A\* and not BFS or Dijkstra?** BFS/Dijkstra explore in all directions. A\* uses the heuristic to steer toward the goal, so it expands about 3x fewer nodes here while giving the same shortest path.

**Q: Why is Manhattan admissible here?** Movement is 4-directional with unit cost, so the real distance is never less than |dx| + |dy|. (The tunnel wrap-around is handled by taking min(dx, W - dx).)

**Q: What happens if h is overestimated?** A\* may return a non-optimal path. That is what Weighted A\* (w = 2.5) shows: fewer nodes, but only 80% optimal paths.

**Q: What is Greedy Best-First?** It uses only h (ignores g). Fast but not optimal and not guaranteed to find the shortest path.

**Q: Why does Alpha-Beta not change the result?** It only prunes branches that provably cannot affect the root decision.

**Q: Is Pac-Man a zero-sum game?** Treated as one here: what is good for Pac-Man is bad for the ghosts, which is what Minimax assumes. Real ghosts also have fixed scripted targets, so this is a conservative (worst-case) model.

**Q: Why a depth limit and an evaluation function?** The full game tree is far too large. The depth cutoff plus a heuristic evaluation is the standard fix (same idea as chess engines).

**Q: What are the limitations?** Evaluation weights are hand-tuned. Only the 2 nearest ghosts are searched. Minimax assumes ghosts play optimally, but they actually follow scripts. Ghost A\* ignores other ghosts.

**Q: How would you improve it?** Iterative deepening, better move ordering, learned evaluation weights (e.g. a neural network or a genetic algorithm tuning the weights), or Monte Carlo Tree Search.

## 5b. Soft computing link (if asked)
The evaluation weights could be tuned with a **Genetic Algorithm** (syllabus unit: Evolutionary techniques), which would tie this project to a second rubric topic.

## 6. Tech summary
Plain HTML + CSS + JavaScript (no frameworks), HTML5 canvas, hosted on Vercel as a static site.
