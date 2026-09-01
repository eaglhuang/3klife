---
task_id: ATM-GOV-0347
title: Recover active claim direction locks and honor explicit task claims
status: planned
owner: atm-captain
priority: P0
depends_on: []
causalGraph:
  causalDependencies:
    - An adopted, active claim can retain a released direction-lock snapshot after an interrupted close/checkpoint path.
    - An explicit task claim can be redirected to an unrelated stale batch head before claim admission.
  startConditions:
    - Reproduce both defects in isolated fixtures without editing runtime state directly.
  softRelations:
    - ATM-GOV-0345 is the blocked consumer; 0347 must be independently claimable to repair its lifecycle state.
    - ATM-GOV-0330 resumes after its explicit claim reaches the requested task.
  changedPublicSeams:
    - task-scope-amendment-recovery
    - explicit-task-claim-routing
  causalImpactEdges:
    - active-claim -> direction-lock-repair -> scoped-mutation
    - explicit-task-intent -> task-selection -> batch-admission
  parallelFrontierInputs:
    - active-claim-and-released-direction-lock
    - stale-batch-run
  validatorReferences:
    - test_scope_repair_active_claim_0347
    - test_explicit_task_claim_precedes_batch_0347
    - validate:cli
  phaseOwner: correction-wave-3-lifecycle-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/scope-amendment/implementation.ts
  - packages/cli/src/commands/tasks/scope-queue.ts
  - packages/cli/src/commands/tasks/__tests__/scope-queue.spec.ts
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next-active-batch.ts
  - packages/cli/src/commands/next/__tests__/task-scoped-claim-command.spec.ts
deliverables:
  - packages/cli/src/commands/tasks/scope-amendment/implementation.ts
  - packages/cli/src/commands/tasks/__tests__/scope-queue.spec.ts
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/next/__tests__/task-scoped-claim-command.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/tasks/__tests__/scope-queue.spec.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/task-scoped-claim-command.spec.ts
  - npm run validate:cli
testContributions:
  - caseId: test_scope_repair_active_claim_0347
    targetGroupId: null
    semanticKey: active_claim_rebuilds_released_direction_lock
    coversAcceptance: [ACC-1, ACC-2, ACC-5]
    coversImpactEdges: [active-claim -> direction-lock-repair -> scoped-mutation]
    expectedRedPredicate: a valid active claim with a released direction lock cannot use the advertised claim-first or repair route
    contributionResourceKey: atm.task-scope-amendment
    responsibility: task-required
    dependencyEdge: task-scope-amendment-recovery
    contractEdge: active-claim-direction-lock
    resourceKey: atm.task-scope-amendment
  - caseId: test_explicit_task_claim_precedes_batch_0347
    targetGroupId: null
    semanticKey: explicit_task_claim_precedes_stale_batch
    coversAcceptance: [ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [explicit-task-intent -> task-selection -> batch-admission]
    expectedRedPredicate: next --claim --task X selects a different active-batch head instead of X
    contributionResourceKey: atm.next-routing
    responsibility: task-required
    dependencyEdge: explicit-task-claim-routing
    contractEdge: explicit-task-precedence
    resourceKey: atm.next-routing
requiredTestCaseIds:
  - test_scope_repair_active_claim_0347
  - test_explicit_task_claim_precedes_batch_0347
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - contract-migration
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the unified claim-lock recovery and explicit-task precedence change; stale batches remain fail-closed and no runtime state is hand-repaired.
atomizationImpact:
  ownerAtomOrMap: atm.task-claim-routing
  mapUpdates: []
  extractionCandidates:
    - atom: atm.active-claim-direction-recovery
      pattern: Policy Object
      source: packages/cli/src/commands/tasks/scope-amendment/implementation.ts
      disposition: inline
      inlineReason: The scope-amendment module is the sole public owner of direction-lock recovery policy.
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0347 Recover active claim direction locks and honor explicit task claims

## Intent

Repair one generic lifecycle consistency rule: an active, valid claim and its
direction lock are one authority fact.  If a close/checkpoint interruption
leaves the lock marked released while the claim remains valid, the advertised
claim-first and emergency repair routes must restore the lock from the live
claim rather than returning a circular refusal.

Also make explicit task selection authoritative at the routing boundary.
`next --claim --task X` must either operate on X or fail with a diagnosis about
X; a stale or unrelated batch may constrain X only after X has been selected.
It may never silently substitute another task.

Both repairs must use live claim, lane, task, and batch facts.  Do not add task
ID allowlists, actor fallbacks, raw ledger edits, force-claim behavior, or a
second lifecycle registry.

## Acceptance

- [ ] ACC-1: A live claim with matching actor/lane and a released direction
  lock is diagnosed as recoverable; the official claim-first or scope-repair
  path restores one active lock without changing the claim owner or dropping
  allowed files.
- [ ] ACC-2: Missing, expired, actor-mismatched, or lane-mismatched claims
  remain fail-closed and do not create a direction lock.
- [ ] ACC-3: An explicit `next --claim --task X` selects X before consulting
  any active batch; if X is ineligible, the result names X and its actual
  blocker rather than another batch head.
- [ ] ACC-4: A taskless/broad prompt retains current batch queue behavior, and
  stale-batch recovery stays explicit rather than being silently bypassed.
- [ ] ACC-5: Both focused regressions and `validate:cli` pass with
  command-backed evidence; all recovery decisions expose a precise next action.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-11T17:06:41.703Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0347-recover-active-claim-direction-locks-and-honor-explicit-task-claims.task.md","contentDigest":"sha256:50843da85b619c53a711855454b6158febf369623252466fbbd38dd5a6c9465c"} -->
