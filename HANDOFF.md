# DuoNook Handoff

**Last updated:** August 20, 2026
**Current phase:** Complete Phase 1 website with shared-space dashboard checkpoint implemented and verified
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
- Wide desktop workspace uses an 18.4% sidebar, 35% chat, and 46.6% reserved area
- Shared-space dashboard fills the desktop right area with connection status, conversation activity, the latest non-deleted message, and quick note starters
- Daily conversation prompt, one-tap affection note, and today's message count
- Desktop and responsive mobile layouts
- Startup reconciliation that keeps only the two configured accounts
- Exact shared-conversation membership reconciliation
- Approved-email enforcement during login
- Controlled `403` response for authenticated users without conversation membership
- Integration tests for account counts, authentication, sessions, logout, conversation authorization, message validation and persistence, ownership controls, reactions, read state, socket authentication, and private real-time delivery

## Verification status

- `npm run build` passes.
- `npm test` passes all **11 tests**.
- `npm audit --omit=dev` reports **0 vulnerabilities**.
- `node --check` passes for the server entry point, database module, and authentication module.
- Two isolated browser sessions verified login, presence, instant delivery, seen state, reactions, live edits, dark mode, and the 390×844 responsive layout.
- The visual-polish checkpoint was browser-verified at desktop and 390×844: prompt insertion, all mood controls, focus mode, dark mode, responsive layout, and zero browser console errors.
- Shared-space dashboard checkpoint: the focused presentation test verifies the rendered dashboard, its existing-conversation activity data, quick-note controls, desktop styling, and mobile hiding. `npm test` passes 11/11 and `npm run build` passes. A new full browser pass was not possible in this workspace because the configured production database path targets `/app` and the Windows Bash service required by the available browser wrapper is denied.
- Dashboard publication: commit `74e6bab` was pushed to `origin/main` successfully on August 21, 2026. The live `/api/health` endpoint returned `{"status":"ok"}` and `/` returned HTTP 200 with the expected security headers, but its `index-Nk5oK47M.js` / `index-x9db2gs1.css` asset references were still the prior deployment rather than this checkpoint's `index-H2x38Hyx.js` / `index-DJ_xDHr0.css` after a second check. LaunchPort must be manually redeployed or its push-trigger configuration repaired before the dashboard is live.
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

Review the shared-space dashboard with both users. If it is approved, the next product checkpoint can begin the first persisted later-phase feature (attachments, replies, search, or pinned messages) one at a time. Before public-internet deployment, configure HTTPS/WSS, backups, process supervision, and the final domain. NoiGate can replace the isolated persistence/authentication modules when its contract becomes available.

## Shared-space dashboard checkpoint

The previously empty desktop right workspace is now a responsive, private dashboard assembled entirely from already-authorized conversation state. It adds no database tables, API routes, or data retention. The panel shows live connection/presence state, message totals for today, the current week, and loaded history, the most recent non-deleted message, and three quick starters that place a love note, planning message, or daily question into the existing composer. It is intentionally hidden at the existing mobile breakpoint, preserving the conversation-first mobile experience.

During verification, a Windows test teardown race was corrected in the local uncommitted integration-test harness by waiting for the spawned server process to exit before removing its temporary SQLite directory. That test file predates this checkpoint and remains untracked, so it is not part of the published dashboard change.

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

This checkpoint is historical and was superseded by the proportional workspace checkpoint below.

The desktop conversation is now fixed at `412px`, matching the Galaxy S26 Ultra's portrait CSS viewport width. The percentage-based width state, `duonook-chat-width` local-storage preference, pointer-drag behavior, keyboard resizing, and separator control were removed. The reserved right workspace remains available for future modules.

Normal desktop mode uses the existing 284px sidebar (236px on medium screens), the fixed 412px chat, and the remaining workspace. Focus Mode keeps the chat at 412px and centers it between two flexible empty columns. At 700px and below, the responsive layout remains fluid: the sidebar and reserved area disappear and the chat fills the viewport, including an exact 412×891 Galaxy S26 Ultra viewport.

Browser verification measured:

- 412px chat width at 1594×900;
- 412px centered chat width in Focus Mode;
- 412px chat width with zero horizontal overflow at the 701px desktop boundary;
- full-width 412×891 chat with zero horizontal overflow at the Galaxy S26 Ultra viewport;
- no unexpected runtime or layout console errors.

A focused client-presentation regression test covers the fixed desktop and Focus Mode columns and confirms that resize controls/storage are absent. The complete 10-test suite and production build pass.

## Proportional desktop workspace checkpoint

The wide desktop grid now divides its usable track space into exactly 18.4% sidebar, 35% chat panel, and 46.6% reserved right workspace. Fractional grid tracks make the three requested shares total 100% without allowing the outer padding or 12px gaps to create horizontal overflow. Focus Mode centers a 35% chat between equal 32.5% flexible columns.

At widths of 1250px and below, the layout retains the practical 236px sidebar and 412px chat fallback so navigation and conversation content do not collapse. At 700px and below, the existing full-width mobile conversation remains unchanged.

At the 1594×900 reference viewport, browser measurements were 284.45px (18.4%) for the sidebar, 541.11px (35%) for the chat, and 720.42px (46.6%) for the reserved workspace, with zero horizontal overflow. Focus Mode measured the same 541.11px/35% chat width and was centered within 0.01px. All 10 tests and the production build pass.

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

`main` is the working and publication branch. After every completed, verified task,
automatically commit the scoped changes and push directly to `origin/main`; a separate
push request is not required. Do not create a feature branch or GitHub pull request and
never force-push. Never include incomplete or failing work, security defects, secrets,
private data, temporary QA artifacts, or unrelated changes. A successful push to `main`
automatically triggers NoiGate to rebuild the Docker service and update the live page.
Verify the health endpoint and changed behavior after deployment when access is available.

## NoiGate status

No NoiGate repository or API contract is present. Current persistence and authentication are deliberately isolated so they can be replaced later. NoiGate documentation is not a blocker for continuing the local Phase 1 implementation.

## Handoff protocol

When the user says **hand-off**, update this file with:

- completed work;
- verification results;
- unresolved defects or decisions;
- exact next step;
- any commands or setup needed to resume.
