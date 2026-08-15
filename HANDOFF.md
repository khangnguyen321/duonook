# DuoNook Handoff

**Last updated:** August 15, 2026
**Current phase:** Complete Phase 1 website implemented and verified
**Project direction:** Private, desktop-first messaging for exactly two approved people

## Product promise

> A quiet place for just us.

DuoNook provides two spouses with one private browser-based conversation that works well on desktop and has a responsive mobile fallback.

## Implemented

- React/Vite client
- Express API and production static serving
- SQLite database initialization
- Two configured seed accounts with bcrypt password hashes
- No public registration route
- HTTP-only, same-site JWT session cookie
- Login rate limiting and Helmet security headers
- Authenticated current-user and conversation endpoints
- One shared conversation and conversation membership
- Responsive sign-in and complete conversation UI
- Persistent messages with chronological history and a 2,000-character limit
- Authenticated send, edit, delete, reaction, history, and read-state APIs
- Authenticated Socket.IO handshakes and private conversation rooms
- Instant message, edit, delete, reaction, presence, typing, and read-state events
- Online/offline presence and last-seen state
- Typing indicators with client throttling and expiry
- Persistent read state, seen receipts, tab unread counts, and desktop notifications
- Sender-only edit and soft-delete controls
- Six emoji reactions
- Persistent light and dark themes
- Relationship-first conversation layout with a compact shared-nook rail
- Three remembered color moods: Garden, Sunset, and Lagoon
- Distraction-free focus mode
- Desktop chat defaults to 20% of the workspace and can be resized by drag or keyboard
- Reserved empty right workspace for future feature modules
- Daily conversation prompt, one-tap affection note, and today's message count
- Desktop and responsive mobile layouts
- Startup reconciliation that keeps only the two configured accounts
- Exact shared-conversation membership reconciliation
- Approved-email enforcement during login
- Controlled `403` response for authenticated users without conversation membership
- Integration tests for account counts, authentication, sessions, logout, conversation authorization, message validation and persistence, ownership controls, reactions, read state, socket authentication, and private real-time delivery

## Verification status

- `npm run build` passes.
- `npm test` passes all **7 tests**.
- `npm audit --omit=dev` reports **0 vulnerabilities**.
- `node --check` passes for the server entry point, database module, and authentication module.
- Two isolated browser sessions verified login, presence, instant delivery, seen state, reactions, live edits, dark mode, and the 390×844 responsive layout.
- The visual-polish checkpoint was browser-verified at desktop and 390×844: prompt insertion, all mood controls, focus mode, dark mode, responsive layout, and zero browser console errors.
- The project files are currently untracked in Git.

## Known limitations

1. History currently loads the latest 200 messages and does not yet provide pagination or search.
2. Presence is held in the server process, so horizontal multi-instance deployment would require a shared Socket.IO adapter and presence store.
3. Sessions use signed 14-day JWT cookies; logout clears the browser cookie but there is no server-side token revocation list.
4. Desktop notification permission and display depend on browser and operating-system settings.
5. Attachments, replies, pinned messages, calls, and PWA installation belong to later product phases.

## Completed build phases

### Step 1 — secure the foundation (complete)

- Enforced exactly two configured accounts in persistent data.
- Ensured both configured accounts, and only those accounts, belong to the shared conversation.
- Added a controlled authorization response for missing conversation membership.
- Added integration tests for login, rejected credentials, session access, logout, and conversation authorization.

### Step 2 — persist messages (complete)

- Added the message and reaction tables and message indexes.
- Added authenticated history, send, edit, delete, reaction, and read-state APIs.
- Added server-side validation and conversation/sender authorization.
- Added persistence, ownership, and validation tests.

### Step 3 — real-time delivery (complete)

- Authenticated Socket.IO handshakes with the session cookie.
- Joined only authorized users to the shared-conversation room.
- Broadcast durable changes after successful database writes.
- Deduplicated HTTP responses and matching socket events in the client.

### Step 4 — presence, typing, unread state, and message controls (complete)

- Added server-owned online/offline and last-seen state.
- Added throttled ephemeral typing events with expiry.
- Added monotonic persistent read state and seen receipts.
- Added browser-tab unread counts and desktop notification support.
- Added edit/delete ownership controls, reactions, themes, and responsive UI.

## Phase 1 acceptance result

The defined acceptance criteria are met: both approved users can sign in separately, open the shared conversation, exchange persistent messages instantly, see presence and typing state, receive read/unread feedback, and use message controls. Unauthorized users and unauthenticated sockets cannot read or publish conversation data.

## Recommended next step

Review the new visual direction with both users. If it is approved, the next product checkpoint can begin the first later-phase feature (attachments, replies, search, pinned messages, or couple-specific shortcuts) one at a time. Before public-internet deployment, configure HTTPS/WSS, backups, process supervision, and the final domain. NoiGate can replace the isolated persistence/authentication modules when its contract becomes available.

## Visual-polish checkpoint

The original admin-style sidebar and wide utility canvas were replaced with a relationship-first nook layout. The new rail centers the two members, a daily shared-message count, and a rotating conversation prompt. Garden, Sunset, and Lagoon moods update the complete interface and persist locally; light/dark preference remains independent. Focus mode collapses the rail for a second desktop layout, while mobile keeps a compact conversation-first composition.

This checkpoint changes client presentation and local UI preferences only. It does not add new private data types, server routes, or later-phase persistence.

## Adjustable chat workspace checkpoint

The desktop sidebar remains unchanged. The conversation now occupies 20% of the application workspace by default, with a 300px usability floor. A divider supports pointer dragging, Left/Right arrow adjustments, and Home to reset to 20%; the selected width persists locally between sessions. The remaining right side is intentionally empty and reserved for future features. Focus mode still expands the conversation, while layouts at 700px and below keep the conversation full width and hide the divider and reserved area.

Browser verification at 1594px measured the default conversation at 19.7% (314px). Keyboard resizing reached 30%, pointer dragging reached 33%, and the 390×844 mobile layout returned to a full-width 390px conversation with no browser console errors.

## NoiGate deployment correction

The first NoiGate deployment was auto-detected as a static Nginx site, so the required
Node/Express process never started. A production `Dockerfile` and `.dockerignore` were
added to force a Node 22 deployment with the Vite build, Express server, non-root runtime,
health check, and SQLite data path at `/app/data`.

Verification after the correction:

- `npm test`: 7/7 passed.
- `npm run build`: passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Production-mode smoke test: `/api/health` returned `{"status":"ok"}` and `/` returned 200 with production security headers.
- Local Docker image execution remains unverified because the Docker Desktop Windows service requires administrator startup in this environment.

NoiGate must redeploy the repository as a Docker service, mount persistent storage at
`/app/data`, enable WebSockets, provide the production environment variables documented
in `README.md`, and reissue the mismatched TLS certificate for `duonook.launchport.org`.

## NoiGate status

No NoiGate repository or API contract is present. Current persistence and authentication are deliberately isolated so they can be replaced later. NoiGate documentation is not a blocker for continuing the local Phase 1 implementation.

## Handoff protocol

When the user says **hand-off**, update this file with:

- completed work;
- verification results;
- unresolved defects or decisions;
- exact next step;
- any commands or setup needed to resume.
