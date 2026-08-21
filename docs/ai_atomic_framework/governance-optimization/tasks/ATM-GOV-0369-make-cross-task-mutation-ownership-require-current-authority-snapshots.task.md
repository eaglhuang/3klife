---
task_id: ATM-GOV-0369
title: Make cross-task mutation ownership require current authority snapshots
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions: ["Frozen runner reports active-task-scope conflicts backed only by terminal/released ledger records."]
  softRelations: [ATM-GOV-0351, ATM-GOV-0362, ATM-GOV-0363]
  changedPublicSeams: [atm.crossTaskMutationAuthoritySnapshot.v1]
  causalImpactEdges: [terminal-task-does-not-own-source, live-foreign-task-history-remains-protected, terminal-task-history-opens-only-to-entitlement, admission-failure-restores-pre-operation-state, stale-incident-reconciles-after-authority-change, frozen-runner-publication, publication-takeover-uses-prebuild-snapshot]
  parallelFrontierInputs: [task-ledger, scope-lock, broker-intent, staged-index-candidate]
  validatorReferences: [cross-task-mutation-guard, cross-task-mutation-candidate-index, frozen-runner-doctor]
  phaseOwner: wave-3-governance-substrate-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/cross-task-mutation-guard.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-guard.test.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-candidate-index.test.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-terminal-entitlement.test.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - packages/cli/src/commands/git-governance/implementation/index-restoration.ts
  - tests/cli/git-commit-failure-index-restoration.test.ts
  - scripts/run-sealed-runner-build.ts
  - scripts/run-sealed-runner-build.test.ts
deliverables:
  - packages/core/src/broker/cross-task-mutation-guard.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-guard.test.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-candidate-index.test.ts
  - packages/core/src/broker/__tests__/cross-task-mutation-terminal-entitlement.test.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - packages/cli/src/commands/git-governance/implementation/index-restoration.ts
  - tests/cli/git-commit-failure-index-restoration.test.ts
  - scripts/run-sealed-runner-build.ts
  - scripts/run-sealed-runner-build.test.ts
