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
  - "tests/performance/atm-3-paired-queue-compose.test.ts"
  - "docs/governance/atm-3-replay-evidence.md"
deliverables:
  - "packages/core/src/broker/replay/**"
  - "packages/core/src/telemetry/parallel-replay/**"
  - "packages/cli/src/commands/broker/replay/**"
  - "tests/e2e/atm-3-real-parallel-replay.test.ts"
  - "tests/e2e/atm-3-parallel-replay-faults.test.ts"
  - "tests/performance/atm-3-paired-queue-compose.test.ts"
  - "docs/governance/atm-3-replay-evidence.md"
validators:
  - "node --strip-types tests/e2e/atm-3-real-parallel-replay.test.ts"
  - "node --strip-types tests/e2e/atm-3-parallel-replay-faults.test.ts"
  - "node --strip-types tests/performance/atm-3-paired-queue-compose.test.ts"
  - "npm run validate:cli"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_EVIDENCE_SEAL_REQUIRED"
  - "ATM_BROKER_STATE_DIVERGENCE"
createdByCommand: atm plan card create
evidence:
  required: real-multiprocess-sealed
producer:
  - "atm.parallelReplayEvidence.v1 digest and paired performance verdict."
consumer:
  - "ATM-GOV-0235"
missingData:
  - "Historical 0014/0015 timing cannot seed passing metrics; all performance fields must come from new runs."
dataDrivenStopRule:
  - "Stop with inconclusive if real overlap is zero, sample pairing breaks, or any required telemetry field lacks an unavailable receipt."
  - "Trip queue-only on any escaped conflict, silent overwrite, duplicate side effect, unresolved starvation or stale authorization."
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

- 使用至少兩個獨立 process/actor、isolated proposals、三個 shared/linked surfaces 與 private work。
- 注入 HEAD movement、stale runner reservation 與 publisher crash。
- 同 sealed base/config 執行 queue-only 與 compose-first AB/BA，各至少三次有效 repeat。
- 封存 correctness、timing、coverage、watermark 與 unavailable receipts。

## Acceptance

- [ ] `maxConcurrentWorkers >= 2`、overlap window > 0、parallel admissions > 0。
- [ ] escaped conflict、silent overwrite、duplicate side effect、unresolved starvation、stale authorization全部為 0。
- [ ] linked surface 在 write 前完成 closure/re-arbitration，commit gate 不再首次要求 amendment。
- [ ] stale SHA reservation 不需偽造 receipt即可處置，queue 能前進。
- [ ] median makespan/throughput 各改善至少 25%，cost ratio <= 1.10；否則 verdict 為 failed/inconclusive 並 trip queue-only。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:45.883Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0234-real-multiprocess-parallel-replay-and-telemetry-proof.task.md","contentDigest":"sha256:92ea922005b78910944bfd547ea70a5b4348bf0c35dfb55a1adb6cb256c12799"} -->
