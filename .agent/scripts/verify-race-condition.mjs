// Verification harness for the Race Condition engine
// (src/app/(pages)/games/race-condition/_lib).
//
//   node .agent/scripts/verify-race-condition.mjs
//
// This repo has no test runner — `package.json` has only dev/build/start/lint —
// so the engine's checks are this script. It imports the real engine (via the
// resolve hook in ./lib/esm-resolver.mjs, which teaches bare Node the repo's
// extensionless imports), prints one line per check, and exits non-zero if any
// of them fail.
//
// Every check that constructs a position also ANCHORS it: it asserts the
// situation it is probing is actually present before asserting the engine's
// answer. Without that, "the setup silently stopped being the setup" reads as a
// pass, which is the one way a script like this can go quietly useless.
import { register } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

register("./lib/esm-resolver.mjs", import.meta.url);

// The engine's files are `.js` under a package.json with no `"type"`, so Node
// reparses each one as ESM and says so. That is expected here and would only be
// silenced by declaring the whole Next.js app a module, so drop that one warning
// and keep every other one.
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name !== "MODULE_TYPELESS_PACKAGE_JSON") console.warn(warning);
});

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE_DIR = join(HERE, "..", "..", "src/app/(pages)/games/race-condition/_lib");

const {
  CELLS,
  DrawReason,
  INNER_TRACK,
  LINES,
  MARBLES_PER_PLAYER,
  MoveError,
  OUTER_TRACK,
  OVERTIME_SPINS,
  PLAY_TURN,
  SIZE,
  canMove,
  completedLines,
  createState,
  emptyCells,
  getResult,
  legalMoves,
  marblesOnBoard,
  orbit,
  playTurn,
  reducer,
  resetState,
  unorbit,
  // `pathToFileURL`, not the bare path: on Windows an absolute path starts with
  // a drive letter and Node reads "C:" as an unsupported URL scheme.
} = await import(pathToFileURL(join(ENGINE_DIR, "index.js")).href);

