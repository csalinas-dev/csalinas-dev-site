# Auth — Claude Code Guide

## Overview

Authentication uses **NextAuth v4** with JWT sessions. Three sign-in methods:

1. **Credentials** — email + password with email verification required
2. **Google OAuth** — auto-verified, accounts linked to existing email if present
3. **GitHub OAuth** — same as Google

## File Map

```
src/
├── app/
│   ├── api/auth/
│   │   ├── [...nextauth]/route.js   # NextAuth handler (providers, JWT/session callbacks)
│   │   ├── register/route.js        # POST — creates user, sends verification email
│   │   ├── verify/route.js          # GET ?token=… — marks email verified
│   │   └── resend-verification/route.js  # POST — resends verification email
│   └── auth/
│       ├── signin/page.js           # Sign-in page (credentials + OAuth buttons)
│       ├── register/page.js         # Registration form (reCAPTCHA v3)
│       ├── verify-request/          # "Check your email" page after registration
│       └── error/                   # NextAuth error page
└── lib/
    └── auth.js                      # getCurrentUser(), registerUser(), sendVerificationEmail()
```

## Key Functions in src/lib/auth.js

- `getCurrentUser()` — reads session, looks up user by email in DB; used by all server actions
- `registerUser(name, email, password)` — hashes password, creates user, sends verification email
- `sendVerificationEmail(email, token)` — **single canonical implementation** — do not duplicate

## Credentials Flow

1. User POSTs to `/api/auth/register` → `registerUser()` creates user with `emailVerified = null`
2. Verification email sent with 24-hour token stored in `VerificationToken` table
3. User clicks link → `/api/auth/verify?token=…` → sets `emailVerified = now()`, deletes token
4. User signs in → `authorize()` in NextAuth:
   - If `!user.emailVerified` → throws `new Error("EMAIL_NOT_VERIFIED")` (propagates to client as `result.error`)
   - If password invalid or user missing → returns `null`
5. Client checks `result.error === "EMAIL_NOT_VERIFIED"` and shows resend button

## OAuth Flow

- `signIn` callback handles account linking: if a user with the same email already exists, the OAuth account is attached and `emailVerified` is set
- OAuth sign-ins bypass email verification entirely

## Session

- Strategy: JWT
- `jwt` callback sets `token.userId` and `token.provider` on first sign-in
- `session` callback sets `session.user.id = token.sub || token.userId`
- `getCurrentUser()` looks up by `session.user.email` (not ID) to guarantee freshness

## Common Gotchas

- `authorize()` throws (not returns null) for unverified email so the error code reaches the client
- The `signIn` callback is NOT called when `authorize()` returns null or throws — don't add verification logic there
- Verification tokens are in the `VerificationToken` table with `(identifier, token)` unique key
