---
task_id: ATM-GOV-0157
title: Classify task import force writes as Tier 1 ledger ingestion
status: done
owner: atm-release
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/ATM-GOV-0157-ledger-import-tier1-admission.task.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/import-planning-authority.ts
  - packages/cli/src/commands/tasks/import-validation.ts
  - packages/cli/src/commands/tasks/__tests__/task-import-tier1-admission.spec.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
deliverables:
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/import-planning-authority.ts
  - packages/cli/src/commands/tasks/import-validation.ts
  - packages/cli/src/commands/tasks/__tests__/task-import-tier1-admission.spec.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
validators:
  - node --strip-types packages/cli/src/commands/tasks/__tests__/task-import-tier1-admission.spec.ts
  - node --strip-types tests/cli/cli-result-contract.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-import-ledger-ingestion
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.task-import-tier1-admission
      pattern: Admission Policy
      source: packages/cli/src/commands/tasks/import-orchestrator.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-17T08:06:12.656Z"
completed_by_agent: "codex-gov-0157"
closedAt: "2026-07-17T08:06:12.656Z"
closedByActor: "codex-gov-0157"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-17T08-06-12-555Z-close-a65afd44b756"
lastTransitionAt: "2026-07-17T08:06:12.656Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "18eac650ee471810813380429064ba4db83f37c2"
---

# ATM-GOV-0157 - Classify task import force writes as Tier 1 ledger ingestion

## Context

During parallel governance dogfood, a lane attempting to force-import task cards
from the governance workbench into the target ATM ledger was blocked as if it
were mutating framework code and required a human emergency lease. This is too
broad: task import is governance ledger ingestion. It writes target
`.atm/history/**` ledger records, import diagnostics, and task events; it does
not change framework source, release artifacts, build output, or protected code
surfaces.

This violates the highest parallel governance principle: Tier 0 reads and Tier 1
private ledger/evidence/planning writes should not queue behind unrelated lanes.
Only Tier 2 shared mutation surfaces require broker/steward serialization.

## Decision

`tasks import` and `tasks import --force` must be treated as Tier 1 governance
ledger ingestion when the command writes only imported task ledger records and
their import events/evidence under `.atm/history/**`.

The command must not be blocked by unrelated framework source dirty files,
runner staleness, runner-sync queue state, build-window admission, release
mirror WIP, or foreign WIP that does not touch the same imported task ledger.

## Acceptance Criteria

- `tasks import --force` can import or refresh open planned task cards into the
  target `.atm/history/**` ledger while unrelated code/build/release/skill WIP
  exists in the shared worktree.
- Import admission still blocks or escalates when the same target task has a
  fresh active claim/lane session.
- Import admission still blocks or requires explicit repair/migration mode when
  the import would overwrite closed target-authority history.
- Import admission still enforces Planning Authority Resolution Gate failures
  when the source planning authority cannot be resolved or is not allowed.
- Import admission still refuses non-ledger mutations. Any import path that
  would write outside `.atm/history/**` must go through the normal shared-write
  broker/steward path.
- Error codes and user-facing guidance distinguish ledger-ingestion conflicts
  from code/build/release shared-write conflicts. No human emergency lease is
  required for clean Tier 1 task import.
- Regression tests reproduce the original dogfood failure: unrelated dirty
  skills/release artifacts exist, yet `tasks import --force` for an unrelated
  planned task succeeds or returns a task-local conflict, not an emergency lease
  requirement.

## Non-goals

- Do not weaken same-task claim ownership, closed-history protection, or
  planning authority validation.
- Do not allow import to mutate `.atm/runtime/**` as a bypass.
- Do not bypass broker/steward for commits, runner-sync, build outputs, release
  mirrors, or projection regeneration.

## Implementation Notes

- Prefer extracting the admission rule into a small import admission helper
  rather than expanding a large command module.
- The helper should classify import writes as:
  - `tier1-ledger-ingestion` when every write is `.atm/history/**`;
  - `task-local-conflict` for same-task active claim/lane or closed-history
    overwrite conflicts;
  - `tier2-shared-write` for any non-ledger mutation.
- The error details should report `taskId`, `sourcePlanPath`,
  `planningRepoRoot`, `targetRepoRoot`, `admissionClass`, and the concrete
  blocking reason.

## Rollback

Revert the implementation commit. Existing imported ledger files remain normal
ATM history and should not be deleted unless a separate governed repair task
explicitly authorizes history migration.