// ── harness ────────────────────────────────────────────────────────────────
let failures = 0;

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const check = (name, run) => {
  try {
    const note = run();
    console.log(`  ok    ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${name}\n          ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertEq = (actual, expected, message) =>
  assert(
    eq(actual, expected),
    `${message}\n          expected ${JSON.stringify(expected)}\n          got      ${JSON.stringify(actual)}`
  );

const section = (title) => console.log(`\n${title}`);

// Seeded so a failure is reproducible and a passing run is not luck.
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── fixtures ───────────────────────────────────────────────────────────────
// Integer slots, and slot 0 deliberately: the realtime core numbers seats from
// zero, and an engine that tests a square with `if (cells[i])` would treat every
// one of player 0's marbles as an empty square.
const A = 0;
const B = 1;

const boardWith = (placements) => {
  const cells = new Array(CELLS).fill(null);

  for (const [slot, indices] of placements) {
    for (const index of indices) cells[index] = slot;
  }

  return cells;
};

const stateWith = (cells, turn) => ({
  ...createState({ slots: [A, B] }),
  cells,
  turn,
});

const IDENTITY = Array.from({ length: CELLS }, (unused, index) => index);
const spin = (cells, times) => {
  let board = cells;

  for (let i = 0; i < times; i += 1) board = orbit(board);

  return board;
};

// ── 1. orbit geometry ──────────────────────────────────────────────────────
section("Orbit — tracks, direction and cycle");

const EXPECTED_OUTER = [0, 4, 8, 12, 13, 14, 15, 11, 7, 3, 2, 1];
const EXPECTED_INNER = [5, 9, 10, 6];

check("outer track is the verified counter-clockwise border walk", () =>
  assertEq([...OUTER_TRACK], EXPECTED_OUTER, "OUTER_TRACK was not re-derived correctly")
);

check("inner track is the verified counter-clockwise centre walk", () =>
  assertEq([...INNER_TRACK], EXPECTED_INNER, "INNER_TRACK was not re-derived correctly")
);

check("the two tracks are disjoint and cover all 16 squares", () => {
  const all = [...OUTER_TRACK, ...INNER_TRACK];

  assert(all.length === CELLS, `tracks hold ${all.length} squares, not ${CELLS}`);
  assert(new Set(all).size === CELLS, "a square appears on both tracks");
  assertEq([...all].sort((a, b) => a - b), IDENTITY, "tracks do not cover the board");
});

check("a press moves marbles the counter-clockwise way (explicit table)", () => {
  const after = orbit(IDENTITY);
  // from → to, straight off the diagram in orbit.js. This table is the guard
  // against the single highest-value bug in the game: a mirrored board still
  // plays a perfectly legal-looking game, so "the board changed" proves nothing.
  const TABLE = [
    [0, 4],
    [3, 2],
    [12, 13],
    [15, 11],
    [5, 9],
    [6, 5],
  ];

  for (const [from, to] of TABLE) {
    assert(
      after[to] === from,
      `the marble on ${from} should land on ${to}, but ${to} holds ${after[to]}`
    );
  }

  return `${TABLE.length} of ${CELLS} destinations pinned`;
});

check("one press, drawn — the whole 16-square permutation", () =>
  // A B C D        B C D H
  // E F G H   ──▶  A G K L
  // I J K L        E F J P
  // M N O P        I M N O
  assertEq(
    orbit(IDENTITY),
    [1, 2, 3, 7, 0, 6, 10, 11, 4, 5, 9, 15, 8, 12, 13, 14],
    "the press is not the permutation drawn in orbit.js"
  )
);

check("orbit does not mutate its input", () => {
  const before = [...IDENTITY];

  orbit(before);
  assertEq(before, IDENTITY, "orbit wrote through to the board it was given");
});

check("unorbit is the exact inverse of orbit", () => {
  const random = mulberry32(11);
  let checked = 0;

  for (let trial = 0; trial < 500; trial += 1) {
    const board = IDENTITY.map(() =>
      random() < 0.35 ? null : random() < 0.5 ? A : B
    );

    assertEq(unorbit(orbit(board)), board, "unorbit(orbit(b)) !== b");
    assertEq(orbit(unorbit(board)), board, "orbit(unorbit(b)) !== b");
    checked += 1;
  }

  return `${checked} random boards round-tripped`;
});

check("every outer square returns home after exactly 12 presses", () => {
  const periods = OUTER_TRACK.map((cell) => {
    for (let presses = 1; presses <= 24; presses += 1) {
      if (spin(IDENTITY, presses)[cell] === cell) return presses;
    }

    return null;
  });

  assert(
    periods.every((period) => period === 12),
    `outer periods were ${JSON.stringify(periods)}, expected all 12`
  );

  return "12 squares, period 12 each";
});

check("every inner square returns home after exactly 4 presses", () => {
  const periods = INNER_TRACK.map((cell) => {
    for (let presses = 1; presses <= 24; presses += 1) {
      if (spin(IDENTITY, presses)[cell] === cell) return presses;
    }

    return null;
  });

  assert(
    periods.every((period) => period === 4),
    `inner periods were ${JSON.stringify(periods)}, expected all 4`
  );

  return "4 squares, period 4 each";
});

check("the whole board repeats after 12 presses and not before", () => {
  for (let presses = 1; presses < 12; presses += 1) {
    assert(
      !eq(spin(IDENTITY, presses), IDENTITY),
      `the board was already back to its start after ${presses} presses`
    );
  }

  assertEq(spin(IDENTITY, 12), IDENTITY, "the board is not home after 12 presses");

  return "full cycle = 12 presses";
});

// ── 2. lines ───────────────────────────────────────────────────────────────
section("Lines — the ten ways to win");

const EXPECTED_LINES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

check("there are exactly 10 lines, each 4 squares long", () => {
  assert(LINES.length === 10, `found ${LINES.length} lines, expected 10`);
  assert(
    LINES.every((line) => line.length === 4),
    "a line is not four squares long"
  );
});

check("the derived lines are the verified 4 rows + 4 columns + 2 diagonals", () => {
  const sorted = (lines) =>
    lines.map((line) => [...line]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  assertEq(sorted(LINES), sorted(EXPECTED_LINES), "LINES was not re-derived correctly");
});

check("the win scan agrees with an independently written one", () => {
  // Written from scratch here, by (row, col) arithmetic, importing nothing from
  // the engine. If `completedLines` ever scans outward from the placed cell —
  // the Connect 404 shortcut, which is wrong here because the orbit moves all
  // sixteen marbles — this is what catches it.
  const independent = (cells) => {
    const at = (row, col) => cells[row * SIZE + col];
    const found = [];
    const consider = (coords) => {
      const owner = at(coords[0][0], coords[0][1]);

      if (owner == null) return;
      if (!coords.every(([row, col]) => at(row, col) === owner)) return;

      found.push(coords.map(([row, col]) => row * SIZE + col));
    };

    for (let row = 0; row < SIZE; row += 1) {
      consider([0, 1, 2, 3].map((col) => [row, col]));
    }
    for (let col = 0; col < SIZE; col += 1) {
      consider([0, 1, 2, 3].map((row) => [row, col]));
    }
    consider([0, 1, 2, 3].map((i) => [i, i]));
    consider([0, 1, 2, 3].map((i) => [i, SIZE - 1 - i]));

    return found;
  };

  const key = (lines) =>
    JSON.stringify(lines.map((line) => [...line]).sort((a, b) => a[0] - b[0] || a[1] - b[1]));

  const random = mulberry32(97);
  let boards = 0;
  let withLines = 0;

  for (let trial = 0; trial < 5000; trial += 1) {
    // Biased towards crowded boards, so a fair share of these actually contain
    // lines — a cross-check over 5000 empty boards proves nothing.
    const fill = 0.55 + random() * 0.45;
    const cells = IDENTITY.map(() =>
      random() > fill ? null : random() < 0.5 ? A : B
    );
    const mine = completedLines(cells);

    assert(
      key(mine) === key(independent(cells)),
      `scanners disagree on ${JSON.stringify(cells)}`
    );

    boards += 1;
    if (mine.length > 0) withLines += 1;
  }

  assert(withLines > 100, `only ${withLines} of the ${boards} boards had a line — too few to mean much`);

  return `${boards} random boards agree, ${withLines} of them holding at least one line`;
});

// ── 3. the rules that are easy to get wrong ────────────────────────────────
section("Rules — the press decides, not the placement");

check("a line made by the placement and broken by the press does NOT win", () => {
  // A already holds 0,1,2 and places on 3, completing the top row. The press
  // then carries those four to 4, 0, 1, 2 — which is not a line.
  const state = stateWith(
    boardWith([
      [A, [0, 1, 2]],
      [B, [4, 5, 6]],
    ]),
    A
  );
  const { state: next, error } = playTurn(state, { place: 3 }, A);

  assert(!error, `the turn was refused: ${error?.code}`);
  // ANCHOR: the position really does contain the line we are claiming is
  // ignored. Without this, a setup that quietly stopped lining up would pass.
  assertEq(
    completedLines(next.lastTurn.cellsBeforeOrbit).map((line) => [...line]),
    [[0, 1, 2, 3]],
    "the anchor is wrong: the placement did not complete a line before the press"
  );
  assert(completedLines(next.cells).length === 0, "the press left a line standing");
  assert(next.finished === false, "the game ended on a line that the press broke");
  assert(next.winner === null, `winner was ${next.winner}, expected null`);
  assert(next.turn === B, "the turn did not pass to the opponent");

  return "4-in-a-row before the press, none after, game continues";
});

check("you can hand the win to your opponent", () => {
  // A declines the slide and places on 15. The press carries B's 1,2,3,7 onto
  // the top row — A's own press, B's win.
  const state = stateWith(
    boardWith([
      [A, [0, 4]],
      [B, [1, 2, 3, 7]],
    ]),
    A
  );

  // ANCHOR: nobody has a line before the press, so the result below can only
  // have come from the press itself.
  assert(
    completedLines(state.cells).length === 0,
    "the anchor is wrong: there was already a line on the board"
  );

  const { state: next, error } = playTurn(state, { move: null, place: 15 }, A);

  assert(!error, `the turn was refused: ${error?.code}`);
  assert(next.finished === true, "the press completed a line and the game did not end");
  assert(next.winner === B, `winner was ${next.winner}, expected the opponent (${B})`);
  assert(next.draw === false, "a one-colour line was reported as a draw");
  assertEq(
    next.winningLines.map((line) => [...line]),
    [[0, 1, 2, 3]],
    "the wrong line was reported"
  );

  return `${A} pressed the button, ${B} won`;
});

check("both colours lining up on one press is a draw, and it is not broken", () => {
  // A places on 7, completing nothing. The press carries A's 1,2,3,7 to the top
  // row and B's 8,12,13,14 to the bottom row, at the same instant.
  const state = stateWith(
    boardWith([
      [A, [1, 2, 3]],
      [B, [8, 12, 13, 14]],
    ]),
    A
  );

  assert(
    completedLines(state.cells).length === 0,
    "the anchor is wrong: there was already a line on the board"
  );

  const { state: next, error } = playTurn(state, { place: 7 }, A);

  assert(!error, `the turn was refused: ${error?.code}`);
  assert(next.finished === true, "the game did not end");
  assert(next.winner === null, `winner was ${next.winner} — the tie was broken`);
  assert(next.draw === true, "a simultaneous line was not reported as a draw");
  assert(
    next.drawReason === DrawReason.Simultaneous,
    `drawReason was ${next.drawReason}, expected "${DrawReason.Simultaneous}"`
  );
  assert(
    next.winningLines.length === 2,
    `winningLines held ${next.winningLines.length} lines, expected both colours' lines`
  );
  assertEq(
    [...new Set(next.winningLines.map((line) => next.cells[line[0]]))].sort(),
    [A, B],
    "winningLines does not carry a line for each colour"
  );

  // getResult must report it the same way, and must not pick a winner.
  const result = getResult(next);

  assert(result.winner === null && result.draw === true, "getResult broke the tie");

  return `both lines reported, drawReason "${next.drawReason}"`;
});

