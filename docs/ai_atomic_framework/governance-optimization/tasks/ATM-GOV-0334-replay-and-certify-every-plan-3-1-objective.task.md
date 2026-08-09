---
task_id: ATM-GOV-0334
title: Replay and certify every Plan 3.1 objective
status: planned
owner: atm-plan31-replay
priority: P0
depends_on: [ATM-GOV-0333]
causalGraph:
  causalDependencies: [ATM-GOV-0333]
  startConditions:
    - Plan 3.0 replay is 17/17 verified.
    - The authoritative Plan 3.1 denominator resolves to exactly 23 rows.
  softRelations: [ATM-GOV-0335]
  changedPublicSeams: [atm.planObjectiveReplay.v1]
  causalImpactEdges: [plan31-causal-chain, plan31-objective-verdict, plan31-closeback]
  parallelFrontierInputs: [sealed-plan31-rows, corrected-receipts, dashboard]
  validatorReferences: [validate-four-plan-objectives, validate-atm-3-final-closure]
  phaseOwner: closeout-wave-6-plan31
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/diagnose-plan3-evidence-closure.ts
  - scripts/validate-atm-3-final-closure.ts
  - tests/cli/atm-3-final-closure.test.ts
  - docs/reports/plan-3-1-objective-replay.json
deliverables:
  - docs/reports/plan-3-1-objective-replay.json
  - docs/reports/plan-3-1-objective-replay.md
  - tests/fixtures/plan3-fake-green/plan31-incomplete-objective.json
validators:
  - node --strip-types scripts/validate-four-plan-objectives.ts --plan 3.1 --mode validate
  - node --strip-types scripts/validate-atm-3-final-closure.ts --mode validate
testContributions:
  - caseId: test_plan31_exact_23_objectives_0334
    semanticKey: plan31_exact_23_objectives
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [plan31-causal-chain, plan31-objective-verdict, plan31-closeback]
    expectedRedPredicate: any of 23 rows missing stale historical-only or prose-only keeps Plan 3.1 not-complete
    responsibility: task-required
    contractEdge: atm.planObjectiveReplay.v1
requiredTestCaseIds: [test_plan31_exact_23_objectives_0334]
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

# ATM-GOV-0334 Replay and certify every Plan 3.1 objective

## Intent

按原始主鏈 `0247/0251 → 0248/0249/0239/ERR-0005 → 0240/0241/0252/ERR-0004 → 0253 → ERR-0006 → 0254 → 0250 → 0246 → 0237/0238 → 0242 → 0243 → 0244 → 0245` 重播 23 個 objectives。

## Acceptance

- [ ] ACC-1: 23/23 rows 全具十項 evidence tuple，exact missing class、shared pure verifier、fake-green rejection、machine authority/realness/two-key close 與 inconclusive evidence 全部可重現。
- [ ] ACC-2: old/new frozen same-digest red/green、two-process overlap、compose/steward、conflict queue/wakeup、full lifecycle receipts 全部 command-backed。
- [ ] ACC-3: AB/BA 每方向至少三次；同一 sealed set 同時報 correctness/performance/cost；incident terminal disposition、rollback/parity/breaker、runner-sync digest、actor continuity 完整。
- [ ] ACC-4: backlog inventory 與 autonomous zero-manual-command replay 完整；任一 row 不足即 Plan 3.1 NOT COMPLETE 並回傳 owning card。

## Stop rules and report

斜線節點只有在 causalGraph 證明無 shared-write 衝突時並行。不得用 override/emergency success path補齊 row。報告列 23-row 表、實驗次數、actor/process、queue/compose receipts、缺口 owner、dashboard digest 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:48.274Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0334-replay-and-certify-every-plan-3-1-objective.task.md","contentDigest":"sha256:1c24cf4062094c8bf1479e4eee250d2b8f0834d96e748a2ed3ff8ef0e19e94d2"} -->
