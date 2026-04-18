# Wordleverse — Claude Code Guide

## Feature Overview

A daily Wordle clone. Each day has a single deterministic word (seed-based from the date). Players get 6 guesses. History and streaks are tracked per-user.

- Game URL: `/games/wordleverse` (today) or `/games/wordleverse?date=YYYY-MM-DD` (past)
- History URL: `/games/wordleverse/history`
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
└── history/             # History + stats feature
    ├── _actions/        # getHistory server action
    ├── _components/     # Calendar, Stats, SignInPrompt
    └── _lib/storage/
        ├── index.js     # useHistory hook (picks DB or localStorage)
        ├── database.js  # getHistoryFromDB server action
        └── localStorage.js # getHistoryFromLocalStorage
```

## Dual Storage Architecture

Authenticated users → **database** (via Prisma server actions)
Anonymous users → **localStorage** (`WORDLEVERSE-{YYYY-MM-DD}` keys)

On login, `useMigrateLocalStorage` (in `_hooks/`) migrates all localStorage games to the database before the game loads. This ordering is critical — see `ContextProvider` and `useLoadGame`.

## Word Selection

`getRandomWord(date)` in `_lib/random.js` uses a deterministic seed derived from the date. Same word for all users on the same date. No state or network call needed.

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

## Key Invariants

- `saveGame` action uses `upsert` — never assume the record already exists
- `getRandomWord` is deterministic; no need to persist the word on the client
- Expert mode is stored in `localStorage` under key `"expert"` (not in the DB per-game)
- `board` and `keyboard` store status values as strings: `"absent"`, `"present"`, `"correct"`, `"default"`
