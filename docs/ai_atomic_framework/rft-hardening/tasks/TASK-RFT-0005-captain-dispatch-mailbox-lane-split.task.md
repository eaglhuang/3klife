---
doc_id: doc_rft_0005
task_id: TASK-RFT-0005
title: "captain-dispatch-mailbox.ts lane split"
status: done
owner: atm-core
priority: P1
milestone: RFT-M2
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/captain-dispatch-mailbox.ts"
  - "scripts/captain-dispatch-mailbox/layout.ts"
  - "scripts/captain-dispatch-mailbox/ledger.ts"
  - "scripts/captain-dispatch-mailbox/cli.ts"
  - "scripts/captain-dispatch-mailbox/stop-loss.ts"
  - "scripts/captain-dispatch-mailbox/frontmatter.ts"
  - "scripts/captain-dispatch-mailbox/lanes/inbox.ts"
  - "scripts/captain-dispatch-mailbox/lanes/outbox.ts"
  - "scripts/captain-dispatch-mailbox/lanes/reports.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/layout.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/ledger.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/inbox.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/outbox.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/reports.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/stop-loss.spec.ts"
  - "scripts/validate-captain-dispatch-atomic-map.ts"
  - "docs/reports/captain-dispatch-mailbox-atomic-map.md"
deliverables:
  - "scripts/captain-dispatch-mailbox.ts"
  - "scripts/captain-dispatch-mailbox/layout.ts"
  - "scripts/captain-dispatch-mailbox/ledger.ts"
  - "scripts/captain-dispatch-mailbox/cli.ts"
  - "scripts/captain-dispatch-mailbox/stop-loss.ts"
  - "scripts/captain-dispatch-mailbox/frontmatter.ts"
  - "scripts/captain-dispatch-mailbox/lanes/inbox.ts"
  - "scripts/captain-dispatch-mailbox/lanes/outbox.ts"
  - "scripts/captain-dispatch-mailbox/lanes/reports.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/layout.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/ledger.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/inbox.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/outbox.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/reports.spec.ts"
  - "scripts/captain-dispatch-mailbox/__tests__/stop-loss.spec.ts"
  - "scripts/validate-captain-dispatch-atomic-map.ts"
  - "docs/reports/captain-dispatch-mailbox-atomic-map.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-captain-dispatch-atomic-map.ts"
  - "node --strip-types scripts/captain-dispatch-mailbox/__tests__/layout.spec.ts"
  - "node --strip-types scripts/captain-dispatch-mailbox/__tests__/ledger.spec.ts"
  - "node --strip-types scripts/captain-dispatch-mailbox/__tests__/inbox.spec.ts"
  - "node --strip-types scripts/captain-dispatch-mailbox/__tests__/outbox.spec.ts"
  - "node --strip-types scripts/captain-dispatch-mailbox/__tests__/reports.spec.ts"
  - "node --strip-types scripts/captain-dispatch-mailbox/__tests__/stop-loss.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if mailbox phase output, ledger schema, or stop-loss thresholds change."
atomizationImpact:
  ownerAtomOrMap: "atm.captain-dispatch-mailbox-atomic-map"
  mapUpdates:
    - "docs/reports/captain-dispatch-mailbox-atomic-map.md"
outOfScope:
  - "Changing the mailbox CLI argument set"
  - "Changing ledger JSON schema"
  - "Changing stop-loss accounting thresholds"
nonGoals:
  - "Do not merge inbox/outbox lanes — keep them addressable."
  - "Do not silently drop captain-report receivers."
completed_at: "2026-07-10T02:28:38.832Z"
completed_by_agent: "cursor-composer-rft0005"
closedAt: "2026-07-10T02:28:38.832Z"
closedByActor: "cursor-composer-rft0005"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T02-28-36-830Z-close-7e2c5505b548"
lastTransitionAt: "2026-07-10T02:28:38.832Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9457a002d6c42a45b1ee05b81a129c1e8e7df0b6"
---

# TASK-RFT-0005 - captain-dispatch-mailbox.ts lane split

