---
task_id: ATM-GOV-0333
title: Replay and certify every Plan 3.0 objective
status: planned
owner: atm-plan3-replay
priority: P0
depends_on: [ATM-GOV-0327, ATM-GOV-0332]
causalGraph:
  causalDependencies: [ATM-GOV-0327, ATM-GOV-0332]
  startConditions:
    - Correction Waves 0 through 5 have passed their task-required cases.
    - The authoritative Plan 3.0 denominator resolves to exactly 17 rows.
  softRelations: [ATM-GOV-0334]
  changedPublicSeams: [atm.planObjectiveReplay.v1]
  causalImpactEdges: [plan30-causal-chain, plan30-objective-verdict, plan30-closeback]
  parallelFrontierInputs: [sealed-plan30-rows, corrected-receipts, dashboard]
  validatorReferences: [validate-four-plan-objectives, validate-atm-3-final-closure]
  phaseOwner: closeout-wave-6-plan30
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/diagnose-plan3-evidence-closure.ts
  - scripts/validate-atm-3-final-closure.ts
  - tests/cli/atm-3-final-closure.test.ts
  - docs/reports/plan-3-0-objective-replay.json
deliverables:
  - docs/reports/plan-3-0-objective-replay.json
  - docs/reports/plan-3-0-objective-replay.md
  - tests/fixtures/plan3-fake-green/plan30-incomplete-objective.json
validators:
  - node --strip-types scripts/validate-four-plan-objectives.ts --plan 3.0 --mode validate
  - node --strip-types scripts/validate-atm-3-final-closure.ts --mode validate
testContributions:
  - caseId: test_plan30_exact_17_objectives_0333
    semanticKey: plan30_exact_17_objectives
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [plan30-causal-chain, plan30-objective-verdict, plan30-closeback]
    expectedRedPredicate: any of 17 rows missing stale historical-only or prose-only keeps Plan 3.0 not-complete
    responsibility: task-required
    contractEdge: atm.planObjectiveReplay.v1
requiredTestCaseIds: [test_plan30_exact_17_objectives_0333]
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

# ATM-GOV-0333 Replay and certify every Plan 3.0 objective

## Intent

按原始主鏈 `TMP-0004 + ERR-0003 → 0226 → 0227 → 0236 → 0230 → 0231 → 0228/0229/0232 → 0233 → 0234 → 0235` 重播 Plan 3.0 的 17 個 objective；只讀 inventory 可並行，row promotion 依因果順序。

## Acceptance

- [ ] ACC-1: 17/17 rows 各有 source anchor、owner card/map、case IDs、red/green、production caller、sealed input、command、window/denominator、rollback/release/closeback 的十項 tuple。
- [ ] ACC-2: 完整覆蓋 divergence、protected faults、source/frozen/release/adopter parity、migration rollback、exactly-once、continuation replay、semantic union、closure predicates、locked policy 與 correctness zeroes。
- [ ] ACC-3: 完整覆蓋 telemetry、overlap/admission/starvation、A/A、AB/BA、N=2 non-extrapolation、breaker/reset、backlog open-item rule、target/planning remote-SHA closeback。
- [ ] ACC-4: 任一 row unknown/unavailable/stale/conflicting 時輸出精確 owning card 與 next safe command，Plan 3.0 維持 NOT COMPLETE。

## Stop rules and report

不得修改 evidence 迎合 verifier；發現缺口即回最早 owning card。報告必列 17-row 表、因果 frontier、blocked rows、freshness、dashboard digest、backlog refs、remote reachability 與 non-claims。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:46.019Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0333-replay-and-certify-every-plan-3-0-objective.task.md","contentDigest":"sha256:e44c8280d5afe95803038e6fb04f5e91c2f0cc292d59f6a167ee133ba47f2e30"} -->
