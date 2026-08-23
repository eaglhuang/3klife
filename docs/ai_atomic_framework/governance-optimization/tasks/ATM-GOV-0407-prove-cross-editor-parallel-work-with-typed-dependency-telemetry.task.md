---
task_id: ATM-GOV-0407
title: Prove cross-editor parallel work with typed dependency telemetry
status: done
owner: cursor-captain
priority: P0
series: GOV
series_reason: Plan 4.1 needs measured product proof that Plan 4.0 parallel governance works across editors.
depends_on: []
causalGraph:
  startConditions:
    - Plan 4.1 taxonomy and proof thresholds are sealed.
    - TASK-PRF-0002 and TASK-PRF-0003 remain available as real workload samples.
  softRelations: [ATM-GOV-0406]
  changedPublicSeams: [dependency-semantics-census, cross-editor-parallel-proof, parallel-progress-dashboard]
  causalImpactEdges:
    - prf-edges-receive-explicit-lifecycle-types
    - concurrent-work-produces-replayable-telemetry
    - dashboard-proves-or-refutes-parallel-governance
  parallelFrontierInputs: [sealed-plan-4-1-definition, prf-planning-corpus, broker-and-task-event-streams]
  validatorReferences: [test_gov_dependency_census_0407, test_gov_parallel_telemetry_0407, test_gov_parallel_dashboard_0407]
  phaseOwner: plan-4-1-proof-lane
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4-1.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/evidence/cross-editor-parallel-proof.schema.json
  - scripts/audit-task-dependency-semantics.ts
  - scripts/compile-cross-editor-parallel-proof.ts
  - scripts/validate-cross-editor-parallel-proof.ts
  - tests/cli/task-dependency-semantics-census.test.ts
  - tests/cli/cross-editor-parallel-proof.test.ts
  - docs/reports/atm-plan-4-1-dependency-census.json
  - docs/reports/atm-plan-4-1-cross-editor-parallel-proof.json
deliverables:
  - schemas/evidence/cross-editor-parallel-proof.schema.json
  - scripts/audit-task-dependency-semantics.ts
  - scripts/compile-cross-editor-parallel-proof.ts
  - scripts/validate-cross-editor-parallel-proof.ts
  - tests/cli/task-dependency-semantics-census.test.ts
  - tests/cli/cross-editor-parallel-proof.test.ts
  - docs/reports/atm-plan-4-1-dependency-census.json
  - docs/reports/atm-plan-4-1-cross-editor-parallel-proof.json
validators:
  - node --strip-types tests/cli/task-dependency-semantics-census.test.ts
  - node --strip-types tests/cli/cross-editor-parallel-proof.test.ts
  - node --strip-types scripts/validate-cross-editor-parallel-proof.ts
  - npm run typecheck
