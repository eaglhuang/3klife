---
task_id: ATM-GOV-0317
title: Plan 4.0 final four-plan objective certification and legacy-authority retirement
status: done
owner: unassigned
priority: P0
depends_on: [ATM-GOV-0316, ATM-GOV-0324]
causalGraph:
  causalDependencies: [ATM-GOV-0316, ATM-GOV-0324]
  startConditions: ["0316 phase-exit evidence is sealed and 0324 closes the recent operator-regression cluster"]
  softRelations:
    - governance-optimization/plan-3x-4x-objective-evidence-matrix-2026-07-31.md
  changedPublicSeams:
    - atm.fourPlanCertificate.v1
  causalImpactEdges:
    - unresolved matrix row -> final verdict blocked
  parallelFrontierInputs:
    - ATM-GOV-0316 hostile dogfood phase exit
  validatorReferences:
    - node --strip-types tests/cli/plan4-final-certification.test.ts
  phaseOwner: Plan4-final-certification
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - governance-optimization/plan-3x-4x-objective-evidence-matrix-2026-07-31.md
  - governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json
  - tests/cli/plan4-final-certification.test.ts
  - tests/catalog/groups/test_group_plan4_final_certification.shard.json
deliverables:
  - four-plan objective certificate with row-level evidence tuples and explicit non-claims
  - incident/backlog census closure manifest and release/push provenance
  - legacy-authority retirement decision with rollback path
validators:
  - node --strip-types tests/cli/plan4-final-certification.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
testContributions:
  - caseId: test_task_atm_gov_0317_four_plan_certificate_5b9d2e71
    targetGroupId: test_group_plan4_final_certification
    semanticKey: plan4_four_plan_objective_certificate
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: ["unresolved matrix row -> final verdict blocked"]
    expectedRedPredicate: an incomplete row is silently certified
    responsibility: task-required
  - caseId: test_task_atm_gov_0317_legacy_retirement_gate_8a4f1c36
    targetGroupId: test_group_plan4_final_certification
    semanticKey: plan4_legacy_authority_retirement_gate
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["unresolved matrix row -> final verdict blocked"]
    expectedRedPredicate: legacy retirement proceeds with an open bug, unknown, or missing rollback
    responsibility: task-required
requiredTestCaseIds:
  - test_task_atm_gov_0317_four_plan_certificate_5b9d2e71
  - test_task_atm_gov_0317_legacy_retirement_gate_8a4f1c36
evidence:
  required: command-backed
  realness: fresh-sealed-four-plan-fan-in
rollback:
  strategy: retain-legacy-authority-and-reopen-failed-objective-rows
  notes: Retirement is reversible; any unresolved row, bug, unknown, or stale mirror keeps legacy authority active.
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-13T12:12:52.053Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-13T12:12:52.053Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T12-12-52-053Z-close-0a69b8fde7d6"
lastTransitionAt: "2026-08-13T12:12:52.053Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e9785f2064aef8f3a5de7d0e9bfa1f272f920ff9"
---

# ATM-GOV-0317 Plan 4.0 final four-plan objective certification and legacy-authority retirement

## Intent

Consume the completed Plan 3.0–4.0 matrix, backlog census, incident corpus,
adapter parity, and hostile dogfood. Report objective, card, incident,
fresh-evidence, and release/push dimensions separately. Any open bug, unknown,
stale mirror, unverified row, or missing rollback blocks the final verdict and
legacy-authority retirement.

## Acceptance

- [ ] Every matrix row has a complete evidence tuple or explicit non-claim.
- [ ] Backlog census has no unresolved open-like item or unauthorized exception.
- [ ] Fresh sealed dogfood and release/push provenance are present.
- [ ] Legacy authority retirement is reversible and independently reviewed.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T15:04:12.889Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0317-plan-4-0-final-four-plan-objective-certification-and-legacy-authority-retirement.task.md","contentDigest":"sha256:6796ab2d7470c25a02deef7e1a2a14608b66fe817959d33703997e97c778e1a5"} -->
