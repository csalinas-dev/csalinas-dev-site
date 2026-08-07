# Wordleverse — Claude Code Guide

## Feature Overview

A daily Wordle clone. Each day has a single deterministic word (seed-based from the date). Players get 6 guesses. History and streaks are tracked per-user.

- Game URL: `/games/wordleverse` (today) or `/games/wordleverse?date=YYYY-MM-DD` (past)
- History URL: `/games/wordleverse/history`
- Leaderboard URL: `/games/wordleverse/leaderboard`
- Valid date range: 2024-01-01 through today

## Directory Structure

```
wordleverse/
├── (game)/              # Gameplay feature
│   ├── _actions/        # Server actions (getOrCreateGame, saveGame, updateStreak)
│   ├── _components/     # UI components (Gameboard, Keyboard, Header, Alerts…)
│   ├── _context/        # React Context + Reducer for game state
│   │   └── reducer/
│   │       └── helpers/ # saveGame.js, submitGuess.js, etc.
│   ├── _hooks/          # useLoadGame, useMigrateLocalStorage, useKeyboardInput…
│   ├── _lib/            # Status enum, defaults, getRandomWord (seed-based)
│   ├── _storage/        # Dual storage abstraction
│   │   ├── index.js     # Selects DB or localStorage based on session
│   │   ├── database/    # Calls server actions
│   │   └── localStorage/# Browser storage fallback
│   ├── Game.jsx         # Root client component (no SSR — uses dynamic import)
│   └── page.js          # Server component with date validation
├── history/             # History + stats feature
│   ├── _actions/        # getHistory server action
│   ├── _components/     # Calendar, Stats, SignInPrompt
│   └── _lib/storage/
│       ├── index.js     # useHistory hook (picks DB or localStorage)
│       ├── database.js  # getHistoryFromDB server action
│       └── localStorage.js # getHistoryFromLocalStorage
└── leaderboard/         # Public leaderboard (opt-in)
    ├── _actions/        # setLeaderboardOptIn
    ├── _components/     # Layout, LeaderboardTabs, TodayBoard, AllTimeBoard, Board, OptInToggle
    ├── _lib/
    │   ├── rank.js      # Pure ranking rules — every leaderboard rule lives here
    │   └── leaderboard.js # getLeaderboard() — the Prisma reads
    └── page.js          # Server component, force-dynamic
```

## Dual Storage Architecture

Authenticated users → **database** (via Prisma server actions)
Anonymous users → **localStorage** (`WORDLEVERSE-{YYYY-MM-DD}` keys)

On login, `useMigrateLocalStorage` (in `_hooks/`) migrates all localStorage games to the database before the game loads. This ordering is critical — see `ContextProvider` and `useLoadGame`.

If a date exists in both places (the player played it on another device while signed in), the `mergeGame` server action keeps the **better-performing** game: a win beats an unfinished game, which beats a loss; wins tie-break on fewer guesses, unfinished games on more progress, and exact ties keep the database copy. The ranking lives in `_lib/compare.js` (`isBetterGame`).

## Word Selection

`getRandomWord(date)` in `_lib/random.js` uses a deterministic seed derived from the date. Same word for all users on the same date. No state or network call needed.

The word list is `src/data/words.json` — it is **both** the answer pool and the accepted-guess dictionary (`submitGuess` checks `words.includes(guess)`).

**Adding words is not a plain append.** The answer is `words[floor(random(seed) * poolSize)]`, so changing the pool size remaps every date, and past dates are replayable via `?date=`. `random.js` therefore pins dates before `EXPANSION_SEED` to the first `ORIGINAL_POOL_SIZE` entries. To add words: append to the **end** of `words.json` (never insert or reorder), bump `ORIGINAL_POOL_SIZE` to the pre-append length, and set `EXPANSION_SEED` to a date safely after the deploy. New words are accepted as guesses immediately either way.

## Game State Flow

1. `ContextProvider` mounts → `useMigrateLocalStorage` runs (awaited before game load)
2. `useLoadGame` fetches or creates game via appropriate storage
3. State lives in `useReducer` — reducer is in `_context/reducer/`
4. Every state change auto-saves via `saveGame` helper (async via `setTimeout`)
5. `saveGame` uses a module-level `currentSession` variable set by `ContextProvider`

## Server Actions

- `getOrCreateGame(date)` — idempotent, creates DB record if missing
- `saveGame(data)` — **upsert** (handles both in-flight saves and migration)
- `updateStreak(userId, isWin)` — called after a game completes on today's date; streak counts consecutive days *played* (not just wins)
- All actions call `getCurrentUser()` to get the authenticated user by email

## Leaderboard

`/games/wordleverse/leaderboard` is a server component with two boards — **Today**
(everyone who finished today's puzzle) and **All Time** — rendered from one
Prisma read, with no client fetch.

- **Appearance is opt-in and off by default**: `User.showOnLeaderboard Boolean
  @default(false)`. OAuth hands us real names the player never meant to publish,
  so nobody is listed until they flip the switch. Both queries filter on the
  flag, so an un-opted-in user cannot leak in through either board. The only way
  to change it is `_actions/setLeaderboardOptIn.js`, which always writes the
  *caller's own* row (`getCurrentUser()`), never an id from the argument.
- **Every ranking rule lives in `_lib/rank.js`** and nothing may re-derive one in
  a component. That includes the guess count (`guesses` is null on legacy rows,
  so it falls back to `row + 1` and clamps to 1..6 — the `IQUIT` concede path
  sets `row: 6`), the sort order, and competition ranks (equal keys share a rank,
  the next rank skips). The module is pure — no Prisma, no `next/*`, no React.
- `rank.js` is also the privacy boundary: it resolves `isYou` against the
  viewer's id and then drops the identifiers, so **no row that reaches a
  component carries a user id or an email**, and nothing rendered contains the
  day's word or any guess string.
- "Today" is `dateFormat(new Date(), "yyyy-mm-dd")`, server-local — identical to
  how `(game)/_actions/saveGame.js` writes `WordleGame.date`. Any other
  definition silently empties the board around midnight.
- `page.js` **must** keep `export const dynamic = "force-dynamic"`. The Docker
  image runs `next build` before the deploy runs `prisma db push`, so a
  statically prerendered page would query `showOnLeaderboard` before the column
  exists and fail the build.
- Narrow screens hide columns with a CSS media query (`.hide-narrow`), never by
  dropping them from the data — the payload must not depend on the viewport.

## Key Invariants

- `saveGame` action uses `upsert` — never assume the record already exists
- `getRandomWord` is deterministic; no need to persist the word on the client
- Expert mode is stored in `localStorage` under key `"expert"` (not in the DB per-game)
- `board` and `keyboard` store status values as strings: `"absent"`, `"present"`, `"correct"`, `"default"`
