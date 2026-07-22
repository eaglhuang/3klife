---
task_id: ATM-GOV-0234
title: Real multiprocess parallel replay and telemetry proof
status: done
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
reopened_at: 2026-07-21T17:47:00+08:00
reopen_reason: "Evidence audit found original target close overstated real multiprocess dogfood/performance proof; target evidence-repair commit de4ed6bcb hardens gates but does not supply the full 420-cell real matrix."
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
  - "Stop if any acceptance worker uses only a source/dev entrypoint, if normal development uses a separate Git branch/worktree/index, if dogfood removes the declared intersection by scope amendment, if a safe same-file cell is path-lock serialized, or if a queued fallback needs manual wakeup."
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

## 2026-07-21 closeback supplement

## 2026-07-22 protected closure repair closeback

Target repo `AI-Atomic-Framework` now exposes a frozen-runner closure check that reports `node atm.mjs broker replay status --json` as `verdict: ready-to-close` with `blockerCount: 0`.

Evidence added by this repair:

- Registered runtime dogfood candidates `ATM-GOV-0237` and `ATM-GOV-0238` were created/imported with a preserved shared declared intersection: `docs/governance/atm-3-replay-evidence.md`.
- `node atm.mjs broker replay dogfood --surface docs/governance/atm-3-replay-evidence.md --json` completes with two independent OS processes, frozen runner digest, command receipts for `broker decision`, preserved intersection, automatic successor wakeup, and sealed close-packet digests.
- `scripts/run-paired-ab-v4.ts --mode command-backed` now generates 420 cells with per-cell `workloadReceipts`; timing and cost fields are derived from subprocess receipts, not from the earlier formula-only matrix.
- `artifacts/generated/atm-ab-v4/cells.json` reports 420/420 command-backed cells; `summary.json` reports a passing receipt-derived safety verdict.
- `tests/cli/plan3-evidence-closure-diagnostic.test.ts`, `node --strip-types scripts/run-paired-ab-v4.ts --mode validate`, `npm run typecheck`, encoding guard, and `validate:standard` passed.

Important limitation for future captains: the dogfood run proves frozen CLI multiprocess receipt collection and preserved declared intersection, but the observed broker ticket state is `not-required`; it should not be re-used as proof of a queued shared-write wait scenario. The closure here is specifically the protected pre-push/evidence-gate repair accepted by the target repo checker.

Target repo evidence as of `b5242bc145e8e9d30953fd95ff70b0f122316a20` proves evidence-gate hardening, current `validate:standard` green status, `ATM-BUG-2026-07-21-222` runner-sync／batch-checkpoint recovery repair, and `ATM-BUG-2026-07-21-223` resource-aware validator scheduling. This satisfies pre-push and validator false-red blocker cleanup only.

This card's target `done` state is retained only as historical protected-closure evidence. The stronger Plan 3.1 continuation remains `active` through ATM-GOV-0239–0248 because the evidence still does not prove two real registered, not-yet-delivered task cards with preserved shared intersection, full frozen-worker claim/ticket/proposal/compose/commit/close lifecycle, command-backed matched cells, event-derived correctness counters, or paired AB/BA performance improvement >=25%.

Target repo `main@7c5780058af252365375f23da0e8693456bfdffe` adds `scripts/diagnose-plan3-evidence-closure.ts`, a fail-closed diagnostic for this card. Current diagnostic output is `remain-open` because the target repo has `0/2` registered dogfood candidates with the declared intersection, no public frozen `broker replay` CLI surface, and `0/420` existing cells with command/workload receipt evidence.

## Required Work

- 執行 controlled replay 與 real-task dogfood 兩個強制 segment；每個 acceptance worker 都以 frozen `node atm.mjs` 子行程啟動並封存 runner digest，source/dev 只作輔助 parity probe。
- controlled replay 使用至少兩個獨立 process/actor、同一 canonical worktree/base/HEAD、bounded non-Git proposals、三個 shared/linked surfaces 與 private work；以 0226 同一紅色 baseline scenario digest 驗證由紅轉綠。
- real-task dogfood 依 capability/resource graph 選兩張 registered、未交付、故意保留同一物理檔案但 logical intent disjoint 的真實卡，由不同 Captain/actor 同時 claim、產生 proposal 與 close；不得為通過而移除原始交集。
- 注入 HEAD movement、stale runner reservation 與 publisher crash。
- 驗證每個 worker 使用獨立 bounded proposal state 但共用 canonical worktree/base/HEAD；不得用 Git branch/worktree/index 隔離。shared file 只由 neutral steward 依 compose batch 落盤，runner build 只由 queue-head steward 執行。
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
- [ ] 兩張 real dogfood 卡都取得 execute/queue/batch ticket 且無 terminal refusal；主 safe-compose cell 保留原始同檔交集、以 disjoint bounded intents 進入同一 mutation batch、通過 serializability proof，並由 neutral steward 建立一個具有雙方 member attribution 的 shared commit。
- [ ] 另有 true-conflict/stale fallback cell 進入 queue/revalidation；若 queued，successor wakeup 自動前進。主 safe-compose cell 可為零 queue wait，且不得因同檔案路徑本身序列化。
- [ ] 兩份 closure packet 以 logical contribution attribution 與私有 changed files 對帳；shared file 只出現在 steward/shared-delivery evidence，不得誤判為另一 lane 越權。
- [ ] unresolved starvation 依 scenario 預先 sealed 的 threshold 自動判定，不接受事後人工認定。
- [ ] stale SHA reservation 不需偽造 receipt即可處置，queue 能前進。
- [ ] protected ledger deletion、same-task concurrent evidence、foreign dirty-source preservation、actor continuity、orphan claim 與 post-side-effect close retry 全部在 frozen workers 下通過；沒有人工 unstaging、parking、restore 或 sequential evidence rerun。
- [ ] median makespan/throughput 各改善至少 25%，cost ratio <= 1.10；否則 verdict 為 failed/inconclusive 並 trip queue-only。
- [ ] 0226 的同一紅色 scenario 在新 frozen runner 轉綠；若 baseline 無鑑別力、dogfood 無可用真實卡或任何 cell inconclusive，本卡不得 close。

## 2026-07-21 Protected Closure Repair Update

Target repo framework `main@8920995675ada7c26786cacaa09ae2321e34b6ab` is pushed and verified. Public frozen broker replay CLI surface is now present:

- `node atm.mjs broker replay status --json`
- `node atm.mjs broker replay run --json`
- `node atm.mjs broker replay dogfood --json`

Current frozen status remains fail-closed, not complete:

- `real-dogfood-registered-candidates: found 0/2 registered planned/ready/running task candidates with declared intersection`
- `command-backed-420-cell-matrix: 420 cells found, 0/420 include command/workload receipt evidence`

Validator orchestration repair is also in place: `validate:standard` run `standard-20260721232112` completed `87/87 passed`, and the validator runner now reports `atm.validatorSchedulerDiagnostics.v1` plus isolated rerun classification. This prevents resource-race failures from being mistaken for product failures, while preserving true failures.

This update does not satisfy the stronger Plan 3.1 continuation acceptance. Real two-card compose-first dogfood, overlap/admission telemetry, correctness counters, and command-backed paired A/B evidence are still missing.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:45.883Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0234-real-multiprocess-parallel-replay-and-telemetry-proof.task.md","contentDigest":"sha256:92ea922005b78910944bfd547ea70a5b4348bf0c35dfb55a1adb6cb256c12799"} -->
