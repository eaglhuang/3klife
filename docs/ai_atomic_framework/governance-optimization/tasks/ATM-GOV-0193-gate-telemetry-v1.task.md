---
doc_id: doc_other_2168
task_id: ATM-GOV-0193
title: 治理閘門遙測基座（Gate Telemetry v1）
status: done
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: 0191 已有歷史 task-event 與雙 repo Git 語意，依不可重用原則改用正式 ledger 未占用的 ATM-GOV-0193。
scopePaths:
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/telemetry/**
  - packages/cli/src/commands/doctor/**
  - packages/cli/src/commands/guard/**
  - packages/cli/src/commands/next/**
  - packages/cli/src/commands/tasks/**
  - packages/cli/src/commands/taskflow/**
  - packages/cli/src/commands/batch/**
  - packages/core/src/broker/**
  - tests/cli/gate-telemetry-v1.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
deliverables:
  - canonical check registry、atm.gateTelemetry.v1 schema 與單一 fail-open emit helper
  - gitignored runtime scratch、rejection store、watermark seal 與 immutable classification events
  - sealed history/digest、telemetry report/task summary 與 meta-health counters
validators:
  - node --strip-types tests/cli/gate-telemetry-v1.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: disable emit/seal wiring and preserve sealed history for audit
errorCodes: []
atomizationImpact:
  ownerAtomOrMap: atm.gate-telemetry
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  extractionCandidates:
    - atom: atm.gate-telemetry
      pattern: Event Log
      source: packages/core/src/telemetry/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: gate-telemetry
createdByCommand: atm plan card create
completed_at: "2026-07-19T08:08:29.065Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T08:08:29.065Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T08-08-29-065Z-close-e48e60e3776b"
lastTransitionAt: "2026-07-19T08:08:29.065Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3b27cabf12a622dd7e907ea2ee9718e71f6e9359"
---

# ATM-GOV-0193 治理閘門遙測基座（Gate Telemetry v1）

## 問題描述

ATM 現有檢查有執行結果但缺少可比較的 per-check eligible、unique block、真陽性、延遲與證據消費鏈，無法證明哪些 gate 有效、重複或只是儀式。遙測本身也不能成為新的 tracked-file 噪音或閘門。

## INPUT_CONTRACT

- 現有 hook/doctor/guard/next/preflight/tasks import/claim/close/handoff/taskflow/evidence/git governance/batch/broker/team/runner-sync/telemetry/analyzer named checks、failure envelopes、actor/lane/task/run correlation 與 canonical redaction policy。
- 0191 已有歷史事件與 Git 語意，不得覆寫或重用；本卡固定為 0193。

## OUTPUT_CONTRACT

- `atm.gateTelemetry.v1` 事件含版本、identity、eligible/result/reason/duration、correlation、input/config digest、source/redaction 與 evidence/rejection refs。
- `.atm/runtime/telemetry/**` 為 gitignored append-only scratch；close/checkpoint/`atm telemetry seal` 以 watermark 產生 immutable history JSONL + digest。
- `atm telemetry report --json` 預設只讀 sealed history；`--include-runtime` 僅診斷。原事件不改寫，true-positive 以後續 classification event 補充。

## Telemetry Contract

- Produces：全部 ATM 節點的 canonical per-check runtime events、rejection/classification、broker decision telemetry、seal/task summary、registry coverage report、dropped/malformed/meta-health。最小覆蓋節點包含 hook、doctor、guard、next/preflight、tasks import/claim/close/handoff、taskflow、evidence seal/readback、git governance、batch、broker、team、runner-sync、telemetry seal/report 與 plan analyzer；暫不接線者必須在 coverage report 標成 `read-only-summary`、`out-of-scope` 或 `not-yet-covered`，不得沉默缺口。
- Broker events 必須記錄 parallelAdmissionAttempted、conflictDetected/conflictAxis、composeCandidate/composeDecision、finalDisposition、waitedMs、decisionLatencyMs、sideEffectAllowed、safetyFallback 與 correctnessVerdict；缺 broker decision event 不得推論為無衝突或 broker 有效。
- Consumes：自身 schema/check registry 與 seal parity；角色為 M1 baseline 起點。
- Missing-data：emit/seal 失敗只 warning 且計數，不能改變原命令 outcome；缺事件不等於 pass/zero。唯讀 lane 留 presence 但不上 write claim。
- Closure evidence：各 gate fixture、runtime worktree cleanliness、雙 lane collision test、watermark replay、report dedupe、fail-open parity、disable/rollback 可讀性。

## 交付物

- 單一 emit/seal/report pipeline、canonical taxonomy、runtime/history stores、rejection/classification 與 focused tests。

## 以戰養戰決策點

- 開工前：確認本卡是依賴圖第 0 步；沒有前序 sealed cohort 可消費時，仍必須產出 self-baseline decision record，列出 coverage registry、meta-health 與 fail-open parity 如何供 0182 起消費。
- 實作中：若發現某 ATM 節點無法安全接線、會污染 tracked worktree、broker 決策缺少可回放 input/config digest、或 registry coverage gap 會使 0182-0190 的 M1/M2 不可比，停止擴大接線，提出 plan/task card 修訂建議給 owner。
- 收口前：封存 0193 自身 baseline，附 `dataDrivenDecision`、registry coverage report、dropped/malformed counters、sealed digest、config digest 與「0182 開工必讀信號」。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/gate-telemetry-v1.test.ts
npm run typecheck
npm run validate:cli
```

## ROLLBACK_HINT

關閉各節點 emit/seal wiring 並 revert implementation；不得刪除已封存 history/digest。原命令在開關前後 outcome、exit code、ordering 與 side effects 必須一致。

## 執行步驟

1. 建 canonical registry/schema/redaction、runtime writer 與 meta-health，先證明 fail-open 及不污染 tracked worktree。
2. 逐一接線 hook、doctor、guard、next/preflight、tasks import/claim/close/handoff、taskflow、evidence seal/readback、git governance、batch、broker、team、runner-sync、telemetry seal/report 與 plan analyzer；每個 gate 使用同一 helper，暫緩接線者寫入 coverage report。
3. 建 rejection/classification 與 watermark seal，驗證 concurrency、crash/replay、去重與 late-event rollover。
4. 交付 report/task summary，封存 0193 自身 baseline，供 0182 起逐卡消費。

## Acceptance

- [ ] 各 ATM 節點至少一筆 canonical per-check fixture，或在 registry coverage report 明確標示尚未接線原因；check registry 無近義重複。
- [ ] runtime 事件不進 tracked history；seal 後 digest 可重現，watermark 前後無漏算/重算。
- [ ] telemetry store 唯讀、毀損或 schema 違規時，原命令照常並留下 meta-health warning。
- [ ] report 能輸出 eligible、unique block、true-positive status、duration、evidence readback 與 missing/dropped。
- [ ] 雙 lane/process 並行零寫入衝突；停用 telemetry 後 sealed history 仍可讀。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T06:30:47.305Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0193-gate-telemetry-v1.task.md","contentDigest":"sha256:d3a7135f21ce4042e45a189cba668c9ce9ddbd7ac956b08f41122237a1a564c4"} -->
