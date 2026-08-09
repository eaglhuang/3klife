---
task_id: ATM-GOV-0307
title: State replay and known incident corpus closure
status: planned
owner: unassigned
priority: P0
depends_on:
  - ATM-GOV-0306
  - ATM-GOV-0293
  - ATM-GOV-0312
causalGraph:
  causalDependencies:
    - ATM-GOV-0306
    - ATM-GOV-0293
    - ATM-GOV-0312
  startConditions:
    - ATM-GOV-0306 is done/released and its lineage/equivalence evidence is consumable.
    - ATM-GOV-0293 has produced the stable fingerprint/family contract consumed by replay.
    - ATM-GOV-0312 has sealed the objective-level certificate contract consumed by phase exit.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - git-boundary-admission/git-boundary-admission-plan.md
  changedPublicSeams:
    - atm.stateReplay.v1
    - atm.incidentRegressionFamily.v1
    - atm.proofInvalidation.v1
  causalImpactEdges:
    - known incident observation -> generic semantic family fixture
    - repair commit -> red/green replay and proof invalidation
    - stale/forged/missing receipt -> fail-closed replay verdict
    - replay verdict -> Plan 4.0 phase-exit incident closure
  parallelFrontierInputs:
    - ATM-GOV-0306 mutation lineage/equivalence contract
    - ATM-GOV-0293 fingerprint/family matching contract
    - TASK-GIT-0029 through TASK-GIT-0031 delivery evidence
  validatorReferences:
    - node --strip-types tests/cli/plan4-state-replay.test.ts
    - node --strip-types tests/cli/plan4-incident-corpus.test.ts
    - npm run typecheck
    - npm run validate:cli
  phaseOwner: plan4-incident-replay
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/state-replay.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/state-replay.schema.json
  - tests/fixtures/governance-incidents/shared-index-commit-attribution/**
  - tests/fixtures/governance-incidents/close-deferral-derived-manifest/**
  - tests/fixtures/governance-incidents/active-batch-router/**
  - tests/fixtures/governance-incidents/import-frontmatter-fidelity/**
  - tests/fixtures/governance-incidents/runner-sync-protected-state/**
  - tests/fixtures/governance-incidents/stale-mixed-batch/**
  - tests/catalog/groups/test_group_plan4_incident_replay.shard.json
  - tests/cli/plan4-state-replay.test.ts
  - tests/cli/plan4-incident-corpus.test.ts
deliverables:
  - packages/core/src/evidence/state-replay.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/state-replay.schema.json
  - tests/fixtures/governance-incidents/shared-index-commit-attribution/**
  - tests/fixtures/governance-incidents/close-deferral-derived-manifest/**
  - tests/fixtures/governance-incidents/active-batch-router/**
  - tests/fixtures/governance-incidents/import-frontmatter-fidelity/**
  - tests/fixtures/governance-incidents/runner-sync-protected-state/**
  - tests/fixtures/governance-incidents/stale-mixed-batch/**
  - tests/catalog/groups/test_group_plan4_incident_replay.shard.json
  - tests/cli/plan4-state-replay.test.ts
  - tests/cli/plan4-incident-corpus.test.ts
validators:
  - node --strip-types tests/cli/plan4-state-replay.test.ts
  - node --strip-types tests/cli/plan4-incident-corpus.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
testContributions:
  - caseId: test_task_atm_gov_0307_state_replay_4f2d8c71
    targetGroupId: test_group_plan4_incident_replay
    semanticKey: plan4_state_replay_proof_invalidation
    coversAcceptance:
      - ACC-2
      - ACC-4
      - ACC-6
    coversImpactEdges:
      - stale/forged/missing receipt -> fail-closed replay verdict
      - repair commit -> red/green replay and proof invalidation
    expectedRedPredicate: Replay accepts stale, forged, missing, or unsupported evidence as a passing result.
    responsibility: task-required
    contractEdge: plan4-state-replay
  - caseId: test_task_atm_gov_0307_incident_corpus_9a1e6b34
    targetGroupId: test_group_plan4_incident_replay
    semanticKey: plan4_known_incident_corpus
    coversAcceptance:
      - ACC-1
      - ACC-3
      - ACC-5
      - ACC-7
    coversImpactEdges:
      - known incident observation -> generic semantic family fixture
      - replay verdict -> Plan 4.0 phase-exit incident closure
      - repair commit -> red/green replay and proof invalidation
    expectedRedPredicate: A required family is missing, fixture-only replay is treated as real dogfood, or rollback destroys historical evidence.
    responsibility: task-required
    contractEdge: plan4-incident-corpus
requiredTestCaseIds:
  - test_task_atm_gov_0307_state_replay_4f2d8c71
  - test_task_atm_gov_0307_incident_corpus_9a1e6b34
errorCodes:
  - ATM_MUTATION_LINEAGE_REPLAY_MISMATCH
  - ATM_BROKER_REPLAY_DOGFOOD_BLOCKED
evidence:
  required: command-backed
  realness: fresh-sealed-and-real-dogfood
rollback:
  strategy: revert-commit-and-disable-plan4-incident-replay
  notes: Revert the delivery and release commits; retain sealed incident observations as historical references.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.state-replay-policy
      pattern: Policy Object
      source: packages/core/src/evidence/state-replay.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
---

# ATM-GOV-0307 State replay and known incident corpus closure

## Intent

Convert every confirmed Plan 3.0/3.1/3.2 parallel-development incident into a
generic, replayable Plan 4.0 fixture and proof-invalidation contract. The
fixture must preserve sealed observations only; task id, actor, date, and local
path may not become production control-flow identity.

## Acceptance

- [ ] ACC-1: Each known incident family is represented: shared-index attribution/TOCTOU (009), sealed deletion/tombstone (010), close deferral manifest (011), active-batch router crash (270), import-frontmatter fidelity (0276), runner-sync protected-state, and stale/mixed batch ownership.
- [ ] ACC-2: Replay consumes a sealed observation and deterministically classifies repaired, regressed, stale, forged, missing, or unsupported evidence; unknown is fail-closed.
- [ ] ACC-3: Every fixture has a focused red-before/green-after regression case and a catalog shard entry with stable case ids.
- [ ] ACC-4: Proof invalidation rejects evidence whose source commit, runner digest, bundle/tree attribution, provenance, or fixture family digest does not match.
- [ ] ACC-5: Real dogfood replay proves at least one cross-lane shared-index commit, one close-deferral path, and one active-batch routing path; fixture-only replay cannot satisfy the row.
- [ ] ACC-6: Replay output is consumable by ATM-GOV-0312/0308/0310 and cannot authorize Plan 4.0 close by itself.
- [ ] ACC-7: Rollback drill reverts the replay adapter and leaves historical incident evidence intact.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T14:00:37.150Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0307-state-replay-and-known-incident-corpus-closure.task.md","contentDigest":"sha256:645ce11fec2ce03faee96f79941b00a5853e1639310fa31532e2607990999506"} -->
