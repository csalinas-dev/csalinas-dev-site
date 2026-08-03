import prisma from "@/lib/prisma";

import { generateCode, isValidCode, normalizeCode } from "./codes";
import {
  CODE_ATTEMPTS,
  HOST_SLOT,
  ROOM_TTL_MS,
  SWEEP_INTERVAL_MS,
} from "./constants";
import {
  badRequest,
  gone,
  inProgress,
  notAPlayer,
  rejected,
  RoomError,
  roomFull,
  staleRevision,
} from "./errors";
import { resolveStatus } from "./games";
import {
  assignColor,
  cleanName,
  findPlayer,
  nextSlot,
  publicPlayer,
  publicPlayers,
  toArray,
  touchPlayer,
} from "./players";
import { forgetRoom, markAbsent, markPresent } from "./presence";
import { getGame } from "./registry";
import { roomPayload } from "./serialize";
import { createRoomWatcher } from "./watch";

// The server side of a room. Every public function here returns a *payload*
// (serialize.js) — never a Prisma row — so a token cannot reach a client by
// somebody forgetting to strip it at a new call site.

// A token is opaque to us; we only insist it looks like something a browser
// minted rather than a probe. `crypto.randomUUID()` is 36 characters.
const TOKEN_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

function assertToken(token) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    throw badRequest("Missing or malformed player token.", "bad-token");
  }
  return token;
}

function assertCode(input) {
  const code = normalizeCode(input);
  // An unparseable code is indistinguishable from a code that has expired, and
  // 410 is the answer the UI already knows how to render ("create a new game").
  if (!isValidCode(code)) throw gone();
  return code;
}

export function isExpired(row, now = Date.now()) {
  if (!row?.updatedAt) return true;
  return now - new Date(row.updatedAt).getTime() >= ROOM_TTL_MS;
}

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

let lastSweepAt = 0;

/**
 * Bulk-delete dead rooms, at most once every SWEEP_INTERVAL_MS. Piggybacking on
 * traffic keeps this cron-free; the per-read check below is what actually
 * guarantees correctness, so a sweep that never runs only wastes disk.
 */
export function maybeSweep(now = Date.now()) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;

  // Deliberately not awaited: nobody's request should pay for housekeeping.
  prisma.gameRoom
    .deleteMany({ where: { updatedAt: { lt: new Date(now - ROOM_TTL_MS) } } })
    .catch((err) => console.error("[realtime] sweep failed", err?.message));
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Load a room that is still alive, or throw 410. Expired rows are deleted on
 * sight so a code can be recycled and so the sweep has less to do.
 */
async function loadLive(code) {
  maybeSweep();

  const row = await prisma.gameRoom.findUnique({ where: { code } });
  if (!row) throw gone();

  if (isExpired(row)) {
    prisma.gameRoom
      .delete({ where: { code } })
      .catch(() => {}); // already gone is the outcome we wanted
    throw gone();
  }

  return row;
}

/** Snapshot for `GET /api/rooms/[code]` and the polling fallback. */
export async function getRoom(rawCode, token) {
  const code = assertCode(rawCode);
  const row = await loadLive(code);
  // A snapshot read counts as a sign of life, so a client that has fallen back
  // to polling is not mistaken for one that walked away.
  if (token) markPresent(code, token);
  return roomPayload(row, token);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Compare-and-set on `revision`. This is a single conditional UPDATE, so two
 * players whose moves cross in flight cannot both win: MySQL applies one, and
 * the loser sees `count === 0` and gets a 409 with the state it missed.
 */
async function commit(code, expectedRevision, data) {
  const result = await prisma.gameRoom.updateMany({
    where: { code, revision: expectedRevision },
    data: { ...data, revision: expectedRevision + 1 },
  });
  return result.count === 1;
}

/**
 * Create a room and seat its creator.
 *
 * The token is optional: a brand-new browser has nothing in localStorage yet,
 * so we mint one and hand it back. Callers that already have a token must send
 * it — one token per browser is what makes rejoin work across both games.
 */
export async function createRoom({ game, token, name, color, options } = {}) {
  const def = getGame(game);
  const playerToken = token ? assertToken(token) : crypto.randomUUID();

  const now = new Date().toISOString();
  const player = {
    token: playerToken,
    slot: 0,
    name: cleanName(name, 0),
    color: assignColor([], def.colors, color),
    connectedAt: now,
    lastSeenAt: now,
  };
  const players = [player];

  let state = def.createState({ options, players: publicPlayers(players) });
  if (typeof def.onPlayersChanged === "function") {
    state = def.onPlayersChanged(state, publicPlayers(players));
  }

  const data = {
    game: def.id,
    state,
    players,
    revision: 0,
    status: resolveStatus(def, state, publicPlayers(players)),
  };

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    try {
      const row = await prisma.gameRoom.create({
        data: { ...data, code: generateCode() },
      });
      return { room: roomPayload(row, playerToken), token: playerToken };
    } catch (err) {
      // P2002 = unique constraint. Any other failure is not a collision and
      // retrying it would just be a slower way to fail.
      if (err?.code !== "P2002") throw err;
    }
  }

  throw new RoomError(
    "code-exhausted",
    "Could not allocate a room code. Try again.",
    503,
  );
}