// ── 4. overtime ────────────────────────────────────────────────────────────
section("Overtime — the five extra presses");

// Search for full boards with the shape each check needs, rather than trying to
// hand-build one: the constraint runs over six successive permutations of the
// whole board and is not something to eyeball.
const findFullBoard = (wanted, seed) => {
  const random = mulberry32(seed);

  for (let attempt = 0; attempt < 200000; attempt += 1) {
    const cells = [
      ...new Array(MARBLES_PER_PLAYER).fill(A),
      ...new Array(MARBLES_PER_PLAYER).fill(B),
    ];

    for (let i = cells.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));

      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    // The presses this turn would make, in order: press 1 … press 6.
    const presses = [];
    let board = cells;

    for (let press = 1; press <= OVERTIME_SPINS + 1; press += 1) {
      board = orbit(board);
      presses.push(completedLines(board).length);
    }

    if (wanted(presses, cells)) return { cells, presses };
  }

  return null;
};

check("a full board with nothing found runs all 6 presses and is a draw", () => {
  const found = findFullBoard((presses) => presses.every((lines) => lines === 0), 2024);

  assert(found, "no line-free full board turned up in 200000 shuffles");

  // Lift out one of A's marbles and make it the placement, so the turn really
  // does fill the sixteenth square.
  const place = found.cells.indexOf(A);
  const opening = [...found.cells];

  opening[place] = null;

  const state = stateWith(opening, A);
  const { state: next, error } = playTurn(state, { place }, A);

  assert(!error, `the turn was refused: ${error?.code}`);
  // ANCHOR: the board this turn produced is the full one we searched for.
  assert(
    next.lastTurn.cellsBeforeOrbit.every((cell) => cell != null),
    "the anchor is wrong: the turn did not fill the board"
  );
  assert(next.finished === true, "the game did not end when the board filled");
  assert(next.draw === true, `draw was ${next.draw}`);
  assert(next.winner === null, `winner was ${next.winner}, expected null`);
  assert(
    next.drawReason === DrawReason.Exhausted,
    `drawReason was ${next.drawReason}, expected "${DrawReason.Exhausted}"`
  );
  assert(
    next.lastTurn.spins === OVERTIME_SPINS + 1,
    `spins was ${next.lastTurn.spins}, expected ${OVERTIME_SPINS + 1}`
  );
  assert(next.winningLines === null, "a draw reported winning lines");

  return `${OVERTIME_SPINS + 1} presses, nothing found`;
});

