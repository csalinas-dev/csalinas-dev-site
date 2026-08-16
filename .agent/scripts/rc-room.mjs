// Drive a Race Condition ROOM over the real HTTP API, with real player tokens.
//
//   node .agent/scripts/rc-room.mjs check [--base URL] [--presence]
//   node .agent/scripts/rc-room.mjs park  [--base URL] [--seats 1|2]
//                                         [--leave-after N] [--drop-after N]
//                                         [--eval OUT.js]
//
// WHY THIS EXISTS. The states that break a multiplayer game are states one
// person at one keyboard cannot get into: a second player who is out of turn, a
// revision that went stale in flight, a third arrival, a seat that was left, a
// phone that stopped answering. The engine's own harness
// (verify-race-condition.mjs) cannot see any of them — they are not rules, they
// are the room. The part-2 review made the point the expensive way: the one
// blocking bug was in an ending nobody had built a way to look at.
//
// So `check` asserts the whole HTTP contract in one pass with no browser, and
// `park` PLAYS THE OPPONENT'S SIDE so a real browser can be the other player —
// which is how you get a screenshot of "they left" or "they went away" without
// two laptops.
//
// `park --eval OUT.js` also writes a page script for shot.mjs that asserts the
// one thing only a browser can see: THE BOARD ON SCREEN IS THE BOARD IN THE
// ROOM. That check is not decoration — it is what caught the orbit sequence
// being cancelled by its own confirmation, which left a board showing one marble
// while the room held three and was invisible to every HTTP assertion above.
//
// Nothing here re-implements a rule. Turns come out of the game's own `_lib`
// (`legalMoves` / `emptyCells`), so every turn this sends is one a human could
// have clicked, and a refusal means the SERVER disagrees with the engine rather
// than that this script guessed.
//
// Exit 0 when everything asserted holds, 1 on the first failure (it says which),
// 2 on bad usage.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// Same re-exec as the other scripts here, for the same reason: the game's files
// are `.js` under a package.json with no `"type"`, and Node warns once per file.
// Silence that ONE code, not every warning.
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

const { applyMove, emptyCells, legalMoves } = await import(
  pathToFileURL(join(GAME_DIR, "_lib", "index.js")).href
);

const GAME_ID = "race-condition";

// The core's own timings, restated here rather than imported: this file talks to
// the server over HTTP and has no business importing the realtime core.
const PRESENCE_STALE_MS = 45_000;

// ── arguments ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith("--")) ?? "";
const flag = (name, fallback = null) => {
  const at = args.indexOf(name);

  return at === -1 ? fallback : (args[at + 1] ?? fallback);
};
const has = (name) => args.includes(name);

const BASE = (flag("--base") ?? "http://localhost:3000").replace(/\/$/, "");

if (command !== "check" && command !== "park") {
  console.error(
    "usage: node .agent/scripts/rc-room.mjs check [--base URL] [--presence]\n" +
      "       node .agent/scripts/rc-room.mjs park [--base URL] [--seats 1|2] [--leave-after N] [--drop-after N] [--eval OUT.js]"
  );
  process.exit(2);
}

// ── assertions ─────────────────────────────────────────────────────────────
let passed = 0;

const fail = (what, detail) => {
  console.error(`\n  FAIL  ${what}`);
  if (detail !== undefined) console.error(`        ${detail}`);
  process.exit(1);
};

const ok = (what, detail) => {
  passed += 1;
  console.log(`  ok    ${what}${detail ? ` — ${detail}` : ""}`);
};

const assert = (condition, what, detail) => {
  if (!condition) fail(what, detail);
  ok(what, detail);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── the token scan ─────────────────────────────────────────────────────────
// A player's token IS their authorization, so a `token` anywhere in a payload
// is a credential handed to whoever asked. `publicPlayer` is the allow-list that
// prevents it; this is the regression test for that allow-list, run over the raw
// JSON of EVERY response this script receives.
//
// One exception, and only one: `POST /api/rooms` answers `{ code, slot, token,
// room }`, echoing back the caller's OWN token so a client that supplied none
// learns the one it was minted. That is at the top level, it is the requester's
// own value, and both of those are asserted — a token nested anywhere (inside
// `room`, inside `players`) is a failure no matter whose it is.
const tokenPaths = (value, path = "$") => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => tokenPaths(entry, `${path}[${index}]`));
  }
  if (value === null || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, entry]) =>
    key === "token"
      ? [`${path}.token`]
      : tokenPaths(entry, `${path}.${key}`)
  );
};

