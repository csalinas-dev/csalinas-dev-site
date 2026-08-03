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
- `/games/tic-tac-overflow` is a two-player hotseat tic-tac-toe variant in `src/app/(pages)/games/tic-tac-overflow/`. Each player keeps at most three marks (`MAX_MARKS`); placing a fourth clears **that player's** oldest one, tracked as a per-player queue in `state.history`. State is a plain `useReducer`; the only persistence is the expiry-hint preference in `localStorage` under `TICTACOVERFLOW-PREVIEW`.
- That hint (fading the mark the next move clears) is toggleable. `getExpiringCell` always reports the rule; `getPreviewedCell` is the display-level wrapper that returns `null` when the player has the hint off — read the latter in components, never the former, so turning the hint off can never alter play. The preference is restored in an effect after mount rather than seeding `defaultState`, because the page is prerendered and the first client render has to match the server's markup.
- `/games/edge-case` ("Edge Case" — Dots and Boxes) keeps **all** of its rules in `src/app/(pages)/games/edge-case/_lib/`. That module is pure, synchronous and dependency-free so the server and every client run it unchanged: `createState`, `drawEdge(state, { orientation, index }, slot) => { state, error? }`, `getResult` (ties are reported as ties, never broken), `reducer(state, action, player)` for the shared realtime core, plus the edge/box indexing helpers. The coordinate convention for `state.edges` and `state.owners` is documented at the top of `_lib/edges.js` — read it there rather than re-deriving it, and never re-implement a rule in a component.
- Font Awesome runs as a kit `<Script>` that replaces `<i>` elements with `<svg>` in the DOM. Any `<i>` React might later unmount (a conditionally rendered icon) must sit inside a wrapper element React owns, or the unmount throws `NotFoundError: Failed to execute 'removeChild'`.
- `src/lib/github/font.js` embeds the Sono latin variable woff2 as a base64 data URI; `svg.js` injects it as an `@font-face` so cards render in Sono inside GitHub's `<img>` sandbox (external fonts can't load there). Regenerate by re-downloading the latin woff2 from the Google Fonts css2 API and base64-encoding it.

## Database

Schema is at `prisma/schema.prisma`. Key models: `User`, `WordleGame`, `Account`, `Session`, `VerificationToken`.
