---
task_id: ATM-GOV-0312
title: Coverage certificate, quality vector, and explicit non-claims
status: planned
owner: unassigned
priority: P0
depends_on:
  - ATM-GOV-0318
  - ATM-GOV-0319
  - ATM-GOV-0320
  - ATM-GOV-0305
  - TASK-SKL-0037
causalGraph:
  causalDependencies:
    - ATM-GOV-0318
    - ATM-GOV-0319
    - ATM-GOV-0320
    - ATM-GOV-0305
    - TASK-SKL-0037
  startConditions:
    - All prerequisite quality, oracle, family, and skill-projection contracts are done/released.
    - The four-plan objective matrix and incident register are available as read-only inputs.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - governance-optimization/plan-3x-4x-objective-evidence-matrix-2026-07-31.md
  changedPublicSeams:
    - atm.qualityCoverageCertificate.v1
    - atm.qualityVector.v1
    - atm.explicitNonClaim.v1
  causalImpactEdges:
    - objective matrix + evidence tuples -> certificate rows
    - independent quality dimensions -> non-compensating quality vector
    - unresolved/unknown evidence -> explicit non-claim
    - incident register + phase receipts -> release authority input
  parallelFrontierInputs:
    - ATM-GOV-0305 recurrence/selective routing contract
    - TASK-SKL-0037 skill projection parity contract
    - four-plan objective evidence matrix
  validatorReferences:
    - node --strip-types tests/cli/plan4-coverage-certificate.test.ts
    - node --strip-types tests/cli/plan4-quality-vector.test.ts
    - npm run typecheck
    - npm run validate:cli
  phaseOwner: plan4-certification
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/coverage-certificate.ts
  - packages/core/src/evidence/quality-vector.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/quality-certificate.schema.json
  - tests/catalog/groups/test_group_plan4_quality_certificate.shard.json
  - tests/cli/plan4-coverage-certificate.test.ts
  - tests/cli/plan4-quality-vector.test.ts
deliverables:
  - packages/core/src/evidence/coverage-certificate.ts
  - packages/core/src/evidence/quality-vector.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/quality-certificate.schema.json
  - tests/catalog/groups/test_group_plan4_quality_certificate.shard.json
  - tests/cli/plan4-coverage-certificate.test.ts
  - tests/cli/plan4-quality-vector.test.ts
validators:
  - node --strip-types tests/cli/plan4-coverage-certificate.test.ts
  - node --strip-types tests/cli/plan4-quality-vector.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
testContributions:
  - caseId: test_task_atm_gov_0312_coverage_certificate_73b4e0c2
    targetGroupId: test_group_plan4_quality_certificate
    semanticKey: plan4_objective_coverage_certificate
    coversAcceptance:
      - ACC-1
      - ACC-4
      - ACC-5
    coversImpactEdges:
      - objective matrix + evidence tuples -> certificate rows
      - incident register + phase receipts -> release authority input
    expectedRedPredicate: An objective is missing, duplicated, or backed by a stale/open incident while the certificate still claims completion.
    responsibility: task-required
    contractEdge: plan4-coverage-certificate
  - caseId: test_task_atm_gov_0312_quality_vector_1d8f6a90
    targetGroupId: test_group_plan4_quality_certificate
    semanticKey: plan4_quality_vector_non_compensating
    coversAcceptance:
      - ACC-2
      - ACC-3
      - ACC-6
      - ACC-7
    coversImpactEdges:
      - independent quality dimensions -> non-compensating quality vector
      - unresolved/unknown evidence -> explicit non-claim
      - incident register + phase receipts -> release authority input
    expectedRedPredicate: A strong dimension score compensates for a blocker, or replay trusts a caller boolean and changes the verdict.
    responsibility: task-required
    contractEdge: plan4-quality-vector
requiredTestCaseIds:
  - test_task_atm_gov_0312_coverage_certificate_73b4e0c2
  - test_task_atm_gov_0312_quality_vector_1d8f6a90
errorCodes: []
evidence:
  required: command-backed
  realness: fresh-sealed-and-independent-review
rollback:
  strategy: revert-commit-and-disable-plan4-certificate
  notes: Revert certificate and release commits; retain source objective evidence and explicit non-claims.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.quality-certificate-policy
      pattern: Policy Object
      source: packages/core/src/evidence/coverage-certificate.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
---

# ATM-GOV-0312 Coverage certificate, quality vector, and explicit non-claims

## Intent

Produce the Plan 4.0 phase-exit certificate from the single four-plan objective
matrix. The certificate must preserve independent quality dimensions, state
explicit non-claims for unknown or incomplete objectives, and never infer
completion from a task-card status or a compensating aggregate score.

## Acceptance

- [ ] ACC-1: Every declared objective in Plans 3.0, 3.1, 3.2, and 4.0 appears exactly once with source, task, acceptance, test, validator, sealed evidence, dogfood, bug disposition, rollback, and verdict references.
- [ ] ACC-2: Quality dimensions remain independent; a strong score in one dimension cannot compensate for a blocker or missing evidence in another.
- [ ] ACC-3: Unknown, stale, unsupported, flaky, equivalent-suspected, or unavailable evidence produces an explicit non-claim and fail-closed release disposition.
- [ ] ACC-4: Certificate provenance binds the matrix digest, policy epoch, source/frozen runner digest, incident-corpus digest, and phase-exit manifest.
- [ ] ACC-5: A negative-control certificate with a removed objective, stale receipt, or open known bug is rejected deterministically.
- [ ] ACC-6: Certificate replay from the sealed manifest yields the same verdict and digest; no caller-provided boolean or prefilled empty backlog is trusted.
- [ ] ACC-7: Independent review/authority separation and rollback evidence are present before release readiness can be true.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T14:01:54.727Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0312-coverage-certificate-quality-vector-and-explicit-non-claims.task.md","contentDigest":"sha256:a7da4de2050a12864a73125ff045add9ffb205801d393cd7bb19c716e587199f"} -->
