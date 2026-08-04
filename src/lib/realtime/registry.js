import { connect404 } from "@/app/(pages)/games/connect-404/multiplayer";
import { edgeCase } from "@/app/(pages)/games/edge-case/multiplayer";
import { ticTacOverflow } from "@/app/(pages)/games/tic-tac-overflow/multiplayer";

import { lookupGame, registerGame } from "./games";
import { unknownGame } from "./errors";

// Where games plug in. Everything else imports `getGame` from *this* module,
// never from games.js — a value import guarantees the registrations below have
// run before the first lookup, which a bare side-effect import would not.
//
// To add a game:
//   1. Put its definition in a pure module next to the game (no JSX imports).
//   2. `import { edgeCase } from "@/app/(pages)/games/edge-case/multiplayer";`
//   3. Add it to the list below.
//
// See games.js for the shape, and README.md for the contract.

const GAMES = [
  ticTacOverflow, // "tto"       -> #88
  edgeCase, //       "edge-case" -> #89
  connect404, //     "connect-404" -> #111
];

for (const def of GAMES) registerGame(def);

/** Look up a game definition or throw the 400 the routes already know how to render. */
export function getGame(id) {
  const def = lookupGame(id);
  if (!def) throw unknownGame(id);
  return def;
}

export { lookupGame, listGames } from "./games";
