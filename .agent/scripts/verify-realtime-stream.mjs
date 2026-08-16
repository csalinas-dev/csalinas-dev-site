// Verification harness for the realtime stream's identity handling (#155).
//
//   node .agent/scripts/verify-realtime-stream.mjs --base http://127.0.0.1:3155
//
// Covers the two halves of the fix, which are independent and neither of which
// covers the other:
//
//   PURE  `keepSeat` (src/lib/realtime/identity.js) — a payload that does not
//         know who you are may only un-seat you if your slot is also gone from
//         its own `players`.
//   LIVE  the stream route — a ticket that is present and cannot be redeemed is
//         refused with 403 `bad-ticket` instead of quietly serving an anonymous
//         stream that reports `me: null` to a seated player.
//
// This repo has no test runner (package.json has only dev/build/start/lint), so
// this script is the check. One line per check, exit non-zero if any fail.
//
// The live half is run against BOTH connect-404 and tto: the bug is in shared
// code under src/lib/realtime, so a fix confirmed on one game proves nothing
// about the others.
//
// If --base is unreachable the live half FAILS. It never "skips": a skip in a
// verification script reads as a pass, which is how one goes quietly useless.
//
// Getting a database in a worktree (the .env provisioned into an agent worktree
// carries no usable DATABASE_URL; an explicit one in the environment wins over
// .env because Next does not override variables that are already set):
//
//   docker run -d --name issue155-mysql -e MYSQL_ROOT_PASSWORD=issue155 \
//     -e MYSQL_DATABASE=csalinas -p 127.0.0.1:13155:3306 mysql:8.0
//   npm ci && npx prisma generate
//   export DB='mysql://root:issue155@127.0.0.1:13155/csalinas'
//   DATABASE_URL="$DB" npx prisma db push --skip-generate
//   DATABASE_URL="$DB" ./node_modules/.bin/next dev -p 3155
//   node .agent/scripts/verify-realtime-stream.mjs --base http://127.0.0.1:3155
//   docker rm -f issue155-mysql
//
// Run it against a production build too (`next build && next start`) — that is
// what deploys, and it is the run that proves the ticket route and the stream
// route really do share one tickets.js module instance. If a freshly minted
// ticket ever 403s there, STOP: do not restore the anonymous fallback to make
// it pass, that fallback is the bug.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
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

