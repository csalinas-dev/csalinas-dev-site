# Realtime rooms

Game-agnostic multiplayer rooms: 4-character codes, revision-based concurrency,
SSE with a polling fallback, and an hour of idle before a room evaporates.

**No game rules live in this directory.** The core knows a room has `state`; it
has no idea whether that state is a tic-tac-toe board or a dots-and-boxes grid.

## The one thing that will bite you

`state` and `players` are **MySQL JSON columns, and MySQL does not preserve
object key order.** Verified against a real database: `{board, history, turn,
slots, nested, edges}` comes back as `{turn, board, edges, slots, nested,
history}`. Array order is preserved perfectly — it is only the key order of
plain objects that changes.

So: **never derive ordering from `Object.keys` / `Object.entries` /
`Object.values` / `for…in` over anything stored in a room.** Turn order, seat
order, scoreboard order — every ordered collection must be a real array.
Edge Case carries `state.slots` for exactly this reason.

This is a nasty bug class because it needs a database round-trip to appear: it
passes every local hotseat test and only scrambles ordering in online games.

## Adding a game

1. Write a definition in a **pure** module next to the game — no JSX imports, it
   runs on the server and in the browser:

   ```js
   // src/app/(pages)/games/edge-case/multiplayer.js
   //
   // Name this file `multiplayer.js`, not `game.js`. Games in this repo already
   // have a `Game.jsx`, and on case-insensitive filesystems (Windows, default
   // macOS) `./Game` and `./game` resolve to the same module — webpack flags it
   // as a real casing collision.
   export const edgeCase = {
     id: "edge-case",                  // matches GameRoom.game
     maxPlayers: 4,
     minPlayers: 2,
     colors: ["blue", "purple", "orange", "green"],
     allowLateJoin: false,

     createState: ({ options }) => ({ /* ... */ }),

     // Pure. No I/O, no Date.now(), no Math.random() — the server and the
     // client's optimistic copy both run this and have to agree exactly.
     reducer: (state, action, player) => {
       if (state.turn !== player.slot) return { error: "Not your turn." };
       return { state: next };
     },

     // Optional. Default: "playing" once minPlayers have joined.
     status: (state, players) => (state.winner ? "over" : "playing"),

     // Optional. Resize anything per-player when someone sits down.
     onPlayersChanged: (state, players) => ({ ...state, scores: ... }),
   };
   ```

2. Register it in [`registry.js`](./registry.js) — one import, one line.

That is the entire seam. Nothing else in `src/lib/realtime` changes.

### Reducer contract

`(state, action, player) => { state } | { error }`

- `player` is the **sanitized** player (`{ slot, name, color, connectedAt,
  lastSeenAt }`). It has no token, by construction, and it is resolved from the
  token on the request — never from anything the client claimed.
- Returning `{ error: "..." }` rejects the action: the client gets **422** with
  the message and the unchanged room.
- `state` must be JSON-serializable; it goes straight into a MySQL JSON column.
- Treat `state` as immutable. The core clones before calling you, so a mutation
  will not corrupt the database, but it *will* desync the optimistic copy.

## HTTP contract