check("overtime stops at the first press that completes a line", () => {
  // A board whose line appears on press 3 — late enough to prove the loop runs,
  // early enough to prove it stops.
  const found = findFullBoard(
    (presses) => presses[0] === 0 && presses[1] === 0 && presses[2] > 0,
    77
  );

  assert(found, "no board with its first line on press 3 turned up");

  const place = found.cells.indexOf(A);
  const opening = [...found.cells];

  opening[place] = null;

  const state = stateWith(opening, A);
  const { state: next, error } = playTurn(state, { place }, A);

  assert(!error, `the turn was refused: ${error?.code}`);
  assert(
    next.lastTurn.cellsBeforeOrbit.every((cell) => cell != null),
    "the anchor is wrong: the turn did not fill the board"
  );
  // ANCHOR: presses 1 and 2 really did find nothing, so stopping at 3 is a
  // decision and not a coincidence.
  assertEq(
    found.presses.slice(0, 3).map((lines) => lines > 0),
    [false, false, true],
    "the anchor is wrong: this board's first line is not on press 3"
  );
  assert(next.finished === true, "the game did not end");
  assert(next.lastTurn.spins === 3, `spins was ${next.lastTurn.spins}, expected 3`);
  assertEq(
    next.cells,
    spin(next.lastTurn.cellsBeforeOrbit, 3),
    "the stored board is not three presses on from the placement"
  );
  assert(
    next.winner !== null || next.draw === true,
    "a line was found and nothing was decided"
  );

  return `stopped on press 3 of ${OVERTIME_SPINS + 1}`;
});

