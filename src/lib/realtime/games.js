import { ROOM_STATUSES } from "./constants";

// The one seam between this layer and the games that ride on it.
//
// A game definition is plain data plus pure functions. Nothing here may touch
// the network, the database, `window`, or the clock: the same definition runs
// on the server (authoritative) and in the browser (optimistic rendering), and
// the two have to agree exactly or the optimistic copy will drift.
//
// Register in registry.js — never call `registerGame` from a module that also
// pulls in React components, or a game's UI ends up in the API route's bundle.
//
//   {
//     id:          "tto",                      // matches GameRoom.game
//     maxPlayers:  2,
//     minPlayers:  2,                          // default: maxPlayers
//     colors:      ["blue", "purple"],         // offered in seat order
//     allowLateJoin: false,                    // may a 3rd player sit down mid-game?
//     createState({ options }) -> state        // opaque initial state
//     reducer(state, action, player) -> { state, error? }
//     status?(state, players) -> "lobby" | "playing" | "over"
//     onPlayersChanged?(state, players) -> state
//   }
//
// `player` is the *sanitized* player — it has no token. That is deliberate: a
// reducer cannot leak a credential it was never handed.

const registry = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(`[realtime] invalid game definition: ${message}`);
}

/**
 * Validate a definition and fill in its defaults. Called by `registerGame`, and
 * exported so a game module can define itself in isolation (and be unit tested)
 * without touching the global registry.
 */
export function defineGame(def) {
  assert(def && typeof def === "object", "expected an object");
  assert(typeof def.id === "string" && def.id, "`id` must be a non-empty string");
  assert(
    Number.isInteger(def.maxPlayers) && def.maxPlayers > 0,
    `${def.id}: \`maxPlayers\` must be a positive integer`,
  );
  assert(
    typeof def.createState === "function",
    `${def.id}: \`createState\` must be a function`,
  );
  assert(
    typeof def.reducer === "function",
    `${def.id}: \`reducer\` must be a function`,
  );

  const minPlayers = def.minPlayers ?? def.maxPlayers;
  assert(
    Number.isInteger(minPlayers) && minPlayers > 0 && minPlayers <= def.maxPlayers,
    `${def.id}: \`minPlayers\` must be between 1 and maxPlayers`,
  );

  return {
    colors: [],
    allowLateJoin: false,
    ...def,
    minPlayers,
  };
}

export function registerGame(def) {
  const game = defineGame(def);
  registry.set(game.id, game);
  return game;
}

/** @returns the definition, or undefined when nothing claims that id. */
export function lookupGame(id) {
  return typeof id === "string" ? registry.get(id) : undefined;
}

export function listGames() {
  return [...registry.keys()];
}

/**
 * A room's status is derived, never stored by the game itself — the core writes
 * whatever this returns to `GameRoom.status`. Games that need something richer
 * than "enough players have shown up" implement `status`; the rest get the
 * obvious default. An out-of-range answer falls through to the default rather
 * than writing garbage the polling clients would have to interpret.
 */
export function resolveStatus(def, state, players) {
  if (typeof def.status === "function") {
    const status = def.status(state, players);
    if (ROOM_STATUSES.includes(status)) return status;
  }
  return players.length >= def.minPlayers ? "playing" : "lobby";
}
