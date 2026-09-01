---
task_id: TASK-LANE-0023
title: Complete framework temporary publication capability lifecycle
status: planned
owner: atm-captain
priority: P0
depends_on: [TASK-LANE-0022]
related_plan: docs/ai_atomic_framework/governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - packages/cli/src/commands/git-governance/work-admission-check.ts
  - packages/cli/src/commands/framework-development/**
  - packages/cli/src/commands/git-governance/__tests__/**
deliverables:
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - packages/cli/src/commands/git-governance/work-admission-check.ts
  - packages/cli/src/commands/git-governance/__tests__/framework-temp-publication-capability.test.ts
validators:
  - node --strip-types packages/cli/src/commands/git-governance/__tests__/framework-temp-publication-capability.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_framework_temp_publication_capability_0023
    targetGroupId: null
    semanticKey: framework_temp_publication_capability
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [temporary-claim-publication-seam]
    expectedRedPredicate: a valid temporary claim cannot publish its sealed inventory
    contributionResourceKey: atm.mutation-capability
    responsibility: task-required
    dependencyEdge: runner-sync-publication
    contractEdge: temporary-claim-publication
    resourceKey: atm.mutation-capability
requiredTestCaseIds: [test_framework_temp_publication_capability_0023]
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the capability-provider and bundle-resolution change, then rebuild and publish a receipt for the reverted sealed source.
atomizationImpact:
  ownerAtomOrMap: atm.mutation-capability
  mapUpdates: []
  extractionCandidates:
    - atom: atm.framework-temp-publication-capability
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/work-admission-check.ts
      disposition: extract
      inlineReason: null
---

# TASK-LANE-0023 — Framework Temporary Publication Capability Lifecycle

## Causal trigger

The live reproduction for `TASK-ERR-0007` created a valid framework temporary lock, runner-sync queue-head, sealed build receipt, and owned output inventory. `node atm.mjs git commit --auto-stage` then failed with `ATM_WRITE_TICKET_MISSING` because it resolved only foreign staged files, not the temporary claim's owned output inventory. Runner-sync release correctly remained publication-pending.

## Goal

Make every valid mutation authority provider expose one coherent, capability-bounded publication path: a framework temporary claim with a sealed output inventory must resolve its eligible auto-stage bundle and work-admission ticket through the same generic admission adapter used by ordinary task claims. No task-id, actor-id, receipt-name, or output-path special case is permitted.

## Acceptance

1. A temp claim + queue-head + matching sealed receipt can publish exactly its inventory through governed `git commit --auto-stage`, then release runner-sync.
2. Foreign staged files remain excluded and byte-preserved.
3. Missing, expired, mismatched-lane, or inventory-incomplete claims fail closed with a broker/recovery decision.
4. Regression test executes the complete claim → build → publication → release lifecycle and its negative variants.
5. The change has one provider-neutral authority seam; delete the duplicate task-only bundle inference rather than adding a fallback branch.

## Non-goals

- No emergency/raw Git publication path.
- No relaxation of tickets, lane binding, foreign-state isolation, or runner receipt verification.

## Evidence links

- `TASK-ERR-0007`, `runner-sync-ddf87b86`, and its `atm.runnerSyncReceipt.v1` are the reproduction record.
- This repairs the unfulfilled public seam promised by `TASK-LANE-0022`; its prior `done` status is not evidence that this lifecycle works.
