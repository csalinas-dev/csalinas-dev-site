import { lookupGame } from "@/lib/realtime/registry";
import { switchTargets } from "@/lib/realtime/switching";

import { GAMES } from "../../games";

// The join, and the only place app-land presentation meets the realtime
// registry. They are two different lists on purpose: `GAMES` is everything the
// /games index draws (Wordleverse and Hashtag have no room behind them at all),
// and the registry is everything that can be played in one. A room can only
// ever become something in the second list, so the join is driven from there.

// The registry id is not the route slug — `tto` lives at /games/tic-tac-overflow
// — and confusing the two produces either a 404 or a `wrong-game` 400.
const REGISTRY_TO_SLUG = {
  tto: "tic-tac-overflow",
  "edge-case": "edge-case",
  "connect-404": "connect-404",
  "race-condition": "race-condition",
};

/** "2 players", or "2–4 players" when the game takes a range. En dash. */
export const capacityLabel = (def) =>
  def.minPlayers === def.maxPlayers
    ? `${def.maxPlayers} players`
    : `${def.minPlayers}–${def.maxPlayers} players`;

/**
 * Everything the picker and the interstitial need to draw a game: its name, its
 * route, its board artwork and how many play.
 *
 * Returns null for an id with no entry in either list rather than throwing, so
 * adding a game to the registry and forgetting the map above degrades to "not
 * offered" instead of taking a lobby down.
 *
 * @param {string} id a registry id (`GameRoom.game`)
 */
export const presentation = (id) => {
  const def = lookupGame(id);
  const slug = REGISTRY_TO_SLUG[id];
  if (!def || !slug) return null;

  const entry = GAMES.find((game) => game.slug === slug);
  if (!entry) return null;

  return {
    id,
    title: entry.title,
    href: entry.href,
    Artwork: entry.Artwork,
    minPlayers: def.minPlayers,
    maxPlayers: def.maxPlayers,
    capacity: capacityLabel(def),
  };
};

/**
 * The games this room may switch to, ready to render. The filter itself is
 * `switchTargets` in the core and is never restated here — all this adds is the
 * artwork and the route.
 */
export const switchOptions = (room) =>
  switchTargets(room)
    .map((def) => presentation(def.id))
    .filter(Boolean);