validators:
  - node --strip-types packages/core/src/broker/__tests__/cross-task-mutation-guard.test.ts
  - node --strip-types packages/core/src/broker/__tests__/cross-task-mutation-candidate-index.test.ts
  - node --strip-types packages/core/src/broker/__tests__/cross-task-mutation-terminal-entitlement.test.ts
  - node --strip-types tests/cli/git-commit-failure-index-restoration.test.ts
  - npm run typecheck
  - node --strip-types scripts/run-sealed-runner-build.test.ts
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - npm run validate:runner-reproducibility
testContributions:
  - caseId: test_atm_gov_0369_terminal_scope_not_live_owner
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: terminal_released_task_scope_is_not_live_ownership
    coversAcceptance: [ACC-1, ACC-3]
    coversImpactEdges: [terminal-task-does-not-own-source, stale-incident-reconciles-after-authority-change]
    expectedRedPredicate: a terminal released ledger record can keep a staged source path blocked as active-task-scope
    contributionResourceKey: cross-task-mutation-authority-snapshot
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.crossTaskMutationAuthoritySnapshot.v1
    resourceKey: cross-task-mutation-guard
  - caseId: test_atm_gov_0369_foreign_task_history_still_blocks
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: foreign_task_history_evidence_remains_fail_closed
    coversAcceptance: [ACC-2]
    coversImpactEdges: [live-foreign-task-history-remains-protected]
    expectedRedPredicate: a foreign task history path can be committed merely because its task is terminal
    contributionResourceKey: cross-task-mutation-authority-snapshot
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.crossTaskMutationAuthoritySnapshot.v1
    resourceKey: cross-task-mutation-guard
  - caseId: test_atm_gov_0369_frozen_runner_publishes_current_authority_rule
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: frozen_runner_uses_current_authority_snapshot
    coversAcceptance: [ACC-4]
    coversImpactEdges: [frozen-runner-publication]
    expectedRedPredicate: frozen runner keeps reporting historical terminal scopes as live owners after source contract is green
    contributionResourceKey: cross-task-mutation-authority-snapshot
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.crossTaskMutationAuthoritySnapshot.v1
    resourceKey: frozen-runner-doctor
  - caseId: test_atm_gov_0369_publication_takeover_binds_prebuild_snapshot
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: publication_takeover_consumes_immutable_prebuild_snapshot
    coversAcceptance: [ACC-4]
    coversImpactEdges: [publication-takeover-uses-prebuild-snapshot]
    expectedRedPredicate: a valid pre-build takeover receipt is rejected after the build creates its sealed outputs
    contributionResourceKey: sealed-runner-publication
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.crossTaskMutationAuthoritySnapshot.v1
    resourceKey: sealed-runner-build
  - caseId: test_atm_gov_0369_terminal_history_needs_reconciliation_entitlement
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: terminal_task_history_opens_only_to_an_entitled_successor
    coversAcceptance: [ACC-5]
    coversImpactEdges: [terminal-task-history-opens-only-to-entitlement]
    expectedRedPredicate: a terminal task's history path is blocked for every writer including one holding an explicit governed reconciliation entitlement, so the residue has no governed writer at all
    contributionResourceKey: cross-task-mutation-authority-snapshot
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.crossTaskMutationAuthoritySnapshot.v1
    resourceKey: cross-task-mutation-guard
  - caseId: test_atm_gov_0369_admission_failure_restores_index_exactly
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: a_refused_governed_commit_is_a_no_op
    coversAcceptance: [ACC-6]
    coversImpactEdges: [admission-failure-restores-pre-operation-state]
    expectedRedPredicate: a refused governed commit leaves part of what it staged behind while reporting an unchanged HEAD as evidence of no residue
    contributionResourceKey: governed-commit-failure-boundary
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.crossTaskMutationAuthoritySnapshot.v1
    resourceKey: git-governance-commit-execution
requiredTestCaseIds: [test_atm_gov_0369_terminal_scope_not_live_owner, test_atm_gov_0369_foreign_task_history_still_blocks, test_atm_gov_0369_frozen_runner_publishes_current_authority_rule, test_atm_gov_0369_publication_takeover_binds_prebuild_snapshot, test_atm_gov_0369_terminal_history_needs_reconciliation_entitlement, test_atm_gov_0369_admission_failure_restores_index_exactly]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert authority-snapshot consumption and focused tests together; never delete foreign task-history evidence for a green doctor.
atomizationImpact:
  ownerAtomOrMap: atm.cross-task-mutation-authority-snapshot
  mapUpdates: []
  extractionCandidates: []
errorCodes:
  - code: ATM_CROSS_TASK_MUTATION_BLOCKED
    disposition: reuse
    category: guard
    trigger: Candidate path has a distinct live authority owner or is foreign task-history evidence.
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs doctor --json
    sourceOwner: packages/core/src/broker/cross-task-mutation-guard.ts
    registryOwnerTask: ATM-GOV-0369
    tests: [packages/core/src/broker/__tests__/cross-task-mutation-guard.test.ts]
createdByCommand: atm plan card create
completed_at: "2026-08-21T09:16:39.839Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-21T09:16:39.839Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-21T09-16-39-839Z-close-07c1088c1620"
lastTransitionAt: "2026-08-21T09:16:39.839Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7e52af2f53e9b011379d08d0c71f5db80043f870"
---

# ATM-GOV-0369 Make cross-task mutation ownership require current authority snapshots

## Intent

Repair the ownership boundary used by cross-task mutation detection. A source
path is protected only when a current canonical authority snapshot proves a
live, non-terminal owner. Historical scope, released claims, and stale
incidents must never regain write ownership merely because they remain in the
ledger.

