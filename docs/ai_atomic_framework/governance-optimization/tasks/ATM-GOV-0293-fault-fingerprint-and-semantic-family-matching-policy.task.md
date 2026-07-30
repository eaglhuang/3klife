---
task_id: ATM-GOV-0293
title: Fault fingerprint and semantic family matching policy
status: planned
owner: unassigned
priority: P0
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0279
  - ATM-GOV-0292
causalGraph:
  causalDependencies:
    - ATM-GOV-0279
    - ATM-GOV-0292
  startConditions:
    - ATM-GOV-0279 is done and exposes confirmed incident observation inputs.
    - ATM-GOV-0292 is done and exposes mutation lineage and equivalence governance.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - TASK-SKL-0036 incident-learning candidate schema
  changedPublicSeams:
    - atm.faultFingerprint.v1
    - atm.semanticRegressionFamilyMatch.v1
    - atm.familyMatchConfidence.v1
  causalImpactEdges:
    - incident symptoms -> normalized fault fingerprint
    - public seam and error class -> semantic family candidate
    - confidence threshold -> exact match, new family proposal, or human mapping review
    - mutation lineage -> survivor/equivalence matching evidence
  parallelFrontierInputs:
    - TASK-SKL-0036 incidentLearningCandidate schema
    - ATM-GOV-0292 mutation lineage outputs
  validatorReferences:
    - node --strip-types tests/cli/plan4-fault-fingerprint.test.ts
    - node --strip-types tests/cli/plan4-semantic-family-match.test.ts
    - npm run typecheck
  phaseOwner: plan4-fingerprint-policy
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/fault-fingerprint.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/fault-fingerprint.schema.json
  - tests/catalog/groups/test_group_plan4_fault_fingerprint.shard.json
  - tests/cli/plan4-fault-fingerprint.test.ts
  - tests/cli/plan4-semantic-family-match.test.ts
deliverables:
  - packages/core/src/evidence/fault-fingerprint.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/fault-fingerprint.schema.json
  - tests/catalog/groups/test_group_plan4_fault_fingerprint.shard.json
  - tests/cli/plan4-fault-fingerprint.test.ts
  - tests/cli/plan4-semantic-family-match.test.ts
validators:
  - node --strip-types tests/cli/plan4-fault-fingerprint.test.ts
  - node --strip-types tests/cli/plan4-semantic-family-match.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0293_stable_fault_fingerprint_6f0a31bb
    targetGroupId: test_group_plan4_fault_fingerprint
    semanticKey: plan4_stable_fault_fingerprint
    coversAcceptance:
      - ACC-1
      - ACC-4
    coversImpactEdges:
      - incident symptoms -> normalized fault fingerprint
      - mutation lineage -> survivor/equivalence matching evidence
    expectedRedPredicate: Equivalent incidents produce unstable fingerprints or omit mutation-lineage discriminators.
    responsibility: task-required
    contractEdge: plan4-fault-fingerprint
  - caseId: test_atm_gov_0293_family_match_confidence_gate_4ae90c25
    targetGroupId: test_group_plan4_fault_fingerprint
    semanticKey: plan4_family_match_confidence_gate
    coversAcceptance:
      - ACC-2
      - ACC-3
      - ACC-5
    coversImpactEdges:
      - public seam and error class -> semantic family candidate
      - confidence threshold -> exact match, new family proposal, or human mapping review
    expectedRedPredicate: Low-confidence or conflicting family match is accepted as exact.
    responsibility: task-required
    contractEdge: plan4-family-match-confidence
requiredTestCaseIds:
  - test_atm_gov_0293_stable_fault_fingerprint_6f0a31bb
  - test_atm_gov_0293_family_match_confidence_gate_4ae90c25
tddMode: required
evidence:
  required: command-backed-fingerprint-and-confidence-gate
rollback:
  strategy: revert-commit-and-disable-plan4-family-matching-policy
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.fault-fingerprint-policy
      pattern: Policy Object
      source: packages/core/src/evidence/fault-fingerprint.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0293 Fault fingerprint and semantic family matching policy

## Intent

Define the fingerprint and confidence policy that decides whether a confirmed
incident belongs to an existing regression family, proposes a new family, or
requires human mapping review. This is the "what kind of leak is this?" layer.

## Acceptance

- [ ] ACC-1: equivalent incidents normalize to stable fingerprints.
- [ ] ACC-2: family matching uses public seam, error/recovery class, causal
      impact, and mutation lineage; it does not rely on task id or actor.
- [ ] ACC-3: low-confidence or conflicting matches fail closed with mapping
      review, not silent merge.
- [ ] ACC-4: mutation survivor/equivalence evidence can strengthen or weaken
      confidence without becoming the sole authority.
- [ ] ACC-5: tests cover exact match, new-family proposal, conflicting match,
      and low-confidence review route.

## Non-goals

- Do not store family revisions; `ATM-GOV-0305` owns the append-only store.
- Do not generate factor combinations; `ATM-GOV-0294` owns that.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T21:14:00.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0293-fault-fingerprint-and-semantic-family-matching-policy.task.md"} -->
