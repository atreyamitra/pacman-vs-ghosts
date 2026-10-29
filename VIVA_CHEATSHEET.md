# Pac-Man vs Ghosts: Viva Cheat-Sheet (CSE3121 AISC)

**One-line pitch:** A Pac-Man game where the ghosts plan routes with **A\* search** (Heuristic Search) and Pac-Man can play itself with **Minimax + Alpha-Beta pruning** (Adversarial Search). On top of that, **fuzzy logic** sets ghost aggression, a **neural network** predicts Pac-Man's turns for Pinky, and a **genetic algorithm** tunes Minimax's evaluation weights. All five are in your handout's rubric list.

## 1. Where each algorithm lives (open index.html and point to these)
| Algorithm | Function in code | What it does in the game |
|---|---|---|
| A* | `astar()` | Every ghost plans a shortest path to its target each time it reaches a tile |
| Heuristic | `heur()` | Manhattan (default), Euclidean, or zero (= Dijkstra) |
| Minimax | `maxVal()` / `minVal()` | Pac-Man = MAX, ghosts = MIN |
| Alpha-Beta | the `if (S.ab) {...}` lines in both | Cuts branches that cannot change the decision |
| Evaluation function | `evaluate()` | Scores a game state for the depth cutoff; its 4 weights are `EW` |
| Fuzzy logic | `fuzzyEval()` in `fuzzy.js` | Distance, lives, pellets left -> 11 rules -> aggression 0..1 -> ghost speed |
| Neural network | `nnForward()`, `nnTrain()` in `nn.js` | 17-10-4 MLP predicts Pac-Man's turn at junctions; Pinky aims there |
| Genetic algorithm | `gaRun()` in `ga.js` | Evolves the 4 evaluation weights; fitness = mean score over seeded games |
| AI Arena | `arenaRun()` in `arena.js` | Compares two setups on identical seeds, paired difference vs 2 standard errors |

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

## 4b. Soft-computing numbers (be honest, examiners like it)
- **GA** (pop 10, 8 generations, 6 games per individual, depth 3, 40 s games): on 12 unseen games the evolved weights averaged **4007** vs **3398** for the hand-tuned ones, but scores ranged 830 to 6460 per game, so the gap is **within noise**. The app states its own verdict after each run. Chromosome = [pellet pull, ghost fear, scared-ghost bonus, power-pellet pull].
- **Neural net**: after about 5,000 junction decisions it predicts Pac-Man's turn about **50%** of the time vs about **47%** for "keep going straight". Chance level is about 40% (2-3 options). It learns, but only slightly beats the baseline.
- **Fuzzy**: ghost 2 tiles away and Pac-Man on 1 life gives aggression **1.00**; 15 tiles away, 3 lives, 90% pellets left gives **0.20**. Speed = x(0.88 + 0.24 x aggression).

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

## 5b. Soft computing questions
**Q: How does the fuzzy system work?** Fuzzification: each crisp input gets a degree (0..1) for sets like Near/Medium/Far using triangular and trapezoidal membership functions. Inference: 11 IF-THEN rules, AND = minimum, so each rule has a firing strength. Defuzzification: weighted average of the rule outputs (Sugeno style: Low 0.2, Medium 0.5, High 0.8, Very high 1.0). Result = aggression.

**Q: Why Sugeno / weighted average and not centroid?** Simpler and cheaper to compute every time a ghost reaches a tile, and the output is a single number we can use directly.

**Q: Describe your neural network.** 17 inputs (per direction: open, pellet closeness, ghost closeness; plus facing direction and a frightened flag), 10 tanh hidden units, softmax over 4 directions (masked to open ones). Trained online by backpropagation with SGD (learning rate 0.1) and cross-entropy loss, using each real Pac-Man decision at a junction plus 3 replayed past examples.

**Q: Did the network help?** It learns (about 50% turn-prediction accuracy vs about 47% for "go straight" over 5,000 decisions) but the gain is small. Honest limits: Minimax Pac-Man's choices depend on ghost positions in ways 17 numbers only partly capture.

**Q: Explain your genetic algorithm.** Population of weight vectors (one of them is the hand-tuned default). Fitness = mean score over seeded fast games (same seeds for everyone in a generation). Each generation: keep the 2 best (elitism), pick parents by tournament selection (k = 3), arithmetic crossover, log-normal mutation, clamp to bounds. After the last generation the champion is tested on unseen seeds against the default.

**Q: Why validate on unseen games?** Fitness is noisy; the best individual of a generation is partly lucky (winner's curse). Unseen seeds tell whether the improvement is real. The app reports the difference with its standard error and says when it is within noise.

**Q: What does the AI Arena prove?** Both setups play the same seeded games, so we compare paired differences; a winner is declared only if the mean difference exceeds 2 standard errors.

## 6. Tech summary
Plain HTML + CSS + JavaScript (no frameworks), HTML5 canvas, hosted on Vercel as a static site.