Every response body is `{ room }` on success and
`{ error, message, room? }` on failure. `room` is the payload shape below.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/rooms` | `{ game, token?, name?, color?, options? }` | -> `201 { code, slot, token, room }` |
| `POST` | `/api/rooms/[code]/join` | `{ token, game?, name?, color? }` | join **and** rejoin |
| `POST` | `/api/rooms/[code]/action` | `{ token, revision, action }` | the only way `state` changes |
| `GET` | `/api/rooms/[code]?token=` | — | snapshot; also the polling fallback |
| `GET` | `/api/rooms/[code]/stream?token=` | — | SSE: `sync`, `gone`, `:` heartbeats |

### Status codes

| Code | `error` | Means |
| --- | --- | --- |
| 400 | `bad-request`, `bad-token`, `wrong-game`, `unknown-game` | malformed request |
| 403 | `not-a-player` | that token holds no seat here |
| 403 | `room-full`, `room-in-progress` | no seat available — **spectate instead** |
| 409 | `stale-revision` | board moved on; `room` is attached, re-render and retry |
| 410 | `gone` | expired, deleted, or never existed — **terminal** |
| 422 | `rejected` | the game's reducer refused; `room` is attached |
| 429 | `rate-limited` | back off, `Retry-After` in seconds |

410 is a different conversation with the user than a dropped socket. Show
"connection lost — create a new game to play again", not a spinner.

### Room payload

```js
{
  code, game, status,      // "lobby" | "playing" | "over"
  revision,                // integer, bumped on every accepted mutation
  state,                   // your game's opaque state
  players: [{ slot, name, color, connectedAt, lastSeenAt }],
  me: { ... } | null,      // the caller's own seat, resolved from their token
  updatedAt, expiresAt,    // ISO; expiresAt = last action + 60 min
}
```

**A player's `token` is never in a payload.** `publicPlayer` in
[`players.js`](./players.js) is an allow-list and the only exit; `roomPayload`
in [`serialize.js`](./serialize.js) is its only caller; `rooms.js` returns
nothing else. If you are reading `room.players` off a Prisma row in a route
handler, stop — you are one `JSON.stringify` from handing a browser somebody
else's credential.

## Identity and authorization

One `crypto.randomUUID()` per browser, in `localStorage` under
`CSALINAS-PLAYER-TOKEN`, shared by every game on the site. It is sent on every
request and **it is the authorization**: the server looks up which seat presented
the token and hands that player to the reducer. There is no `slot` or `playerId`
in any request body, so there is nothing to forge.

Rejoin falls out of this for free — same token, same seat, board resumes. A
refresh, a locked phone, or a redeploy costs one round trip.

## Concurrency

Actions carry the revision the client last rendered. The write is a single
conditional `UPDATE ... WHERE code = ? AND revision = ?`, so two moves that cross
in flight cannot both land: one wins, the other gets 409 with the state it
missed. Never read-then-write.

## Transport

SSE (`EventSource`) with exponential backoff; after three consecutive failures
the client gives up on streaming and polls `GET /api/rooms/[code]` every 2s for
the rest of the session. Both feed the same monotonic-revision guard, so they can
race freely.

Server-side there is one poll loop **per room**, not per connection
([`watch.js`](./watch.js)) — five people watching one board is one query a
second, and the interval is cleared when the last listener leaves.

Streams never write to the database. That is deliberate: expiry is measured from
the last *accepted action*, so a tab left open overnight does not keep a
finished game alive.

`X-Accel-Buffering: no` on the stream response is load-bearing — nginx buffers
SSE into uselessness without it.

## Expiry

60 minutes since the last accepted action. Enforced on every read (an expired row
is deleted on sight and answers 410) and, cheaply, by a bulk sweep that runs at
most once every 5 minutes on whatever request happens to trigger it. No cron.

## Client hook

```js
const {
  state, players, me, status, revision,
  connected, error, spectating, transport,
  send, refresh,
} = useRoom({ code, game, name, color, spectate });

await send({ type: "PLACE", cell: 4 }, { optimistic: true });
```

- `error` is connection/room level (`gone`, `connect-failed`). A rejected move
  comes back from `send`, not from here.
- `send` never auto-retries a 409 — it applies the fresh state and returns
  `{ ok: false, error: "stale-revision" }`. Whether the move still makes sense
  against the new board is a question only the game can answer.
- `optimistic: true` runs your own reducer locally first. The preview keeps the
  current revision, so the server's answer always wins.
- `spectate: true` watches without taking a seat. A join that comes back
  `room-full` or `room-in-progress` degrades to spectating automatically and
  sets `spectating`.
- `createRoom({ game, name, color })` (exported from `useRoom.js`) is the
  companion for a "create game" button.

## Local development

There is no MySQL in the repo's dev setup by default; `docker compose up db`
provides one. Apply the schema with `npx prisma db push`. In production the
deploy workflow runs `prisma db push --skip-generate` against the freshly built
image *before* the app serves traffic.
