// Tunables shared by the server and the client hook.
//
// This module must stay dependency-free: `useRoom` pulls from it, so anything
// imported here ends up in the browser bundle.

// No I, L, O, 0 or 1 — codes get read aloud across a room or squinted at on a
// TV, and those five are the pairs people get wrong. 31^4 ≈ 923k codes, plenty
// for the handful of rooms that are ever live at once.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;

// Insert-and-retry on collision. Five is far more than the birthday math needs;
// it exists so a pathological run fails loudly instead of looping forever.
export const CODE_ATTEMPTS = 5;

// A room dies an hour after its last *accepted action*. Deliberately not its
// last connection: a tab left open overnight should not keep a dead game alive.
export const ROOM_TTL_MS = 60 * 60 * 1000;

// How often a request may trigger the opportunistic bulk sweep of dead rooms.
// There is no cron; expiry rides along on traffic (see rooms.js `maybeSweep`).
export const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// Server-side: how often an open SSE stream re-reads its room looking for a new
// revision. One timer per *room*, not per connection — see watch.js.
export const STREAM_POLL_MS = 1000;

// Proxies reap idle connections; a comment line every 20s keeps them honest.
export const STREAM_HEARTBEAT_MS = 20_000;

// Client-side: after SSE has failed this many times in a row, stop fighting it
// and poll GET /api/rooms/[code] instead.
export const SSE_FAILURES_BEFORE_POLLING = 3;
export const SSE_RETRY_BASE_MS = 1000;
export const SSE_RETRY_MAX_MS = 15_000;
export const POLL_FALLBACK_MS = 2000;

// One token per browser, shared by every game on the site.
export const PLAYER_TOKEN_KEY = "CSALINAS-PLAYER-TOKEN";

export const ROOM_STATUSES = ["lobby", "playing", "over"];