check("spins is 1 on an ordinary turn", () => {
  const state = stateWith(boardWith([[B, [5]]]), A);
  const { state: next } = playTurn(state, { place: 0 }, A);

  assert(next.lastTurn.spins === 1, `spins was ${next.lastTurn.spins}, expected 1`);
});

// ── 5. legality ────────────────────────────────────────────────────────────
section("Legality — step 1 moves your OPPONENT'S marble");

const refusal = (state, turn, slot) => {
  const result = playTurn(state, turn, slot);

  assert(result.error, "the turn was allowed when it should have been refused");
  // The by-reference contract: a refused turn hands back the very object it was
  // given, so a caller can `if (result.state === state)` and skip a re-render.
  assert(result.state === state, "a refused turn did not return the same state reference");
  assert(
    typeof result.error.message === "string" && result.error.message.length > 0,
    `${result.error.code} has no message for the player to read`
  );

  return result.error.code;
};

const expectRefusal = (name, code, build) =>
  check(name, () => {
    const { state, turn, slot = A } = build();
    const actual = refusal(state, turn, slot);

    assert(actual === code, `refused with "${actual}", expected "${code}"`);

    return `→ ${code}`;
  });

expectRefusal("moving one of your OWN marbles", MoveError.OwnMarble, () => ({
  state: stateWith(
    boardWith([
      [A, [5]],
      [B, [10]],
    ]),
    A
  ),
  turn: { move: { from: 5, to: 1 }, place: 0 },
}));

