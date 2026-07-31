---
task_id: ATM-GOV-0284
title: QualityGauntlet facade and ClosureAssuranceMachine reducer events
status: done
owner: unassigned
priority: P2
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0280
  - ATM-GOV-0269
causalGraph:
  causalDependencies:
    - ATM-GOV-0280
    - ATM-GOV-0269
  startConditions:
    - ATM-GOV-0280 is done and exposes a coverage universe / obligation model contract.
    - ATM-GOV-0269 is done and validation-plan observability is stable enough to provide progress evidence.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - packages/core/src/evidence/validation-contract.ts
    - packages/core/src/evidence/validation-receipt.ts
    - packages/core/src/evidence/test-case-catalog.ts
  changedPublicSeams:
    - atm.qualityGauntlet.v1
    - atm.closureAssuranceMachine.v1
    - atm.qualityGauntletEvent.v1
  causalImpactEdges:
    - close/check-in/phase/release checkpoint -> QualityGauntlet request
    - coverage obligations and validation plan progress -> ClosureAssuranceMachine state transition
    - assurance reducer event stream -> validator catalog selection inputs
    - terminal assurance verdict -> evidence and closeback eligibility
  validatorReferences:
    - node --strip-types tests/cli/plan4-quality-gauntlet.test.ts
    - node --strip-types tests/cli/plan4-closure-assurance-machine.test.ts
    - npm run typecheck
  phaseOwner: plan4-quality-gauntlet
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/quality-gauntlet.ts
  - packages/core/src/evidence/closure-assurance-machine.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/quality-gauntlet.schema.json
  - tests/catalog/groups/test_group_plan4_quality_gauntlet.shard.json
  - tests/cli/plan4-quality-gauntlet.test.ts
  - tests/cli/plan4-closure-assurance-machine.test.ts
deliverables:
  - packages/core/src/evidence/quality-gauntlet.ts
  - packages/core/src/evidence/closure-assurance-machine.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/quality-gauntlet.schema.json
  - tests/catalog/groups/test_group_plan4_quality_gauntlet.shard.json
  - tests/cli/plan4-quality-gauntlet.test.ts
  - tests/cli/plan4-closure-assurance-machine.test.ts
validators:
  - node --strip-types tests/cli/plan4-quality-gauntlet.test.ts
  - node --strip-types tests/cli/plan4-closure-assurance-machine.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0284_quality_gauntlet_facade_contract_2ef36d44
    targetGroupId: test_group_plan4_quality_gauntlet
    semanticKey: plan4_quality_gauntlet_facade_contract
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-4
    coversImpactEdges:
      - close/check-in/phase/release checkpoint -> QualityGauntlet request
      - terminal assurance verdict -> evidence and closeback eligibility
    expectedRedPredicate: Callers must not need ClosureAssuranceMachine private state to advance, inspect, or replay a quality run.
    responsibility: task-required
    contractEdge: plan4-quality-gauntlet
  - caseId: test_atm_gov_0284_closure_assurance_reducer_events_91afdb50
    targetGroupId: test_group_plan4_quality_gauntlet
    semanticKey: plan4_closure_assurance_reducer_events
    coversAcceptance:
      - ACC-2
      - ACC-3
      - ACC-5
    coversImpactEdges:
      - coverage obligations and validation plan progress -> ClosureAssuranceMachine state transition
      - assurance reducer event stream -> validator catalog selection inputs
    expectedRedPredicate: Replaying the same event stream must produce a different view, duplicate events, or hide incomplete/blocked assurance state.
    responsibility: task-required
    contractEdge: plan4-closure-assurance-machine
requiredTestCaseIds:
  - test_atm_gov_0284_quality_gauntlet_facade_contract_2ef36d44
  - test_atm_gov_0284_closure_assurance_reducer_events_91afdb50
tddMode: required
evidence:
  required: command-backed-quality-gauntlet-and-reducer-receipts
rollback:
  strategy: revert-commit-and-disable-plan4-quality-gauntlet-adapter
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.quality-gauntlet
      pattern: Facade
      source: packages/core/src/evidence/quality-gauntlet.ts
      disposition: extract
      inlineReason: null
    - atom: atm.closure-assurance-machine
      pattern: Reducer
      source: packages/core/src/evidence/closure-assurance-machine.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-07-31T10:57:26.480Z"
completed_by_agent: "claude-006"
closedAt: "2026-07-31T10:57:26.480Z"
closedByActor: "claude-006"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T10-57-26-480Z-close-9a52924ac29c"
lastTransitionAt: "2026-07-31T10:57:26.480Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b54f7723b369427635a47eaf834ef0056404af77"
---

# ATM-GOV-0284 QualityGauntlet facade and ClosureAssuranceMachine reducer events

## Intent

Create the Plan 4.0 quality gate seam that future close, check-in, phase, and
release flows can call without knowing the internal assurance algorithm. This
card owns the first typed `QualityGauntlet` facade and the
`ClosureAssuranceMachine` reducer/event model that downstream selector work can
consume.

First-principles boundary:

- The caller asks for a quality transition for one task/checkpoint/candidate.
- The facade returns an auditable transition, view, and replay report.
- The reducer hides gap selection, partial progress, terminal verdicts,
  idempotency, and event replay.
- Later cards may attach catalog selection, freshness, certificates, or
  regression families, but they must consume this card's public events instead
  of coupling to private reducer internals.

## Acceptance

- [ ] ACC-1: `QualityGauntlet` exposes `advance`, `inspect`, and `replay` as the
      only public caller interface for start/resume quality assurance.
- [ ] ACC-2: `ClosureAssuranceMachine` is a deterministic reducer/event stream;
      replaying recorded events reconstructs the same public view.
- [ ] ACC-3: transitions can represent running, stopped-proven,
      stopped-sufficient, blocked-counterexample, and indeterminate states
      without throwing away partial progress.
- [ ] ACC-4: events expose stable public fields that `ATM-GOV-0285` can use for
      validator catalog selection without reading private state.
- [ ] ACC-5: tests prove idempotency, replay, terminal verdict mapping, and
      invalid transition diagnostics.

## Non-goals

- Do not implement validator catalog selection; `ATM-GOV-0285` owns it.
- Do not implement evidence freshness/cache certificates; `ATM-GOV-0286` owns
  them.
- Do not implement checkpoint projection across all lifecycle surfaces;
  `ATM-GOV-0287` owns it.
- Do not implement regression family/fingerprint learning; `ATM-GOV-0293`,
  `ATM-GOV-0294`, and `ATM-GOV-0305` own those seams.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T00:10:12.550Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0284-quality-gauntlet-facade-and-closure-assurance-machine-reducer-events.task.md","contentDigest":"sha256:099fb95334fa3bf325e44cba34a599097e92213d875047c1c7b8e7d2031cef03"} -->