This card was amended (amendment 1) to absorb ATM-GOV-0397, which rediscovered
the same public seam from the opposite side. The original contract protected
another task's `.atm/history/**` unconditionally, "regardless of terminal
status". That rule is now known to be too strong in one specific way: it is
derived from the *filename*, not from an authority snapshot, so a task that has
ever existed owns its history files forever. The records a close generates then
have no governed writer at all, which is the deadlock ATM-GOV-0395 hit and could
not resolve from its own side.

The amended rule keeps the protection and adds the missing door. Ownership of a
history path is resolved through the same canonical authority snapshot as source
ownership. When that snapshot says the owner is terminal, the path is still not
freely writable: it opens only to a writer holding an explicit governed
reconciliation entitlement, proven from the writer's own claim — its admitted
scope and its declared `linkedTaskId` — never from an identifier resembling the
owner's. Everything else stays fail-closed.

Amendment 1 also absorbs the transactional defect observed in the same
operation: a refused admission must leave nothing behind. HEAD is only one of
three mutable surfaces, and the index is the one that was left dirty.

## Acceptance

- ACC-1: A terminal task with a released claim and released lock is absent from
  the live source-owner set, even if historical scope, claim files, or a
  direction-lock record names the current candidate path.
- ACC-2 (amended): A candidate under `.atm/history/{evidence,task-events,tasks}`
  belonging to a different task is blocked whenever the authority snapshot shows
  that task holds live write authority, and is also blocked when the owner is
  terminal but the writer holds no reconciliation entitlement. Ownership on this
  surface must be resolved by the same authority snapshot used for source paths,
  never by the task id embedded in the filename.
- ACC-3: An incident recorded under an old false active-scope classification
  reconciles when current authority snapshots prove its source owners terminal;
  the repair never mutates foreign staged bytes.
- ACC-4: Publish the frozen runner after source-focused checks and prove the
  sealed runner is reproducible and carries the current authority rule while
  retaining real foreign task-history conflicts. A repository-global doctor
  result is advisory for this card: unrelated adapter, backlog, or stale-lock
  findings must not invalidate this task's focused authority evidence.
- ACC-5 (added by amendment 1): A writer holding an explicit governed
  reconciliation entitlement over a terminal task's history paths is admitted.
  The entitlement is proven from the writer's own claim — the paths it was
  admitted for, and the task it declares it is reconciling — and must not be
  inferred from a task id, a file name, a path glob, a lane suffix, or any
  resemblance between the writer's work-item id and the owner's task id. A
  refusal may describe an ownership state only after that state has actually
  been read: it may not call an owner "active" without having evaluated its
  status, claim state, and lock state.
- ACC-6 (added by amendment 1): After any admission or pre-commit failure, the
  index and worktree are restored blob by blob to their exact pre-operation
  state. Restoration covers staged deletions, staged modifications, and unstaged
  modifications the operation created, and preserves foreign staged entries it
  did not create exactly as they were. An unchanged HEAD is not accepted as
  evidence that nothing was left behind; any residue that cannot be restored is
  retained under a durable owner-bound recovery receipt.

## Stop rules

- Do not clear an incident, release a lock, or unstage an external receipt only
  to make the detector green.
- Do not key the rule to a task id, actor, file name, timestamp, or incident.
- Preserve a block whenever a live claim, active lock, or broker intent exists.
- Do not widen entitlement into a general write permission. A terminal task's
  artifacts become reachable to one entitled successor, not to everyone.
- Regressions build their own fixture repository. The ATM-GOV-0392 residue
  preserved in the shared canonical worktree is reproduction evidence and must
  not be read as fixture input, unstaged, restored, stashed, or hand-edited.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T23:46:16.992Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0369-make-cross-task-mutation-ownership-require-current-authority-snapshots.task.md","contentDigest":"sha256:a813690f4e150b69e2f8a6c0c6b262f308a5d62560d31841a598eb905fbe9493"} -->
