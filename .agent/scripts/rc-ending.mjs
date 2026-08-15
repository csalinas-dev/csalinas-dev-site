// Reach a Race Condition ending you cannot steer the UI into.
//
//   node .agent/scripts/rc-ending.mjs <ending> [--seed N] [--eval OUT.js]
//
//   endings:  orbited-in   the winner is NOT the player who ended the game —
//                          the press, not the placement, completed the line
//             simultaneous both colours complete a line on the same press
//             exhausted    the board fills and six presses find nothing
//
// WHY THIS EXISTS. Two of this game's four endings cannot be produced by
// deciding to produce them. You do not choose to win: you place a marble, the
// board turns, and a line either appeared or did not — and the line that appears
// may be your opponent's. "Play until you happen to orbit the other player into
// a line" is not a repeatable way to look at a screen, and the consequence of
// not having one is on the record: the turn banner named the LOSER as the winner
// in 38.5% of decided games, and shipped, because nobody could get the case in
// front of their eyes. An ending nobody can reach is an ending nobody can check.
//
// So this searches for one, through the real engine, with a seeded RNG — the
// same turn list every run — and prints it. With --eval it also writes a page
// script for shot.mjs, which replays that turn list by CLICKING THE REAL BOARD
// and reads the rendered result back out of the DOM. Nothing is stubbed: the
// engine picks the game, the browser plays it, and what comes back is what a
// player would have seen.
//
//   node .agent/scripts/rc-ending.mjs orbited-in --eval rc-orbited-in.js
//   npx next start &
//   node .agent/scripts/shot.mjs http://localhost:3000/games/race-condition 900 \
//     rc-orbited-in.png rc-orbited-in.js
//
// Exit 0 when the ending was found and the turn list replays back to it, 1 when
// it was not, 2 on bad usage.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// Same re-exec as verify-race-condition.mjs, for the same reason: the engine's
// files are `.js` under a package.json with no `"type"`, and Node warns once per
// file. Silence that ONE code, not every warning.
const SILENCE = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";

if (!process.execArgv.includes(SILENCE)) {
  const { status } = spawnSync(
    process.execPath,
    [SILENCE, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit" }
  );

  process.exit(status ?? 1);
}

register("./lib/esm-resolver.mjs", import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, "..", "..", "src/app/(pages)/games/race-condition");

const { DrawReason, applyMove, createState, emptyCells, legalMoves, playTurn } =
  await import(pathToFileURL(join(GAME_DIR, "_lib", "index.js")).href);

const { HOTSEAT_SLOTS, createPlayers } = await import(
  pathToFileURL(join(GAME_DIR, "players.js")).href
);

// ── usage ──────────────────────────────────────────────────────────────────
const ENDINGS = {
  "orbited-in": {
    what: "a win completed by the PRESS — the winner is not the player who ended the game",
    matches: (state) =>
      state.winner !== null && state.winner !== state.lastTurn.by,
  },
  simultaneous: {
    what: "a draw in which both colours completed a line on the same press",
    matches: (state) =>
      state.draw && state.drawReason === DrawReason.Simultaneous,
  },
  exhausted: {
    what: "a draw in which the board filled and six presses found no line",
    matches: (state) => state.draw && state.drawReason === DrawReason.Exhausted,
  },
};

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);

  return at === -1 ? null : args[at + 1] ?? null;
};

const wanted = args.find((arg) => !arg.startsWith("--") && ENDINGS[arg]);
const evalOut = flag("--eval");
const firstSeed = Number(flag("--seed") ?? 1);

if (!wanted) {
  console.error(
    `usage: node .agent/scripts/rc-ending.mjs <${Object.keys(ENDINGS).join(
      "|"
    )}> [--seed N] [--eval OUT.js]`
  );
  process.exit(2);
}