register("./lib/esm-resolver.mjs", import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// `pathToFileURL`, not the bare path: on Windows an absolute path starts with a
// drive letter and Node reads "C:" as an unsupported URL scheme.
const { keepSeat } = await import(
  pathToFileURL(join(REPO, "src/lib/realtime/identity.js")).href
);

const baseFlag = process.argv.indexOf("--base");
const BASE = (
  baseFlag !== -1 ? process.argv[baseFlag + 1] : "http://127.0.0.1:3000"
).replace(/\/$/, "");

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

// ── pure: keepSeat ─────────────────────────────────────────────────────────
section("keepSeat — when `me: null` is believable");

const seated = (slots) => slots.map((slot) => ({ slot, name: `P${slot}` }));

await check("restores `me` when the held slot is still in `players`", () => {
  const payload = { me: null, players: seated([0, 1]), revision: 4 };
  const out = keepSeat(payload, 0);

  assert(out.me !== null, "the seat was not restored");
  assertEq(out.me.slot, 0, "restored the wrong seat");
  // From the payload's own roster, not remembered, so name/colour/connected
  // stay as fresh as the rest of the snapshot.
  assertEq(out.me.name, "P0", "seat did not come from this payload's roster");
  assertEq(out.revision, 4, "the rest of the payload must pass through intact");

  return "me: null -> slot 0";
});

await check("leaves `me` null when the held slot is gone from `players`", () => {
  // The only two ways a seat disappears: the host removed them, or they stood
  // up in the lobby. Then `me: null` is the truth and must be rendered.
  const payload = { me: null, players: seated([1, 2]), revision: 9 };
  const out = keepSeat(payload, 0);

  assertEq(out.me, null, "a seat that is really gone was resurrected");
  assertEq(out, payload, "should return the same object when it does nothing");

  return "seat gone -> stays null";
});

await check("never overwrites a non-null `me`", () => {
  const payload = { me: { slot: 1, name: "P1" }, players: seated([0, 1]) };
  const out = keepSeat(payload, 0);

  assertEq(out.me.slot, 1, "the payload's own identity was overwritten");
  assertEq(out, payload, "should return the same object when it does nothing");

  return "server's `me` wins";
});

await check("no-ops when no seat is held", () => {
  // A genuine spectator: never had a seat, so there is nothing to restore and
  // `me: null` must survive. This is the check that stops the fix from
  // silently seating the television.
  const payload = { me: null, players: seated([0, 1]) };

  assertEq(keepSeat(payload, null), payload, "null heldSlot must no-op");
  assertEq(keepSeat(payload, undefined), payload, "undefined heldSlot must no-op");
  assertEq(keepSeat(null, 0), null, "a falsy payload must pass through");

  return "spectators stay spectators";
});

await check("slot 0 is a held seat, not a falsy one", () => {
  // The seat numbering starts at zero, so anything testing `if (heldSlot)`
  // would break exactly for the host and nobody else.
  const payload = { me: null, players: seated([0, 1]) };

  assertEq(keepSeat(payload, 0).me?.slot, 0, "slot 0 was treated as no seat");

  return "host's seat survives";
});

await check("returns a copy rather than mutating the payload", () => {
  const payload = { me: null, players: seated([0, 1]) };
  const out = keepSeat(payload, 0);

  assert(out !== payload, "must not return the same object when it repairs");
  assertEq(payload.me, null, "the caller's payload was mutated");

  return "input untouched";
});

// ── live: the stream route ─────────────────────────────────────────────────
const api = async (path, init) => {
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
  return { status: res.status, ok: res.ok, body };
};

/**
 * Open the stream and read exactly one event, then hang up.
 *
 * Bare fetch rather than EventSource on purpose: EventSource hides the status
 * code and the content type, and those are precisely what this is checking.
 */
const openStream = async (path) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);

  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal });
    const contentType = res.headers.get("content-type") ?? "";

    if (!contentType.includes("text/event-stream")) {
      let body = null;
      try {
        body = await res.json();
      } catch {
        // not JSON either; the status is what matters
      }
      return { status: res.status, contentType, body, event: null, data: null };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (buffer.indexOf("\n\n") === -1) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    ctrl.abort(); // one event is all we need

    const frame = buffer.slice(0, buffer.indexOf("\n\n"));
    const event = /^event: (.*)$/m.exec(frame)?.[1] ?? null;
    const raw = /^data: (.*)$/m.exec(frame)?.[1] ?? null;

    return {
      status: res.status,
      contentType,
      body: null,
      event,
      data: raw ? JSON.parse(raw) : null,
    };
  } finally {
    clearTimeout(timer);
  }
};

