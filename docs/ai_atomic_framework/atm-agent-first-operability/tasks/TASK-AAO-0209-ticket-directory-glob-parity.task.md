---
id: TASK-AAO-0209
title: Ticket directory glob parity
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/write-scope-policy.ts
  - tests/cli/work-admission-ticket-scope-glob-parity.test.ts
  - tests/cli/scope-amendment-work-admission-ticket.test.ts
  - .atm/history/tasks/TASK-AAO-0209.json
  - .atm/history/evidence/TASK-AAO-0209.*
  - .atm/history/task-events/TASK-AAO-0209/**
deliverables:
  - packages/core/src/broker/write-scope-policy.ts
  - tests/cli/work-admission-ticket-scope-glob-parity.test.ts
  - tests/cli/scope-amendment-work-admission-ticket.test.ts
contextMap:
  primary:
    - packages/core/src/broker/write-scope-policy.ts
    - tests/cli/work-admission-ticket-scope-glob-parity.test.ts
  secondary:
    - packages/core/src/broker/work-admission-ticket.ts
    - packages/cli/src/commands/tasks/claim-work-admission.ts
  test:
    - tests/cli/scope-amendment-work-admission-ticket.test.ts
    - tests/cli/work-admission-ticket-claim.test.ts
    - tests/cli/work-admission-coverage-gates.test.ts
  pattern: Canonical normalization and globToRegExp behavior in write-scope-policy.ts
validators:
  - node --strip-types tests/cli/work-admission-ticket-scope-glob-parity.test.ts
  - node --strip-types tests/cli/scope-amendment-work-admission-ticket.test.ts
  - node --strip-types tests/cli/work-admission-ticket-claim.test.ts
  - node --strip-types tests/cli/work-admission-coverage-gates.test.ts
  - npm run typecheck
  - git diff --check
priority: P1
phase: Backlog-P1
created: 2026-10-18
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: implementation
depends: []
notes: "2026-10-18 | 狀態: planned | 驗證: pending | 變更: directory glob parity planning only | 阻塞: Phase 1 claim required"
---
# [TASK-AAO-0209] Ticket directory glob parity

> **任務開卡** — Ticket directory glob parity
> **定位**：Backlog-P1
> **前置依賴**：無

## 問題描述

Align trailing directory glob ticket grants with canonical matching while preserving existing prefix and authorization boundaries.

## INPUT_CONTRACT

- Reproduction observed 2026-10-18 under TASK-AAO-0208: grant packages/*/dist/** rejects packages/cli/dist/index.js; renewal does not repair matching. Normal explicit amendment to 27 concrete paths works, but is a workaround, not product parity.
- Root cause to verify before editing: pathMatchesWriteScope in packages/core/src/broker/write-scope-policy.ts handles trailing /** with literal prefix comparison, ignoring interior globs. Read actual canonical normalization/globToRegExp semantics first.
- No dependencies or import/resume work: original cards PROG-2-0130/0131 are out of scope.

## OUTPUT_CONTRACT

- [ ] packages/core/src/broker/write-scope-policy.ts
- [ ] tests/cli/work-admission-ticket-scope-glob-parity.test.ts
- [ ] tests/cli/scope-amendment-work-admission-ticket.test.ts

## VALIDATION_CMD

```bash
node --strip-types tests/cli/work-admission-ticket-scope-glob-parity.test.ts
node --strip-types tests/cli/scope-amendment-work-admission-ticket.test.ts
node --strip-types tests/cli/work-admission-ticket-claim.test.ts
node --strip-types tests/cli/work-admission-coverage-gates.test.ts
npm run typecheck
git diff --check
```

## ROLLBACK_HINT

```bash
# Revert this task's delivery through normal ATM governance.
# Do not reset the shared worktree or restore foreign WIP.
```

## 執行步驟

1. Phase 0 registers only this planned card and compact tasks-aao entry in one planning commit. Phase 1 claims in AI-Atomic-Framework and uses exactly delivery plus closure commits; no game status mirrors.
2. Verify prerequisite source/test paths and atom ownership; amend scope normally before any additional write. Existing focused test is amended, not duplicated; no new module/file or large refactor.
3. Capture a failing regression for the actual directory grant, then minimally fix interior * and ** patterns to agree with canonical glob matching. Preserve existing plain-prefix and root-directory semantics.
4. Test parity through real work-admission tickets for every operation: write, stage, commit, close and push. Cover exact paths, directory itself, nested globs, normalized slashes and sibling-prefix/outside negatives.
5. Prove actor, lane, expiry, claim generation, ticket and lifecycle rejection remain unchanged. Run all validators and preserve red-to-green command evidence; missing evidence blocks delivery.

## Boundaries

- No permission broadening outside canonical scope semantics. A pattern fix must not weaken containment, identity, ticket or lifecycle checks.
- Only matcher and necessary existing tests plus runtime-managed task evidence/ledger/events may change. Forbidden: runner/release/dist, framework installation in adopters, master, planning card status mirrors, original game cards and foreign WIP.
- Runner synchronization, if required, needs a separate formal task. No emergency, force, skipped hooks or direct backend workaround.

*由 codex-gpt-6 透過 task-card-opener 開立 | 2026-10-18*
