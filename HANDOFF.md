# DuoNook Handoff

**Last updated:** August 20, 2026
**Current phase:** Complete Phase 1 website with fixed-width chat checkpoint implemented and verified
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
- Compact sender avatars beside every message, aligned left for received messages and right for sent messages
- Cream sent-message bubbles with palette-colored received-message bubbles
- Distraction-free focus mode
- Desktop chat is fixed at the Galaxy S26 Ultra's 412px CSS viewport width
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
- `npm test` passes all **10 tests**.
- `npm audit --omit=dev` reports **0 vulnerabilities**.
- `node --check` passes for the server entry point, database module, and authentication module.
- Two isolated browser sessions verified login, presence, instant delivery, seen state, reactions, live edits, dark mode, and the 390×844 responsive layout.
- The visual-polish checkpoint was browser-verified at desktop and 390×844: prompt insertion, all mood controls, focus mode, dark mode, responsive layout, and zero browser console errors.
- `main` is the working and publication branch; unrelated temporary QA files remain excluded from Git.

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

This checkpoint is historical and was superseded by the fixed-width Galaxy S26 Ultra checkpoint below.

The desktop sidebar remains unchanged. The conversation now occupies 20% of the application workspace by default, with a 300px usability floor. A divider supports pointer dragging, Left/Right arrow adjustments, and Home to reset to 20%; the selected width persists locally between sessions. The remaining right side is intentionally empty and reserved for future features. Focus mode still expands the conversation, while layouts at 700px and below keep the conversation full width and hide the divider and reserved area.

Browser verification at 1594px measured the default conversation at 19.7% (314px). Keyboard resizing reached 30%, pointer dragging reached 33%, and the 390×844 mobile layout returned to a full-width 390px conversation with no browser console errors.

## Message identity checkpoint

Every message now resolves its sender from the two approved conversation members and displays that member's compact avatar beside the bubble. Received messages place the avatar on the left; sent messages mirror the row so the avatar appears on the right with the same 10px spacing. Sent bubbles remain cream (`#fffefb`) in every mood, while received bubbles use the selected Garden, Sunset, or Lagoon color. Deleted-message placeholders remain transparent, and typing/edit controls retain appropriate contrast after the color-role inversion.

Two client-presentation regression tests cover sender-avatar placement and the sent/received palette mapping. The full 9-test suite and production build pass.

## Fixed-width Galaxy S26 Ultra chat checkpoint

The desktop conversation is now fixed at `412px`, matching the Galaxy S26 Ultra's portrait CSS viewport width. The percentage-based width state, `duonook-chat-width` local-storage preference, pointer-drag behavior, keyboard resizing, and separator control were removed. The reserved right workspace remains available for future modules.

Normal desktop mode uses the existing 284px sidebar (236px on medium screens), the fixed 412px chat, and the remaining workspace. Focus Mode keeps the chat at 412px and centers it between two flexible empty columns. At 700px and below, the responsive layout remains fluid: the sidebar and reserved area disappear and the chat fills the viewport, including an exact 412×891 Galaxy S26 Ultra viewport.

Browser verification measured:

- 412px chat width at 1594×900;
- 412px centered chat width in Focus Mode;
- 412px chat width with zero horizontal overflow at the 701px desktop boundary;
- full-width 412×891 chat with zero horizontal overflow at the Galaxy S26 Ultra viewport;
- no unexpected runtime or layout console errors.

A focused client-presentation regression test covers the fixed desktop and Focus Mode columns and confirms that resize controls/storage are absent. The complete 10-test suite and production build pass.

## NoiGate deployment correction

The first NoiGate deployment was auto-detected as a static Nginx site, so the required
Node/Express process never started. A production `Dockerfile` and `.dockerignore` were
added to force a Node 22 deployment with the Vite build, Express server, non-root runtime,
health check, and SQLite data path at `/app/data`.

Verification after the correction:

- `npm test`: 9/9 passed.
- `npm run build`: passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Production-mode smoke test: `/api/health` returned `{"status":"ok"}` and `/` returned 200 with production security headers.
- Local Docker image execution remains unverified because the Docker Desktop Windows service requires administrator startup in this environment.

NoiGate must redeploy the repository as a Docker service, mount persistent storage at
`/app/data`, enable WebSockets, provide the production environment variables documented
in `README.md`, and reissue the mismatched TLS certificate for `duonook.launchport.org`.

## Publication workflow

`main` is the working and publication branch. When the user requests a push, commit the
verified scoped changes and push directly to `origin/main`; do not create a feature branch
or GitHub pull request. Never force-push. A successful push to `main` automatically
triggers NoiGate to rebuild the Docker service and update the live page. Verify the health
endpoint and changed behavior after the automatic deployment when access is available.

## NoiGate status

No NoiGate repository or API contract is present. Current persistence and authentication are deliberately isolated so they can be replaced later. NoiGate documentation is not a blocker for continuing the local Phase 1 implementation.

## Handoff protocol

When the user says **hand-off**, update this file with:

- completed work;
- verification results;
- unresolved defects or decisions;
- exact next step;
- any commands or setup needed to resume.