/**
 * Join, or rejoin after a disconnect — the same call. A token already seated in
 * the room resumes its slot and its colour, which is why a refresh, a tunnel, or
 * a phone locking itself costs nothing but the round trip.
 */
export async function joinRoom(rawCode, { token, game, name, color } = {}) {
  const code = assertCode(rawCode);
  const playerToken = assertToken(token);

  // Sitting down is a sign of life, so the lobby does not show a player as
  // disconnected for the second or two before their stream opens.
  markPresent(code, playerToken);

  // Retry the read-modify-write: unlike an action, a join carries no revision
  // from the client, so a race with another player sitting down at the same
  // instant is ordinary rather than an error to report.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await loadLive(code);

    if (game && row.game !== game) {
      throw badRequest(
        `Room ${code} is playing a different game.`,
        "wrong-game",
      );
    }

    const def = getGame(row.game);
    const existing = findPlayer(row.players, playerToken);

    let players;
    let state = row.state;

    if (existing) {
      // Rejoin. Name and colour may still be edited in the lobby; once play has
      // started, changing them mid-game would be confusing at best.
      const editable = row.status === "lobby";
      const others = toArray(row.players).filter((p) => p !== existing);
      players = toArray(row.players).map((p) =>
        p !== existing
          ? p
          : {
              ...p,
              name: name === undefined || !editable ? p.name : cleanName(name, p.slot),
              color:
                color === undefined || !editable
                  ? p.color
                  : assignColor(others, def.colors, color),
              lastSeenAt: new Date().toISOString(),
            },
      );
    } else {
      if (toArray(row.players).length >= def.maxPlayers) throw roomFull();
      if (row.status !== "lobby" && !def.allowLateJoin) throw inProgress();

      const slot = nextSlot(row.players, def.maxPlayers);
      if (slot === null) throw roomFull();

      const now = new Date().toISOString();
      players = [
        ...toArray(row.players),
        {
          token: playerToken,
          slot,
          name: cleanName(name, slot),
          color: assignColor(row.players, def.colors, color),
          connectedAt: now,
          lastSeenAt: now,
        },
      ];

      // Let the game resize anything that is per-player (scores, turn order)
      // before the new seat is visible to anyone.
      if (typeof def.onPlayersChanged === "function") {
        state = def.onPlayersChanged(structuredClone(row.state), publicPlayers(players));
      }
    }

    const status = resolveStatus(def, state, publicPlayers(players));
    const ok = await commit(code, row.revision, { state, players, status });
    if (ok) {
      return roomPayload(
        { ...row, state, players, status, revision: row.revision + 1, updatedAt: new Date() },
        playerToken,
      );
    }
  }

  // Three losses in a row means something is hammering this room; a 409 tells
  // the client to re-read and decide for itself rather than looping here.
  throw staleRevision(await getRoom(code, playerToken));
}

/**
 * Give up a seat, or take somebody else's away.
 *
 * `token` is who is asking. `slot` is optional and names somebody else — only
 * the host (slot 0) may pass it, and only while the room is still in the lobby.
 * That is the "kick" half: a player who joined from a second device, or whose
 * identity was lost before the cookie fallback existed, leaves a seat nobody
 * can reclaim, and somebody has to be able to clear it.
 *
 * Removing a player is deliberately a lobby-and-leave operation rather than a
 * general one: pulling a seat out from under a game in progress would renumber
 * turn order mid-play. Once the game starts, leaving marks you gone (the seat
 * stays, so the board still makes sense) instead of deleting you.
 */
