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
