// Verification harness for switching a room's game without changing its code (#176).
//
//   node .agent/scripts/verify-game-switch.mjs                       # pure half only
//   node .agent/scripts/verify-game-switch.mjs --base http://127.0.0.1:3176
//
// Four passes, and none of them covers the others:
//
//   PURE  src/lib/realtime/switching.js — the offer rule (`activeCount <=
//         maxPlayers`, `minPlayers` DELIBERATELY not consulted) and the
//         permission verdict (`switchRefusal`). This is the module both the
//         server and the picker import, so a drift here is a button that offers
//         a game the server refuses.
//   ROOM  the real `switchGame` from src/lib/realtime/rooms.js, run over an
//         in-memory `gameRoom` — far enough to read the sentence a refused
//         player is shown. It may never contain a registry id: they pressed
//         a tile that said "Tic-Tac-Overflow", not one that said "tto".
//   READ  the four OnlineBar toggles, checked as source. This repo has no DOM
//         test runner, so the alternative to checking that wiring statically
//         is not checking it at all.
//   LIVE  POST /api/rooms/[code]/switch — the compare-and-set write, the
//         refusals, and the seat compaction. Compaction is the dangerous half:
//         `HOST_SLOT` is the literal integer 0, so a room that loses seat 0
//         without renumbering has no host for the rest of its life, and
//         `connectedAt` must survive BYTE-IDENTICAL because identity.js's
//         `keepSeat` recognises a seat by it precisely because slots recycle.
//
// This repo has no test runner (package.json has only dev/build/start/lint), so
// this script is the check. One line per check, non-zero exit if any fail.
//
// If --base is given and unreachable the live half FAILS. It never "skips": a
// skip in a verification script reads as a pass, which is how one goes quietly
// useless. Omitting --base runs the pure half alone and says so.
//
// Getting a database into a worktree (the .env provisioned into an agent
// worktree carries no usable MySQL DATABASE_URL; an explicit one in the
// environment wins over .env because Next does not override what is already
// set). Pick a port nobody else is on — 3176 is this issue's number:
//
//   docker run -d --name issue176-mysql -e MYSQL_ROOT_PASSWORD=issue176 \
//     -e MYSQL_DATABASE=csalinas -p 127.0.0.1:13176:3306 mysql:8.0
//   npm ci && ./node_modules/.bin/prisma generate
//   export DB='mysql://root:issue176@127.0.0.1:13176/csalinas'
//   DATABASE_URL="$DB" ./node_modules/.bin/prisma db push --skip-generate
//   DATABASE_URL="$DB" npm run build
//   DATABASE_URL="$DB" ./node_modules/.bin/next start -p 3176
//   node .agent/scripts/verify-game-switch.mjs --base http://127.0.0.1:3176
//   docker rm -f issue176-mysql
//
// Run `npm ci` FIRST. `npx prisma` in a checkout with no node_modules fetches
// the latest major, which rejects this repo's v6 schema with a P1012 that reads
// like a database connection problem.
//
// Stop your server by the PID listening on YOUR port — never by image name,
// other agents run node on this machine:
//   netstat -ano | grep ':3176.*LISTENING'  then  taskkill //F //PID <pid>
//
// TO CONFIRM THIS CAN GO RED: invert one assertion (or delete the `left`
// filter in `switchGame`) and check for a non-zero exit before trusting green.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// The source files are `.js` under a package.json with no `"type"`, so Node
// reparses them as ESM and warns about it. Re-exec once with that ONE warning
// disabled — not `--no-warnings`, which would hide the next real one too.
const SILENCE = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";

