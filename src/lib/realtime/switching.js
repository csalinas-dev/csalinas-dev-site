import { LEFT, absenceOf } from "./absence";
import { HOST_SLOT } from "./constants";
import { toArray } from "./players";
import { listGames, lookupGame } from "./registry";

// Whether a room may change which game it is playing, and to what.
//
// THE ONE STATEMENT OF THE OFFER RULE. The server asks this before it rewrites
// `GameRoom.game`, and the picker asks it before it draws a tile. Two copies is
// how a button ends up offering a game the server refuses, so nothing else in
// the codebase may restate `activeCount <= maxPlayers`.
//
// Client-safe and free of game rules: this lives in the core, so it knows only
// what `games.js` already says about a definition (`id`, `maxPlayers`) and what
// `absence.js` already says about a seat. No presentation, no JSX, no `window`.

/**
 * The people still at the table.
 *
 * AWAY COUNTS AS ACTIVE, deliberately. A locked phone is measured in seconds,
 * and handing somebody's seat away while they read a text is the wrong trade —
 * so only LEFT (they meant it, or the host cleared the seat) is discounted.
 * Somebody will try to "fix" this by counting `connected` too; do not.
 *
 * Spectators hold no seat and are therefore never in `players` to begin with.
 */
export const activeSeats = (players) =>
  toArray(players).filter((player) => absenceOf(player) !== LEFT);

/**
 * Does everybody here fit in that game?
 *
 * `minPlayers` is DELIBERATELY NOT CONSULTED. Falling short of the minimum is
 * not a reason to hide a game — it is the state the destination's own `status`
 * already renders as a waiting screen, and it is exactly what a freshly created
 * room shows too. A room with one person in it is precisely when somebody is
 * most likely to want a different game.
 */
export const fitsGame = (def, players) =>
  activeSeats(players).length <= def.maxPlayers;

/**
 * Every game this room could become, as registry definitions in registry order.
 * No presentation data — that join happens in app-land, not here.
 *
 * @param {object} room a room payload (`{ game, players }`)
 */
export const switchTargets = (room) =>
  listGames()
    .map((id) => lookupGame(id))
    .filter((def) => def && def.id !== room?.game && fitsGame(def, room?.players));

/**
 * May this seat change the game right now? `null` means yes; anything else is
 * the reason, and it is the same string the server turns into an error code.
 *
 * Whoever may start the next game may choose which game it is: in a lobby that
 * is the host, and once a board has finished it is any seated player. Mid-board
 * nobody may, because the switch discards a game somebody else is still playing.
 *
 * @param {object} room a room payload, or anything carrying `status`
 * @param {?object} seat the asking player's seat (`room.me` on the client)
 */
export const switchRefusal = (room, seat) => {
  if (!seat) return "not-a-player";
  if (room?.status === "playing") return "in-progress";
  if (room?.status === "lobby" && seat.slot !== HOST_SLOT) return "not-host";
  return null;
};

/** Client sugar: is there a control to draw at all? */
export const canSwitch = (room) =>
  Boolean(room) &&
  switchRefusal(room, room.me) === null &&
  switchTargets(room).length > 0;
