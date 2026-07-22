---
task_id: ATM-GOV-0259
title: Write-ticket scope amendment guard and out-of-scope WIP recorder
status: planned
owner: atm-governance
priority: P0
milestone: ATM-3.1-R0.11
severity: P0
depends_on:
  - ATM-GOV-0247
  - ATM-GOV-0250
  - ATM-GOV-0258
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 shared-write governance and editor/agent safety. This card extends the existing task scope, broker ticket, integration adapter, and dirty-WIP admission model instead of creating a parallel permission system."
scopePaths:
  - packages/cli/src/commands/write-ticket.ts
  - packages/cli/src/commands/command-specs/write-ticket.spec.ts
  - packages/cli/src/commands/tasks/scope-amendment.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/core/src/broker/write-ticket.ts
  - packages/core/src/broker/write-scope-policy.ts
  - integrations/codex-skills/atm-governance-router/SKILL.md
  - .claude/skills/atm-governance-router/SKILL.md
  - .cursor/rules/skills/atm-governance-router/SKILL.md
  - .gemini/commands/atm-governance-router.toml
  - GEMINI.md
  - tests/cli/write-ticket-scope-guard.test.ts
  - tests/cli/write-ticket-scope-amendment.test.ts
  - tests/cli/out-of-scope-write-recorder.test.ts
deliverables:
  - packages/cli/src/commands/write-ticket.ts
  - packages/core/src/broker/write-ticket.ts
  - packages/core/src/broker/write-scope-policy.ts
  - tests/cli/write-ticket-scope-guard.test.ts
  - tests/cli/write-ticket-scope-amendment.test.ts
  - tests/cli/out-of-scope-write-recorder.test.ts
validators:
  - node --strip-types tests/cli/write-ticket-scope-guard.test.ts
  - node --strip-types tests/cli/write-ticket-scope-amendment.test.ts
  - node --strip-types tests/cli/out-of-scope-write-recorder.test.ts
  - npm run validate:cli
  - npm run typecheck
errorCodes:
  - ATM_WRITE_SCOPE_AMENDMENT_REQUIRED
  - ATM_WRITE_SCOPE_UNATTACHED_WIP
  - ATM_WRITE_TICKET_SCOPE_VIOLATION
  - ATM_WRITE_TICKET_MISSING
  - ATM_WRITE_TICKET_STALE
evidence:
  required: write-ticket-scope-guard-red-green
rollback:
  strategy: revert-commit-and-retain-existing-commit-close-gates
  notes: "Rollback may keep commit/close gates as last-line defenses, but must not claim editor-time or pre-write scope safety."
atomizationImpact:
  ownerAtomOrMap: atm.write-ticket-scope-guard
  mapUpdates: []
  extractionCandidates:
    - atom: atm.write-ticket
      pattern: Authority Token
      source: packages/core/src/broker/write-ticket.ts
      disposition: extract
    - atom: atm.write-scope-policy
      pattern: Policy Object
      source: packages/core/src/broker/write-scope-policy.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0259 Write-ticket scope amendment guard and out-of-scope WIP recorder

## Intent

Add a first-class write-ticket and scope-amendment guard so external AI workers
cannot silently dirty files outside the task authority and only discover the
problem at commit or close. ATM should encourage legitimate scope expansion
instead of treating every out-of-scope intent as misconduct, but it must also
record and escalate unsafe writes that bypass the amendment path.

This card closes the Plan 3.1 dogfood gap exposed by the Antigravity/Gemini 3.6
dispatch attempt on `ATM-GOV-0258`: the worker used the wrong actor id
(`antigravity-gemini35-plan31-captain` after the human had corrected the lane to
Gemini 3.6), directly edited `.atm/history/tasks/ATM-GOV-0258.json` with Node,
and modified source files outside the original `ATM-GOV-0258` scope before any
commit or close gate could stop the dirty worktree. ATM later surfaced the
dirty files and active ledger state, but the warning was too late: the shared
worktree was already polluted and required captain arbitration.

The fix is not a full OS/filesystem sandbox. The MVP is an ATM authority layer:
workers acquire a write ticket for the task/actor/lane/scope, editor adapters
check that ticket before writes when they can, and ATM still detects and records
post-write unattached WIP when an adapter cannot enforce the pre-write hook.

## Acceptance

- [ ] `node atm.mjs write-ticket acquire --task <task> --actor <actor> --files <paths> --intent <intent> --json` or an equivalent command returns a ticket carrying actor id, task id, lane/session/lease when available, allowed files, scope digest, expiry, operation class, and recovery policy.
- [ ] `write-ticket check` or equivalent accepts in-scope writes and rejects out-of-scope writes with `ATM_WRITE_SCOPE_AMENDMENT_REQUIRED` before the file is modified when an editor adapter can call the guard.
- [ ] The required scope-amendment response includes a copyable `tasks scope add ... --reason ...` command and classifies the request as amendment-required rather than a violation when the worker asked before writing.
- [ ] If a worker already produced out-of-scope dirty WIP, ATM classifies it as `ATM_WRITE_SCOPE_UNATTACHED_WIP`, records actor/task/lane/path/timestamp/digest evidence, blocks commit/close, and offers governed recovery choices: scope-amend-and-attach, non-delivery WIP commit, discard receipt, or split-to-new-task.
- [ ] A true `ATM_WRITE_TICKET_SCOPE_VIOLATION` is emitted only when the worker writes or attempts to commit/close/push outside ticket scope while refusing or bypassing the amendment/unattached-WIP recovery path.
- [ ] Commit, close, and pre-push gates consume write-ticket/touched-path evidence as a last-line defense, but editor adapters for Codex, Claude, Cursor, Gemini, and Antigravity receive generated instructions or command surfaces for pre-write ticket checks.
- [ ] The Antigravity/Gemini 3.6 counterexample is replayed as a red/green test: wrong actor id, direct `.atm/history/**` edit attempt, and out-of-scope source writes must produce early warnings/events before commit, plus deterministic recovery commands.
- [ ] The system preserves flexibility for real task-card omissions: scope expansion is a normal governed path, not a punishment, and final reports distinguish amendment-required, unattached-WIP, and violation cases.
- [ ] Final evidence reports counts for write-ticket acquisitions, pre-write blocks, scope amendments, unattached-WIP records, true violations, adapter-enforced blocks, post-write detections, and manual captain interventions.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T14:47:07.432Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0259-write-ticket-scope-amendment-guard-and-out-of-scope-wip-recorder.task.md","contentDigest":"sha256:778e95e82f04bba966b823df793face06eef6b2d8a90a07472cd686bc88d1067"} -->
