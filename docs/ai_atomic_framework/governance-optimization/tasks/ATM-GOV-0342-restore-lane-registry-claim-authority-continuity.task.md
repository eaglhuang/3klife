---
task_id: ATM-GOV-0342
title: Restore lane-registry claim authority continuity
status: done
owner: atm-captain
priority: P0
depends_on: [ATM-GOV-0325]
causalGraph:
  causalDependencies: [ATM-GOV-0325]
  startConditions:
    - Preserve all foreign staged bytes and rescue-worktree evidence.
    - Diagnose the active claim, work session, governance lock, and lane-registry tuple before mutation.
  softRelations: [TASK-LANE-0023, TASK-ERR-0007]
  changedPublicSeams:
    - lane-session resolution and adoption
    - claim repair diagnosis and lifecycle recovery
  causalImpactEdges:
    - active-claim-to-lane-registry-authority
    - repair-diagnosis-to-renew-and-close-recovery
  parallelFrontierInputs: [TASK-LANE-0023]
  validatorReferences: [test_lane_registry_claim_authority_continuity_0342]
  phaseOwner: Wave-2-governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/lane-session/resolve.ts
  - packages/cli/src/commands/lane-session/adopt-rebind.ts
  - packages/cli/src/commands/tasks/claim-repair-diagnostics.ts
  - packages/cli/src/commands/tasks/repair-claim-orchestrator.ts
  - packages/cli/src/commands/lane-session/__tests__/**
  - packages/cli/src/commands/tasks/__tests__/**
deliverables:
  - packages/cli/src/commands/lane-session/resolve.ts
  - packages/cli/src/commands/tasks/claim-repair-diagnostics.ts
  - packages/cli/src/commands/lane-session/__tests__/claim-authority-continuity.test.ts
validators:
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/claim-authority-continuity.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_lane_registry_claim_authority_continuity_0342
    targetGroupId: null
    semanticKey: lane_registry_claim_authority_continuity
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [active-claim-to-lane-registry-authority, repair-diagnosis-to-renew-and-close-recovery]
    expectedRedPredicate: a claim with a missing or stale registry lane is reported as valid-active and cannot be renewed or recovered
    contributionResourceKey: atm.lane-session-authority
    responsibility: task-required
    dependencyEdge: lane-registry-authority
    contractEdge: claim-authority-continuity
    resourceKey: atm.lane-session-authority
requiredTestCaseIds: [test_lane_registry_claim_authority_continuity_0342]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the authority resolver and restore the prior lane registry behavior; repair receipts must remain append-only evidence.
atomizationImpact:
  ownerAtomOrMap: atm.lane-session-authority
  mapUpdates: []
  extractionCandidates:
    - atom: atm.lane-registry-claim-authority
      pattern: Policy Object
      source: packages/cli/src/commands/lane-session/resolve.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_LANE_SESSION_NOT_FOUND
    disposition: reuse
    category: lane-session
    trigger: A claim references a lane id absent from the canonical lane registry.
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs tasks repair-claim --task <task> --actor <actor> --json
    sourceOwner: packages/cli/src/commands/lane-session/resolve.ts
    registryOwnerTask: null
    tests: [packages/cli/src/commands/lane-session/__tests__/claim-authority-continuity.test.ts]
completed_at: "2026-08-09T21:43:04.589Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-09T21:43:04.589Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-09T21-43-04-589Z-close-776a05a09843"
lastTransitionAt: "2026-08-09T21:43:04.589Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "692ec05b1b851e5289553acdfa22a1a6295c78ec"
---

# ATM-GOV-0342 — Restore Lane-Registry Claim Authority Continuity

## Causal trigger

During Wave 2 delivery, `TASK-LANE-0023` was active in the task ledger while its claimed lane could not be resolved or adopted. `tasks renew` returned same-actor `ATM_TASK_CLAIM_OWNER_MISMATCH`; `lane adopt` returned `ATM_LANE_SESSION_NOT_FOUND`; and diagnose-first `tasks repair-claim` classified the claim as valid-active using only heartbeat age. The three authority stores therefore disagreed.

This repeats backlog incidents ATM-BUG-2026-07-29-267, ATM-BUG-2026-07-29-271, and ATM-BUG-2026-07-30-277. It blocks the governed commit that must precede the release publication and ERR-0007 closeout.

## Goal

Make claim authority a single verifiable tuple: active claim, active work session, governance lock, and canonical lane registry must agree on the same lane identity. A missing, expired, released, or mismatched lane is not a valid active claim. The repair path must provide an attributable, bounded rebind or release-and-reclaim decision; it must never silently mint a competing lane.

## Acceptance

1. A fresh active claim whose lane resolves in the canonical registry can renew, commit, and close using that lane.
2. A claim referencing a missing, expired, released, or mismatched registry lane is diagnosed as repairable drift, not `valid-active-claim`.
3. Recovery returns a structured lane-specific decision: rebind only when actor and continuity evidence match; otherwise release the stale claim with a receipt and require normal reclaim. No raw Git, direct runtime edits, or actor-id-only override.
4. Bare lane resolution must not silently mint a new incompatible lane when a task-bound claim references an unavailable lane; it must expose an exact recovery command or broker decision.
5. Focused regression covers valid continuity, missing registry lane, expired lane, actor mismatch, and rebind/reclaim negative paths while preserving foreign staged files.

## Non-goals

- Do not change ERR-0007 behavior or its planning-root contract.
- Do not delete the 23 rescue worktrees or modify their evidence hold.
- Do not loosen lane, ticket, index, or emergency approval checks.

## Evidence and handoff

- Reproduction: `TASK-LANE-0023`, `ATM_TASK_CLAIM_OWNER_MISMATCH`, `ATM_LANE_SESSION_NOT_FOUND`, and `ATM_TASKS_REPAIR_CLAIM_BLOCKED` receipts on 2026-08-09.
- Backlog lineage: ATM-BUG-2026-07-29-267, ATM-BUG-2026-07-29-271, ATM-BUG-2026-07-30-277.
- On green delivery, re-run the LANE-0023 governed commit dry-run, then continue the runner publication and reclaim/close TASK-ERR-0007.
