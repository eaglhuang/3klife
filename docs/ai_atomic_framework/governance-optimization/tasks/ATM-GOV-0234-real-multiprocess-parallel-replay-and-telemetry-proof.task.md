---
task_id: ATM-GOV-0234
title: Real multiprocess parallel replay and telemetry proof
status: planned
owner: atm-performance
priority: P0
milestone: ATM-3.0-E
severity: P0
depends_on:
  - ATM-GOV-0233
  - ATM-GOV-0232
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns real multi-agent dogfood, canonical telemetry and performance/correctness proof."
scopePaths:
  - "packages/core/src/broker/replay/**"
  - "packages/core/src/telemetry/parallel-replay/**"
  - "packages/cli/src/commands/broker/replay/**"
  - "tests/e2e/atm-3-real-parallel-replay.test.ts"
  - "tests/e2e/atm-3-parallel-replay-faults.test.ts"
  - "tests/e2e/atm-3-real-task-dogfood.test.ts"
  - "tests/performance/atm-3-paired-queue-compose.test.ts"
  - "docs/governance/atm-3-replay-evidence.md"
deliverables:
  - "packages/core/src/broker/replay/**"
  - "packages/core/src/telemetry/parallel-replay/**"
  - "packages/cli/src/commands/broker/replay/**"
  - "tests/e2e/atm-3-real-parallel-replay.test.ts"
  - "tests/e2e/atm-3-parallel-replay-faults.test.ts"
  - "tests/e2e/atm-3-real-task-dogfood.test.ts"
  - "tests/performance/atm-3-paired-queue-compose.test.ts"
  - "docs/governance/atm-3-replay-evidence.md"
validators:
  - "node --strip-types tests/e2e/atm-3-real-parallel-replay.test.ts"
  - "node --strip-types tests/e2e/atm-3-parallel-replay-faults.test.ts"
  - "node --strip-types tests/e2e/atm-3-real-task-dogfood.test.ts"
  - "node --strip-types tests/performance/atm-3-paired-queue-compose.test.ts"
  - "npm run validate:cli"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_EVIDENCE_SEAL_REQUIRED"
  - "ATM_BROKER_STATE_DIVERGENCE"
  - "ATM_BROKER_AUTHORIZATION_DIMENSION_MISMATCH"
createdByCommand: atm plan card create
evidence:
  required: real-multiprocess-sealed
producer:
  - "atm.parallelReplayEvidence.v1 digest and paired performance verdict."
consumer:
  - "ATM-GOV-0235"
missingData:
  - "Historical 0014/0015 timing cannot seed passing metrics; all performance fields must come from new runs."
  - "Real dogfood task ids must be selected at run time from registered, not-yet-delivered tasks by declared intersection/capability criteria; no id is preapproved in control flow."
dataDrivenStopRule:
  - "Stop with inconclusive if real overlap or pre-sealed overlap ratio is below threshold, serialized admission ratio exceeds threshold, sample pairing breaks, or any required telemetry field lacks an unavailable receipt."
  - "Trip queue-only on any escaped conflict, silent overwrite, duplicate side effect, unresolved starvation, stale authorization, dimension-mismatched authorization or decision contradiction."
  - "Stop if any acceptance worker uses only a source/dev entrypoint, if dogfood removes the declared intersection by scope amendment, or if a queued lane needs manual wakeup."
out_of_scope:
  - "No deterministic fixture may substitute for the real multiprocess acceptance run."
  - "No hardcoded task/path incident orchestration."
rollback:
  strategy: circuit-breaker
  notes: "Trip queue-only and preserve the failed evidence seal; test repositories and proposals are disposable through governed cleanup."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.parallel-replay"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0234 Real multiprocess parallel replay and telemetry proof

## Intent

以新版本 ATM 真正重演 0014／0015 的故障形狀。scenario 用角色、resource graph 與 fault schedule 描述，因此同一 runner 可驗證其他任務組合，不是為歷史 incident 寫的腳本。