let scanned = 0;

const scanForTokens = (label, body, allowOwnTokenEqualTo = null) => {
  scanned += 1;
  const found = tokenPaths(body);
  const leaked = found.filter((path) => {
    if (path !== "$.token") return true;
    // The documented echo, and only if it really is the caller's own.
    return allowOwnTokenEqualTo === null || body.token !== allowOwnTokenEqualTo;
  });

  if (leaked.length > 0) {
    fail(
      "no payload carries a player token",
      `${label} exposed ${leaked.join(", ")}`
    );
  }
};

// ── HTTP ───────────────────────────────────────────────────────────────────
const request = async (method, path, { body, token, allowOwnToken } = {}) => {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-Player-Token": token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    fail(
      `reach ${method} ${path}`,
      `${err.message} — is the server running at ${BASE}? (npm run dev)`
    );
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // A proxy's HTML error page, or a 204.
  }

  scanForTokens(`${method} ${path} (${res.status})`, json, allowOwnToken ?? null);

  return { status: res.status, body: json };
};

// The token is a header on GET and a body field everywhere else — it never goes
// in a URL, which is the core's rule and is worth keeping in the harness too.
const createRoom = (token) =>
  request("POST", "/api/rooms", {
    body: { game: GAME_ID, token },
    allowOwnToken: token,
  });

const joinRoom = (code, token) =>
  request("POST", `/api/rooms/${code}/join`, {
    body: { token, game: GAME_ID },
  });

const readRoom = (code, token) =>
  request("GET", `/api/rooms/${code}`, { token });

const leaveRoom = (code, token, slot) =>
  request("POST", `/api/rooms/${code}/leave`, {
    body: slot === undefined ? { token } : { token, slot },
  });

const act = (code, token, revision, action) =>
  request("POST", `/api/rooms/${code}/action`, {
    body: { token, game: GAME_ID, revision, action },
  });

const newToken = () => crypto.randomUUID();

// ── turns, from the engine ─────────────────────────────────────────────────
/**
 * A turn the seat on the clock could legally take, chosen the way the board
 * offers them: a slide out of `legalMoves`, then a placement out of the empty
 * squares of the board that slide leaves. Deterministic — index `n` of each
 * list — so a failing run replays identically.
 */
const turnFor = (state, slot, n = 0) => {
  const options = legalMoves(state, slot);
  const move = options.length > 0 ? options[n % options.length] : null;
  const empty = emptyCells(applyMove(state.cells, move));

  if (empty.length === 0) return null;

  return {
    type: "PLAY TURN",
    move: move === null ? null : { from: move.from, to: move.to },
    place: empty[n % empty.length],
  };
};

