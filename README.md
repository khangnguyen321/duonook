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
- Fixed 412px desktop chat panel matching the Galaxy S26 Ultra CSS viewport width
- Responsive desktop and mobile conversation layouts

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

## Docker and NoiGate deployment

The repository includes a production `Dockerfile`. It builds the Vite client and runs
the Express, SQLite, and Socket.IO server in one non-root Node.js container. Deploy the
repository as a **Docker service**, not as a static Vite/Nginx site.

The publication branch is `main`. Verified changes are committed and pushed directly to
`origin/main`; GitHub pull requests are not part of the normal DuoNook workflow. Each
successful push to `main` automatically triggers NoiGate to rebuild the service and update
the live page.

Use these service settings:

- Dockerfile path: `Dockerfile`
- Container port: `3001` (or allow the platform to inject `PORT`)
- Health check: `/api/health`
- Persistent volume mount: `/app/data`
- WebSocket support: enabled for `/socket.io`

Set these environment variables in the deployment platform:

```text
NODE_ENV=production
CLIENT_ORIGIN=https://your-deployed-domain.example
SESSION_SECRET=replace-with-at-least-32-random-characters
DUONOOK_USER_ONE_NAME=Alex
DUONOOK_USER_ONE_EMAIL=alex@example.com
DUONOOK_USER_ONE_PASSWORD=replace-with-a-strong-password
DUONOOK_USER_TWO_NAME=Sam
DUONOOK_USER_TWO_EMAIL=sam@example.com
DUONOOK_USER_TWO_PASSWORD=replace-with-another-strong-password
DATABASE_PATH=/app/data/duonook.db
```

Do not override the Docker start command. The container runs `node server/index.js`.
After deployment, confirm `/api/health` returns `{"status":"ok"}` before signing in.

## Verification

```powershell
npm run build
npm audit --omit=dev
```

Before publication, the two-user conversation flow was validated in isolated real-browser
sessions at desktop and mobile sizes, alongside server integration checks.

## NoiGate integration

No NoiGate repository or API contract is present yet. Server-side persistence and authentication are isolated behind the `server/` modules, while browser requests are isolated in `src/api.js`. Once NoiGate documentation is available, those boundaries can be replaced without rewriting the conversation UI.
