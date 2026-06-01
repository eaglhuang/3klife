---
task_id: TASK-AAO-0106
title: "Path-to-atom-map owner shards"
status: open
priority: high
created_at: 2026-06-01T23:59:00+08:00
created_by_agent: codex-gpt-5
closure_authority: target_repo
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
hostKind: downstream-3klife
alphaGate:
  requiresAlpha0: false
  blocker: false
depends_on:
  - TASK-AAO-0102
scopePaths:
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/**
  - packages/cli/src/commands/next.ts
  - scripts/**
allowed_files:
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/atomization-coverage/**
  - packages/cli/src/commands/next.ts
  - scripts/validate-atomization-coverage.ts
  - scripts/validate-atom-id-to-cid.ts
  - scripts/atom-id-to-cid-backfill.ts
  - scripts/src/atomize-inventory.js
  - scripts/src/atomize-score.js
forbidden_files:
  - atomic-registry.json
  - docs/ai_atomic_framework/**
  - docs/tasks/**
  - release/**
  - atm.mjs
  - package-lock.json
  - atomic_workbench/registry-catalog.md
  - atomic_workbench/atomization-coverage/validator-to-atom-relationship.json
  - merged projection / generated snapshot（不可手改，只可由 shard merge 流程重建）
non_goals:
  - 不處理 registry external-parts reader / writer / merge
  - 不改 catalog projection
  - 不修改與 owner shards 無關的 tasks / evidence / batch UX
executionMode: task-card-opener
deliverables:
  - "path-to-atom-map owner shards layout 與 merge 規則"
  - "合併結果與現行單檔語意等價的 validator"
  - "重複 path/glob ownership 明確報錯"
  - "CLI / scripts 對 owner shards 的讀取支援"
validators:
  - "node atm.mjs doctor --json"
  - "node atm.mjs hook pre-commit --json"
  - "node scripts/validate-atomization-coverage.ts"
  - "node scripts/validate-atom-id-to-cid.ts"
rollback_hint: "先回退 owner shards 與 merge projection touched files；單檔 projection 若需回退，應由 shard merge 流程重建或回退來源 shard，不直接手編。"
notes: "2026-06-01 | 狀態: open | 驗證: pending | 變更: 建立 path-to-atom-map owner shards 草案卡；與 registry external-parts 分卡 | 阻塞: 無"
---

# TASK-AAO-0106 Path-to-atom-map owner shards

## 摘要
把 `atomic_workbench/atomization-coverage/path-to-atom-map.json` 從單一共同責任地圖拆成 owner shards，降低多人同時新增 atom / path pattern 時的搶寫衝突，同時保證 merge 後結果對既有 CLI 與 validator 語意等價。

## 背景
- 目前多個 CLI / scripts 直接把 `path-to-atom-map.json` 視為單一真相來源。
- owner shards 必須在不破壞既有使用者心智的前提下，提供 deterministic merge、等價驗證與重複 ownership 報錯。

## Allowed Files
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- `atomic_workbench/atomization-coverage/**`
- `packages/cli/src/commands/next.ts`
- `scripts/validate-atomization-coverage.ts`
- `scripts/validate-atom-id-to-cid.ts`
- `scripts/atom-id-to-cid-backfill.ts`
- `scripts/src/atomize-inventory.js`
- `scripts/src/atomize-score.js`

## 禁止事項
- 禁止把 `TASK-AAO-0105` 的 registry external-parts 工作混進本卡。
- 禁止手工維護 merge projection 當真相來源。
- 禁止修改 `atomic-registry.json`、`atm.mjs`、`release/**`、`package-lock.json`。
- 禁止為了避錯而靜默覆蓋重複 path/glob ownership；衝突必須報錯。
- 禁止把單檔與 shards 長期雙寫成兩個平行真相來源。

## Validators
- `node atm.mjs doctor --json`
- `node atm.mjs hook pre-commit --json`
- `node scripts/validate-atomization-coverage.ts`
- `node scripts/validate-atom-id-to-cid.ts`

## Acceptance Criteria
- owner shards 可 deterministic merge 成單一 projection，且結果對目前單檔 `path-to-atom-map.json` 語意等價。
- CLI / validator / score / inventory 工具可讀取 shards 或 merge 後結果，不要求人工手併。
- 若同一 path 或 glob 被多個 owner shard 重複宣告，流程必須明確報錯，不得 silent override。
- merge 後 projection 仍相容於現有 `validate-atomization-coverage`、`validate-atom-id-to-cid` 與 inventory / score 腳本。
- 單檔 projection 只作 generated output 或 compatibility surface，不再作多人直接編輯真相來源。

## Generated / Projection Files 不可手改
- merge 後的單檔 `path-to-atom-map.json` 若保留為 projection / compatibility surface，僅可由 shard merge 流程產生。
- 任何 generated snapshot、projection 或 compatibility output 都不得手工編輯來遮掩 ownership 衝突。

## 交付物
- owner shards 佈局與 merge 規則
- 等價驗證
- ownership collision error handling
- CLI / script 讀取支援

## 範圍外
- atomic-registry external-parts
- registry catalog projection
- 與 owner shards 無關的 AAO / MRP UX 清理

## 非目標
- 不要求一次重寫所有 atomization coverage 相關歷史檔案
- 不允許把 projection 當新手工真相來源