// ── the search ─────────────────────────────────────────────────────────────
// Seeded, so a run is reproducible and a passing check is not luck. Lifted from
// verify-race-condition.mjs rather than imported: that script is a program, not
// a library, and five lines is cheaper than making it one.
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// One random game, played entirely through the engine's own offers: the slide
// comes from `legalMoves` and the placement from `emptyCells` of the board that
// slide leaves, which is exactly what the board offers a player. A turn this
// picks is therefore a turn a human could have clicked.
const selfPlay = (seed) => {
  const random = mulberry32(seed);
  const pick = (list) => list[Math.floor(random() * list.length)];

  let state = createState({ slots: HOTSEAT_SLOTS });
  const turns = [];

  // 16 marbles, one placed per turn, so a game cannot outlast the board.
  while (!state.finished && turns.length < 20) {
    const slot = state.turn;
    const options = legalMoves(state, slot);
    // Declined about half the time. Slides are what make the interesting
    // endings reachable, and never declining makes the board too fluid to
    // finish; this is a search, not an opponent.
    const move = options.length > 0 && random() < 0.55 ? pick(options) : null;
    const empty = emptyCells(applyMove(state.cells, move));

    if (empty.length === 0) return null;

    const place = pick(empty);
    const { state: next, error } = playTurn(state, { move, place }, slot);

    // The offers came from `_lib`, so a refusal means the search is wrong about
    // the engine and every game after it would be too.
    if (error) {
      console.error(`rc-ending: the engine refused an offered turn (${error.code})`);
      process.exit(1);
    }

    turns.push({ move: move === null ? null : { ...move }, place });
    state = next;
  }

  return state.finished ? { state, turns } : null;
};

// The turn list is what the browser will replay, so prove it IS the game — the
// same list, fed back through the engine, has to arrive at the same board. A
// list that does not replay would send the page somewhere else entirely and the
// screenshot would be of a different game.
const replay = (turns) => {
  let state = createState({ slots: HOTSEAT_SLOTS });

  for (const { move, place } of turns) {
    const { state: next, error } = playTurn(state, { move, place }, state.turn);

    if (error) return null;

    state = next;
  }

  return state;
};

const ending = ENDINGS[wanted];
let found = null;

for (let seed = firstSeed; seed < firstSeed + 20000 && !found; seed += 1) {
  const game = selfPlay(seed);

  if (game && ending.matches(game.state)) found = { seed, ...game };
}

if (!found) {
  console.error(`rc-ending: no "${wanted}" game in 20000 seeded self-plays`);
  process.exit(1);
}

// ANCHOR. The ending is asserted again here, on the state the replay produces
// rather than the one the search kept, because everything downstream — the
// printed turn list, the page script, the screenshot — is about the replay.
const replayed = replay(found.turns);

if (!replayed || !ending.matches(replayed)) {
  console.error(
    "rc-ending: the turn list does not replay to the ending it was found for"
  );
  process.exit(1);
}

// ── the report ─────────────────────────────────────────────────────────────
const players = createPlayers(HOTSEAT_SLOTS);
const name = (slot) =>
  players.find((player) => player.slot === slot)?.name ?? String(slot);
const cell = (index) => `r${Math.floor(index / 4) + 1}c${(index % 4) + 1}`;

console.log(`${wanted} — ${ending.what}`);
console.log(`seed ${found.seed}, ${found.turns.length} turns\n`);
console.log(`  ended by:      ${name(replayed.lastTurn.by)}`);
console.log(
  `  winner:        ${
    replayed.winner === null ? "nobody" : name(replayed.winner)
  }${
    replayed.winner !== null && replayed.winner !== replayed.lastTurn.by
      ? "   <- NOT the player who ended it"
      : ""
  }`
);
console.log(`  draw:          ${replayed.draw} ${replayed.drawReason ?? ""}`);
console.log(
  `  lines:         ${(replayed.winningLines ?? [])
    .map((line) => `${name(replayed.cells[line[0]])} ${line.map(cell).join("-")}`)
    .join("  |  ") || "none"}`
);
console.log(`  presses:       ${replayed.lastTurn.spins} on the last turn\n`);
console.log(JSON.stringify(found.turns));

