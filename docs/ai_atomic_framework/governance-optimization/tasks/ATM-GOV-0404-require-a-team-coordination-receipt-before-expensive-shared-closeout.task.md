---
task_id: ATM-GOV-0404
title: Require a Team coordination receipt before expensive shared closeout
status: planned
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0403
causalGraph:
  causalDependencies:
    - ATM-GOV-0403 provides a canonical team-required escalation decision.
  startConditions:
    - The attempted operation is a runner publication, certificate/release transition, or multi-task closeout on a declared shared surface.
  softRelations:
    - ATM-GOV-0341
  changedPublicSeams:
    - expensive-closeout-team-receipt-admission
  causalImpactEdges:
    - team-required-decision-to-shared-closeout-admission
  parallelFrontierInputs:
    - canonical team escalation decision
  validatorReferences:
    - tests/cli/team-required-closeout-admission.test.ts
  phaseOwner: unassigned
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: C:/Users/User/AI-Atomic-Framework
scopePaths:
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/framework-development/runner-publication-close-handoff.ts
  - packages/core/src/broker/team-wave-checkpoint.ts
  - packages/core/src/broker/team-lane.ts
  - tests/cli/team-required-closeout-admission.test.ts
deliverables:
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/framework-development/runner-publication-close-handoff.ts
  - packages/core/src/broker/team-wave-checkpoint.ts
  - packages/core/src/broker/team-lane.ts
  - tests/cli/team-required-closeout-admission.test.ts
validators:
  - node --strip-types tests/cli/team-required-closeout-admission.test.ts
  - npm run typecheck
testContributions:
  - caseId: team_required_receipt_gates_only_expensive_shared_closeout_0404
    targetGroupId: null
    semanticKey: team_receipt_closeout_admission
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [team-required-decision-to-shared-closeout-admission]
    expectedRedPredicate: a high-risk shared closeout starts without a current coordination receipt or an ordinary operation is unnecessarily gated
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: expensive-closeout-team-receipt-admission
    resourceKey: null
requiredTestCaseIds:
  - team_required_receipt_gates_only_expensive_shared_closeout_0404
tddMode: required
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-admission
  mapUpdates: []
  extractionCandidates:
    - atom: atm.team-receipt-admission
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/runner-sync-admission.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0404 Require a Team coordination receipt before expensive shared closeout

## Intent

Consume a current state-only Team coordination receipt only at expensive shared
boundaries that were classified `team-required`. The receipt proves a bounded
proposal, broker decision, crew plan, and current authority snapshot; it must
not become a general prerequisite for focused tests, ordinary task commits, or
isolated quickfixes.

## Acceptance

- [ ] ACC-1: Runner publication, certificate/release transition, and multi-task closeout require a current Team coordination receipt only when the canonical escalation decision is `team-required`.
- [ ] ACC-2: Missing, expired, mismatched, or broker-invalid receipts fail closed with one official recovery command; the gate does not create a Team run or override broker admission.
- [ ] ACC-3: Non-expensive or non-required operations remain ungated, including focused tests and single-task quickfix commits.
- [ ] ACC-4: Focused red/green fixtures prove the positive gate and all negative boundaries; no runner build, publication, or close runs in the fixture.

## Boundaries

Do not implement a new Team scheduler, auto-spawn workers, relax publication
ownership, or modify certificate evidence semantics. This card consumes the
existing Team receipt at a narrow admission boundary only.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T16:45:28.512Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0404-require-a-team-coordination-receipt-before-expensive-shared-closeout.task.md","contentDigest":"sha256:2fd050c9b010c6b79cb1359b1616a36109068baa889e3d45044b42dbcec7ed57"} -->