expectRefusal("moving diagonally", MoveError.NotAdjacent, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: { move: { from: 5, to: 0 }, place: 15 },
}));

expectRefusal("moving onto an occupied square", MoveError.Occupied, () => ({
  state: stateWith(
    boardWith([
      [A, [6]],
      [B, [5]],
    ]),
    A
  ),
  turn: { move: { from: 5, to: 6 }, place: 0 },
}));

expectRefusal("moving across the flat-array row wrap (3 → 4)", MoveError.NotAdjacent, () => ({
  state: stateWith(boardWith([[B, [3]]]), A),
  turn: { move: { from: 3, to: 4 }, place: 15 },
}));

expectRefusal("moving anything at all on turn one", MoveError.EmptySource, () => ({
  state: createState({ slots: [A, B] }),
  turn: { move: { from: 5, to: 6 }, place: 0 },
}));

expectRefusal("moving a marble off the board", MoveError.OutOfRange, () => ({
  state: stateWith(boardWith([[B, [3]]]), A),
  turn: { move: { from: 3, to: 16 }, place: 0 },
}));

expectRefusal("placing onto an occupied square", MoveError.Occupied, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: { place: 5 },
}));

expectRefusal("placing onto the square the slid marble just landed on", MoveError.Occupied, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: { move: { from: 5, to: 6 }, place: 6 },
}));

expectRefusal("placing off the board", MoveError.OutOfRange, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: { place: 99 },
}));

expectRefusal("placing nowhere at all", MoveError.OutOfRange, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: {},
}));

expectRefusal("a turn that is not shaped like a turn", MoveError.BadTurn, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: null,
}));

expectRefusal("a move that is not shaped like a move", MoveError.BadTurn, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: { move: 5, place: 0 },
}));

expectRefusal("playing out of turn", MoveError.NotYourTurn, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: { place: 0 },
  slot: B,
}));

expectRefusal("playing as somebody who is not in the game", MoveError.UnknownSlot, () => ({
  state: stateWith(boardWith([[B, [5]]]), A),
  turn: { place: 0 },
  slot: 7,
}));

expectRefusal("playing after the game is over", MoveError.Finished, () => ({
  state: { ...stateWith(boardWith([[B, [5]]]), A), finished: true, winner: B },
  turn: { place: 0 },
}));

check("placing onto the square the slid marble just VACATED is legal", () => {
  const state = stateWith(boardWith([[B, [5]]]), A);
  const { state: next, error } = playTurn(state, { move: { from: 5, to: 6 }, place: 5 }, A);

  assert(!error, `the turn was refused with "${error?.code}"`);
  // ANCHOR: the placement really is on the square the slide emptied.
  assert(
    next.lastTurn.cellsBeforeOrbit[5] === A && next.lastTurn.cellsBeforeOrbit[6] === B,
    "the slide and the placement did not land where they were asked to"
  );

  return "slide 5→6, place on 5";
});

check("declining step 1 is legal, and turn one has nothing to decline", () => {
  const opening = createState({ slots: [A, B] });

  assertEq(legalMoves(opening, A), [], "turn one offered a slide with an empty board");

  const { state: next, error } = playTurn(opening, { place: 5 }, A);

  assert(!error, `the opening turn was refused: ${error?.code}`);
  assert(next.lastTurn.move === null, "a declined slide was not recorded as null");
  assert(next.turn === B, "the turn did not pass");
});

check("legalMoves only ever offers the opponent's marbles, orthogonally", () => {
  const state = stateWith(
    boardWith([
      [A, [0, 5]],
      [B, [6, 15]],
    ]),
    A
  );
  const moves = legalMoves(state, A);

  assert(moves.length > 0, "the anchor is wrong: there were no legal slides to check");

  for (const { from, to } of moves) {
    assert(state.cells[from] === B, `offered to slide ${state.cells[from]}'s marble on ${from}`);
    assert(state.cells[to] === null, `offered to slide onto occupied square ${to}`);
    assert(canMove(state, from, to, A) === null, `canMove refuses a move legalMoves offered`);
  }

  // Every offered slide must actually be playable.
  for (const move of moves) {
    const attempt = playTurn(state, { move, place: emptyCells(state.cells).find((cell) => cell !== move.to) }, A);

    assert(!attempt.error, `a slide legalMoves offered was refused: ${attempt.error?.code}`);
  }

  return `${moves.length} slides offered, all playable`;
});

