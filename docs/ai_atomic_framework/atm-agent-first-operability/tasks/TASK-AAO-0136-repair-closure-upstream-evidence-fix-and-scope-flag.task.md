---
doc_id: ""
task_id: TASK-AAO-0136
title: "tasks repair-closure upstream-evidence-fix mode and --scope flag"
milestone: M17
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
created: "2026-06-08"
created_by_agent: captain-incident-review-2026-06-08
started_at: ""
started_by_agent: ""
blocked_by:
  - TASK-AAO-0135
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-repair-closure-upstream-evidence-fix-and-scope-flag
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-CID-0018
  - TASK-AAO-0135
depends:
  - TASK-AAO-0135
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
forbidden_files:
  - .atm runtime / history manual edits
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not change tasks reconcile semantics for fresh closures."
  - "Do not implement automated bulk repair across all tasks."
  - "Do not weaken dirty-tree fail-closed posture for unrelated changes."
notes: "2026-06-08 | status: open | validation: pending | change: Phase 0 open card for repair-closure upstream-evidence-fix mode and --scope flag | blocker: depends on TASK-AAO-0135"
---

# TASK-AAO-0136 tasks repair-closure upstream-evidence-fix mode and --scope flag

## 目標

讓 `tasks repair-closure` 真正能補單，不只是改 closure-packet.json：

1. 新增 upstream-evidence-fix 模式：掃描 `.atm/history/evidence/<task>.json` 內所有 `commandRuns[*].stdoutSha256/stderrSha256`，套用與 0135 同樣的 lowercase normalization；以及修補 format-invalid 欄位。
2. 新增 `--scope <taskId>` 旗標：只把與該 task scope（claim.files / direction lock allowedFiles / declared deliverables）重疊的 dirty file 列為「相關」，其他 unrelated tracked dirty 不再阻擋維修。

## 背景

2026-06-08 TASK-CID-0018 unstick 經驗：

- `repair-closure` 只更新 `closure-packet.json`，但 `tasks reconcile` 從 `.atm/history/evidence/<task>.json` 重建 packet。結果修了 packet 還是會被 reconcile 駁回。
- 在多 captain 共用 repo 情境，CID-0019 captain 進行中的 broker.ts 修改被 `repair-closure` 判定為 unrelated dirty，整個維修通道直接關閉。
- 最後是隊長手動 grep `[A-F]` + 改 evidence file + npm run build + 重跑 reconcile 才解開。這套流程應該變成官方工具。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Candidate Allowed Files

- `packages/cli/src/commands/framework-development.ts`（`repairClosurePacket`、`readClosureEvidenceContext`）
- `packages/cli/src/commands/tasks.ts`（repair-closure dispatcher、scope filter）
- `packages/cli/src/commands/command-specs/tasks.spec.ts`（新旗標）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm` runtime / history manual edits
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

- `tasks repair-closure --task <id>` 預設多做一步：呼叫 evidence-source normalizer，把上游 evidence file 內所有 sha256 lowercase 並修補格式錯誤（依賴 0135 的 normalization util）。
- 新旗標 `--scope <taskId>` 開啟後：dirty-tree check 只看與該 task 的 claim.files / direction lock allowedFiles / deliverables 交集的修改；無交集的 unrelated dirty 降為 warning 不 block。
- 沒帶 `--scope` 時維持現行 fail-closed 行為（向後相容）。
- 新增 integration test：模擬大寫 sha256 evidence + unrelated dirty broker.ts → 帶 `--scope TASK-CID-0018` 應該能跑完並產出可用 packet。
- 新增 test：`--scope` 與 task scope 重疊的 dirty 仍然會 block。

## Validators

### Phase 0 Planning Validators

- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm test -- --grep repair-closure`
- `git diff --check`

## Plain-language Anchor

這張卡是讓「維修通道」真的可以維修。修對地方（upstream evidence），允許多 captain 共用 repo 時還能單獨修一個 task。
