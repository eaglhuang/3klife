---
task_id: ATM-GOV-0196
title: Observed telemetry coverage and task seal enforcement
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0195
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with evidence-chain repair work.
scopePaths:
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/telemetry.ts
  - packages/cli/src/commands/taskflow/**
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/gate-telemetry-observed-chain.test.ts
deliverables:
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/telemetry.ts
  - packages/cli/src/commands/taskflow/**
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/gate-telemetry-observed-chain.test.ts
validators:
  - node --strip-types tests/cli/gate-telemetry-observed-chain.test.ts
  - node --strip-types scripts/validate-gate-telemetry-coverage.ts --mode validate
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Disable the new close/checkpoint summary gate, restore the prior coverage reader, and retain runtime raw archives as source-unavailable inputs rather than deleting evidence.
atomizationImpact:
  ownerAtomOrMap: atm.gate-telemetry
  mapUpdates: []
  extractionCandidates:
    - atom: atm.gate-telemetry-observed-coverage
      pattern: Observed Coverage Chain
      source: packages/core/src/telemetry/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m3-observability-repair
surfaceFamily: gate-telemetry
---

# ATM-GOV-0196 Observed telemetry coverage and task seal enforcement

## Intent

把 0195 的「registry 有沒有接線」提升成可驗證的現場證據鏈。coverage 必須分開呈現 `registered`、`codeWired`、`observed`、`sealed`、`consumed`；後續卡只有在事件已封存且被 consumer readback 後，才能把它列入 cohort 或效果判斷。

## Evidence Baseline

- 0195/M2 報告的 control、treatment、matched pairs 均為 0。
- 現場 runtime gate events 只觀察到 `next.route-resolution`，不能代表其他 node family 已有效量測。
- target history 找不到實際 `atm.gateTelemetryTaskSummary.v1`；需求文字不能替代產物。
- 對應 backlog：ATM-BUG-2026-07-19-027、ATM-BUG-2026-07-19-044。

## Producer / Consumer Contract

- Producer：canonical registry、runtime events、watermark seal、taskflow close/checkpoint。
- Consumer：0197-0200 與 0202 cohort matcher。
- Window：claim 前讀取 0195 preflight；close 前固定 watermark 並產出本卡 summary。
- Role：M3 observability repair head。
- Missing-data semantics：缺事件一律為 `observability-missing` 或 `source: unavailable`，不得寫 0 或 successful no-op。
- Raw-data policy：raw event/counter/timing 永遠留 `.atm/runtime/**`；Git 只放 compact digest/manifest。

## Required Work

- coverage report 對每個 node/check 輸出五層狀態、source window、config digest 與未前進原因。
- taskflow close/checkpoint 必須引用 task summary；無資料仍建立 missing summary，不改變原命令 outcome。
- M3 cohort 只接受 observed+sealed+consumed 的樣本，並明列排除原因。
- 先用本卡自己的開發流程 dogfood；同卡 readback validator 必須讀回本卡 sealed summary 並留下 consumed receipt，證明 close 前即可完成正向鏈。
- 跨卡 consumed 證據由 0197-0200、0203 與 0202 各自在開工 `dataDrivenDecision`／close evidence 中引用本卡 history/config digest；不得把未來 consumer readback 設成 0196 的 close 前置。
- 若 taskflow seal/readback 尚不能被觀察，停止後卡並先修本卡。

## Data-Driven Stop Rule

若 0195 coverage source 不可重算、taskflow 無法在 fail-open 前提下可靠封存、或 observed identity 無法與 registry 唯一對應，停止實作並提出 schema/plan 修訂，不得以 code search 推定 covered。

## Acceptance

- [ ] 至少一條 registered→codeWired→observed→sealed→consumed 正向鏈可由本卡同卡 readback validator 重放，且 consumed receipt 引用 history/config digest。
- [ ] 至少一條 code-wired-but-unobserved 與一條 source-unavailable case 保留正確語義。
- [ ] close/checkpoint 缺 summary 不會被當成零事件或有效 cohort。
- [ ] telemetry 失敗前後 command outcome/exit code parity 不變。
- [ ] tracked diff 不含 raw JSONL、counter、per-run timing 或 debug log。
- [ ] 0197-0200、0203 的 consumer contract 明確要求在各自開工／close 證據中寫入本卡 consumed receipt；0196 不等待未來任務才能 close。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:01.166Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0196-observed-telemetry-coverage-and-task-seal-enforcement.task.md","contentDigest":"sha256:8e6b1fc6bb5d65b795d3fee9173ae4ac940f592b45d0022f5f085dc18ac01461"} -->