check("the reducer routes PLAY TURN and refuses anything else", () => {
  const state = stateWith(boardWith([[B, [5]]]), A);
  const viaReducer = reducer(state, { type: PLAY_TURN, move: { from: 5, to: 6 }, place: 5 }, A);
  const direct = playTurn(state, { move: { from: 5, to: 6 }, place: 5 }, A);

  assert(!viaReducer.error, `the reducer refused a legal turn: ${viaReducer.error?.code}`);
  assertEq(viaReducer.state.cells, direct.state.cells, "the reducer and playTurn disagree");

  // The core hands its reducers a player OBJECT; a bare slot is the hotseat case.
  const viaPlayerObject = reducer(state, { type: PLAY_TURN, place: 0 }, { slot: A });

  assert(!viaPlayerObject.error, "the reducer did not resolve a player object to its slot");

  const unknown = reducer(state, { type: "ORBIT" }, A);

  assert(unknown.error?.code === MoveError.UnknownAction, "an unknown action was not refused");
  assert(unknown.state === state, "an unknown action did not return the same state reference");
});

check("createState throws on a bad roster; resetState hands the winner the opening", () => {
  const bad = [
    () => createState({ slots: null }),
    () => createState({ slots: [A] }),
    () => createState({ slots: [A, B, 2] }),
    () => createState({ slots: [A, A] }),
    () => createState({ slots: [A, B], first: 9 }),
  ];

  for (const build of bad) {
    let threw = false;

    try {
      build();
    } catch {
      threw = true;
    }

    assert(threw, "a bad roster produced a board instead of throwing");
  }

  assert(resetState({ slots: [A, B], winner: B }).turn === B, "the winner does not open");
  assert(resetState({ slots: [A, B], winner: null }).turn === A, "a draw does not go back to join order");

  return `${bad.length} bad rosters rejected`;
});

// ── 6. self-play ───────────────────────────────────────────────────────────
section("Self-play — invariants over whole games");

