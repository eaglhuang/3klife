---
task_id: ATM-GOV-0169
title: Block claims on foreign or unowned task-scoped WIP
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0170
amendment_epoch: 1
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  The confirmed ATM-BUG-2026-07-18-002 claim-admission gap belongs to
  governance-optimization and ATM-GOV-0168 is occupied by the lane-aware
  same-task repair, so this card takes the next free GOV id.
scopePaths:
  - packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/next/__tests__/active-work-summary.spec.ts
  - packages/cli/src/commands/next/__tests__/claim-readiness.test.ts
  - tests/cli/claim-foreign-unstaged-wip.test.ts
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - docs/governance/command-surface.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - .atm/history/evidence/ATM-GOV-0169.*
  - .atm/history/task-events/ATM-GOV-0169/**
  - .atm/history/tasks/ATM-GOV-0169.json
deliverables:
  - packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - tests/cli/claim-foreign-unstaged-wip.test.ts
validators:
  - node --strip-types packages/cli/src/commands/next/__tests__/active-work-summary.spec.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/claim-readiness.test.ts
  - node --strip-types tests/cli/claim-foreign-unstaged-wip.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.next.active-work-summary
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.claim.foreign-unstaged-wip-admission
      pattern: Policy Object
      source: packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0169 - Foreign Unstaged WIP Claim Admission

## Context

ATM-BUG-2026-07-18-002 reproduced a shared-worktree collision: `next --claim`
reported no foreign work and admitted a second lane for ATM-GOV-0168 while a
Cursor agent already had unstaged changes in the card's declared scope. The
absence of a ledger claim must not make task-scoped WIP invisible.

Claiming this card first exposed ATM-BUG-2026-07-18-003: the line-budget gate
blocks `claim-orchestration.ts` before an extraction/refactor task can legally
touch it. ATM-GOV-0170 must close first so this card can proceed without a
manual bypass.

## Required Behavior

- Inspect both staged and unstaged Git changes before claim admission.
- Classify each changed path as active-task-owned, current-candidate-owned,
  unrelated, or unowned. Never infer an editor or actor when evidence is absent.
- If a staged or unstaged path intersects the candidate's code scope and is not
  proven owned by the requesting lane, refuse admission with
  `ATM_CLAIM_FOREIGN_UNSTAGED_WIP`; details include `taskId`,
  `intersectingFiles`, `ownership` (`foreign` or `unowned`), and any known
  owner/session/lane.
- Unrelated dirty files and docs/ledger-only candidate writes remain
  non-blocking. R1/R2/R3/R4 behavior remains unchanged.
- Active-work summaries and next playbook evidence expose this classification so
  Captain can coordinate instead of blindly retrying.

## Acceptance

Use isolated fixture repos to prove: unowned unstaged code WIP blocks a matching
claim; a foreign claimed lane reports its owner; unrelated dirty files do not
block; and a docs-only candidate is not blocked by code WIP. Add the error code
and command-surface documentation. Do not use the live shared worktree as a
test fixture.
