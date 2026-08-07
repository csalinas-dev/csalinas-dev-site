# csalinas.dev — Claude Code Guide

## Project Overview

Next.js 15 (App Router) personal portfolio site for Christopher Salinas Jr. Includes blog posts, games, and other pages. The main game is **Wordleverse**, a Wordle clone with user auth and gameplay history.

## Tech Stack

- **Framework**: Next.js 15 + React 19 (App Router; codebase is primarily `.js`/`.jsx`, with TypeScript included as a devDependency)
- **UI**: Material-UI (MUI) v6 + Emotion
- **Auth**: NextAuth v4 (JWT sessions, credentials + OAuth)
- **ORM**: Prisma with MySQL
- **Email**: Nodemailer (SMTP)
- **State**: React Context + Reducer

## Key Path Aliases (jsconfig.json)

- `@/` → `src/`
- `@wordleverse/*` → `src/app/(pages)/games/wordleverse/(game)/*`
- `@wordleverse-history/*` → `src/app/(pages)/games/wordleverse/history/*`

## Environment Variables Required

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
EMAIL_SERVER_HOST / EMAIL_SERVER_PORT / EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD
EMAIL_FROM
RECAPTCHA_SECRET_KEY
GITHUB_STATS_TOKEN          # GitHub PAT (classic: read:user + repo) for the /api/github/* stat cards; enables private contribution counts
GITHUB_STATS_USERNAME       # optional; defaults to "csalinas-dev"
GITHUB_CARD_KEY             # shared secret required on /api/github/card requests; must match the ?key=... in the profile README <img>
GITHUB_CARD_RATE_LIMIT      # optional; requests/minute/IP for the card route (defaults to 30)
GAME_ROOM_RATE_LIMIT        # optional; room creations/minute/IP for POST /api/rooms (defaults to 10)
```

## Development

```bash
npm run dev      # start dev server on localhost:3000
npx prisma studio  # inspect DB
npx prisma db push # apply schema changes
```

## Important Patterns

- Server actions live in `_actions/` directories and begin with `"use server"`
- Client components that need server data call server actions directly (Next.js handles the RPC boundary)
- `sendVerificationEmail` lives in `src/lib/auth.js` — do not duplicate it elsewhere
- `getCurrentUser()` in `src/lib/auth.js` looks up the authenticated user by email from the session; all server actions use this to get `userId`
- The GitHub profile card is served from `src/app/api/github/card`. It renders the whole profile (hero intro + streak + stats/languages) as one themed SVG (VS Code palette) via `src/lib/github/{api,svg,palette}.js`. Consumed by the `csalinas-dev/csalinas-dev` profile repo as `<img src="https://csalinas.dev/api/github/card?key=...">`.
- The same card is embedded on this site's `/github` page as `<img src="/api/github/card">` (no key — the route allows same-origin requests).
- The card route is gated: requests must come from GitHub's Camo image proxy (`github-camo` User-Agent — README `<img>`s are proxied, never fetched by the viewer's browser, so there is no `Referer` to match on) **and** carry the `GITHUB_CARD_KEY` secret as `?key=`. Same-origin requests (the `/github` page) bypass both checks via `Sec-Fetch-Site`, falling back to a `Referer` host match. It is rate-limited in-memory (`src/lib/rate-limit.js`, 30 req/min/IP by default). Upstream GitHub GraphQL results are memoized with `unstable_cache` (60s) in `src/lib/github/api.js` (`getOverview`/`getStreak`) so the PAT is called at most once/minute regardless of request volume — this is what keeps `GITHUB_STATS_TOKEN` from being rate-limited. The route's response `Cache-Control` (consumed by GitHub's Camo proxy) is also 60s, so the rendered streak/stats stay near-live (subject to Camo's own internal minimum cache TTL).
- The card SVG must not use CSS animations that start from `opacity: 0`. It is displayed inside an `<img>` (both on `/github` and on the README), and Chrome rasterizes an SVG image at animation time 0 without advancing it — a fade-in leaves the animated content permanently invisible.
- The `/games` index is data-driven: `src/app/(pages)/games/games.js` is the manifest (`{ slug, title, href, Artwork }` per game, in display order) and `page.jsx` is one `.map` over it. Every tile is the same `GameCard` from `_components/GameCard.jsx` — the **card** owns the portrait `1 / 2` aspect ratio, the chrome and the title overlay, so an artwork never sets its own shape; artwork is authored as a square `viewBox="0 0 300 300"` (or an `<Image fill>`) in one module per game under `_artwork/`. The grid is a single `repeat(auto-fit, minmax(min(9rem, 100%), 1fr))` rule and the title is sized in container query units off the card, so adding a game means adding a manifest entry and an artwork file and touching no CSS.
- `/games/tic-tac-overflow` is a two-player tic-tac-toe variant in `src/app/(pages)/games/tic-tac-overflow/`. Each player keeps at most three marks (`MAX_MARKS`); placing a fourth clears **that player's** oldest one, tracked as a per-player queue in `state.history`. `TicTacOverflow.jsx` is the mode picker: **same device** is the original hotseat game (its own `useReducer`, zero network calls — the realtime core is not in that branch at all) and **online** is the same board driven by a room. `?room=CODE` deep-links into a room; the effect that reads it runs after mount because the page is prerendered.
- Both modes fill the *same* `context/index.jsx` Context — `{ state, dispatch, canPlay, canReset, online }` — so Cell, Status, Toolbar and Play Again are shared verbatim. `OnlineGame.jsx` fills it from `useRoom` instead of `useReducer` and translates the existing action creators into `send()`. `online` is null hotseat and carries the per-player view (your mark, opponent, room code, connection) when networked; `canPlay` closes the board on the opponent's turn and `canReset` makes "play again" a post-win rematch rather than a mid-game wipe.
- The multiplayer definition is `multiplayer.js` (id `tto`), registered in `src/lib/realtime/registry.js`. It **calls** the hotseat `placeMark` reducer rather than restating the expiry rule — one implementation, server-authoritative. It is named `multiplayer.js` and not the `game.js` the core's README suggests because `Game.jsx` sits beside it and webpack treats two modules differing only in case as a collision on Windows/macOS. Its `createState`/`PLAY AGAIN` go through `createBoard(first)`, which is also what seeds hotseat `defaultState` — and `PLAY AGAIN` passes the winner, which is how the winner opens the next game online while hotseat always opens with X.
- Online state deliberately omits `showExpiring`: the hint is a per-player display preference in `localStorage` (`TICTACOVERFLOW-PREVIEW`), merged into the context state client-side, so one player turning it off can never change what the other sees or how the rule runs.
- MySQL JSON columns do **not** preserve object key order, so nothing in a room's `state` may depend on it. TTO is safe because `board` and `history.X`/`history.O` are arrays (order intact) and `history` is only ever read by key; the turn is a mark string and a seat is `player.slot`, an integer.
- That hint (fading the mark the next move clears) is toggleable. `getExpiringCell` always reports the rule; `getPreviewedCell` is the display-level wrapper that returns `null` when the player has the hint off — read the latter in components, never the former, so turning the hint off can never alter play. The preference is restored in an effect after mount rather than seeding `defaultState`, because the page is prerendered and the first client render has to match the server's markup.
- `/games/edge-case` ("Edge Case" — Dots and Boxes) keeps **all** of its rules in `src/app/(pages)/games/edge-case/_lib/`. That module is pure, synchronous and dependency-free so the server and every client run it unchanged: `createState`, `drawEdge(state, { orientation, index }, slot) => { state, error? }`, `getResult` (ties are reported as ties, never broken), `reducer(state, action, player)` for the shared realtime core, plus the edge/box indexing helpers. The coordinate convention for `state.edges` and `state.owners` is documented at the top of `_lib/edges.js` — read it there rather than re-deriving it, and never re-implement a rule in a component.
- Edge Case's online half is `multiplayer.js` (id `edge-case`, registered in `src/lib/realtime/registry.js`) plus `online/`. The room's state wraps the engine — `{ phase: "lobby" | "playing", size, slots, game }` — so a room exists *before* a board does: `_lib/createState` needs two to four slots, and a lobby has neither. `slots` is an array in join order, maintained by `onPlayersChanged` (the reducer is only handed the one player who acted, never the roster), and it becomes the engine's turn order at `START`. `status` returns "lobby" until the host starts, which is what holds the door open for late arrivals and then shuts it — the core turns a newcomer away once status leaves "lobby", and `useRoom` degrades them to spectating.
- Only seat 0 (`HOST_SLOT`, the creator — nobody ever vacates a seat) may `SET SIZE` or `START`. Nothing can infer when everybody has arrived, so the host says so.
- Names and colours are seat data, not game state: they live on `GameRoom.players[]` and are edited by re-POSTing `/api/rooms/[code]/join` (`online/seat.js`), which the core allows while the room is in "lobby". That is what makes a colour lock live for everyone — `assignColor` refuses a colour someone holds and silently hands out a free one instead, so the UI must render the snapshot that comes back, never the colour it asked for. `createPlayers(slots, { names, colors })` in `players.js` turns those seats into the board's cast; `PLAYER_PALETTE[].choice` ("blue"/"purple"/"orange"/"green") is the wire name and `.color` the CSS variable.
- `Game.jsx` is shared by the hotseat game and the room. The context value carries `online`, null on one device and the per-player view otherwise, and `Game` reads exactly two things off it: `youSlot` (the seat this browser holds, resolved by the server from its token) and `interactive` (`youSlot === game.turn && !finished`). The turn banner names `game.turn`, never `youSlot` — online those are usually different people. Spectators are the same board with `interactive={false}`.
- `src/lib/qr.js` is a from-scratch QR encoder (byte mode, ECC level M, versions 1-10) used by the spectator view's join code. It exists because an image service is a third-party request from a page that makes none and would leak the room code; it is deliberately not a vendored library because encoding one short URL does not need four ECC levels and forty versions. The two arrays at the top are the only numbers the spec does not let you derive — everything else (module count, alignment positions, BCH format/version bits) is computed. Verified by decoding the rendered SVG back to its payload with an independently written reader.
- Font Awesome runs as a kit `<Script>` that replaces `<i>` elements with `<svg>` in the DOM. Any `<i>` React might later unmount (a conditionally rendered icon) must sit inside a wrapper element React owns, or the unmount throws `NotFoundError: Failed to execute 'removeChild'`.
- `src/lib/realtime/` is the shared multiplayer core for every networked game (`/api/rooms/*`, `useRoom()`, the `GameRoom` Prisma model). It is deliberately game-agnostic: a game plugs in a pure `{ id, maxPlayers, colors, createState, reducer }` definition registered in `src/lib/realtime/registry.js`, and **no game rules ever live under `src/lib/realtime/`**. Identity is one `crypto.randomUUID()` per browser in `localStorage` under `CSALINAS-PLAYER-TOKEN`; that token *is* the authorization (the server resolves which seat sent it — request bodies never name a slot), which is also what makes rejoin-after-disconnect free. **It never appears in a URL** — POST bodies carry it, the snapshot route reads an `X-Player-Token` header, and the SSE stream (where `EventSource` cannot set headers) takes a single-use ~30s ticket from `src/lib/realtime/tickets.js` instead, so nothing that reaches a proxy access log can be replayed. Tokens are stripped in exactly one place (`publicPlayer` in `players.js`, called only by `roomPayload` in `serialize.js`) — never serialize a raw `GameRoom` row. Mutations are optimistically concurrent: an action carries the revision the client last saw and the write is a conditional `UPDATE ... WHERE revision = ?`, so a loser gets 410/409/422 with the authoritative room attached. Rooms expire 60 minutes after their last accepted action and answer **410 Gone** thereafter. Full contract in `src/lib/realtime/README.md`.
- Two independent facts say somebody is not at the table, and they are never interchangeable: `player.left` (deliberate — they gave up the seat, or the host removed them) and `player.connected` (a stream, snapshot, join or move has been heard from them inside `PRESENCE_STALE_MS`). `src/lib/realtime/absence.js` is the one place that reads them and the one place their wording lives; components call `absenceOf`/`absenceTag`/`absenceSentence` rather than testing the flags, so a dropped phone never gets a disconnected player's sentence. Presence is in-memory (`presence.js`) rather than on the row, which has a consequence: it does **not** move the revision, so the watcher cannot notice it — `subscribeRoom` runs its own `PRESENCE_POLL_MS` timer that both re-asserts this stream's own presence and re-publishes the payload when the room's roster of live tokens changes. Without that timer a quiet lobby counts everybody out at 45s and a real disconnect never reaches a single screen.
- Leaving is `POST /api/rooms/[code]/leave` (`useRoom().leave(slot?)`). Omit `slot` for your own seat; pass one to remove somebody else, which is host-only and lobby-only and enforced on the server whatever the UI shows. In the lobby the seat is deleted; mid-game it stays (the board and turn order still have to make sense) and is flagged `left`. `useRoom` also fires a `sendBeacon` leave on `pagehide` — which fires on a *reload* as well as a closed tab, so `joinRoom` clears `left` on rejoin; without that a refresh would tell the room you had walked out.
- Schema changes reach production through the `Apply Prisma schema` step in `.github/workflows/deploy.yml` (`docker compose build` → `db push --skip-generate` → `up -d`). It intentionally omits `--accept-data-loss` so a destructive change fails the deploy instead of dropping a table.
- `src/lib/github/font.js` embeds the Sono latin variable woff2 as a base64 data URI; `svg.js` injects it as an `@font-face` so cards render in Sono inside GitHub's `<img>` sandbox (external fonts can't load there). Regenerate by re-downloading the latin woff2 from the Google Fonts css2 API and base64-encoding it.

## Database

Schema is at `prisma/schema.prisma`. Key models: `User`, `WordleGame`, `Account`, `Session`, `VerificationToken`.