if (!process.execArgv.includes(SILENCE)) {
  const { status } = spawnSync(
    process.execPath,
    [SILENCE, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit" }
  );

  process.exit(status ?? 1);
}

// Four hooks: `switching.js` reaches the registry, the registry imports the four
// game definitions through the repo's `@/` alias, Tic-Tac-Overflow's board
// helpers take a named import off lodash's CommonJS build, and the last one
// points `@/lib/prisma` at an in-memory `gameRoom` so the REAL `rooms.js` can
// run here without a MySQL. It is registered last on purpose: Node runs the
// most recently registered resolve hook first, so it has to beat the alias hook
// to `@/lib/prisma` — which would otherwise hand back a live PrismaClient.
register("./lib/esm-resolver.mjs", import.meta.url);
register("./lib/alias-resolver.mjs", import.meta.url);
register("./lib/lodash-resolver.mjs", import.meta.url);
register("./lib/prisma-stub-resolver.mjs", import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// `pathToFileURL`, not the bare path: on Windows an absolute path starts with a
// drive letter and Node reads "C:" as an unsupported URL scheme.
const src = (rel) => pathToFileURL(join(REPO, rel)).href;

const { activeSeats, canSwitch, fitsGame, switchRefusal, switchTargets } =
  await import(src("src/lib/realtime/switching.js"));
const { lookupGame, listGames } = await import(src("src/lib/realtime/registry.js"));
const { HOST_SLOT } = await import(src("src/lib/realtime/constants.js"));
// The real server-side write, over the stubbed delegate.
const { switchGame } = await import(src("src/lib/realtime/rooms.js"));
const { readRoom, resetRooms, seedRoom } = await import("./lib/prisma-stub.mjs");

const baseFlag = process.argv.indexOf("--base");
const BASE =
  baseFlag !== -1 ? process.argv[baseFlag + 1].replace(/\/$/, "") : null;

// ── harness ────────────────────────────────────────────────────────────────
let failures = 0;

const check = async (name, run) => {
  try {
    const note = await run();
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
    actual === expected,
    `${message}\n          expected ${JSON.stringify(expected)}\n          got      ${JSON.stringify(actual)}`
  );

const section = (title) => console.log(`\n${title}`);

// ── pure: the offer rule ───────────────────────────────────────────────────
section("switching.js — who is at the table");

// A seat as the wire carries it. `left` is deliberate ("they meant it");
// `connected: false` is AWAY (a phone that locked itself).
const seat = (slot, extra = {}) => ({
  slot,
  name: `P${slot}`,
  connectedAt: `2026-01-01T00:00:0${slot}.000Z`,
  left: false,
  connected: true,
  ...extra,
});

const seats = (count) => Array.from({ length: count }, (_, i) => seat(i));

await check("counts an AWAY seat and drops a LEFT one", () => {
  const roster = [seat(0), seat(1, { connected: false }), seat(2, { left: true })];

  assertEq(activeSeats(roster).length, 2, "AWAY must count, LEFT must not");
  assert(
    activeSeats(roster).every((p) => p.slot !== 2),
    "the LEFT seat survived the filter"
  );

  return "3 seats -> 2 active (1 away, 1 left)";
});

await check("an empty or absent roster is zero seats, not a crash", () => {
  assertEq(activeSeats([]).length, 0, "empty roster");
  assertEq(activeSeats(undefined).length, 0, "absent roster");
  assertEq(activeSeats(null).length, 0, "null roster");

  return "0, 0, 0";
});

section("switching.js — fitsGame (`minPlayers` is NOT consulted)");

// ANCHOR. Every exclusion below is only news if the registry really is loaded
// and really does have the shapes this file reasons about.
await check("anchor: the registry holds the four games this reasons about", () => {
  const ids = listGames();
  assert(ids.length >= 4, `expected at least 4 games, got ${ids.length}`);

  for (const [id, min, max] of [
    ["tto", 2, 2],
    ["connect-404", 2, 2],
    ["race-condition", 2, 2],
    ["edge-case", 2, 4],
  ]) {
    const def = lookupGame(id);
    assert(def, `no definition registered for "${id}"`);
    assertEq(def.minPlayers, min, `${id} minPlayers`);
    assertEq(def.maxPlayers, max, `${id} maxPlayers`);
  }

  return ids.join(", ");
});

await check("every registered game against rosters of 1..5 seats", () => {
  for (const id of listGames()) {
    const def = lookupGame(id);
    for (let count = 1; count <= 5; count += 1) {
      assertEq(
        fitsGame(def, seats(count)),
        count <= def.maxPlayers,
        `${id} with ${count} seats`
      );
    }
  }

  return "fits iff activeCount <= maxPlayers";
});

await check("a lone player is offered a 2-player game (minPlayers ignored)", () => {
  // The case a stricter reading breaks, and the one the whole feature exists
  // for: one person waiting is exactly when somebody changes their mind. They
  // land on the destination's own waiting screen, which is byte-identical to
  // what a freshly created room shows.
  assert(fitsGame(lookupGame("connect-404"), seats(1)), "1 seat must fit a 2-player game");
  assert(fitsGame(lookupGame("edge-case"), seats(1)), "1 seat must fit a 2-4 player game");

  return "1 seat fits everything";
});

await check("a LEFT seat does not count against capacity", () => {
  // The abandoned-room case: two seats, one of them gone on purpose, so a
  // 2-player game still fits and so does everything else.
  const roster = [seat(0), seat(1, { left: true }), seat(2, { left: true })];

  assert(fitsGame(lookupGame("tto"), roster), "one active seat must fit tto");

  return "3 seats, 1 active -> fits";
});

section("switching.js — switchTargets");

await check("anchor: a tto room with one seat is offered at least 2 games", () => {
  const targets = switchTargets({ game: "tto", players: [seat(0)] });
  assert(
    targets.length >= 2,
    `a filter that returns nothing would pass every exclusion below; got ${targets.length}`
  );

  return targets.map((d) => d.id).join(", ");
});

await check("never offers the game the room is already playing", () => {
  for (const id of listGames()) {
    const targets = switchTargets({ game: id, players: seats(2) });
    assert(
      targets.every((def) => def.id !== id),
      `${id} was offered as a destination for itself`
    );
    assert(targets.length > 0, `${id} with 2 seats should have somewhere to go`);
  }

  return "checked every registered game";
});

await check("a 3-seat room is offered nothing but edge-case, and a 4-seat one nothing", () => {
  const three = switchTargets({ game: "edge-case", players: seats(3) });
  assertEq(three.length, 0, "3 seats cannot fit any 2-player game, and edge-case is itself");

  const threeElsewhere = switchTargets({ game: "tto", players: seats(3) });
  assertEq(threeElsewhere.map((d) => d.id).join(","), "edge-case", "3 seats fit only edge-case");

  assertEq(
    switchTargets({ game: "edge-case", players: seats(4) }).length,
    0,
    "a full edge-case table has nowhere to go"
  );

  return "3 -> edge-case only, 4 -> nothing";
});

section("switching.js — switchRefusal / canSwitch");

await check("refuses mid-board, whoever asks", () => {
  assertEq(
    switchRefusal({ status: "playing" }, seat(HOST_SLOT)),
    "in-progress",
    "the host must not be able to bin a live board either"
  );
  assertEq(
    switchRefusal({ status: "playing" }, seat(1)),
    "in-progress",
    "a non-host mid-board"
  );

  return "in-progress";
});

await check("in a lobby, only the host", () => {
  assertEq(switchRefusal({ status: "lobby" }, seat(HOST_SLOT)), null, "host in a lobby");
  assertEq(switchRefusal({ status: "lobby" }, seat(1)), "not-host", "non-host in a lobby");
  assertEq(switchRefusal({ status: "lobby" }, seat(3)), "not-host", "a later seat in a lobby");

  return `slot ${HOST_SLOT} yes, everyone else not-host`;
});

await check("at game over, any seated player", () => {
  assertEq(switchRefusal({ status: "over" }, seat(HOST_SLOT)), null, "host at game over");
  assertEq(switchRefusal({ status: "over" }, seat(1)), null, "seat 1 at game over");
  assertEq(switchRefusal({ status: "over" }, seat(3)), null, "seat 3 at game over");

  return "null for every seat";
});

await check("a spectator holds no seat and may not switch", () => {
  for (const status of ["lobby", "playing", "over"]) {
    assertEq(
      switchRefusal({ status }, null),
      "not-a-player",
      `an unseated caller in a ${status} room`
    );
  }

  return "not-a-player in all three statuses";
});

await check("canSwitch needs a seat, a permission AND something to switch to", () => {
  const room = (over) => ({
    game: "edge-case",
    status: over,
    players: seats(4),
    me: seat(0),
  });

  // Four seats: permitted, but nothing fits anywhere else.
  assertEq(canSwitch(room("over")), false, "4 seats have nowhere to go");
  // Two seats at game over: permitted and two destinations.
  assertEq(
    canSwitch({ game: "edge-case", status: "over", players: seats(2), me: seat(0) }),
    true,
    "2 seats at game over must be able to switch"
  );
  assertEq(
    canSwitch({ game: "edge-case", status: "playing", players: seats(2), me: seat(0) }),
    false,
    "mid-board is never switchable"
  );
  assertEq(
    canSwitch({ game: "edge-case", status: "lobby", players: seats(2), me: seat(1) }),
    false,
    "a non-host in a lobby"
  );
  assertEq(canSwitch(null), false, "no room at all");
  assertEq(
    canSwitch({ game: "tto", status: "over", players: seats(2), me: null }),
    false,
    "a spectator"
  );

  return "all six verdicts";
});

// ── rooms.js: the sentence a refused player actually reads ─────────────────
section("rooms.js — the 422 shows no registry id");

// The real `switchGame`, over the in-memory `gameRoom` the fourth resolve hook
// installed. Only the capacity refusal is exercised here — the rest of the
// write is the live half's job, and this is not a second copy of it.
// CODE_ALPHABET has no `1` and no `0` — they read as I and O off a screen —
// so a code containing either is 410 Gone before any of this is reached.
const ROOM_422 = "ZQ76";

const capacityRow = (game, seatCount) => ({
  code: ROOM_422,
  game,
  status: "over",
  revision: 7,
  state: {},
  players: Array.from({ length: seatCount }, (_, i) => ({
    // TOKEN_PATTERN wants 8-64 characters; `token-0` is seven and is
    // refused as malformed long before the capacity rule is reached.
    token: `player-token-${i}`,
    slot: i,
    name: `P${i}`,
    color: null,
    connectedAt: `2026-01-01T00:00:0${i}.000Z`,
    left: false,
  })),
  updatedAt: new Date().toISOString(),
});

/** @returns the thrown RoomError, or null when the switch was accepted. */
const attemptSwitch = async (seatCount, to) => {
  resetRooms();
  seedRoom(capacityRow("edge-case", seatCount));
  try {
    await switchGame(ROOM_422, { token: "player-token-0", revision: 7, to });
    return null;
  } catch (error) {
    return error;
  }
};

// ANCHOR. Two seats fit a 2-player game, so the same call must be ACCEPTED —
// which is what makes the 422 below evidence about the capacity rule rather
// than about anything else `switchGame` could have thrown on the way past it.
await check("anchor: the same call with 2 seats is accepted", async () => {
  const error = await attemptSwitch(2, "tto");
  assertEq(error, null, `a 2-seat room was refused: ${error?.message}`);
  assertEq(readRoom(ROOM_422).game, "tto", "the accepted switch never landed");
  assertEq(readRoom(ROOM_422).revision, 8, "revision must move by exactly 1");

  return "2 seats -> tto, revision 7 -> 8";
});

await check("3 seats into a 2-player game is refused 422, room attached", async () => {
  const error = await attemptSwitch(3, "tto");

  assert(error, "a 3-seat room was allowed into a 2-player game");
  assertEq(error.status, 422, `wrong status — ${error.message}`);
  assertEq(error.code, "rejected", "wrong error code");
  assert(error.room, "a 422 must carry the authoritative room to re-render from");
  assertEq(readRoom(ROOM_422).game, "edge-case", "a refused switch must not write");

  return `422 — "${error.message}"`;
});

await check("that message names no registry id", async () => {
  const error = await attemptSwitch(3, "tto");
  // Re-asserted here rather than leaned on from the check above: without it
  // ANY unrelated failure (a bad token, an expired code) would sail through
  // this check, because those messages name no registry id either.
  assertEq(error?.status, 422, `not the capacity refusal — ${error?.message}`);
  const { message } = error;
  assert(typeof message === "string" && message.length > 0, "empty message");

  // The picker renders this verbatim in its notice slot, and the player got
  // there by pressing a tile that said "Tic-Tac-Overflow" — "tto takes at most
  // 2 players." is a sentence about a database column. Every id is checked, not
  // just the destination's: naming the game the room is LEAVING would be the
  // same bug. The display names live in the games' presentation catalog and
  // cannot be imported here, because no presentation data belongs under
  // src/lib/realtime, so the sentence has to work without a name at all.
  for (const id of listGames()) {
    assert(
      !message.toLowerCase().includes(id.toLowerCase()),
      `the 422 shows the registry id "${id}" to a player: "${message}"`
    );
  }

  return `"${message}"`;
});

resetRooms();

// ── the picker's toggle: Escape, and what aria-expanded points at ──────────
section("OnlineBar — the toggle closes on Escape and names the picker");

// Static, and honestly so: this repo has no DOM test runner, so what is checked
// here is the wiring rather than a synthesised keypress. It is still the right
// regression guard, because the finding it closes was precisely a missing
// attribute and a handler mounted on the wrong element.
const BARS = [
  "connect-404",
  "edge-case",
  "race-condition",
  "tic-tac-overflow",
].map((game) => [game, `src/app/(pages)/games/${game}/online/OnlineBar.jsx`]);

const barSource = (rel) => readFileSync(join(REPO, rel), "utf8");

/** The toggle element only: its opening tag through to its label text. */
const toggleOf = (source) => {
  const marker = source.indexOf("aria-expanded={open}");
  if (marker === -1) return null;
  // Backwards to the opening tag, because attributes are alphabetical and
  // `aria-controls` therefore sits ABOVE the marker.
  const start = source.lastIndexOf("<Leave", marker);
  const end = source.indexOf("Switch game", marker);
  return start === -1 || end === -1 ? null : source.slice(start, end);
};

// ANCHOR. Four bars, each with a disclosure toggle and a picker. Without this,
// a rename would empty the list and every assertion below would pass on zero.
await check("anchor: all four bars render a Switch game toggle and the picker", () => {
  assertEq(BARS.length, 4, "the bar list itself");

  for (const [game, rel] of BARS) {
    const source = barSource(rel);
    assert(toggleOf(source), `${game}: no disclosure toggle found`);
    assert(source.includes("<GameSwitcher"), `${game}: no picker`);
  }

  return "4 bars";
});

await check("aria-expanded is accompanied by aria-controls", () => {
  for (const [game, rel] of BARS) {
    const toggle = toggleOf(barSource(rel));
    assert(
      toggle.includes("aria-controls={open ? switcherId : undefined}"),
      `${game}: aria-expanded with nothing saying WHAT is expanded`
    );
  }

  return "4 toggles";
});

await check("the id it announces is the one the picker is given", () => {
  for (const [game, rel] of BARS) {
    const source = barSource(rel);
    assert(
      source.includes("const switcherId = useId();"),
      `${game}: no id is minted`
    );
    assert(
      /<GameSwitcher[\s\S]*?id=\{switcherId\}/.test(source),
      `${game}: aria-controls points at an id the picker never receives`
    );
  }

  const picker = barSource(
    "src/app/(pages)/games/_components/switch/GameSwitcher.jsx"
  );
  assert(/^\s+id,$/m.test(picker), "GameSwitcher does not accept an `id` prop");
  assert(
    /<Frame\b[\s\S]{0,40}\n\s+id=\{id\}/.test(picker),
    "the `id` prop never reaches the element GameSwitcher renders"
  );

  return "aria-controls resolves to a real element";
});

await check("Escape closes it from the toggle, not only from inside", () => {
  for (const [game, rel] of BARS) {
    const toggle = toggleOf(barSource(rel));

    // The picker's frame carries the same handler, but it only ever sees
    // Escape once focus is INSIDE the picker. Opening moves focus to the first
    // tile so that path works; this is the one where the player opened the
    // picker and left the keyboard on the toggle.
    assert(toggle.includes("onKeyDown"), `${game}: the toggle has no keydown handler`);
    assert(
      toggle.includes('event.key === "Escape"'),
      `${game}: the toggle's handler does not test for Escape`
    );
    assert(
      toggle.includes("closeSwitcher()"),
      `${game}: Escape on the toggle does not close the picker`
    );
  }

  // And the frame's handler is still there — this ADDS a path, it does not
  // move one, so Escape from a focused tile must keep working.
  const picker = barSource(
    "src/app/(pages)/games/_components/switch/GameSwitcher.jsx"
  );
  assert(
    /<Frame[\s\S]*?onKeyDown=[\s\S]*?event\.key === "Escape"/.test(picker),
    "the picker frame lost its own Escape handler"
  );

  return "4 toggles + the frame";
});

// ── live: POST /api/rooms/[code]/switch ────────────────────────────────────
if (!BASE) {
  console.log(
    "\nlive — SKIPPED, and this run therefore proves only the pure half.\n" +
      "        Pass --base http://127.0.0.1:3176 to check the route, the\n" +
      "        refusals and the seat compaction (see the header for the recipe)."
  );
} else {
  // A player's token IS their authorization, so a `token` anywhere in a payload
  // is a credential handed to whoever asked. `publicPlayer` is the allow-list
  // that prevents it; this is the regression check for that allow-list, run
  // over the raw JSON of every response this half receives.
  const tokenPaths = (value, path = "$") => {
    if (Array.isArray(value)) {
      return value.flatMap((entry, i) => tokenPaths(entry, `${path}[${i}]`));
    }
    if (value === null || typeof value !== "object") return [];
    return Object.entries(value).flatMap(([key, entry]) =>
      key === "token" ? [`${path}.token`] : tokenPaths(entry, `${path}.${key}`)
    );
  };

  let scanned = 0;
  let leaked = [];

  const api = async (path, init, { allowOwnToken = null } = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      // 204, or a proxy's HTML error page
    }

    scanned += 1;
    // POST /api/rooms echoes the caller's OWN token at the top level so a
    // browser that supplied none learns the one it was minted. That is the one
    // exception, and only when it really is the caller's own value.
    const found = tokenPaths(body).filter(
      (p) => p !== "$.token" || allowOwnToken === null || body.token !== allowOwnToken
    );
    if (found.length > 0) leaked.push(`${path} (${res.status}): ${found.join(", ")}`);

    return { status: res.status, ok: res.ok, body };
  };

  const create = (game, token, name) =>
    api(
      "/api/rooms",
      { method: "POST", body: JSON.stringify({ game, token, name }) },
      { allowOwnToken: token }
    );

  const join = (code, game, token, name) =>
    api(`/api/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ token, game, name }),
    });

  const snapshot = (code, token) =>
    api(`/api/rooms/${code}`, { headers: { "X-Player-Token": token } });

  const act = (code, token, revision, action, game) =>
    api(`/api/rooms/${code}/action`, {
      method: "POST",
      body: JSON.stringify({ token, game, revision, action }),
    });

  const switchTo = (code, token, revision, to) =>
    api(`/api/rooms/${code}/switch`, {
      method: "POST",
      body: JSON.stringify({ token, revision, to }),
    });

  /** Create a room, seat a second player, and hand back the current payload. */
  const twoSeatRoom = async (game, tokenA, tokenB) => {
    const created = await create(game, tokenA, "A");
    assert(
      created.status === 201 && created.body?.code,
      `could not create a ${game} room: ${created.status} ${JSON.stringify(created.body)}`
    );
    const code = created.body.code;
    const joined = await join(code, game, tokenB, "B");
    assert(joined.ok, `second player could not join ${code}: ${joined.status}`);
    return { code, room: joined.body.room };
  };

  /** Play a tto board to a win for X (slot 0): 0,3,1,4,2 across the top row. */
  const finishTto = async (code, tokenA, tokenB, startRevision) => {
    let revision = startRevision;
    for (const [token, cell] of [
      [tokenA, 0],
      [tokenB, 3],
      [tokenA, 1],
      [tokenB, 4],
      [tokenA, 2],
    ]) {
      const res = await act(code, token, revision, { type: "PLACE MARK", cell }, "tto");
      assert(res.ok, `move ${cell} refused: ${res.status} ${JSON.stringify(res.body)}`);
      revision = res.body.room.revision;
    }
    return revision;
  };

  section(`live — ${BASE}`);

  const reachable = await fetch(`${BASE}/api/rooms/ZZZZ`, {
    signal: AbortSignal.timeout(15_000),
  })
    .then(() => true)
    .catch(() => false);

  if (!reachable) {
    failures += 1;
    console.log(
      `  FAIL  server is reachable\n          nothing answered at ${BASE} — start the app first (see the header of this file).\n          NOT skipping: a skipped live half reads as a pass.`
    );
  }

  if (reachable) {
    // ANCHOR. "Nothing leaked a token" is only news if the scanner can see one.
    await check("anchor: the token scanner finds a planted token", () => {
      const planted = tokenPaths({
        room: {
          players: [{ slot: 0, name: "P1", token: "leaked-a" }],
          me: { slot: 1, token: "leaked-b" },
        },
      });
      assertEq(
        planted.sort().join(", "),
        "$.room.me.token, $.room.players[0].token",
        "the scan below would be worthless"
      );
      return "2 planted tokens found";
    });

    await check("tto -> connect-404 keeps both seats and lands on a board", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("tto", a, b);

      // ANCHOR: two seats really are here, and this really is a tto room.
      assertEq(room.game, "tto", "the room did not start as tto");
      assertEq(room.players.length, 2, "expected two seats before the switch");
      const before = room.players.map((p) => p.connectedAt);
      assert(before.every(Boolean), "seats must carry connectedAt before the switch");

      const revision = await finishTto(code, a, b, room.revision);
      const over = await snapshot(code, a);
      assertEq(over.body.room.status, "over", "the board should be finished");

      const res = await switchTo(code, b, revision, "connect-404");
      assert(res.ok, `switch refused: ${res.status} ${JSON.stringify(res.body)}`);

      const next = res.body.room;
      assertEq(next.game, "connect-404", "the room did not change game");
      assertEq(next.revision, revision + 1, "revision must move by exactly 1");
      assertEq(next.status, "playing", "two players land on a live board");
      assertEq(next.code, code, "the code must not change");
      assertEq(next.players.length, 2, "both seats must survive");
      assertEq(
        next.players.map((p) => p.connectedAt).join("|"),
        before.join("|"),
        "connectedAt was rewritten — keepSeat recognises a seat by it"
      );

      // Seats are resolved from the token, never claimed, so this is the real
      // proof that A is still 0 and B is still 1.
      assertEq((await snapshot(code, a)).body.room.me?.slot, 0, "A lost seat 0");
      assertEq((await snapshot(code, b)).body.room.me?.slot, 1, "B lost seat 1");

      return `${code}: tto -> connect-404, revision ${revision} -> ${next.revision}`;
    });

    await check("tto -> edge-case lands in edge-case's own lobby, with colours", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("tto", a, b);
      // ANCHOR: tto hands out no colours, so anything below is the switch's work.
      assert(
        room.players.every((p) => p.color === null),
        "a tto seat should hold no colour before the switch"
      );

      const revision = await finishTto(code, a, b, room.revision);
      const res = await switchTo(code, a, revision, "edge-case");
      assert(res.ok, `switch refused: ${res.status} ${JSON.stringify(res.body)}`);

      const next = res.body.room;
      assertEq(next.status, "lobby", "edge-case holds the door open until Start");
      assertEq(next.state?.phase, "lobby", "state.phase");
      assertEq(JSON.stringify(next.state?.slots), "[0,1]", "state.slots");

      const { COLOR_CHOICES } = await import(
        src("src/app/(pages)/games/edge-case/players.js")
      );
      const colors = next.players.map((p) => p.color);
      assert(
        colors.every((c) => COLOR_CHOICES.includes(c)),
        `every seat must hold a colour from the destination palette, got ${JSON.stringify(colors)}`
      );
      assertEq(new Set(colors).size, colors.length, "two seats hold the same colour");

      return `${code}: colours ${colors.join(", ")}`;
    });

    await check("edge-case -> tto nulls the colours the destination does not offer", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("edge-case", a, b);
      // ANCHOR: they really do hold colours to begin with.
      assert(
        room.players.every((p) => p.color !== null),
        "edge-case seats should hold colours before the switch"
      );

      const res = await switchTo(code, a, room.revision, "tto");
      assert(res.ok, `switch refused: ${res.status} ${JSON.stringify(res.body)}`);
      assert(
        res.body.room.players.every((p) => p.color === null),
        "a seat kept a colour the destination does not offer"
      );

      return `${code}: colours cleared`;
    });

    await check("mid-board is refused 400 in-progress", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("tto", a, b);
      // ANCHOR: it really is mid-board.
      assertEq(room.status, "playing", "two tto seats should be playing");

      const res = await switchTo(code, a, room.revision, "connect-404");
      assertEq(res.status, 400, "a live board must not be switchable");
      assertEq(res.body?.error, "in-progress", "wrong error code");

      const after = await snapshot(code, a);
      assertEq(after.body.room.game, "tto", "the room changed anyway");

      return "400 in-progress, room untouched";
    });

    await check("a non-host in a lobby is refused 400 not-host", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("edge-case", a, b);
      // ANCHOR: it really is a lobby, and B really is not seat 0.
      assertEq(room.status, "lobby", "edge-case with 2 seats should still be a lobby");
      assertEq(room.me?.slot, 1, "B should hold seat 1");

      const res = await switchTo(code, b, room.revision, "tto");
      assertEq(res.status, 400, "a non-host must not set up the room");
      assertEq(res.body?.error, "not-host", "wrong error code");

      // ...and the host may.
      const host = await switchTo(code, a, room.revision, "tto");
      assert(host.ok, `the host was refused too: ${host.status}`);

      return "400 not-host for B, 200 for A";
    });

    await check("an unseated token is refused 403 not-a-player", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("edge-case", a, b);

      const res = await switchTo(code, randomUUID(), room.revision, "tto");
      assertEq(res.status, 403, "a spectator must not switch");
      assertEq(res.body?.error, "not-a-player", "wrong error code");

      return "403 not-a-player";
    });

    await check("a stale revision is 409 with the authoritative room", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("edge-case", a, b);
      assert(room.revision >= 1, "need a revision above 0 to send a stale one");

      const res = await switchTo(code, a, room.revision - 1, "tto");
      assertEq(res.status, 409, "a stale revision must lose");
      assertEq(res.body?.error, "stale-revision", "wrong error code");
      assert(res.body?.room, "409 must carry the authoritative room");
      assertEq(res.body.room.revision, room.revision, "the attached room is not current");
      assertEq(res.body.room.game, "edge-case", "the room changed anyway");

      return "409 + room";
    });

    await check("a roster that no longer fits is 422 with the room", async () => {
      const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];
      const { code } = await twoSeatRoom("edge-case", a, b);
      const third = await join(code, "edge-case", c, "C");
      assert(third.ok, `third player could not join: ${third.status}`);
      // ANCHOR: there really are three of them.
      assertEq(third.body.room.players.length, 3, "expected three seats");

      const res = await switchTo(code, a, third.body.room.revision, "tto");
      assertEq(res.status, 422, "three people cannot move into a 2-player game");
      assertEq(res.body?.error, "rejected", "wrong error code");
      assert(res.body?.room, "422 must carry the room");
      assertEq(res.body.room.game, "edge-case", "the room changed anyway");

      return "422 + room";
    });

    await check("an unregistered destination is 400 unknown-game", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("edge-case", a, b);

      const res = await switchTo(code, a, room.revision, "solitaire");
      assertEq(res.status, 400, "an unknown game must be refused");
      assertEq(res.body?.error, "unknown-game", "wrong error code");

      return "400 unknown-game";
    });

    await check("switching to the game you are already playing is 400 same-game", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("edge-case", a, b);

      const res = await switchTo(code, a, room.revision, "edge-case");
      assertEq(res.status, 400, "a no-op switch must be refused, not burn a revision");
      assertEq(res.body?.error, "same-game", "wrong error code");

      return "400 same-game";
    });

    await check("a room that has expired is 410 gone", async () => {
      const res = await switchTo("ZZZZ", randomUUID(), 0, "tto");
      assertEq(res.status, 410, "a room that is not there must be 410");
      assertEq(res.body?.error, "gone", "wrong error code");

      return "410 gone";
    });

    await check("COMPACTION: a LEFT seat is dropped and the survivor becomes seat 0", async () => {
      // The case the feature exists for, and the dangerous one: HOST_SLOT is
      // the literal integer 0, so if the seat that leaves is 0 and nothing
      // renumbers, the room has no host for the rest of its life.
      const [a, b] = [randomUUID(), randomUUID()];
      const { code, room } = await twoSeatRoom("tto", a, b);
      const beforeB = room.players.find((p) => p.slot === 1)?.connectedAt;
      assert(beforeB, "B must carry a connectedAt before any of this");

      const revision = await finishTto(code, a, b, room.revision);

      // A (seat 0, the host) walks out of a FINISHED game. The seat stays and
      // is flagged, because the board and turn order still have to make sense.
      const left = await api(`/api/rooms/${code}/leave`, {
        method: "POST",
        body: JSON.stringify({ token: a }),
      });
      assert(left.ok, `A could not leave: ${left.status}`);

      // ANCHOR: `left: true` is really present, on seat 0, before we claim the
      // switch removed it. Without this, a switch that changed nothing and a
      // leave that never landed report identically.
      const seat0 = left.body.room.players.find((p) => p.slot === 0);
      assert(seat0, "seat 0 vanished on a mid/post-game leave — it must stay");
      assertEq(seat0.left, true, "seat 0 is not flagged left");
      assertEq(left.body.room.players.length, 2, "both seats should still be listed");

      const res = await switchTo(code, b, left.body.room.revision, "connect-404");
      assert(res.ok, `the survivor could not switch: ${res.status} ${JSON.stringify(res.body)}`);

      const next = res.body.room;
      assertEq(next.players.length, 1, "the LEFT seat was not dropped");
      assertEq(next.players[0].slot, HOST_SLOT, "the survivor was not compacted onto seat 0");
      assertEq(next.players[0].left, false, "the survivor must not be flagged left");
      assertEq(
        next.players[0].connectedAt,
        beforeB,
        "connectedAt was rewritten during compaction"
      );
      assertEq(next.status, "lobby", "one player lands on the waiting screen");

      // The token is the seat's identity: this is what proves seat 0 is B and
      // not a renumbered ghost of A.
      assertEq((await snapshot(code, b)).body.room.me?.slot, HOST_SLOT, "B is not the host");
      assertEq((await snapshot(code, a)).body.room.me ?? null, null, "A still holds a seat");

      return `${code}: 2 seats -> 1, B promoted to slot 0`;
    });

    await check("no response body carried a player token", () => {
      assert(scanned > 20, `only ${scanned} bodies were scanned — did the live half run?`);
      assertEq(leaked.join(" | "), "", "a payload leaked a token");
      return `${scanned} bodies scanned`;
    });
  }
}

console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check${failures === 1 ? "" : "s"} FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
