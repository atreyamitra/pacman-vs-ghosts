'use strict';
// Fuzzy-logic ghost aggression (Soft Computing: Fuzzy Logic).
// Three inputs (distance to Pac-Man, Pac-Man's lives, pellets left) are fuzzified into linguistic sets
// (Near / Medium / Far, Low / Medium / High, Few / Many). Ten IF-THEN rules fire to different degrees
// (AND = minimum). The result is defuzzified with a weighted average of the rule outputs (Sugeno style)
// into one "aggression" number from 0 to 1. That number scales the ghost's speed and decides whether it
// skips its scatter phase. Loaded as a classic <script>; globals are shared between files.

const fuzzy = { on: false, ghost: 0 };

// Membership functions: triangle (a, b, c) and trapezoid (a, b, c, d).
const fzTri = (x, a, b, c) => (x <= a || x >= c) ? 0 : x === b ? 1 : x < b ? (x - a) / (b - a) : (c - x) / (c - b);
const fzTrap = (x, a, b, c, d) => (x < a || x > d) ? 0 : x < b ? (x - a) / (b - a) : x <= c ? 1 : (d - x) / (d - c);

// Linguistic variables. "range" is only used for drawing the graphs.
const FZ_VARS = {
  dist: {
    label: 'Distance to Pac-Man (tiles)', range: [0, 30],
    sets: { Near: x => fzTrap(x, 0, 0, 3, 7), Medium: x => fzTri(x, 4, 9, 14), Far: x => fzTrap(x, 10, 16, 60, 60) }
  },
  lives: {
    label: 'Pac-Man lives', range: [0.5, 3.5],
    sets: { Low: x => fzTrap(x, 0, 1, 1, 2), Medium: x => fzTri(x, 1, 2, 3), High: x => fzTrap(x, 2, 3, 9, 9) }
  },
  pellets: {
    label: 'Pellets left (fraction)', range: [0, 1],
    sets: { Few: x => fzTrap(x, 0, 0, 0.15, 0.4), Many: x => fzTrap(x, 0.25, 0.6, 1, 1) }
  }
};
// Output levels used by the rule consequents (singletons).
const FZ_OUT = { 'Low': 0.2, 'Medium': 0.5, 'High': 0.8, 'Very high': 1.0 };
// IF all antecedents THEN aggression = level
const FZ_RULES = [
  { if: [['dist', 'Near'], ['lives', 'Low']], then: 'Very high' },
  { if: [['dist', 'Near'], ['pellets', 'Few']], then: 'Very high' },
  { if: [['dist', 'Near'], ['lives', 'Medium']], then: 'High' },
  { if: [['dist', 'Near'], ['lives', 'High']], then: 'High' },
  { if: [['dist', 'Medium'], ['pellets', 'Few']], then: 'Very high' },
  { if: [['dist', 'Medium'], ['lives', 'Low']], then: 'High' },
  { if: [['dist', 'Medium'], ['pellets', 'Many']], then: 'Medium' },
  { if: [['dist', 'Far'], ['pellets', 'Few']], then: 'High' },
  { if: [['dist', 'Far'], ['lives', 'Low']], then: 'Medium' },
  { if: [['dist', 'Far'], ['lives', 'High']], then: 'Low' },
  { if: [['dist', 'Far'], ['pellets', 'Many']], then: 'Low' }
];
const fzRuleText = r => 'IF ' + r.if.map(a => a[0] + ' is ' + a[1]).join(' AND ') + ' THEN aggression is ' + r.then;

// Pure function: crisp inputs -> memberships, rule strengths and the defuzzified aggression.
function fuzzyEval(d, lives, pelletFrac) {
  const inputs = { dist: Math.min(60, d), lives, pellets: pelletFrac };
  const mu = {};
  for (const v in FZ_VARS) { mu[v] = {}; for (const s in FZ_VARS[v].sets) mu[v][s] = FZ_VARS[v].sets[s](inputs[v]); }
  let num = 0, den = 0;
  const rules = FZ_RULES.map(r => {
    const w = Math.min(...r.if.map(a => mu[a[0]][a[1]]));
    num += w * FZ_OUT[r.then]; den += w;
    return { text: fzRuleText(r), w, level: FZ_OUT[r.then] };
  });
  return { inputs, mu, rules, out: den > 1e-9 ? num / den : 0.5 };
}
function fuzzyForGhost(g) {
  const d = dist[(pac.r * W + pac.c) * N + (g.r * W + g.c)];
  return fuzzyEval(d >= 999 ? 60 : d, game.lives, game.left / foodCells.length);
}
