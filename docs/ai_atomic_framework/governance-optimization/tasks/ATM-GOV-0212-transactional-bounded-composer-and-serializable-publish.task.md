---
task_id: ATM-GOV-0212
title: Transactional bounded composer and serializable publish
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0208
  - ATM-GOV-0209
  - ATM-GOV-0211
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan by replacing line-shift-prone sequential patch application with a transactional serializable composer.
scopePaths:
  - packages/core/src/broker/compose.ts
  - packages/core/src/broker/merge-plan.ts
  - packages/core/src/broker/steward.ts
  - packages/core/src/broker/transactional-composer.ts
  - packages/core/src/broker/adapters/text-range.ts
  - packages/core/src/broker/adapters/json-record.ts
  - packages/core/src/broker/adapters/cas.ts
  - schemas/governance/composition-plan.schema.json
  - tests/core/transactional-bounded-composer.test.ts
  - tests/core/composer-serializability.test.ts
  - scripts/validate-broker-compose.ts
  - scripts/validate-broker-steward.ts
deliverables:
  - packages/core/src/broker/transactional-composer.ts
  - packages/core/src/broker/compose.ts
  - packages/core/src/broker/merge-plan.ts
  - packages/core/src/broker/steward.ts
  - schemas/governance/composition-plan.schema.json
  - tests/core/transactional-bounded-composer.test.ts
  - tests/core/composer-serializability.test.ts
validators:
  - node --strip-types tests/core/transactional-bounded-composer.test.ts
  - node --strip-types tests/core/composer-serializability.test.ts
  - node --strip-types scripts/validate-broker-compose.ts
  - node --strip-types scripts/validate-broker-steward.ts
  - npm run validate:schemas
  - npm run validate:brokered-write
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Transactional composition plan, composed temp tree/index, per-member attribution, serializability proof, and rollback receipt.
consumer:
  - ATM-GOV-0214 shared delivery saga
  - ATM-GOV-0199 broker correctness telemetry
  - ATM-GOV-0202 scale benchmark
missingData:
  - Adapter-specific merge success, composition cost, permutation stability, and partial-compose fallback rates must be observed separately by surface type.
dataDrivenStopRule:
  - Stop on any silent overwrite, context mismatch accepted as success, partial live-working-tree mutation, or result not equivalent to a legal serial order.
  - Stop if unresolved/ambiguous anchors are coerced into absolute-line application.
  - Stop if partial composition cannot retain skipped members in their original fair queue order with independent attribution and rollback.
out_of_scope:
  - No read-set semantic validity, ticket fairness policy, live commit/update-ref, build, projection, checkpoint, closeback, or push.
rollback:
  strategy: circuit-breaker-and-discard-temp-tree
  notes: Disable compose admission, discard un-published temp trees/indexes, preserve plans and failure evidence, and return member tickets to queue order; already-published commits require governed revert rather than reset.
atomizationImpact:
  ownerAtomOrMap: atom-core-broker
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.transactional-bounded-composer
      pattern: Strategy Map
      source: packages/core/src/broker/transactional-composer.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: broker-composer
---

# ATM-GOV-0212 Transactional bounded composer and serializable publish

## Intent

把現有「逐 proposal 對已變動檔案套原始行號」的非交易式 steward 改為同一 sealed base 上的 bounded composition。所有提案先在記憶體或 temp tree/index 合成、驗證 context/scope/hash/validators，成功後才產生一份可發布結果；任何中途失敗不得留下 partial live mutation。

## Correctness Contract

- 無 silent overwrite、可 replay、可 rollback、member attribution 完整。
- disjoint proposals 對排列順序 invariant；compose tree 必須等價於某個合法 serial order（serializability）。
- insert-before-later-hunk、rename+modify、delete+modify、duplicate context、same-file multi-hunk、JSON records 與 scalar CAS 都有 oracle fixtures。
- partial compose 只選可證明相容的 connected component；未選 tickets 保留原 queue aging/position，不因反覆跳過而飢餓。

## Required Work

- 所有 member pin 同一 base tree/blob；context/preimage 不符就停止該 composition group並回 ticket transition request。
- adapter strategy map 回統一 composed result contract；text/JSON/scalar/CAS 不各自發明成功語義。
- composed output 在 temp tree/index 完整建立後驗證 file slices、scope、hash、member postconditions（非 semantic read-set）與 validators，再交給 0214 發布。
- live working tree 在 composition planning/validation 全程不被逐 proposal 修改。

## Acceptance

- [ ] 已知 line-shift silent-corruption 反例被 focused test 捕捉並產生正確結果或安全 queue fallback。
- [ ] disjoint permutation/property fixtures 與 serial oracle 全等；零 partial live mutation。
- [ ] composition plan 包含 base/output digest、member attribution、selected/skipped reason、rollback 與 validator refs。
- [ ] partial compose 後剩餘 tickets 的 age/order 不遺失。
- [ ] composer/steward/brokered-write/typecheck validators 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:43.982Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0212-transactional-bounded-composer-and-serializable-publish.task.md","contentDigest":"sha256:f83b7bbf5681a98624dd57d26bc5f0c35ea6e9493b5118e007cad49c44b1106b"} -->
