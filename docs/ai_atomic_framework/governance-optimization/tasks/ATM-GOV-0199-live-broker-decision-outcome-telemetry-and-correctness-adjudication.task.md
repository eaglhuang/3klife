---
task_id: ATM-GOV-0199
title: Live broker decision outcome telemetry and correctness adjudication
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0196
  - ATM-GOV-0205
  - ATM-GOV-0206
  - ATM-GOV-0211
  - ATM-GOV-0212
  - ATM-GOV-0213
  - ATM-GOV-0214
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with broker effectiveness evidence.
scopePaths:
  - packages/core/src/telemetry/broker/**
  - packages/cli/src/commands/broker/broker-decision-observation.ts
  - scripts/validate-broker-decision-outcome-telemetry.ts
  - tests/cli/broker-decision-outcome-telemetry.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/core/src/telemetry/broker/**
  - packages/cli/src/commands/broker/broker-decision-observation.ts
  - scripts/validate-broker-decision-outcome-telemetry.ts
  - tests/cli/broker-decision-outcome-telemetry.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types tests/cli/broker-decision-outcome-telemetry.test.ts
  - node --strip-types scripts/validate-broker-decision-outcome-telemetry.ts
  - node --strip-types scripts/validate-gate-telemetry-coverage.ts --mode validate
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Disable only the observation adapter, outcome classifier, and aging worker; retain append-only runtime decisions for audit and verify the unchanged 0211-0214 admission/publish behavior has side-effect parity after rollback.
atomizationImpact:
  ownerAtomOrMap: atm.broker-conflict-resolution
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.broker-decision-outcome-classifier
      pattern: Broker Decision Outcome Classifier
      source: packages/core/src/telemetry/broker/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m3-observability-repair
surfaceFamily: broker-decision
---

# ATM-GOV-0199 Live broker decision outcome telemetry and correctness adjudication

## Intent

讓 broker 的每次 execute/queue/batch、compose strategy、revalidation、R1/R2/R3/R4 例外與結果都能被觀察、回放並在後續結果出現後裁決正確性，回答「是否先讓不同卡平行進場」、「是否能 compose 一起寫」、「queue fallback 是否公平」與「解衝突是否正確」。

## Evidence Baseline

- 既有 final report 只有 1 筆 broker ticket、correctness samples=0、parallel admission rate=0%、compose 為 n/a。
- 這些數據只能證明缺樣，不能證明 broker 沒衝突或解得正確。
- 對應 backlog：ATM-BUG-2026-07-19-036。

## Producer / Consumer Contract

- Producer：0211 ticket decisions、0212 composition receipts、0213 semantic receipts、0214 publish/commit/close/incident outcomes。
- Consumer：0202 broker correctness 與 paired A/B analyzer。
- Window：開工 `dataDrivenDecision` 消費 0196 broker observed coverage 的 history/config digest並寫 consumed receipt；decision 發生即寫 runtime，outcome 後追加 immutable classification，close 時 seal summary並由同卡 readback validator 驗證。
- Role：M3 broker treatment producer。
- Missing-data semantics：無 decision event 是 observability-missing；`pending` 不等於 correct，必須 aging。
- Raw-data policy：requestedFiles/conflict trace 留 runtime；tracked digest 去識別、聚合並引用 outcome/config digest。

## Required Work

- 量 parallel admission attempt/reason、conflict set/axis、compose candidate/decision、final disposition、waitedMs、latency、fallback 與 side-effect allowance。
- 明確區分「先平行後判斷」、「policy 預先序列化」、「surface 不可平行」；分母用 eligible opportunity。
- decision join commit/file slices、validators、rollback/escape、downstream incident，產生 correct/false-positive/false-negative/escaped/manual-overridden。
- correctness pending 有 age threshold、ownerReviewRef 與 backlog/escalation 出口。
- close evidence 保存本卡 sealed broker summary、同卡 readback receipt 與供 0202 依 decisionId/outcomeRef 消費的 history/config digest；0199 不等待 0202 才能 close。

## Data-Driven Stop Rule

若 requestedFiles/conflictSet 不能安全 redaction、outcome join 會改寫原 decision、或 parallel-first 會突破 R1/R2/R3 安全邊界，停卡回報；不得為取得樣本刻意製造不安全平行寫入。

## Acceptance

- [ ] 無衝突 execute、可 compose batch、不安全 queue fallback、R1 hard reject、false-positive、escaped-conflict 各有 deterministic case。
- [ ] 至少一筆真 dogfood decision 被 observed、sealed、consumed 並完成 outcome adjudication。
- [ ] pending correctness 會 aging/升級，不被統計成成功。
- [ ] telemetry fail-open，不改變 broker admission 或 side-effect outcome。
- [ ] 0202 能直接依 decisionId/outcomeRef join，不靠 actor 名稱猜測。
- [ ] 開工 `dataDrivenDecision` 已引用 0196 history/config digest並留下 consumed receipt；本卡 sealed summary 可由同卡 validator 讀回並供 0202 後續寫入跨卡 consumed receipt。
- [ ] rollback 後 broker admission、compose/queue 與 side-effect outcome parity 通過，既有 append-only decision 不被改寫或刪除。

## v2.1 Required Adjustment (Capability Telemetry Only)

- 本卡只接線/分類/量測 0211–0214 的既有 capability，不得自行改 admission、ticket、composer、semantic或publish policy；觀測 failure維持fail-open。
- canonical decision fields增加anchor resolution rate、structured-overlap kind/confidence、compose candidate/selected/skipped、composition cost、serializability verdict、read/write-set intersection、revalidation result、queue depth/position/aging/bypass/wakeup、starvation/duplicate-wakeup、partial-compose與fallback reason。
- 排隊對照報 `waitedMs` p50/p95/p99、total queue wait、release-to-executing、head health與waitRatio；compose報authoring max、composition/publish cost與saved serialization depth，不使用O(1)宣稱。
- correctness以commit tree/member slices、serial oracle、validator、semantic result與downstream incident join；只有receipt帶`compose`字串不構成正確樣本。
- raw decision/outcome traces走0205/0197 runtime boundary；Git只存compact digest與aggregate。0202消費前，compose、queue、semantic與scale strata任一缺樣必須明示`inconclusive`。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:05.936Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0199-live-broker-decision-outcome-telemetry-and-correctness-adjudication.task.md","contentDigest":"sha256:737aa16264afd5da24d38f674ba7a56ca4215d1e536fcc0e2e37967d47dfe8a0"} -->
