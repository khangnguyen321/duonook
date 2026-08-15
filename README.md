# DuoNook

> A quiet place for just us.

DuoNook is a private, desktop-first messenger for exactly two approved people. The project is being built in small, runnable phases.

## Current progress

The complete Phase 1 website is implemented:

- React and Vite client
- Express API and production static serving
- SQLite persistence with a single shared conversation
- Exactly two seeded accounts and no registration route
- bcrypt password hashes
- HTTP-only, same-site session cookie
- Login rate limiting and security headers
- Responsive sign-in and conversation shell
- Startup reconciliation that enforces exactly two approved accounts and memberships
- Persistent message history and server-side message validation
- Authenticated Socket.IO rooms and instant message delivery
- Online/offline presence, last-seen state, and typing indicators
- Persistent read state, seen receipts, browser-tab unread counts, and desktop notifications
- Sender-only message editing and deletion
- Emoji reactions
- Light and dark themes
- Responsive desktop and mobile conversation layouts
- Integration coverage for authentication, authorization, messages, controls, read state, and private real-time events

## Run locally

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Before sharing or deploying the app, replace every value in `.env`.

For a quick local-only preview without an `.env` file, the development seed accounts are:

- `alex@duonook.local` / `nook-one`
- `sam@duonook.local` / `nook-two`

These fallback credentials are rejected in production. Account creation is intentionally unavailable.

## Production build

```powershell
npm run build
$env:NODE_ENV = 'production'
npm start
```

Production requires `SESSION_SECRET` and both account emails and passwords from `.env.example`.

## Verification

```powershell
npm test
npm run build
npm audit --omit=dev
```

The current suite contains seven server integration tests. The two-user conversation flow
has also been exercised in isolated real-browser sessions at desktop and mobile sizes.

## NoiGate integration

No NoiGate repository or API contract is present yet. Server-side persistence and authentication are isolated behind the `server/` modules, while browser requests are isolated in `src/api.js`. Once NoiGate documentation is available, those boundaries can be replaced without rewriting the conversation UI.