check("2000 random games hold every invariant", () => {
  const random = mulberry32(31337);
  const GAMES = 2000;
  const outcomes = { win: 0, simultaneous: 0, exhausted: 0 };
  let longest = 0;
  let mostSpins = 0;

  for (let game = 0; game < GAMES; game += 1) {
    let state = createState({ slots: [A, B], first: random() < 0.5 ? A : B });
    let turns = 0;

    while (!state.finished) {
      turns += 1;
      assert(turns <= CELLS, `game ${game} ran past ${CELLS} turns without ending`);

      const slot = state.turn;
      const options = legalMoves(state, slot);
      // Decline the slide about a third of the time, which the rules allow.
      const move =
        options.length > 0 && random() < 0.67
          ? options[Math.floor(random() * options.length)]
          : null;

      const staged = [...state.cells];

      if (move) {
        staged[move.to] = staged[move.from];
        staged[move.from] = null;
      }

      const open = emptyCells(staged);

      assert(open.length > 0, `game ${game} had nowhere to place on turn ${turns}`);

      const place = open[Math.floor(random() * open.length)];
      const { state: next, error } = playTurn(state, { move, place }, slot);

      assert(!error, `game ${game} turn ${turns} was refused: ${error?.code}`);

      state = next;

      assert(
        marblesOnBoard(state.cells, A) <= MARBLES_PER_PLAYER &&
          marblesOnBoard(state.cells, B) <= MARBLES_PER_PLAYER,
        `game ${game} put more than ${MARBLES_PER_PLAYER} marbles of a colour on the board`
      );
      assert(
        state.lastTurn.spins >= 1 && state.lastTurn.spins <= OVERTIME_SPINS + 1,
        `game ${game} pressed the button ${state.lastTurn.spins} times`
      );
      assertEq(
        state.cells,
        spin(state.lastTurn.cellsBeforeOrbit, state.lastTurn.spins),
        `game ${game}: the board is not \`spins\` presses on from cellsBeforeOrbit`
      );
      assert(
        state.finished || state.turn !== slot,
        `game ${game}: an unfinished turn did not pass`
      );

      mostSpins = Math.max(mostSpins, state.lastTurn.spins);
    }

    longest = Math.max(longest, turns);

    const decided = (state.winner !== null ? 1 : 0) + (state.draw ? 1 : 0);

    assert(decided === 1, `game ${game} finished with ${decided} of winner/draw set`);

    const result = getResult(state);

    assert(result.finished === true, `game ${game}: getResult disagrees about finishing`);
    assertEq(
      result.hands.map(({ slot }) => slot),
      state.slots,
      `game ${game}: hands is not in slots order`
    );
    assert(
      result.hands.every(({ onBoard, inHand }) => onBoard + inHand === MARBLES_PER_PLAYER),
      `game ${game}: a player's marbles do not add up to ${MARBLES_PER_PLAYER}`
    );
    assert(
      result.placed + result.remaining === CELLS,
      `game ${game}: placed + remaining is not ${CELLS}`
    );

    if (state.winner !== null) {
      outcomes.win += 1;
      // A win must be a line actually standing on the final board, in the
      // winner's colour.
      const lines = completedLines(state.cells);

      assert(lines.length > 0, `game ${game} was won with no line on the board`);
      assert(
        lines.every((line) => state.cells[line[0]] === state.winner),
        `game ${game} was won by a player who does not own every completed line`
      );
    } else {
      outcomes[state.drawReason] += 1;
    }
  }

  assert(outcomes.win > 0, "no game was ever won — self-play is not exercising the win path");
  assert(
    outcomes.simultaneous + outcomes.exhausted > 0,
    "no game was ever drawn — self-play is not exercising the draw paths"
  );

  return `${GAMES} games · ${outcomes.win} won, ${outcomes.simultaneous} simultaneous draws, ${outcomes.exhausted} exhausted draws · longest ${longest} turns, most presses ${mostSpins}`;
});

check("string slots work as well as integer ones", () => {
  let state = createState({ slots: ["white", "black"] });
  const random = mulberry32(5);

  while (!state.finished) {
    const slot = state.turn;
    const staged = [...state.cells];
    const place = emptyCells(staged)[Math.floor(random() * emptyCells(staged).length)];
    const { state: next, error } = playTurn(state, { place }, slot);

    assert(!error, `refused: ${error?.code}`);
    state = next;
  }

  assert(state.winner !== null || state.draw, "the game ended undecided");

  return `ended ${state.winner !== null ? `won by ${state.winner}` : `a draw (${state.drawReason})`}`;
});

// ── 7. purity ──────────────────────────────────────────────────────────────
section("Purity — the engine imports nothing but itself");

check("no React, Prisma, realtime core, alias or third-party import", () => {
  const files = readdirSync(ENGINE_DIR).filter((name) => name.endsWith(".js"));

  assert(files.length >= 8, `only found ${files.length} engine files — is the path right?`);

  const offences = [];

  for (const file of files) {
    const source = readFileSync(join(ENGINE_DIR, file), "utf8");
    const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);

    for (const specifier of specifiers) {
      if (!specifier.startsWith("./")) offences.push(`${file} imports "${specifier}"`);
    }
  }

  assertEq(offences, [], "the engine reaches outside itself");

  return `${files.length} files, relative sibling imports only`;
});

// ── ────────────────────────────────────────────────────────────────────────
console.log(
  failures === 0
    ? "\nRace Condition engine: all checks passed."
    : `\nRace Condition engine: ${failures} check(s) FAILED.`
);

process.exit(failures === 0 ? 0 : 1);
