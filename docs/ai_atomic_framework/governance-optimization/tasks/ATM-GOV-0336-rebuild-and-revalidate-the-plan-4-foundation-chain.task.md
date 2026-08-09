---
task_id: ATM-GOV-0336
title: Rebuild and revalidate the Plan 4 foundation chain
status: planned
owner: atm-plan4-foundation
priority: P0
depends_on: [ATM-GOV-0335]
causalGraph:
  causalDependencies: [ATM-GOV-0335]
  startConditions:
    - Plan 3.0 3.1 and 3.2 are 17/17 23/23 and 29/29 verified.
    - Canonical catalog and observed-evidence production callers are green.
  softRelations: [ATM-GOV-0337]
  changedPublicSeams: [atm.plan4FoundationReplay.v1]
  causalImpactEdges: [plan4-topology, catalog-foundation, incident-corpus, quality-certificate]
  parallelFrontierInputs: [plan4-source-cards, task-ledger, incident-fixtures, validator-catalog]
  validatorReferences: [validate-four-plan-objectives, validate-governance-fix-wave, validate-state-replay]
  phaseOwner: closeout-wave-7
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/core/src/evidence/phase-suite.ts
  - packages/core/src/evidence/state-replay.ts
  - packages/core/src/evidence/quality-authority.ts
  - tests/catalog/groups/test_group_plan4_*.shard.json
  - tests/fixtures/governance-incidents/
  - docs/reports/plan-4-foundation-replay.json
deliverables:
  - docs/reports/plan-4-foundation-replay.json
  - docs/reports/plan-4-foundation-replay.md
  - tests/cli/plan4-foundation-topology.test.ts
validators:
  - node --strip-types tests/cli/plan4-foundation-topology.test.ts
  - node --strip-types scripts/validate-four-plan-objectives.ts --plan 4.0 --mode validate
  - npm run validate:governance-fix-wave
testContributions:
  - caseId: test_plan4_foundation_topology_and_17_anchors_0336
    semanticKey: plan4_foundation_topology_and_17_anchors
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [plan4-topology, catalog-foundation, incident-corpus, quality-certificate]
    expectedRedPredicate: skipped dependency stale mirror missing incident or compensating score fails Plan 4 foundation
    responsibility: task-required
    contractEdge: atm.plan4FoundationReplay.v1
requiredTestCaseIds: [test_plan4_foundation_topology_and_17_anchors_0336]
phaseTestCaseIds: [test_group_plan4_authority_foundation, test_group_plan4_incident_replay]
tddMode: reasoned-not-applicable
tddNotApplicableReason: Foundation replay routes implementation defects to existing causal owners and correction cards.
tddExemptions: [{kind: docs, reason: Replay reports do not count as TDD success.}]
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: preserve-failed-anchor-as-not-complete-and-restore-prior-policy-epoch
atomizationImpact:
  ownerAtomOrMap: atm.plan4-phase-suite
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0336 Rebuild and revalidate the Plan 4 foundation chain

## Intent

依保守 topology `0285 → 0306 → 0313 → 0293 → 0294 → 0305 → TASK-SKL-0037 → 0321 → 0318 → 0288 → 0289 → 0322 → 0296 → 0297 → 0298 → 0282 → 0299 → 0290 → 0291 → 0300 → 0302 → 0303 → 0319 → 0320 → 0312 → 0307 → 0287 → 0324 → 0281 → 0283` 重驗，不因舊 ledger done 跳步。

## Acceptance

- [ ] ACC-1: 每個節點重新解析 causalDependencies/startConditions、planning seal、source/ledger/projection fidelity；0313 未 released 時 catalog-dependent 節點停止。
- [ ] ACC-2: 0313 canonical catalog、alias/lineage migration、full catalog 與 closure attribution 全綠。
- [ ] ACC-3: 0307 重播 009/010/011/270/0276/runner-sync/stale-mixed-batch；0324 對 2026-07-31-002..008 逐 bug 有 red/green、repair commit、rollback、fresh evidence。
- [ ] ACC-4: 0312 不得 compensating score；17/17 section anchors 各具十項 tuple，unknown/hard blocker 使 phase blocked。

## Dispatch and stop rules

每節開始前重跑 status/next，只照該卡 playbook；此文字 topology 不取代真實 causalGraph。若舊卡需 correction/reopen，走診斷回傳 route，不 reset。報告含每節 start-condition verdict、delivery/validation digest、incident coverage、blocked frontier 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:52.442Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0336-rebuild-and-revalidate-the-plan-4-foundation-chain.task.md","contentDigest":"sha256:b21e0e93c926d7d73f8d492f7a4deadbea187c99d5ede865edf3fc620f41e525"} -->
