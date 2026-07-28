---
task_id: ATM-GOV-0227
title: Canonical broker arbitration authority
status: done
owner: atm-broker
priority: P0
milestone: ATM-3.0-B0
severity: P0
depends_on:
  - ATM-GOV-0226
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns canonical shared-write arbitration and INV-ATM-008 enforcement."
scopePaths:
  - "packages/core/src/broker/contracts/**"
  - "packages/core/src/broker/ticket-authority/**"
  - "packages/core/src/schemas/broker-ticket.ts"
  - "packages/cli/src/commands/broker-conflict-resolution.ts"
  - "schemas/atm.broker-ticket.v1.schema.json"
  - "tests/broker/canonical-arbitration-authority.test.ts"
  - "tests/broker/terminal-ticket-authorization.test.ts"
  - "tests/broker/authorization-resource-dimension.test.ts"
  - "tests/cli/legacy-bcr-fail-closed-authorization.test.ts"
deliverables:
  - "packages/core/src/broker/contracts/**"
  - "packages/core/src/broker/ticket-authority/**"
  - "packages/cli/src/commands/broker-conflict-resolution.ts"
  - "schemas/atm.broker-ticket.v1.schema.json"
  - "tests/broker/canonical-arbitration-authority.test.ts"
  - "tests/broker/terminal-ticket-authorization.test.ts"
  - "tests/broker/authorization-resource-dimension.test.ts"
  - "tests/cli/legacy-bcr-fail-closed-authorization.test.ts"
validators:
  - "node --strip-types tests/broker/canonical-arbitration-authority.test.ts"
  - "node --strip-types tests/broker/terminal-ticket-authorization.test.ts"
  - "node --strip-types tests/broker/authorization-resource-dimension.test.ts"
  - "node --strip-types tests/cli/legacy-bcr-fail-closed-authorization.test.ts"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_STATE_DIVERGENCE"
  - "ATM_BROKER_TICKET_STALE_GENERATION"
  - "ATM_BROKER_AUTHORIZATION_DIMENSION_MISMATCH"
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "Canonical ticket authority and terminal authorization contract."
consumer:
  - "ATM-GOV-0228"
  - "ATM-GOV-0229"
  - "ATM-GOV-0230"
  - "ATM-GOV-0231"
  - "ATM-GOV-0232"
  - "ATM-GOV-0233"
missingData:
  - "Existing BCR fields must be inventoried before choosing a compatibility projection."
  - "Legacy consumers that reduce path/atom/surface grants to foreign task-id sets must be inventoried before migration."
  - "Observed legacy sidecar counts are census evidence, never control-flow constants."
dataDrivenStopRule:
  - "Stop if implementation introduces a second writable registry or lets currentAllowedTaskId authorize without ticket generation verification."
  - "Stop if a terminal ticket can still pass any shared-write gate."
  - "Stop if task id alone authorizes a write, or if a grant for one resource dimension suppresses a conflict in another dimension."
  - "Stop if fail-closed compatibility handling returns a terminal refusal instead of a canonical re-arbitration or queue ticket."
out_of_scope:
  - "No legacy runtime migration; ATM-GOV-0233 owns migration."
  - "No queue/freeze/direction-lock storage rewrite; ATM-GOV-0228 owns projection mechanics."
rollback:
  strategy: circuit-breaker-and-revert
  notes: "Trip parallel admission to queue-only before reverting the contract implementation. Rollback must not reactivate legacy artifacts that lack canonical generation/dimension grants."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.ticket-authority"
  mapUpdates: []
  extractionCandidates: []
completed_at: "2026-07-21T06:00:52.301Z"
completed_by_agent: "codex-plan3-captain-20260721-01"
closedAt: "2026-07-21T06:00:52.301Z"
closedByActor: "codex-plan3-captain-20260721-01"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-21T06-00-52-193Z-close-9bbada241f99"
lastTransitionAt: "2026-07-21T06:00:52.301Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4caf97f9a115d7b725df02d33b0aaa2dd4684bb3"
---

# ATM-GOV-0227 Canonical broker arbitration authority

## Intent

讓 `atm.brokerTicket.v1` 成為 shared-write 仲裁的唯一可寫 authority。BCR、release order 或 direction metadata 若沒有相同 ticket generation 與 digest，只能作診斷，不得授權。

## Required Work

- 定義 ticket generation、authority digest、terminal authorization 與 compatible projection contract。
- 在既有 `atm.brokerTicket.v1` 定義 `authorizationGrants[]`；每筆 grant 攜帶 resource dimension/kind、normalized resource keys、operation、consumer gate 與 authority generation/digest，不建立第二套票券或白名單。
- 移除 BCR sidecar 的獨立授權語意；保留相容讀取時必須驗證 canonical ticket。
- 在任何 B1 平行施工前，讓所有缺少 canonical authority generation、dimension-preserving grant 或 terminal linkage 的 legacy BCR fail closed；artifact 保留不改寫，claim/Git consumer 必須回到正式 re-arbitration/ticket 路徑。
- 定義單一 arbitration result 對 outer decision、conflict matrix、gate results 與 conflict details 的一致性投影契約。
- 讓 execute/queue/batch 與 compose apply strategy 沿用現有模型，不新增 verdict 或任務模型。

## Acceptance

- [ ] 任一 shared-write authorization 可反查唯一 canonical ticket id/generation/digest。
- [ ] file/path grant 不得抑制 atom id/CID block，atom grant 不得授權無關 path/surface/range；成對 negative fixtures 通過。
- [ ] 同維度、同 normalized resource、同 operation/gate 且 generation 有效的 grant 必須授權，證明修復不是全序列化或全拒絕。
- [ ] census 發現的所有 generation/grant 缺失 legacy sidecars 對 active authorization count 貢獻為 0，且 overlap 仍產生 execute/queue/batch ticket；無 sidecar 被刪改。
- [ ] outer decision、matrix arbitration、gate status 與 conflict detail 在同一 generation 不得產生 clear/block 或 clear/freeze 矛盾。
- [ ] completed/cancelled/expired ticket 在所有 gate 都 fail closed，不能被 stale BCR 復活。
- [ ] schema、TypeScript contract 與 tests 同版，`additionalProperties` 無漂移。
- [ ] INV-ATM-008 與 INV-ATM-009 測試通過。
- [ ] source 與 frozen `node atm.mjs` 對相同 probe 的 canonical behavior projection digest 一致，runner digest 已封存；source-only 綠燈不得 close。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:26.017Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0227-canonical-broker-arbitration-authority.task.md","contentDigest":"sha256:4126e1c34b1eef3a318da3e38802c121f55f5ca3dcf4917b763875f85fd1107f"} -->