## Goal

Reduce `scripts/captain-dispatch-mailbox.ts` (2,009 lines as of 2026-06-20) into a thin Facade by splitting layout, ledger, CLI, stop-loss, frontmatter, and three lane modules (inbox/outbox/reports) into separate files.

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill (`Strategy Map` + `Facade`). Per casebook RFT-0005 forward case:

1. **`captain-dispatch-mailbox/layout.ts`** — owns `resolveLayout`, `ensureLayout`, `acquireLock`, `requireAgentLayout`.
2. **`captain-dispatch-mailbox/ledger.ts`** — owns `readLedger`, `writeLedger`, `createLedger`.
3. **`captain-dispatch-mailbox/cli.ts`** — owns `parseArgs`, `printHelp`, `requireValue`, `parseAgents`, `assertSafeId`.
4. **`captain-dispatch-mailbox/stop-loss.ts`** — owns `createStopLossState`, `createWorkerStopLossState`, `normalizeStopLoss`.
5. **`captain-dispatch-mailbox/frontmatter.ts`** — owns `fmString`, `resolveDispatchId`, frontmatter parsing helpers.
6. **`captain-dispatch-mailbox/lanes/inbox.ts`** — **Strategy** for the inbox lane: `dispatchQueuedWork`, `scanUnclaimed`, `seedDemoQueue`.
7. **`captain-dispatch-mailbox/lanes/outbox.ts`** — **Strategy** for the outbox lane: `pollWorkers`, `pollOneWorker`, `completeSimulatedWorker`.
8. **`captain-dispatch-mailbox/lanes/reports.ts`** — **Strategy** for reports: `receiveCaptainReports`, `isThinDoneReport`.
9. **`captain-dispatch-mailbox.ts`** — thin Facade composing the lanes; entry point still callable as `node --strip-types scripts/captain-dispatch-mailbox.ts ...`.

## Required Behavior

- All existing mailbox CLI options (`--phase`, `--agents`, `--demo`, `--stop-loss`, etc) keep their semantics.
- Ledger JSON schema field names are unchanged.
- `captain-dispatch-mailbox.ts` after the split must be under 400 lines.
- Atomic-map report enumerates each module, its public surface, and pre/post line counts.

## Testing Requirements

- `layout.spec.ts`:
  - one fresh layout case;
  - one existing-layout case (idempotent);
  - one lock-conflict case asserting `acquireLock` returns a release function.
- `ledger.spec.ts`:
  - one read of valid ledger;
  - one read of missing ledger (creates default);
  - one write round-trip preserves field order.
- `inbox.spec.ts`:
  - one successful dispatch case;
  - one stale-unclaimed scan case;
  - one demo-queue seed case.
- `outbox.spec.ts`:
  - one poll case finding worker reports;
  - one simulated-worker completion case;
  - one no-workers case (graceful no-op).
- `reports.spec.ts`:
  - one fresh captain-report receive case;
  - one duplicate-report case (idempotent);
  - one thin-done-report detection case.
- `stop-loss.spec.ts`:
  - one within-budget case;
  - one budget-exceeded case;
  - one worker-budget-exceeded case.

Add `scripts/validate-captain-dispatch-atomic-map.ts` asserting:

- all 8 sub-modules exist;
- each lane has a spec;
- `captain-dispatch-mailbox.ts` is below 400 lines;
- `parseArgs` still parses every documented CLI flag.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-captain-dispatch-atomic-map.ts
node --strip-types scripts/captain-dispatch-mailbox/__tests__/layout.spec.ts
node --strip-types scripts/captain-dispatch-mailbox/__tests__/ledger.spec.ts
node --strip-types scripts/captain-dispatch-mailbox/__tests__/inbox.spec.ts
node --strip-types scripts/captain-dispatch-mailbox/__tests__/outbox.spec.ts
node --strip-types scripts/captain-dispatch-mailbox/__tests__/reports.spec.ts
node --strip-types scripts/captain-dispatch-mailbox/__tests__/stop-loss.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`.
