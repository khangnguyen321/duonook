# DuoNook Project Instructions

## Product

DuoNook is a private, desktop-first messenger for exactly two approved people.
The product promise is: **two accounts, one private conversation, no public registration**.

## Working method

- Build the project phase by phase. Finish and verify the current phase before starting the next one.
- Keep changes small, runnable, and reviewable.
- Preserve existing user changes and avoid unrelated rewrites.
- Treat `HANDOFF.md` as the durable source of current progress, decisions, blockers, and next steps.
- When the user says **hand-off**, update `HANDOFF.md` before ending the task.
- Do not create project-specific agents or skills unless a repeated workflow or independent parallel workstream clearly justifies one.

## Mandatory build lifecycle

Use this lifecycle for every implementation checkpoint. Do not skip directly from coding to completion.

1. **Plan:** inspect the current code and handoff, define the scoped outcome, identify risks and acceptance criteria, and choose proportional verification.
2. **Build:** implement the smallest coherent change that satisfies the plan while preserving established architecture and security invariants.
3. **Check the code:** review the complete changed surface for correctness, authorization, validation, error handling, maintainability, accessibility where relevant, and unintended regressions.
4. **Debug and verify:** run focused tests plus the required project checks, investigate every failure, fix root causes, and add regression coverage for defects found.
5. **Check the code again:** reread the final diff after fixes, remove temporary or dead code, confirm tests exercise meaningful behavior, and verify the result against the acceptance criteria.
6. **Ship:** update `README.md` or `HANDOFF.md` when project state changed and deliver a concise summary with verification evidence and known limitations. Commit, push, open a pull request, deploy, or publish only when the user explicitly requests that external action.

If any check fails, return to the appropriate earlier step. Do not call a checkpoint complete while relevant failures, security gaps, or unreported blockers remain.

## Git publication and deployment

- Use `main` as the working and publication branch for DuoNook. Do not create feature branches or GitHub pull requests unless the user explicitly asks for one.
- When the user asks to **push**, stage only the intended verified files, commit them, and push directly to `origin/main`.
- Never force-push. If remote `main` advanced, fetch it and reconcile safely before retrying the direct push.
- A successful push to `origin/main` automatically triggers NoiGate to rebuild and update the live page. Do not create a separate GitHub pull request or manually deploy after a successful push.
- After the automatic deployment, verify the health endpoint and the changed live behavior when access is available. Report deployment failures rather than silently treating the Git push as a live-site success.

## Current stack

- React 19 with Vite
- Express 5
- SQLite
- Socket.IO
- Cookie-based JWT sessions
- Plain CSS

Keep browser API calls behind `src/api.js`. Keep persistence and authentication behind modules in `server/` so they can later be replaced by NoiGate without rewriting the UI.

## Required verification

Run checks appropriate to the change. At minimum, before completing an implementation phase:

```powershell
npm test
npm run build
```

Do not describe `npm test` as meaningful coverage when it discovers zero tests. Add focused tests for new server behavior and regressions.

## Security and data invariants

- Exactly two approved users may authenticate.
- There is no registration endpoint or public account creation flow.
- Every private HTTP route and Socket.IO event must authenticate and authorize the user.
- Both approved users belong to the single shared conversation; no other user may belong to it.
- Users may modify or delete only their own messages and reactions.
- Never commit `.env`, credentials, session secrets, database files, or message content.
- Production requires HTTPS, secure cookies, secure WebSockets, rate limiting, security headers, and secrets supplied outside source control.
- Validate message and attachment size, type, and ownership on the server.
- Avoid logging passwords, tokens, private message bodies, or other sensitive content.

## Phase order

1. **Phase 1A — foundation:** client/server shell, authentication, SQLite persistence, two seeded accounts, shared conversation shell.
2. **Phase 1B — core messaging:** message schema and APIs, authenticated Socket.IO delivery, message history, presence, typing, read state, and unread tracking.
3. **Phase 1C — message controls:** edit/delete own messages, reactions, timestamps, notifications, and theme support.
4. **Later phases:** attachments, replies, search, pinned messages, couple-specific shortcuts, PWA support, and optional richer communication features.

Do not begin later-phase features until the current phase's acceptance criteria and tests pass.
