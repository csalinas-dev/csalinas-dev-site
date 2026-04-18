# csalinas.dev — Claude Code Guide

## Project Overview

Next.js 14 (App Router) personal portfolio site for Christopher Salinas Jr. Includes blog posts, games, and other pages. The main game is **Wordleverse**, a Wordle clone with user auth and gameplay history.

## Tech Stack

- **Framework**: Next.js 14 (App Router, no TypeScript — all `.js`/`.jsx`)
- **UI**: Material-UI (MUI) v5 + Emotion
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

## Database

Schema is at `prisma/schema.prisma`. Key models: `User`, `WordleGame`, `Account`, `Session`, `VerificationToken`.
