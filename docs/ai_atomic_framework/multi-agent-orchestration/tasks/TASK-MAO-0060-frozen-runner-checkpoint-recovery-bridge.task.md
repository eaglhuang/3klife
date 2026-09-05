---
task_id: TASK-MAO-0060
doc_id: doc_mao_0060
title: "frozen runner checkpoint recovery bridge"
status: planned
owner: atm-core
priority: P1
milestone: M8F
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0058"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/batch/implementation.ts"
  - "packages/cli/src/commands/batch/**"
  - "packages/cli/src/commands/runner/**"
  - "packages/cli/src/commands/taskflow/**"
  - "packages/core/src/broker/**"
  - "tests/cli/batch-checkpoint-runner-sync-recovery.test.ts"
  - "tests/cli/batch-checkpoint-runner-sync-recovery-bridge.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/batch/**"
  - "packages/cli/src/commands/runner/**"
  - "packages/cli/src/commands/taskflow/**"
  - "packages/core/src/broker/**"
  - "tests/cli/batch-checkpoint-runner-sync-recovery.test.ts"
  - "tests/cli/batch-checkpoint-runner-sync-recovery-bridge.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "node --strip-types tests/cli/batch-checkpoint-runner-sync-recovery.test.ts"
  - "node --strip-types tests/cli/batch-checkpoint-runner-sync-recovery-bridge.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
causalGraph:
  causalDependencies: []
  startConditions:
    - "TASK-MAO-0058 governed branch/commit queue behavior remains green"
    - "candidate source and frozen runner base are both digest-addressable"
  softRelations:
    - "ATM-BUG-2026-08-12-001 cross-card index authority policy remains out of scope"
  changedPublicSeams:
    - "batch checkpoint"
    - "runner publication recovery"
  causalImpactEdges:
    - "stale frozen runner -> governed recovery ticket"
    - "publication refusal -> commit-candidate bridge"
  parallelFrontierInputs:
    - "broker shared-write admission"
    - "runner publication receipt"
  validatorReferences:
    - "batch-checkpoint-runner-sync-recovery"
    - "batch-checkpoint-runner-sync-recovery-bridge"
  phaseOwner: "neutral-steward"
testContributions:
  - caseId: test_batch_checkpoint_runner_sync_recovery_5c7e6c2a
    targetGroupId: null
    semanticKey: batch_checkpoint_runner_sync_recovery
    coversAcceptance: [ACC-1, ACC-3]
    coversImpactEdges: ["stale frozen runner -> governed recovery ticket"]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: "TASK-MAO-0058"
    contractEdge: runner_recovery_contract
    resourceKey: batch_checkpoint_runner_sync
  - caseId: test_batch_checkpoint_runner_sync_bridge_9a4d1f73
    targetGroupId: null
    semanticKey: batch_checkpoint_runner_sync_bridge
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: ["publication refusal -> commit-candidate bridge"]
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: runner_recovery_bridge_contract
    resourceKey: batch_checkpoint_runner_sync_bridge
requiredTestCaseIds:
  - test_batch_checkpoint_runner_sync_recovery_5c7e6c2a
  - test_batch_checkpoint_runner_sync_bridge_9a4d1f73
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the recovery bridge, receipts, and focused tests together if candidate publication or bridge atomicity is not deterministic."
atomizationImpact:
  ownerAtomOrMap: "atm.batch-checkpoint-runner-sync"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  extractionCandidates:
    - atom: "atm.batch-checkpoint-recovery-policy"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/batch/implementation.ts"
      disposition: follow-up-card
      inlineReason: null
errorCodes:
  - code: ATM_RUNNER_STALE_WRITE_REFUSED
    disposition: reuse
    category: guard
    trigger: "Frozen runner seal does not match the candidate source required by checkpoint write."
    retryable: true
    requiresHumanApproval: false
    recovery: "node atm.mjs batch checkpoint --actor <id> --json"
    sourceOwner: "packages/cli/src/commands/batch/implementation.ts"
    registryOwnerTask: TASK-MAO-0060
    tests:
      - test_batch_checkpoint_runner_sync_recovery_5c7e6c2a
  - code: ATM_SOURCE_FIRST_WRITE_REFUSED
    disposition: reuse
    category: guard
    trigger: "Source-first mode would perform a lifecycle write while the frozen runner is stale or publication is forbidden."
    retryable: false
    requiresHumanApproval: false
    recovery: "node atm.mjs batch checkpoint --actor <id> --json"
    sourceOwner: "packages/cli/src/commands/batch/implementation.ts"
    registryOwnerTask: TASK-MAO-0060
    tests:
      - test_batch_checkpoint_runner_sync_bridge_9a4d1f73
outOfScope:
  - "Do not decide cross-card shared-index authority; ATM-BUG-2026-08-12-001 remains owner-policy deferred."
  - "Do not run npm publication or modify release tags."
  - "Do not edit .atm/runtime/** directly or use native Git as the normal recovery path."
---

# TASK-MAO-0060 - frozen runner checkpoint recovery bridge

## Goal

Give `batch checkpoint` one governed recovery path when staged source changes
make the frozen runner stale, without weakening source-first fail-closed
semantics or performing a partial task close.

## Acceptance criteria

- **ACC-1:** stale frozen runner produces a brokered, candidate-bound recovery
  ticket rather than an unstructured refusal.
- **ACC-2:** when runner publication is not admissible, a VCS-neutral
  commit-candidate bridge is returned with an executable next command and no
  lifecycle mutation.
- **ACC-3:** successful publication is bound to candidate HEAD and seal digest;
  checkpoint resumes only after both match.
- **ACC-4:** source-first and failure paths are byte-identical in task ledger,
  close packet, and task events.

## Required red/green evidence

The two declared case IDs must first fail on the current sealed runner at the
behavior assertion, then pass on the candidate source and freshly sealed
runner. Evidence must bind the same test digest, public seam, baseline SHA,
and candidate SHA in both phases.
