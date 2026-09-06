---
task_id: ATM-GOV-0413
title: Add an explicit bounded claim-side adoption route for unowned WIP
status: done
owner: atm-git-governance
priority: P1
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
related_plan: governance-optimization/follow-ups/ATM-GOV-0413-claim-side-adoption-of-bounded-unowned-wip.plan.md
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - ATM-BUG-2026-08-13-006 remains reproducible as a claim-admission gap.
    - Foreign active-claim and retained-WIP rejection remains fail-closed.
  softRelations:
    - ATM-BUG-2026-08-13-006
  changedPublicSeams:
    - tasks claim option parsing
    - canonical claim dirty-WIP admission
    - claim transition evidence
  causalImpactEdges:
    - bounded-unowned-wip-adoption
    - foreign-wip-rejection-preserved
    - claim-transition-rollback
  parallelFrontierInputs: []
  validatorReferences:
    - claim-foreign-unstaged-wip
    - claim-orchestrator
  phaseOwner: null
scopePaths:
  - packages/cli/src/commands/tasks/task-option-parsers/misc-claim-options.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - tests/cli/claim-foreign-unstaged-wip.test.ts
  - tests/cli/claim-adopt-unowned-wip.test.ts
deliverables:
  - packages/cli/src/commands/tasks/task-option-parsers/misc-claim-options.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - tests/cli/claim-foreign-unstaged-wip.test.ts
  - tests/cli/claim-adopt-unowned-wip.test.ts
validators:
  - node --strip-types tests/cli/claim-foreign-unstaged-wip.test.ts
  - node --strip-types tests/cli/claim-adopt-unowned-wip.test.ts
  - node --strip-types packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts
  - npm run typecheck
testContributions:
  - caseId: test_claim_bounded_unowned_wip_adoption_0413_7b8f2d1a
    targetGroupId: null
    semanticKey: bounded_unowned_wip_adoption
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [bounded-unowned-wip-adoption, claim-transition-rollback]
    expectedRedPredicate: explicit adoption is required for unowned in-scope WIP and failed transitions leave no ownership residue
    responsibility: task-required
    dependencyEdge: null
    contractEdge: claim-adoption-contract
    resourceKey: null
  - caseId: test_claim_foreign_wip_rejection_preserved_0413_2d6e9a44
    targetGroupId: null
    semanticKey: foreign_wip_rejection_preserved
    coversAcceptance: [ACC-3]
    coversImpactEdges: [foreign-wip-rejection-preserved]
    expectedRedPredicate: adoption cannot admit foreign-owned, retained-owned, mixed, or out-of-scope dirty paths
    responsibility: task-required
    dependencyEdge: null
    contractEdge: claim-admission-contract
    resourceKey: null
requiredTestCaseIds:
  - test_claim_bounded_unowned_wip_adoption_0413_7b8f2d1a
  - test_claim_foreign_wip_rejection_preserved_0413_2d6e9a44
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
  notes: Revert the single target commit and preserve the original fail-closed claim gate.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates:
    - atomic_workbench/maps/atm-cli-command-router-map.json
  extractionCandidates:
    - atom: atm.claim-dirty-wip-admission
      pattern: Policy Object
      source: packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
      disposition: inline
      inlineReason: The canonical helper already owns this policy and the change is a bounded option contract.
errorCodes:
  - code: ATM_CLAIM_FOREIGN_UNSTAGED_WIP
    disposition: reuse
    category: claim-admission
    trigger: A claim still intersects foreign, retained-owned, mixed, or out-of-scope dirty WIP.
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs tasks status --task <task-id> --json
    sourceOwner: packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
    registryOwnerTask: ATM-GOV-0413
    tests:
      - tests/cli/claim-foreign-unstaged-wip.test.ts
      - tests/cli/claim-adopt-unowned-wip.test.ts
completed_at: "2026-09-06T01:29:17.624Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-06T01:29:17.624Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-06T01-29-17-624Z-close-2985854de7b6"
lastTransitionAt: "2026-09-06T01:29:17.624Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a50574095eb8694a5e0657d16349c0cc063d3c78"
---

# ATM-GOV-0413 — Claim-side adoption of bounded unowned WIP

## Decision and source evidence

`ATM-BUG-2026-08-13-006` records a repeatable gap: diagnosis-driven repairs can
exist as unowned dirty files before the owning task can be claimed. The normal
claim gate correctly rejects those files, but it has no explicit adoption route.
The repair must preserve the rejection for foreign-owned WIP and must never
infer ownership from a path alone.

## Scope

Add one explicit claim option, `--adopt-unowned-wip`, to the normal task claim
route. It may admit only unowned dirty files that are explicitly listed in the
claim scope, and it must record the adopted paths in the claim evidence and
transition data. Foreign active-claim WIP, retained WIP owned by another task,
and any dirty path outside the declared scope remain fail-closed with the
existing `ATM_CLAIM_FOREIGN_UNSTAGED_WIP` contract.

The target repository is the ATM framework. The planning repository remains
read-only context for the target import; no planning path is a target
deliverable.

## Acceptance

- ACC-1: Explicit adoption admits only wholly unowned, in-scope code WIP and records attributable adoption evidence; clean claims remain unchanged.
- ACC-2: A failed claim transition leaves no adoption or ownership residue.
- ACC-3: `next --claim` and `tasks claim` use the same canonical helper; foreign-owned, retained-owned, mixed, and out-of-scope WIP remain fail-closed with the existing `ATM_CLAIM_FOREIGN_UNSTAGED_WIP` code.

## Verification and rollback

Required cases: clean claim, bounded unowned adoption, foreign rejection,
out-of-scope rejection, mixed ownership rejection, and adoption rollback on a
failed claim transition. Run the focused claim-admission tests, the task claim
orchestration tests, typecheck, and touched encoding guard. Revert the single
target commit if adoption evidence or ownership invariants regress.

## ATM-GOV-0413 Add an explicit bounded claim-side adoption route for unowned WIP

### Deliverables
- packages/cli/src/commands/tasks/task-option-parsers/misc-claim-options.ts
- packages/cli/src/commands/tasks/claim-orchestrator.ts
- packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
- tests/cli/claim-foreign-unstaged-wip.test.ts
- tests/cli/claim-adopt-unowned-wip.test.ts

### Scope
- packages/cli/src/commands/tasks/task-option-parsers/misc-claim-options.ts
- packages/cli/src/commands/tasks/claim-orchestrator.ts
- packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
- tests/cli/claim-foreign-unstaged-wip.test.ts
- tests/cli/claim-adopt-unowned-wip.test.ts

### Validators
- node --strip-types tests/cli/claim-foreign-unstaged-wip.test.ts
- node --strip-types tests/cli/claim-adopt-unowned-wip.test.ts
- node --strip-types packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts
- npm run typecheck

### Acceptance
- ACC-1: Explicit adoption admits only wholly unowned, in-scope code WIP and records attributable adoption evidence.
- ACC-2: A failed claim transition leaves no adoption or ownership residue.
- ACC-3: Foreign-owned, retained-owned, mixed, and out-of-scope WIP remain fail-closed with ATM_CLAIM_FOREIGN_UNSTAGED_WIP.