## Required Work

- 執行 controlled replay 與 real-task dogfood 兩個強制 segment；每個 acceptance worker 都以 frozen `node atm.mjs` 子行程啟動並封存 runner digest，source/dev 只作輔助 parity probe。
- controlled replay 使用至少兩個獨立 process/actor、isolated proposals、三個 shared/linked surfaces 與 private work；以 0226 同一紅色 baseline scenario digest 驗證由紅轉綠。
- real-task dogfood 依 capability/resource graph 選兩張 registered、未交付、故意保留 declared intersection 的真實卡，由不同 Captain/actor 同時 claim、施工與 close；不得為通過而移除原始交集。
- 注入 HEAD movement、stale runner reservation 與 publisher crash。
- 驗證每個 worker 使用獨立 proposal/worktree/index；shared runtime/evidence 的 mutation 只經 canonical CAS/lease，runner build 只由 queue-head steward 執行。
- 加入成對授權維度情境：file/path grant 不得抑制 atom id/CID block，atom grant 不得授權無關 path/surface；同時核對 outer decision、gate results 與 conflict details。
- 同 sealed base/config/build 執行 queue-only 與 compose-first AB/BA，各至少三次有效 repeat；queue-only arm 只能由 policy CLI trip 產生，correctness/performance 使用同一組 valid cells。
- 封存 `parallelOverlapRatio`、`serializedAdmissionRatio` 與 pre-sealed `starvationThresholdMs`/source；canonical closure profile 要求 overlap ratio 至少 0.30、serialized ratio 不高於 0.70。
- 封存 correctness、timing、coverage、watermark、breaker trip/residency/recovery 與 unavailable receipts；區分 healthy replay 與 fault-injection segment。

## Acceptance

- [ ] controlled replay 與 real-task dogfood 都由 frozen `node atm.mjs` workers 執行，runner digests 完整；source/frozen canonical behavior projection digests 一致。
- [ ] `maxConcurrentWorkers >= 2`、overlap window > 0、parallel admissions > 0、`parallelOverlapRatio >= 0.30`、`serializedAdmissionRatio <= 0.70`。
- [ ] escaped conflict、silent overwrite、duplicate side effect、unresolved starvation、stale authorization、dimension-mismatched authorization、decision contradiction 全部為 0。
- [ ] healthy replay 的 `unexpectedBreakerTripCount = 0`、`timeInQueueOnlyRatio = 0`；fault-injection 的每次 trip 都與注入原因、recovery latency 及較新的 passing digest 可關聯。
- [ ] linked surface 在 write 前完成 closure/re-arbitration，commit gate 不再首次要求 amendment。
- [ ] 兩張 real dogfood 卡都取得 execute/queue/batch ticket且無 terminal refusal；原始 declared intersection 全程保留，queued lane 由 successor wakeup 自動前進，兩份 closure packet changed files 互不污染。
- [ ] unresolved starvation 依 scenario 預先 sealed 的 threshold 自動判定，不接受事後人工認定。
- [ ] stale SHA reservation 不需偽造 receipt即可處置，queue 能前進。
- [ ] protected ledger deletion、same-task concurrent evidence、foreign dirty-source preservation、actor continuity、orphan claim 與 post-side-effect close retry 全部在 frozen workers 下通過；沒有人工 unstaging、parking、restore 或 sequential evidence rerun。
- [ ] median makespan/throughput 各改善至少 25%，cost ratio <= 1.10；否則 verdict 為 failed/inconclusive 並 trip queue-only。
- [ ] 0226 的同一紅色 scenario 在新 frozen runner 轉綠；若 baseline 無鑑別力、dogfood 無可用真實卡或任何 cell inconclusive，本卡不得 close。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:45.883Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0234-real-multiprocess-parallel-replay-and-telemetry-proof.task.md","contentDigest":"sha256:92ea922005b78910944bfd547ea70a5b4348bf0c35dfb55a1adb6cb256c12799"} -->
