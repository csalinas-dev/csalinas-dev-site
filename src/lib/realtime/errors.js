// Every failure the room layer can produce, as one throwable that a route
// handler turns into a response without a switch statement of its own.
//
// The wire shape is always `{ error, message, room? }`. `room` is present
// whenever the client's copy of the world is stale (409) or its action was
// rejected (422) — in both cases it needs the authoritative snapshot to
// re-render, and making it ask for one in a second request is a round trip
// spent proving something we already knew.

export class RoomError extends Error {
  constructor(code, message, status, { room } = {}) {
    super(message);
    this.name = "RoomError";
    this.code = code;
    this.status = status;
    this.room = room ?? null;
  }
}

/** Missing, expired, or swept. Terminal — the UI must offer a new game. */
export const gone = () =>
  new RoomError("gone", "This room no longer exists.", 410);

export const badRequest = (message, code = "bad-request") =>
  new RoomError(code, message, 400);

/** The token presented is not seated in this room. */
export const notAPlayer = () =>
  new RoomError(
    "not-a-player",
    "You are not a player in this room.",
    403,
  );

/**
 * A stream ticket that was presented but could not be redeemed — replayed,
 * expired, or lost when the process holding the Map restarted.
 *
 * This refuses the connection rather than downgrading it to an anonymous one.
 * Serving the stream without a token looks harmless (it is exactly the
 * spectator path) but it is the opposite: every payload then reports
 * `me: null` to a player who is genuinely seated, the board goes dead, and
 * because the stream opened with a 200 nothing on the client ever notices —
 * `onerror` does not fire, so the polling fallback that would have fixed it
 * never engages. `subscribeRoom` with no token also makes `markPresent` a
 * no-op, so everyone else watches that player go away. A loud 403 costs one
 * retry with a fresh ticket; the quiet 200 costs the seat.
 */
export const badTicket = () =>
  new RoomError(
    "bad-ticket",
    "This stream link is no longer valid — reconnect to get a new one.",
    403,
  );

export const roomFull = () =>
  new RoomError("room-full", "This room is full.", 403);

export const inProgress = () =>
  new RoomError(
    "room-in-progress",
    "This game has already started.",
    403,
  );

/** Client acted on a revision that is no longer current. */
export const staleRevision = (room) =>
  new RoomError(
    "stale-revision",
    "The board moved on — try again.",
    409,
    { room },
  );

/** The game's reducer refused the action (not your turn, illegal move, ...). */
export const rejected = (message, room) =>
  new RoomError("rejected", message || "That move is not allowed.", 422, {
    room,
  });

export const unknownGame = (game) =>
  new RoomError("unknown-game", `Unknown game "${game}".`, 400);

/** Turn any thrown value into the JSON response the client contract expects. */
export function toResponse(err) {
  const known = err instanceof RoomError;
  if (!known) console.error("[realtime]", err);

  const status = known ? err.status : 500;
  const body = {
    error: known ? err.code : "server-error",
    message: known ? err.message : "Something went wrong.",
  };
  if (known && err.room) body.room = err.room;

  return Response.json(body, { status });
}
