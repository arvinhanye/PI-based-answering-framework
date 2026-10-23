# Pi Study UX redesign implementation

Spec: `docs/superpowers/specs/2026-10-23-pi-study-ux-redesign.md` (user-approved, overrides the old UX and budget design).

Global constraints: use the current `codex/mvp` checkout; preserve the supplied spec and existing learning records. Run all fixtures in temporary data directories. Do not expose credentials. Do not push. Deliver §0.1 independently before any other implementation. New user decisions take priority over older controlled-menu requirements.

### Task 1: Remove rate expiry (complete)

Delete review timestamps/TTL checks, ignore old stored timestamp fields, update docs/examples. Verify future-clock configuration and LearningService generation, typecheck, complete suite and build. Independent commit `39a19b7`; 172 tests passed. Already reported to user.

### Task 2: Verify Pi integration assumptions

Inspect and exercise installed Pi context projection with a local capture provider; prove previous-question turns can be removed from outgoing requests while transcript remains. Check key conflicts and document alternate shortcuts. After the soft ledger exists, send one bounded image request with existing credentials and record usage; otherwise fall back honestly to text-only context. No remote request is a substitute for outgoing-context capture.

### Task 3: Study state, undo, queue and cards

Interfaces: StudyService exposes snapshot status/answer, current-question undo, assisted marking, per-session progress. Backward-compatible SQLite migration preserves submissions; voided records are excluded from statistics and review state is restored. Natural numeric/source ordering, wrong-only queue and random-new selection preserve review scheduling. Remove draft/hint APIs. Add strict input classification and shared human-readable card renderers. RED→GREEN regressions for each behavior, then full checks.

### Task 4: Soft monthly ledger

Interfaces: BudgetService records native usage once per request, carries existing settled spending/limits forward, persists per-month warning state, and rejects only new questions after spent reaches the limit. No reservations or cost-proof machinery in active paths. CNY rates support zero and reductions; no timestamps. Pi and CLI share the ledger. Preserve the old finance DB during migration and test migration/restart/multiple writers/calendar boundaries. Remove obsolete gateway/state-machine tests with their retired implementation.

### Task 5: Direct Pi interaction and native DeepSeek conversation

Interfaces: one `/study` command with subcommands; native input classifies answers, next and questions. No grading tools or confirmation dialogs. Persistent cards use a custom renderer and are removed from model context. Disable file/bash tools, use native DeepSeek Flash, restore original model/tools/thinking on exit; no-key practice still works. Current-question-only context, pending request/session boundaries, usage accounting and assisted classification must remain correct on failure/cancellation/undo. One-level menu supports specified preferences.

### Task 6: CLI and integration acceptance

Use shared question/result cards for CLI, add undo, remove hint/draft/verify entry points; keep imports/backups/stats. Migrate docs and examples to the new active behavior. Test complete Pi flow with real SDK/PTY and isolate real-provider probes from learner data. Verify each spec §9 acceptance item and record limits honestly.

### Task 7: Final review and delivery

Run typecheck, full tests, clean build/package and diff review. One independent whole-change review is permitted by the executing-plans skill; resolve important findings, rerun affected checks and full suite. Commit local verified increments, leave remote untouched. Report actual evidence and any unresolved acceptance items.

Pre-flight interfaces: Task 3 snapshot/undo/card data feed Task 5/6; Task 4 budget usage feeds Task 5 request completion and both card footers. Task 2 projection evidence chooses Task 5 context implementation. Task 1 deliberately retains old validation until Task 4 replaces it. Source alias `pdf` must resolve actual imported `wlan-pdf` as well as a literal `pdf` source; do not assume the design's source-id spelling is authoritative over stored sources.
