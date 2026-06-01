---
task_id: TASK-AAO-0105
title: "Atom registry external-parts sharding"
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
  - atomic-registry.json
  - packages/core/src/index.ts
  - packages/core/src/registry/**
  - scripts/validate-seed-registry.ts
  - scripts/validate-cli.ts
  - atomic_workbench/registry-catalog.md
allowed_files:
  - atomic-registry.json
  - packages/core/src/index.ts
  - packages/core/src/registry/**
  - scripts/validate-seed-registry.ts
  - scripts/validate-cli.ts
  - atomic_workbench/registry-catalog.md
forbidden_files:
  - docs/ai_atomic_framework/**
  - docs/tasks/**
  - release/**
  - atm.mjs
  - package-lock.json
  - atomic_workbench/registry-catalog.md（不可手改，只可由生成流程更新）
non_goals:
  - 不處理 path-to-atom-map owner shard
  - 不修改 dogfood-score 與 atomization coverage 規則
  - 不把 registry-catalog.md 當手工維護真相來源
executionMode: task-card-opener
deliverables:
  - "atomic-registry.json 支援 external-parts strategy 的正式 reader/writer/merge 行為"
  - "registry parts layout 與 merge 規則"
  - "CLI / validator 對 external-parts registry 的讀寫支援"
  - "generated registry-catalog projection 可由流程重建，但不手改"
validators:
  - "node atm.mjs doctor --json"
  - "node atm.mjs hook pre-commit --json"
  - "node scripts/validate-seed-registry.ts"
  - "node scripts/validate-cli.ts"
rollback_hint: "先回退 atomic-registry 與 registry parts touched files；generated catalog 若需回退，應回退生成來源或生成流程，不直接手編 projection。"
notes: "2026-06-01 | 狀態: open | 驗證: pending | 變更: 建立 external-parts registry sharding 草案卡；與 path-to-atom-map owner shards 分卡 | 阻塞: 無"
---

# TASK-AAO-0105 Atom registry external-parts sharding

## 摘要
把 `atomic-registry.json` 從單一總帳擴成 `external-parts` 正式模式，支援實際可用的 reader / writer / merge。目標是降低多人新增 atom 時集中搶寫單一 registry 文件的衝突。

## 背景
- `packages/core/src/registry/registry.ts` 已接受 `single-document` / `external-parts` 兩種 sharding strategy，但目前 Phase 0 判定尚未形成完整且穩定的 reader / writer / merge 閉環。
- `atomic_workbench/registry-catalog.md` 應維持 generated projection 角色，不應被手工編輯為真相來源。

## Allowed Files
- `atomic-registry.json`
- `packages/core/src/index.ts`
- `packages/core/src/registry/**`
- `scripts/validate-seed-registry.ts`
- `scripts/validate-cli.ts`
- `atomic_workbench/registry-catalog.md`（僅允許生成流程更新，不可手改）

## 禁止事項
- 禁止把 `TASK-AAO-0106` 的 path-to-atom-map owner shards 內容混進本卡。
- 禁止手工編輯 `atomic_workbench/registry-catalog.md`。
- 禁止修改 `atm.mjs`、`release/**`、`package-lock.json`。
- 禁止擴大到 dogfood-score、atomization coverage scoring 或 CID sidecar。
- 禁止順手整理 3KLife planning docs / ledger 以外的檔案。

## Validators
- `node atm.mjs doctor --json`
- `node atm.mjs hook pre-commit --json`
- `node scripts/validate-seed-registry.ts`
- `node scripts/validate-cli.ts`

## Acceptance Criteria
- `atomic-registry.json` 可宣告並驗證 `external-parts` 佈局，reader 能正確載入 parts 並輸出等價 registry 視圖。
- writer / merge 流程可在 external-parts 模式下運作，不要求人工先拼回 single-document。
- parts 合併後的 registry 結果對既有 validator 與 CLI 消費端保持相容。
- projection 類輸出仍可重建 `atomic_workbench/registry-catalog.md`，但該檔不作手工真相來源。
- 若 parts 配置缺失、重複、順序不一致或 merge 失敗，CLI / validator 要給可操作錯誤訊息。

## Generated / Projection Files 不可手改
- `atomic_workbench/registry-catalog.md` 是 generated projection。
- 本卡若需要更新 catalog，必須透過 generator / projection pipeline 產生，不得手工編輯內容湊通過。

## 交付物
- external-parts registry 結構與合併規則
- reader / writer / merge 實作
- validator / CLI 支援
- generated catalog projection 更新流程

## 範圍外
- path-to-atom-map owner shards
- atomization coverage owner 規則重設
- release onefile / root-drop 打包調整

## 非目標
- 不追求一次完成所有 registry 相關歷史資料清理
- 不把 catalog 改成新真相來源
