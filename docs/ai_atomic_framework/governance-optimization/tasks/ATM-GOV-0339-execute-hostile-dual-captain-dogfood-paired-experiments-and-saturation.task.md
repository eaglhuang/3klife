---
task_id: ATM-GOV-0339
title: Execute hostile dual-captain dogfood paired experiments and saturation
status: planned
owner: atm-dogfood
priority: P0
depends_on: [ATM-GOV-0327, ATM-GOV-0338]
causalGraph:
  causalDependencies: [ATM-GOV-0327, ATM-GOV-0338]
  startConditions:
    - Six adapter parity is green.
    - Rescue history is fully classified and prompt-scoped next no longer fails from rescue-root ambiguity.
    - Two distinct actors and OS processes are available in the single canonical worktree.
  softRelations: [ATM-GOV-0340]
  changedPublicSeams: [atm.hostileDogfood.v1, atm.parallelReplayEvidence.v1]
  causalImpactEdges: [shared-index, cas-head-moved, queue-race, close-deferral, runner-sync, provenance-mismatch, stale-batch, foreign-dirty]
  parallelFrontierInputs: [two-actors, two-processes, sealed-workload, broker, canonical-head]
  validatorReferences: [validate-team-brokered-write, validate-broker-recovery, validate-state-replay]
  phaseOwner: closeout-wave-8-dogfood
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/run-real-parallel-dogfood.ts
  - packages/core/src/evidence/hostile-dogfood.ts
  - packages/core/src/broker/replay/
  - schemas/atm.parallel-replay-scenario.v1.schema.json
  - schemas/atm.parallel-replay-evidence.v1.schema.json
  - tests/e2e/atm-3-real-parallel-replay.test.ts
deliverables:
  - docs/reports/plan4-hostile-dogfood-saturation.json
  - tests/e2e/plan4-hostile-dual-captain.test.ts
validators:
  - node --strip-types tests/e2e/plan4-hostile-dual-captain.test.ts
  - node --strip-types tests/e2e/atm-3-real-parallel-replay.test.ts
  - npm run validate:team-brokered-write
testContributions:
  - caseId: test_hostile_dual_captain_real_branches_0339
    semanticKey: hostile_dual_captain_real_branches
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [shared-index, cas-head-moved, queue-race, close-deferral, runner-sync, provenance-mismatch, stale-batch, foreign-dirty]
    expectedRedPredicate: synthetic actor same-process branch or override success cannot satisfy hostile coverage
    responsibility: task-required
    contractEdge: atm.hostileDogfood.v1
  - caseId: test_paired_experiment_and_saturation_0339
    semanticKey: paired_experiment_and_saturation
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [queue-race, runner-sync, stale-batch]
    expectedRedPredicate: missing AA control AB or BA samples stopping rule or rollback blocks phase exit
    responsibility: task-required
    contractEdge: atm.parallelReplayEvidence.v1
requiredTestCaseIds: [test_hostile_dual_captain_real_branches_0339, test_paired_experiment_and_saturation_0339]
phaseTestCaseIds: [test_group_plan4_hostile_dogfood]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
team:
  required: true
  teamLevel: L5
  selectionPolicy: provider-neutral-different-provider-review-when-available
  review:
    requiredFormalSignatures: 2
    reviewerIndependencePolicy: different-provider-or-independent-process
  observability:
    requiredEventTypes: [artifact.output, broker.conflict.blocked, task.close.deferred, runner.sync]
evidence:
  required: command-backed-real-execution
rollback:
  strategy: restore-prior-policy-epoch-and-replay-rollback-without-discarding-observations
atomizationImpact:
  ownerAtomOrMap: atm.hostile-dogfood
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0339 Execute hostile dual-captain dogfood paired experiments and saturation

## Intent

以兩個不同 actor、兩個 process、同一 canonical worktree 實際觸發八種 hostile branches，並執行 A/A、AB/BA 與 saturation。這不是 fixture theater，也不允許 branch/worktree、override 或 emergency success path。

## Acceptance

- [ ] ACC-1: 八種 branch 每個都有 sealed input、actor/process、command、expected failure/recovery、HEAD/index/lock/broker before-after、exit、receipt、rollback、dashboard digest。
- [ ] ACC-2: shared-write gate 一律回 broker ticket；真正 logical conflict 才 queue/revalidate，safe compose 可零等待，neutral steward 為唯一 shared writer。
- [ ] ACC-3: 沒有 borrowed identity、detached worktree、alternate index、merge/rebase、override/no-verify/emergency success；foreign dirty 必須 fail-close。
- [ ] ACC-4: A/A null control；AB/BA 每方向至少三次，固定 workload/seed/threshold，同時記 correctness、latency、cost、overlap、queue wait、rollback。
- [ ] ACC-5: 每 incident family 有 recurrence count、事前 stopping rule、new-family count、unknown disposition；新增 family 回 backlog，不能因未飽和宣告完成。

## Dispatch and stop rules

卡片 claim 後必須以 `team start --execute` 建立受治理 Team run；captain/worker identity 分離。`broker-conflict-blocked`、HEAD drift、actor collision、uncontrolled workload 或 rollback failure 立即停止。報告含 Team summary、八分支 matrix、paired statistics、saturation、dashboard refs、non-claims 與 keep-memory decision。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:59.361Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0339-execute-hostile-dual-captain-dogfood-paired-experiments-and-saturation.task.md","contentDigest":"sha256:3e1dacbce6e3e7afe00b200608efb2075a5ac07bafde084b7853315070751ed5"} -->
