---
task_id: ATM-GOV-0408
title: Prove bounded validator deadlines and single-writer evidence concurrency
status: done
owner: unassigned
priority: P1
series: GOV
series_reason: Evidence execution, validator deadlines, and concurrent writer safety are existing governance-optimization concerns owned by the registered GOV family.
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: [ATM-BUG-2026-08-09-006, ATM-BUG-2026-07-19-018]
  changedPublicSeams: [validator-deadline-policy, task-evidence-single-writer-lock]
  causalImpactEdges:
    - validator-deadline-terminates-owned-child-before-return
    - same-task-evidence-writes-never-overlap
    - lock-contention-returns-actionable-retry-without-corrupting-evidence
  parallelFrontierInputs: [task-id-scoped-evidence-lock, validator-timeout-policy]
  validatorReferences: [test_gov_evidence_write_lock_concurrency_0408, test_gov_test_facade_timeout_policy_0408]
  phaseOwner: null
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4-1.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/evidence/bundle-io/implementation.ts
  - packages/cli/src/commands/evidence/__tests__/run.spec.ts
  - tests/cli/evidence-write-lock-concurrency.test.ts
  - tests/cli/test-facade-timeout-policy.test.ts
deliverables:
  - tests/cli/evidence-write-lock-concurrency.test.ts
  - packages/cli/src/commands/evidence/__tests__/run.spec.ts
validators:
  - node --strip-types tests/cli/evidence-write-lock-concurrency.test.ts
  - node --strip-types packages/cli/src/commands/evidence/__tests__/run.spec.ts
  - node --strip-types tests/cli/test-facade-timeout-policy.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_gov_evidence_write_lock_concurrency_0408
    targetGroupId: null
    semanticKey: task_scoped_evidence_write_lock
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [same-task-evidence-writes-never-overlap, lock-contention-returns-actionable-retry-without-corrupting-evidence]
    expectedRedPredicate: A second concurrent evidence writer either succeeds while the first writer owns the lock or leaves a partial/corrupt evidence bundle.
    contributionResourceKey: evidence-write-lock
    responsibility: task-required
    dependencyEdge: evidence-command-to-task-scoped-lock
    contractEdge: task-evidence-single-writer-lock
    resourceKey: task-evidence-path
  - caseId: test_gov_test_facade_timeout_policy_0408
    targetGroupId: null
    semanticKey: owned_validator_deadline
    coversAcceptance: [ACC-1]
    coversImpactEdges: [validator-deadline-terminates-owned-child-before-return]
    expectedRedPredicate: An outer validator deadline returns while its child remains live and can overlap a later run.
    contributionResourceKey: test-facade-timeout
    responsibility: task-required
    dependencyEdge: validator-policy-to-child-process-lifecycle
    contractEdge: validator-deadline-policy
    resourceKey: validator-subprocess
requiredTestCaseIds: [test_gov_evidence_write_lock_concurrency_0408, test_gov_test_facade_timeout_policy_0408]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [evidence-first]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the bounded deadline/lock regression changes; preserve evidence files and never rewrite another task's bundle.
atomizationImpact:
  ownerAtomOrMap: atom-evidence-tracking
  mapUpdates: []
  extractionCandidates: []
errorCodes:
  - code: ATM_EVIDENCE_WRITE_LOCK_CONFLICT
    disposition: reuse
    category: guard
    trigger: A second writer cannot acquire the same task's evidence lock before the bounded owner window ends.
    retryable: true
    requiresHumanApproval: false
    recovery: Retry the same evidence command after the active writer finishes.
    sourceOwner: packages/cli/src/commands/evidence/bundle-io/implementation.ts
    registryOwnerTask: ATM-GOV-0408
    tests: [tests/cli/evidence-write-lock-concurrency.test.ts]
createdByCommand: atm plan card create
completed_at: "2026-09-02T02:48:49.411Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-02T02:48:49.411Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-02T02-48-49-411Z-close-c0f335a2e2cb"
lastTransitionAt: "2026-09-02T02:48:49.411Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d288484883b67f007328f10ca42c08789f54a572"
---

# ATM-GOV-0408 Prove bounded validator deadlines and single-writer evidence concurrency

## Intent

Prove, with a real concurrent process regression, that one validator run owns its child deadline and one task owns one evidence writer at a time. The earlier incident showed an outer timeout could return before its child and permit duplicate writes; current source has a timeout policy and task-scoped evidence lock, but lacks the end-to-end concurrency proof needed to close the two historical findings.

## Acceptance

- [ ] ACC-1: A validator deadline owns termination and wait of its child; a completed outer run cannot leave a live child able to overlap a subsequent run.
- [ ] ACC-2: Two concurrent writers for the same task produce exactly one successful evidence mutation while the other returns `ATM_EVIDENCE_WRITE_LOCK_CONFLICT` with a retryable recovery.
- [ ] ACC-3: The losing writer neither truncates nor adds a partial record to the evidence bundle, and the winner leaves no lock residue after completion.

## Scope and boundaries

Planning authority is `C:/Users/User/3KLife`; target and closure authority are `C:/Users/User/AI-Atomic-Framework`. Import this source card only through `node atm.mjs tasks import --from <this-card> --dry-run --json`; no planning path is an implementation allowlist.

The task may adjust only the declared evidence implementation and focused tests. It must not rewrite historical evidence, change global validator budgets, relax a timeout, remove the lock, or treat an in-process unit test as proof of multi-process mutual exclusion.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-02T02:35:48.707Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0408-prove-bounded-validator-deadlines-and-single-writer-evidence-concurrency.task.md","contentDigest":"sha256:e184c8f207a32abe70b2cce4b6d3b8d86f010fd04ead28a6a2bd7252bf7e7724"} -->