const mintTicket = async (code, token) => {
  const res = await api(`/api/rooms/${code}/ticket`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  assert(res.ok && res.body?.ticket, `could not mint a ticket: ${res.status}`);
  return res.body.ticket;
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

for (const game of reachable ? ["connect-404", "tto"] : []) {
  section(`live — ${game}`);

  const tokenA = randomUUID();
  const tokenB = randomUUID();

  const created = await api("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ game, token: tokenA, name: "A" }),
  });
  assert(
    created.status === 201 && created.body?.code,
    `could not create a ${game} room: ${created.status} ${JSON.stringify(created.body)}`
  );
  const code = created.body.code;

  const joined = await api(`/api/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ token: tokenB, game, name: "B" }),
  });
  assert(joined.ok, `second player could not join: ${joined.status}`);

  // ANCHOR. Everything below is about a player who is genuinely seated; if
  // they are not, the rest of this section proves nothing.
  await check("anchor: A really holds slot 0", async () => {
    const snap = await api(`/api/rooms/${code}`, {
      headers: { "X-Player-Token": tokenA },
    });
    assertEq(snap.body?.room?.me?.slot, 0, "A is not seated in slot 0");
    return `room ${code}, ${snap.body.room.players.length} players`;
  });

  // In `next dev` the FIRST stream open after the route is compiled loses the
  // ticket: compiling the stream route rebuilds the module instance holding
  // tickets.js's Map, so the ticket the already-compiled ticket route minted is
  // not in the Map the stream route reads. Compile it first with a bare
  // (spectator) open, then mint. It does not happen in a production build, and
  // after this fix it is a loud 403 with a one-retry recovery either way.
  await openStream(`/api/rooms/${code}/stream`).catch(() => null);

  // ANCHOR #2: the probe itself works. If a *fresh* ticket does not identify
  // its player, the 403s below would pass for entirely the wrong reason.
  const before = failures;
  await check("anchor: a fresh ticket opens an SSE stream as slot 0", async () => {
    const ticket = await mintTicket(code, tokenA);
    const res = await openStream(`/api/rooms/${code}/stream?ticket=${ticket}`);

    assertEq(res.status, 200, "a fresh ticket must be honoured");
    assert(
      res.contentType.includes("text/event-stream"),
      `expected an SSE stream, got ${res.contentType}`
    );
    assertEq(res.event, "sync", "first frame should be a sync");
    assertEq(res.data?.me?.slot, 0, "a fresh ticket did not identify its player");

    return "200 text/event-stream, me.slot 0";
  });

  if (failures !== before) {
    console.log(
      "        ^ the anchor failed: a freshly minted ticket does not redeem, so\n" +
        "          the refusals below would pass for the wrong reason. Stopping this game."
    );
    continue;
  }

  await check("a REPLAYED ticket is refused with 403 bad-ticket", async () => {
    const ticket = await mintTicket(code, tokenA);
    const first = await openStream(`/api/rooms/${code}/stream?ticket=${ticket}`);
    assertEq(first.status, 200, "the first use of a fresh ticket must work");

    const replay = await openStream(`/api/rooms/${code}/stream?ticket=${ticket}`);

    assertEq(replay.status, 403, "a replayed ticket must not open a stream");
    assertEq(replay.body?.error, "bad-ticket", "wrong error code");
    assert(
      !replay.contentType.includes("text/event-stream"),
      "no stream may be opened for a refused ticket"
    );
    return "403 bad-ticket";
  });

  await check("an unknown ticket is refused with 403 bad-ticket", async () => {
    // Expired, or lost when the process holding the Map restarted.
    const res = await openStream(
      `/api/rooms/${code}/stream?ticket=${randomUUID()}`
    );

    assertEq(res.status, 403, "an unknown ticket must not open a stream");
    assertEq(res.body?.error, "bad-ticket", "wrong error code");
    return "403 bad-ticket";
  });

  await check("no ticket at all is still the spectator path", async () => {
    // The regression this fix must not cause: a bare open is a spectator, not
    // a refused player, and it has to keep working.
    const res = await openStream(`/api/rooms/${code}/stream`);

    assertEq(res.status, 200, "a bare stream open must still work");
    assert(
      res.contentType.includes("text/event-stream"),
      `expected an SSE stream, got ${res.contentType}`
    );
    assertEq(res.data?.me ?? null, null, "a spectator must have no seat");
    return "200 text/event-stream, me: null";
  });

  await check("POST /ticket with no token is 400 bad-token", async () => {
    const res = await api(`/api/rooms/${code}/ticket`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    assertEq(res.status, 400, "a tokenless ticket request must be refused");
    assertEq(res.body?.error, "bad-token", "wrong error code");
    return "400 bad-token";
  });
}

console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check${failures === 1 ? "" : "s"} FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