// ── check ──────────────────────────────────────────────────────────────────
const check = async () => {
  console.log(`Race Condition rooms — ${BASE}\n`);

  // ANCHOR. "Nothing leaked a token" is only news if this scanner can see one,
  // and a scanner that silently matched nothing would pass every run for the
  // worst possible reason. So it is pointed at a payload shaped exactly like the
  // one that would be a disaster — a raw GameRoom row serialized straight out —
  // and has to find both.
  const planted = tokenPaths({
    room: {
      players: [{ slot: 0, name: "Player 1", token: "leaked-a" }],
      me: { slot: 1, token: "leaked-b" },
    },
  });
  assert(
    planted.length === 2 &&
      planted.includes("$.room.players[0].token") &&
      planted.includes("$.room.me.token"),
    "the token scanner finds a planted token",
    planted.join(", ") || "found nothing — the scan below would be worthless"
  );

  const tokenA = newToken();
  const tokenB = newToken();
  const tokenC = newToken();

  // 1 — a room opens in the lobby and starts when the second seat fills.
  console.log("Opening a room");
  const created = await createRoom(tokenA);
  assert(created.status === 201, "POST /api/rooms creates a room", `status ${created.status}`);
  const code = created.body?.code;
  assert(
    typeof code === "string" && code.length === 4,
    "the room has a four-character code",
    code
  );
  assert(
    created.body.room.status === "lobby",
    "one player is still the lobby",
    `status ${created.body.room.status}, ${created.body.room.players.length} player(s)`
  );
  assert(
    created.body.room.state !== null && created.body.room.state.cells.length === 16,
    "the board exists before the second player does",
    "createState ignores the roster, as it must — _lib refuses anything but two slots"
  );

  const joined = await joinRoom(code, tokenB);
  assert(joined.status === 200, "the second player joins", `status ${joined.status}`);
  assert(
    joined.body.room.status === "playing",
    "the second seat starts the game",
    `status ${joined.body.room.status}`
  );
  assert(
    joined.body.room.players.length === 2 &&
      joined.body.room.players.map((p) => p.slot).join(",") === "0,1",
    "two seats, 0 and 1",
    joined.body.room.players.map((p) => `${p.slot}:${p.name}`).join("  ")
  );
  assert(
    Array.isArray(joined.body.room.state.slots) &&
      joined.body.room.state.slots.join(",") === "0,1",
    "turn order is an ARRAY on the state, not key order",
    "MySQL JSON does not preserve object key order"
  );

  let room = joined.body.room;
  const tokens = [tokenA, tokenB];
  const tokenFor = (slot) => tokens[room.state.slots.indexOf(slot)];

  // 2 — the refusals. Done first, while the board is untouched and a wrong-turn
  // action is unambiguous.
  console.log("\nRefusals");
  const offTurn = room.state.slots.find((slot) => slot !== room.state.turn);
  // A perfectly legal turn, sent by the seat that is not on the clock. The
  // request never names a slot — the server works out who sent it from the
  // token, which is the only reason this can be refused at all.
  const wrongSeat = turnFor(room.state, room.state.turn);
  const refused = await act(code, tokenFor(offTurn), room.revision, wrongSeat);
  assert(refused.status === 422, "an out-of-turn action is refused", `status ${refused.status}`);
  assert(
    typeof refused.body?.message === "string",
    "the refusal is a STRING, not the engine's { code, message } object",
    `typeof message === "${typeof refused.body?.message}"`
  );
  assert(
    refused.body.message === "It is not your turn.",
    "and it is the engine's own sentence",
    JSON.stringify(refused.body.message)
  );
  assert(
    refused.body.room?.revision === room.revision,
    "a refused action carries the authoritative room and moves nothing",
    `revision ${refused.body.room?.revision}`
  );

  const stale = await act(
    code,
    tokenFor(room.state.turn),
    room.revision - 1,
    turnFor(room.state, room.state.turn)
  );
  assert(stale.status === 409, "a stale revision is refused", `status ${stale.status}`);
  assert(
    stale.body?.error === "stale-revision" && stale.body?.room?.revision === room.revision,
    "409 attaches the room the client missed",
    `error ${stale.body?.error}, revision ${stale.body?.room?.revision}`
  );

  // 3 — a third arrival.
  console.log("\nA third arrival");
  const third = await joinRoom(code, tokenC);
  assert(third.status === 403, "a third player is turned away", `status ${third.status}`);
  // `room-full`, NOT `room-in-progress`. Both are 403s that `useRoom` degrades
  // to spectating, and for this game only the first is reachable: `joinRoom`
  // tests capacity before it tests status, and a two-seat room has a free seat
  // only while it is still in the lobby. (A seat that is LEFT mid-game is kept,
  // so it still counts as full — which is what stops a stranger walking into a
  // game in progress and inheriting somebody's marbles.)
  assert(
    third.body?.error === "room-full" || third.body?.error === "room-in-progress",
    "with the 403 useRoom degrades to spectating",
    third.body?.error
  );
  const watching = await readRoom(code, tokenC);
  assert(watching.status === 200, "and can still read the room", `status ${watching.status}`);
  assert(watching.body.room.me === null, "as a spectator: me is null", "no seat, no controls");

  // 4 — leaving and rejoining, MID-GAME, with marbles on the board.
  console.log("\nLeaving and coming back, mid-game");
  for (let turn = 0; turn < 3; turn += 1) {
    const action = turnFor(room.state, room.state.turn, turn);
    const played = await act(code, tokenFor(room.state.turn), room.revision, action);
    assert(
      played.status === 200,
      `turn ${turn + 1} is accepted`,
      `placed on ${action.place}${action.move ? `, slid ${action.move.from}>${action.move.to}` : ", no slide"}`
    );
    room = played.body.room;
  }

  const before = JSON.stringify(room.state.cells);
  const beforeTurn = room.state.turn;
  const left = await leaveRoom(code, tokenB);
  assert(left.status === 200, "a player may leave mid-game", `status ${left.status}`);
  room = left.body.room;
  const seatB = room.players.find((p) => p.slot === 1);
  assert(
    seatB !== undefined && seatB.left === true,
    "their seat STAYS on the board and is flagged left",
    "deleting it mid-game would break the turn order"
  );
  assert(
    JSON.stringify(room.state.cells) === before && room.state.turn === beforeTurn,
    "and the board is untouched",
    `${before.split("null").length - 1} empty squares, still ${beforeTurn} to move`
  );

  const rejoined = await joinRoom(code, tokenB);
  assert(rejoined.status === 200, "and they can come back", `status ${rejoined.status}`);
  room = rejoined.body.room;
  const backB = room.players.find((p) => p.slot === 1);
  assert(
    backB !== undefined && backB.left === false,
    "the left flag is cleared on rejoin",
    "which is also what makes a page RELOAD safe — pagehide fires a leave"
  );
  assert(
    room.me?.slot === 1,
    "and it is the SAME seat, resolved from the token",
    `slot ${room.me?.slot}`
  );

  // 5 — the rest of the game, one action per turn, one revision per action.
  console.log("\nPlaying it out");
  let turns = 3;
  while (!room.state.finished && turns < 24) {
    const revision = room.revision;
    const action = turnFor(room.state, room.state.turn, turns);
    if (action === null) fail("the board filled without finishing", `after ${turns} turns`);
    const played = await act(code, tokenFor(room.state.turn), revision, action);

    if (played.status !== 200) {
      fail(
        `turn ${turns + 1} was refused`,
        `${played.status} ${played.body?.error}: ${played.body?.message}`
      );
    }
    if (played.body.room.revision !== revision + 1) {
      fail(
        "every accepted action bumps the revision by exactly one",
        `${revision} -> ${played.body.room.revision}`
      );
    }

    room = played.body.room;
    turns += 1;
  }

  assert(room.state.finished === true, "the game finishes", `${turns} turns`);
  ok("every accepted action bumped the revision by exactly one", `${turns} actions`);
  assert(
    room.status === "over",
    "and the room's status follows the board",
    `status ${room.status}, winner ${room.state.winner ?? "nobody"}${room.state.draw ? ` (draw: ${room.state.drawReason})` : ""}`
  );

  // 6 — the rematch, asked for by the seat that did NOT win, to prove either may.
  console.log("\nThe rematch");
  // Read off the FINISHED board, before the rematch replaces it — the new state
  // has no winner by construction, and asking it would label this assertion "a
  // draw" every single time whatever happened.
  const decidedBy = room.state.winner;
  const expectedFirst = decidedBy ?? room.state.slots[0];
  const asker = room.state.slots.find((slot) => slot !== expectedFirst) ?? expectedFirst;
  const again = await act(code, tokenFor(asker), room.revision, { type: "NEW GAME" });
  assert(again.status === 200, "either seat may start the next game", `asked for by slot ${asker}`);
  room = again.body.room;
  assert(
    room.state.turn === expectedFirst && room.state.lastTurn === null,
    decidedBy === null
      ? "after a draw the next game opens in seat order"
      : "the WINNER opens the next game, even though the LOSER asked",
    `slot ${room.state.turn} to move on a fresh board`
  );
  assert(
    room.status === "playing" && room.state.cells.every((cell) => cell === null),
    "and the room is playing again on an empty board",
    `revision ${room.revision}`
  );

  // 7 — presence, which costs 45 seconds and so is opt-in.
  if (has("--presence")) {
    console.log("\nPresence (silence, not a departure)");
    const deadline = Date.now() + PRESENCE_STALE_MS + 6000;
    // A keeps reading; B says nothing at all. Nobody leaves.
    while (Date.now() < deadline) {
      await readRoom(code, tokenA);
      await sleep(3000);
    }
    const seen = await readRoom(code, tokenA);
    const quiet = seen.body.room.players.find((p) => p.slot === 1);
    assert(
      quiet.connected === false && quiet.left === false,
      "silence reads as away (connected false) and NOT as left",
      "absence.js is what turns those two flags into two different sentences"
    );
  }

  console.log(
    `\nRace Condition rooms: ${passed} checks passed, ${scanned} response bodies scanned for tokens.`
  );
};

