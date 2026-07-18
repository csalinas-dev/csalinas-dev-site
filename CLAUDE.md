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
- The card route is gated: requests must come from GitHub's Camo image proxy (`github-camo` User-Agent — README `<img>`s are proxied, never fetched by the viewer's browser, so there is no `Referer` to match on) **and** carry the `GITHUB_CARD_KEY` secret as `?key=`. It is rate-limited in-memory (`src/lib/rate-limit.js`, 30 req/min/IP by default). Upstream GitHub GraphQL results are memoized with `unstable_cache` (6h) in `src/lib/github/api.js` (`getOverview`/`getStreak`) so the PAT is called at most every 6h regardless of request volume — this is what keeps `GITHUB_STATS_TOKEN` from being rate-limited.
- `src/lib/github/font.js` embeds the Sono latin variable woff2 as a base64 data URI; `svg.js` injects it as an `@font-face` so cards render in Sono inside GitHub's `<img>` sandbox (external fonts can't load there). Regenerate by re-downloading the latin woff2 from the Google Fonts css2 API and base64-encoding it.

## Database

Schema is at `prisma/schema.prisma`. Key models: `User`, `WordleGame`, `Account`, `Session`, `VerificationToken`.