export async function leaveRoom(rawCode, { token, slot } = {}) {
  const code = assertCode(rawCode);
  const playerToken = assertToken(token);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await loadLive(code);
    const asking = findPlayer(row.players, playerToken);
    if (!asking) throw notAPlayer();

    const targetSlot = slot === undefined ? asking.slot : slot;

    if (targetSlot !== asking.slot) {
      if (asking.slot !== HOST_SLOT) {
        throw badRequest("Only the host can remove another player.", "not-host");
      }
      if (row.status !== "lobby") {
        throw badRequest(
          "Players can only be removed before the game starts.",
          "in-progress",
        );
      }
    }

    const target = toArray(row.players).find((p) => p.slot === targetSlot);
    if (!target) throw notAPlayer();

    const def = getGame(row.game);
    let players;
    let state = row.state;

    if (row.status === "lobby") {
      // Nothing has been played, so the seat can simply go.
      players = toArray(row.players).filter((p) => p.slot !== targetSlot);
      if (typeof def.onPlayersChanged === "function") {
        state = def.onPlayersChanged(
          structuredClone(row.state),
          publicPlayers(players),
        );
      }
    } else {
      // Mid-game: keep the seat so the board and turn order still make sense,
      // and mark it gone so everyone else can be told.
      players = toArray(row.players).map((p) =>
        p.slot === targetSlot
          ? { ...p, left: true, lastSeenAt: new Date().toISOString() }
          : p,
      );
    }

    const status = resolveStatus(def, state, publicPlayers(players));
    const ok = await commit(code, row.revision, { state, players, status });
    if (ok) {
      return roomPayload(
        {
          ...row,
          state,
          players,
          status,
          revision: row.revision + 1,
          updatedAt: new Date(),
        },
        playerToken,
      );
    }
  }

  throw staleRevision(await getRoom(code, playerToken));
}

/**
 * Apply a game action. This is the only path that can change `state`.
 *
 * Authorization is the token and nothing else: we look up which seat presented
 * it and hand *that* player to the reducer. A request body cannot claim a slot,
 * so "it's not your turn" is a rule the reducer enforces against a player the
 * client had no say in choosing.
 */
export async function applyAction(rawCode, { token, revision, action, game } = {}) {
  const code = assertCode(rawCode);
  const playerToken = assertToken(token);

  if (!Number.isInteger(revision) || revision < 0) {
    throw badRequest("`revision` must be a non-negative integer.");
  }
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw badRequest("`action` must be an object.");
  }

  const row = await loadLive(code);
  if (game && row.game !== game) {
    throw badRequest(`Room ${code} is playing a different game.`, "wrong-game");
  }

  const player = findPlayer(row.players, playerToken);
  if (!player) throw notAPlayer();

  // Making a move is the strongest sign of life there is.
  markPresent(code, playerToken);

  if (row.revision !== revision) {
    throw staleRevision(roomPayload(row, playerToken));
  }

  const def = getGame(row.game);

  // Clone before handing the state over. Reducers are pure by contract, but a
  // reducer that mutates in place would otherwise corrupt the snapshot we send
  // back when it rejects the action — the one moment the client most needs the
  // *pre-action* truth.
  const result = def.reducer(
    structuredClone(row.state),
    action,
    publicPlayer(player),
  );

  if (!result || typeof result !== "object") {
    throw rejected("The game did not respond.", roomPayload(row, playerToken));
  }
  if (result.error) {
    throw rejected(result.error, roomPayload(row, playerToken));
  }

  const players = touchPlayer(row.players, playerToken);
  const status = resolveStatus(def, result.state, publicPlayers(players));

  const ok = await commit(code, revision, { state: result.state, players, status });
  if (!ok) {
    // Somebody else's move landed between our read and our write.
    throw staleRevision(await getRoom(code, playerToken));
  }

  return roomPayload(
    {
      ...row,
      state: result.state,
      players,
      status,
      revision: revision + 1,
      updatedAt: new Date(),
    },
    playerToken,
  );
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

const watcher = createRoomWatcher({
  // Returning null means "gone" — the watcher tells its listeners and they
  // close. Expiry is applied here too so a stream cannot outlive its room.
  poll: async (code) => {
    const row = await prisma.gameRoom.findUnique({ where: { code } });
    if (!row || isExpired(row)) return null;
    return row;
  },
});

/**
 * Watch a room for the SSE route. Listeners receive payloads, never rows, so
 * the stream handler has no opportunity to leak a token.
 *
 * @returns {() => void} unsubscribe. Call it from the abort handler *and* from
 *   `cancel()` — it is idempotent, and a missed call leaks a poll loop.
 */
export function subscribeRoom(code, token, listener, since = null) {
  // Normalize defensively: the watcher keys its poll loops by code, and an
  // un-normalized one would both miss the row and split the loop in two.
  const key = normalizeCode(code);

  // An open stream is the strongest evidence a player is still there.
  markPresent(key, token);

  const unsubscribe = watcher.subscribe(
    key,
    (msg) => {
      if (msg.type === "gone") {
        forgetRoom(key);
        listener({ type: "gone" });
        return;
      }
      // Re-assert on every tick: presence entries expire on their own, so a
      // long-lived stream has to keep saying so.
      markPresent(key, token);
      listener({ type: "sync", room: roomPayload(msg.row, token) });
    },
    since,
  );

  return () => {
    markAbsent(key, token);
    unsubscribe();
  };
}

/** Exposed for the tests; counts rooms with a live poll interval. */
export const watchedRooms = () => watcher.size();