// ── the page script ────────────────────────────────────────────────────────
// Replayed by shot.mjs in a real browser against the parked room. It plays one
// turn by CLICKING, then holds still and compares, twice a second for twelve
// seconds, the marbles the DOM is drawing against the marbles the room says are
// there.
//
// Both halves of that are load-bearing:
//
//   AGREEMENT catches a board that has stopped keeping up — the orbit sequence
//   being cancelled by the server's confirmation of the turn it was already
//   playing left marbles with no id and therefore no DOM node, and every HTTP
//   assertion in `check` passed throughout.
//
//   STILLNESS catches the opposite failure, the one `turnKey` exists for: a
//   board that re-animates itself because a re-delivered revision looked like
//   news. Twelve seconds is six polls of the fallback transport.
//
// EVERY return carries `ok`, including the two that give up early. shot.mjs
// exits 3 on a falsy one and 0 on a result with no `ok` field at all, so a
// bare `{ error }` here would be a real failure passing the gate (#150).
const pageScript = (code) => `// Generated by .agent/scripts/rc-room.mjs (park --eval), room ${code}.
// Plays one turn in the browser, then asserts the board on screen IS the board
// in the room, and that it holds still while snapshots keep arriving.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cells = () => [...document.querySelectorAll("[data-cell]")];
  const placeable = () => cells().filter((c) => c.className.includes("placeable"));

  // What the screen is drawing: every marble, by the square it is standing on
  // and the initial stamped on it.
  const drawn = () =>
    [...document.querySelectorAll('[style*="--row"]')]
      .map((p) => {
        const row = Number(p.style.getPropertyValue("--row"));
        const col = Number(p.style.getPropertyValue("--col"));
        const initial = p.firstElementChild?.querySelector("text")?.textContent ?? "?";
        return \`\${row * 4 + col}\${initial}\`;
      })
      .sort()
      .join(" ");

  // What the room says. Read as a spectator would — no token, no seat.
  const held = async () => {
    const res = await fetch("/api/rooms/${code}");
    const { room } = await res.json();
    const initials = ["C", "G"];
    return room.state.cells
      .map((slot, index) =>
        slot === null ? null : \`\${index}\${initials[room.state.slots.indexOf(slot)] ?? "?"}\`
      )
      .filter(Boolean)
      .sort()
      .join(" ");
  };

  for (let i = 0; i < 200 && cells().length !== 16; i += 1) await sleep(250);
  if (cells().length !== 16) return { ok: false, error: "board never appeared" };

  // Take a turn, so there is an orbit to get wrong.
  for (let i = 0; i < 200 && placeable().length === 0; i += 1) await sleep(200);
  const open = placeable();
  if (open.length === 0) return { ok: false, error: "never offered a turn" };
  open[Math.floor(open.length / 2)].click();
  await sleep(4000);

  const settled = drawn();
  const samples = [];
  let disagreed = 0;
  let moved = 0;

  for (let i = 0; i < 24; i += 1) {
    const onScreen = drawn();
    const inTheRoom = await held();
    if (onScreen !== inTheRoom) disagreed += 1;
    if (onScreen !== settled) moved += 1;
    if (i % 8 === 0) samples.push({ onScreen, inTheRoom });
    await sleep(500);
  }

  return {
    marblesOnScreen: settled.split(" ").filter(Boolean).length,
    screenDisagreedWithTheRoom: disagreed,
    boardMovedOnItsOwn: moved,
    samples,
    ok: disagreed === 0 && moved === 0,
  };
})();
`;