testContributions:
  - caseId: test_gov_dependency_census_0407
    targetGroupId: null
    semanticKey: prf_dependency_semantics_census
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [prf-edges-receive-explicit-lifecycle-types]
    expectedRedPredicate: A PRF edge is unclassified, or a blocking edge lacks the six hard-causal facts.
    contributionResourceKey: prf-dependency-census
    responsibility: task-required
    dependencyEdge: planning-edge-to-lifecycle-classification
    contractEdge: dependency-semantics-census
    resourceKey: planning-corpus
  - caseId: test_gov_parallel_telemetry_0407
    targetGroupId: null
    semanticKey: real_cross_editor_parallel_window
    coversAcceptance: [ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [concurrent-work-produces-replayable-telemetry]
    expectedRedPredicate: Distinct editors cannot maintain two active work intervals, or overlap/proposal/compose/safety events cannot be replayed.
    contributionResourceKey: parallel-proof-events
    responsibility: task-required
    dependencyEdge: task-events-to-parallel-proof
    contractEdge: cross-editor-parallel-proof
    resourceKey: event-stream
  - caseId: test_gov_parallel_dashboard_0407
    targetGroupId: null
    semanticKey: reproducible_parallel_progress_dashboard
    coversAcceptance: [ACC-6, ACC-7]
    coversImpactEdges: [dashboard-proves-or-refutes-parallel-governance]
    expectedRedPredicate: Dashboard lacks window, watermark, denominator, source digest, independent lifecycle states or reproducible totals.
    contributionResourceKey: plan-4-1-dashboard
    responsibility: task-required
    dependencyEdge: sealed-inputs-to-dashboard
    contractEdge: parallel-progress-dashboard
    resourceKey: proof-report
requiredTestCaseIds: [test_gov_dependency_census_0407, test_gov_parallel_telemetry_0407, test_gov_parallel_dashboard_0407]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [evidence-first]
evidence:
  required: command-backed
rollback:
  strategy: preserve-raw-events-and-invalidate-derived-proof
  notes: Never rewrite raw events; invalidate and regenerate census/dashboard after source or policy drift.
atomizationImpact:
  ownerAtomOrMap: atm.parallel-governance-proof
  mapUpdates: []
  newScriptsAllowed: true
  extractionCandidates:
    - atom: atm.cross-editor-parallel-proof-compiler
      pattern: Functional Core Imperative Shell
      source: scripts/compile-cross-editor-parallel-proof.ts
      disposition: extract
      inlineReason: null
errorCodes: [ATM_PARALLEL_PROOF_INPUT_INVALID, ATM_PARALLEL_PROOF_THRESHOLD_UNMET]
createdByCommand: atm plan card create
completed_at: "2026-08-23T16:13:54.433Z"
completed_by_agent: "cursor-captain"
closedAt: "2026-08-23T16:13:54.433Z"
closedByActor: "cursor-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-23T16-13-54-433Z-close-702c8d335595"
lastTransitionAt: "2026-08-23T16:13:54.433Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a910f1dc599375845e703bfeb68bd7b22481da80"
---

# ATM-GOV-0407 Prove cross-editor parallel work with typed dependency telemetry

## Intent

Classify PRF dependency edges and prove or refute ATM cross-editor parallel development using real TASK-PRF-0002/0003 work plus the concurrent ATM-GOV-0406/0407 delivery.

## Acceptance

- [ ] ACC-1: PRF census has zero unclassified edges and publishes numerator, denominator and observed hard-dependency rate without quota gaming.
- [ ] ACC-2: Every blocking edge contains six hard-causal facts; validation/publication/observation/soft relations remain nonblocking at claim.
- [ ] ACC-3: Distinct Claude and Cursor actors/editors hold concurrent active work for at least 15 minutes or 25% of the shorter active interval; maximum concurrency is at least two.
- [ ] ACC-4: At least one overlapping/dependent surface uses proposal-first or Broker arbitration, with no foreign-byte overwrite, unauthorized takeover or bypass.
- [ ] ACC-5: A hard-causal negative control blocks before its producer result and admits afterward; non-hard controls start before compose/validation.
- [ ] ACC-6: Dashboard seals time window, watermark, sources, commits, SHA-256 digests, counts, overlap, proposals, compose outcomes and safety events.
- [ ] ACC-7: Regeneration reproduces the digest and reports source delivery, frozen publication and formal closeout separately.

## Parallel contract

Cursor Captain owns this card and starts with Claude's ATM-GOV-0406. Instrumentation and proposal-first work use the sealed plan. Only final compose/acceptance consume 0406's source contract; absence of that SHA cannot block this card's claim.

## Out of scope

Implementing the 0406 claim gate, changing PRF family authority, relabelling edges to hit 2%, bypassing Broker, or declaring Plan 4.1 complete from task closure alone.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-22T15:35:16.457Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0407-prove-cross-editor-parallel-work-with-typed-dependency-telemetry.task.md","contentDigest":"sha256:aaaea9f0654567bc88ec6f01622e42ebbcbdc1797f3e71949224d87146a54daa"} -->
