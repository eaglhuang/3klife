---
task_id: ATM-GOV-0214
title: Shared delivery saga and crash safe exactly once lifecycle
status: done
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0211
  - ATM-GOV-0212
  - ATM-GOV-0213
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan with the crash-safe publish boundary required before compose results can mutate HEAD or shared generated surfaces.
scopePaths:
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/core/src/broker/recovery.ts
  - packages/core/src/broker/shared-delivery-saga.ts
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - packages/cli/src/commands/broker/steward-runtime-actions.ts
  - schemas/governance/shared-delivery-saga.schema.json
  - tests/cli/shared-delivery-saga-ordering.test.ts
  - tests/cli/shared-delivery-saga-crash-recovery.test.ts
  - tests/cli/real-shared-delivery-commit-executor.test.ts
deliverables:
  - packages/core/src/broker/shared-delivery-saga.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - schemas/governance/shared-delivery-saga.schema.json
  - tests/cli/shared-delivery-saga-ordering.test.ts
  - tests/cli/shared-delivery-saga-crash-recovery.test.ts
validators:
  - node --strip-types tests/cli/shared-delivery-saga-ordering.test.ts
  - node --strip-types tests/cli/shared-delivery-saga-crash-recovery.test.ts
  - node --strip-types tests/cli/real-shared-delivery-commit-executor.test.ts
  - node --strip-types tests/cli/shared-delivery-commit-executor.test.ts
  - npm run validate:schemas
  - npm run validate:brokered-write
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Pre-publish blocker plan, prepared temp index/tree, compare-and-swap publish receipt, crash journal, compensation plan, and exactly-once recovery evidence.
consumer:
  - ATM-GOV-0198 true plan executor loop
  - ATM-GOV-0199 broker outcome telemetry
  - ATM-GOV-0202 scale and rollout proof
missingData:
  - Killpoint behavior across commit, receipt, build, projection, checkpoint, closeback, and push must be measured; a happy-path receipt is insufficient.
dataDrivenStopRule:
  - Stop if HEAD/update-ref, build, projection, checkpoint, close, or push can occur before every applicable blocker, composition, semantic revalidation, scope, validator, and expected-HEAD assertion passes.
  - Stop on any duplicate commit/close/push, partial live mutation, unrecoverable acknowledged side effect, or receipt that cannot reconstruct the published tree and member slices.
  - Stop if unrelated tasks are coalesced into one commit to reduce landing count.
out_of_scope:
  - No overlap detection, compose eligibility, ticket fairness, composition algorithm, or semantic policy.
rollback:
  strategy: compensation-and-governed-revert
  notes: Discard prepared but unpublished temp trees/indexes; replay durable receipts after crash; never reset an already-published shared commit automatically, and use governed revert/compensation for published mistakes.
atomizationImpact:
  ownerAtomOrMap: atm.shared-delivery-commit-executor
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.shared-delivery-saga
      pattern: Facade
      source: packages/core/src/broker/shared-delivery-saga.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: shared-delivery-saga
completed_at: "2026-07-20T09:46:27.660Z"
completed_by_agent: "codex-captain-0214"
closedAt: "2026-07-20T09:46:27.660Z"
closedByActor: "codex-captain-0214"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T09-46-27-660Z-close-838fa321f5d9"
lastTransitionAt: "2026-07-20T09:46:27.660Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b95abf409536d5879389b00d9ab1f32d5e972cdb"
---

# ATM-GOV-0214 Shared delivery saga and crash safe exactly once lifecycle

## Intent

修正 shared delivery 先更新 HEAD、之後才完成 blocker planning 的 P0 saga 順序缺陷。0212 的 composed temp tree 與 0213 semantic verdict 都完成後，本卡才允許在 expected HEAD 上做單次 CAS publish，並把 commit/build/projection/checkpoint/closeback/push 的 side effects 納入可重播、可補償的 exactly-once journal。

## Required Work

- phase 固定為 prepare inputs -> plan all blockers -> compose/semantic/scope/validator checks -> prepare temp index/tree -> verify expected HEAD -> single CAS publish -> receipts -> generated writes -> checkpoint/closeback -> optional push。
- `executeTemporaryIndexCommit` 不得在 `planSharedDeliveryCommit` 或任何 blocker 前移動 HEAD；commit object 可預建，但 ref update 是最後的原子 publish boundary。
- 每個 side effect 帶 operation id、ticket/group/member refs、input/output digest、expected/actual ref、attempt、terminal state與 compensation；crash resume 先 reconcile，不盲重做。
- unrelated tasks 不共用 commit；related compose members各自保留 file slices、validator/semantic refs與 closure attribution。
- build/projection/runner-sync 也消費 0211 ticket；失敗不產生成功 receipt，不進 checkpoint/close。

## Fault-injection Cohort

- 在 blocker plan、temp tree、commit object、update-ref 前後、receipt write、build、projection、checkpoint、closeback、push 前後注入 crash/kill。
- 每個 acknowledged side effect重啟後只能存在一次，且能由 journal/receipt重建；HEAD 失配回 ticket rearbitration，不覆蓋 foreign WIP。

## Acceptance

- [ ] 所有 blocker、composition與 semantic checks 在 `update-ref` 前完成；失敗時 HEAD/tree/working index 不變。
- [ ] killpoint fixtures 無 duplicate commit/close/push、無 partial live mutation、無 acknowledged side effect 遺失。
- [ ] shared receipt 可重算 commit tree、member file slices、ticket transitions、validators 與 semantic refs。
- [ ] unrelated tasks 無法共用 commit；related members attribution 不遺失。
- [ ] focused saga、real executor、brokered-write、typecheck 與 validate:cli 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:48.907Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0214-shared-delivery-saga-and-crash-safe-exactly-once-lifecycle.task.md","contentDigest":"sha256:f40207a0914449eef372fd0746c388e29be2b8154e65676cb8fb8f0d11b33d3b"} -->