// ── the page script ────────────────────────────────────────────────────────
// Replays the turn list against the REAL board — every step is a click on a
// real <button>, in the order a player would click them — then reads back what
// the screen ended up saying. It decides nothing about the game; it only reports
// the two sentences that have to agree with each other and with the board.
const pageScript = (turns) => `// Generated by .agent/scripts/rc-ending.mjs (${wanted}, seed ${found.seed}).
// Replays a real game by clicking the board, then reports what the page says.
(async () => {
  const TURNS = ${JSON.stringify(turns)};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const cellAt = (i) => document.querySelector(\`[data-cell="\${i}"]\`);
  const cells = () => [...document.querySelectorAll("[data-cell]")];
  // Two elements carry role="status": the banner and the visually hidden
  // announcer. The banner is the one with a height.
  const statuses = () => [...document.querySelectorAll('[role="status"]')];
  const banner = () => statuses().find((el) => el.clientHeight > 5) ?? null;
  const announcer = () =>
    statuses().find((el) => el.clientHeight <= 5)?.textContent ?? "";
  const playAgain = () =>
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Play again"
    ) ?? null;
  // No square offers a placement while the board is turning — \`interactive\` is
  // false for the whole sequence — so this is a true "the board is open again".
  const open = () => cells().some((c) => /Place .* here/.test(c.ariaLabel ?? c.getAttribute("aria-label") ?? ""));

  const settle = async (was) => {
    // The commit first: the announcer rewrites itself once the turn is in.
    for (let i = 0; i < 60 && announcer() === was; i += 1) await sleep(50);
    // Then the orbit, up to six presses of it.
    for (let i = 0; i < 300; i += 1) {
      if (open() || playAgain()) return;
      await sleep(50);
    }
  };

  if (cells().length !== 16) return { error: "board not found" };

  let played = 0;

  for (const turn of TURNS) {
    const was = announcer();

    if (turn.move) {
      cellAt(turn.move.from).click();
      await sleep(120);
      cellAt(turn.move.to).click();
      await sleep(120);
    }

    cellAt(turn.place).click();
    await sleep(120);
    await settle(was);
    played += 1;
  }

  // Let the endgame panel's entrance finish before anything is read or shot.
  await sleep(900);

  const bar = banner();
  const chip = bar?.children[0] ?? null;
  const copy = bar?.children[1] ?? null;
  const verdict = playAgain()?.parentElement?.firstElementChild ?? null;
  const style = (el, prop) => (el ? getComputedStyle(el)[prop] : null);

  return {
    turnsPlayed: played,
    banner: {
      headline: copy?.children[0]?.textContent ?? null,
      hint: copy?.children[1]?.textContent ?? null,
      headlineColor: style(copy?.children[0], "color"),
      chip: chip?.textContent ?? null,
      chipBackground: style(chip, "backgroundColor"),
      chipBorderColor: style(chip, "borderTopColor"),
      slot: bar?.style.getPropertyValue("--slot") ?? null,
    },
    endgame: verdict?.textContent ?? null,
    announcer: announcer(),
    // Every marble on the board, from the marble layer: which square it is on
    // (its own --row/--col, the thing the orbit animates), whose it is, and
    // whether it is ringed as part of a completed line.
    marbles: [...document.querySelectorAll('[style*="--row"]')]
      .map((positioner) => {
        const disc = positioner.firstElementChild;
        const row = Number(positioner.style.getPropertyValue("--row"));
        const col = Number(positioner.style.getPropertyValue("--col"));

        return {
          cell: row * 4 + col,
          initial: disc?.querySelector("text")?.textContent ?? null,
          color: disc?.style.getPropertyValue("--slot") ?? null,
          winning: (disc?.className ?? "").includes("winning"),
        };
      })
      .sort((a, b) => a.cell - b.cell),
    ringed: cells()
      .filter((c) => (c.className ?? "").includes("winning"))
      .map((c) => Number(c.dataset.cell)),
  };
})();
`;

if (evalOut) {
  writeFileSync(evalOut, pageScript(found.turns));
  console.log(`\nwrote ${evalOut} — replay it with shot.mjs:`);
  console.log(
    `  node .agent/scripts/shot.mjs http://localhost:3000/games/race-condition 900 ${wanted}.png ${evalOut}`
  );
}