// ── park ───────────────────────────────────────────────────────────────────
// Holds a seat (or both) and plays it, so a browser can be the other player.
const park = async () => {
  const seats = Number(flag("--seats", "1"));
  const leaveAfter = flag("--leave-after") === null ? null : Number(flag("--leave-after"));
  const dropAfter = flag("--drop-after") === null ? null : Number(flag("--drop-after"));

  if (seats !== 1 && seats !== 2) {
    console.error("--seats must be 1 (bot holds one seat) or 2 (bot holds both)");
    process.exit(2);
  }

  const tokenA = newToken();
  const tokenB = seats === 2 ? newToken() : null;

  const created = await createRoom(tokenA);
  if (created.status !== 201) {
    fail("create a room", `${created.status} ${created.body?.error}`);
  }
  const code = created.body.code;

  if (tokenB) {
    const second = await joinRoom(code, tokenB);
    if (second.status !== 200) fail("seat the second bot", `${second.status}`);
  }

  const mine = tokenB ? [tokenA, tokenB] : [tokenA];

  console.log(`room ${code}`);
  console.log(`open  ${BASE}/games/race-condition?room=${code}`);
  console.log(
    tokenB
      ? "the bot holds BOTH seats — a browser opening that link is a spectator"
      : "the bot holds seat 0 — a browser opening that link takes seat 1"
  );
  if (leaveAfter !== null) console.log(`it will LEAVE after ${leaveAfter} of its own turns`);
  if (dropAfter !== null) console.log(`it will go SILENT after ${dropAfter} of its own turns`);

  const evalOut = flag("--eval");
  if (evalOut) {
    writeFileSync(evalOut, pageScript(code));
    console.log(`\nwrote ${evalOut} — replay it in a real browser with shot.mjs:`);
    console.log(
      `  node .agent/scripts/shot.mjs "${BASE}/games/race-condition?room=${code}" 900 rc-room.png ${evalOut}`
    );
    console.log("  shot.mjs exits 3 if the board and the room disagree");
  }

  console.log("\nctrl-c to stop.\n");

  let played = 0;
  let silent = false;

  // Poll rather than stream: EventSource is a browser API and the point here is
  // to be a second player, not to be a second client library.
  for (;;) {
    if (silent) {
      // Not a request of any kind — that is the whole point of --drop-after.
      // The room must decide on its own that nobody is there.
      await sleep(2000);
      continue;
    }

    const snapshot = await readRoom(code, mine[0]);
    if (snapshot.status === 410) {
      console.log("the room expired");
      return;
    }
    if (snapshot.status !== 200) {
      await sleep(1000);
      continue;
    }

    const room = snapshot.body.room;

    if (room.status === "lobby") {
      await sleep(1000);
      continue;
    }

    const state = room.state;

    if (state.finished) {
      // Wait for the human to ask for the rematch rather than racing them to it;
      // both seats may, and a bot that always wins that race is not a useful
      // second player to look at a finished screen with.
      await sleep(1500);
      continue;
    }

    const seat = room.players.find((player) => player.slot === state.turn);
    const token = mine[state.slots.indexOf(state.turn)];

    if (!token || !seat) {
      // The human's turn.
      await sleep(1000);
      continue;
    }

    const action = turnFor(state, state.turn, played);
    if (action === null) {
      await sleep(1000);
      continue;
    }

    const result = await act(code, token, room.revision, action);
    if (result.status === 409) continue; // the board moved; look again
    if (result.status !== 200) {
      console.log(`refused: ${result.status} ${result.body?.error} ${result.body?.message ?? ""}`);
      await sleep(1000);
      continue;
    }

    played += 1;
    console.log(
      `turn ${played}: slot ${state.turn} placed on ${action.place}` +
        (action.move ? `, slid ${action.move.from}>${action.move.to}` : ", no slide")
    );

    if (leaveAfter !== null && played >= leaveAfter) {
      await leaveRoom(code, mine[0]);
      console.log("\nleft the room — the browser should now say so, in the LEFT wording");
      return;
    }

    if (dropAfter !== null && played >= dropAfter) {
      silent = true;
      console.log(
        `\ngone silent — no further requests. In about ${PRESENCE_STALE_MS / 1000}s the browser` +
          " should say they lost connection, in the AWAY wording."
      );
    }

    await sleep(700);
  }
};

await (command === "check" ? check() : park());
