---
task_id: ATM-GOV-0335
title: Replay and certify every Plan 3.2 objective
status: planned
owner: atm-plan32-replay
priority: P0
depends_on: [ATM-GOV-0334]
causalGraph:
  causalDependencies: [ATM-GOV-0334]
  startConditions:
    - Plan 3.1 replay is 23/23 verified.
    - The authoritative Plan 3.2 denominator resolves to exactly 29 rows.
  softRelations: [ATM-GOV-0336]
  changedPublicSeams: [atm.planObjectiveReplay.v1]
  causalImpactEdges: [plan32-causal-chain, plan32-objective-verdict, plan32-closeback]
  parallelFrontierInputs: [sealed-plan32-rows, corrected-receipts, dashboard]
  validatorReferences: [validate-four-plan-objectives, validate-atm-3-final-closure]
  phaseOwner: closeout-wave-6-plan32
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/diagnose-plan3-evidence-closure.ts
  - scripts/validate-atm-3-final-closure.ts
  - tests/cli/atm-3-final-closure.test.ts
  - docs/reports/plan-3-2-objective-replay.json
deliverables:
  - docs/reports/plan-3-2-objective-replay.json
  - docs/reports/plan-3-2-objective-replay.md
  - tests/fixtures/plan3-fake-green/plan32-incomplete-objective.json
validators:
  - node --strip-types scripts/validate-four-plan-objectives.ts --plan 3.2 --mode validate
  - node --strip-types scripts/validate-atm-3-final-closure.ts --mode validate
testContributions:
  - caseId: test_plan32_exact_29_objectives_0335
    semanticKey: plan32_exact_29_objectives
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [plan32-causal-chain, plan32-objective-verdict, plan32-closeback]
    expectedRedPredicate: any of 29 rows missing stale historical-only or prose-only keeps Plan 3.2 not-complete
    responsibility: task-required
    contractEdge: atm.planObjectiveReplay.v1
requiredTestCaseIds: [test_plan32_exact_29_objectives_0335]
phaseTestCaseIds: [test_group_plan4_final_certification]
tddMode: reasoned-not-applicable
tddNotApplicableReason: This card replays sealed objectives; implementation gaps are routed to their owning correction cards.
tddExemptions: [{kind: docs, reason: Objective replay artifacts do not count as TDD success.}]
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: revert-failed-row-to-not-complete-and-retain-valid-observations
atomizationImpact:
  ownerAtomOrMap: atm.plan-objective-replay
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0335 Replay and certify every Plan 3.2 objective

## Intent

依 `0269 → 0270 → 0271 → 0272 → 0273` 重播 §124–135、§166–177、§179–183 的 29 個 objectives，特別驗證 resumable validation、freshness、legal recovery、public attestation、cross-repo close 與 runner saga。

## Acceptance

- [ ] ACC-1: 29/29 rows 具十項 tuple；validator progress/partial timeout、freshness binding、legal recovery lane、public attestation、target/planning close seam 完整。
- [ ] ACC-2: runner saga、sealed bundle/tree subset、authorized shared delivery、sealed apply、HEAD CAS、queue-only/no override、foreign-work fail-close 全部重播。
- [ ] ACC-3: compose attribution、deferral order、batch split/handoff、stale repair、parallel prepare、provenance mismatch、stale-batch routing 各有 generic Plan 4 fixture。
- [ ] ACC-4: 任何 missing/unknown/stale row 都返回 owning card，不准用 29-row 總分掩蓋單列 blocker。

## Stop rules and report

真實 shared-write dogfood 在 Plan 3.0→3.1→3.2 序列進行；只讀 inventory 才可並行。報告列 29-row 表、run IDs、partial summaries、CAS/queue/compose receipts、generic fixtures、closeback digest 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:50.549Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0335-replay-and-certify-every-plan-3-2-objective.task.md","contentDigest":"sha256:110cc9a95ceb4c554ee060e5158bf9942b02e6ec08ff7ae028b602ed148f0265"} -->
