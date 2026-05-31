---
task_id: TASK-AAO-0100
title: "Batch-10 LOC-ranked leaf extraction + atom map formation"
status: in_progress
priority: high
created_at: 2026-05-31T09:48:25+08:00
created_by_agent: antigravity-gemini-3.5-flash
started_at: 2026-05-31T09:48:25+08:00
started_by_agent: antigravity-gemini-3.5-flash
closure_authority: target_repo
depends_on:
  - TASK-AAO-0099
scopePaths:
  - .atm/history/reports/candidates/
  - .atm/history/reports/
  - packages/cli/src/commands/<top-ranked source>
  - atomic_workbench/maps/
deliverables:
  - "candidates rank 4 報告"
  - "10 個 leaf 函數抽取（按 LOC 降序、排除已抽 4 個）"
  - "10 個 helper modules（或 1-3 個 cluster modules，依語意分組）"
  - "10 個 unit test files"
  - "decomposition-plan.json（含 10 atom members + edges + entrypoints）"
  - "atm create-map --from-plan 形成 atm.<cluster>-helpers-map"
  - "atm test --map <mapId> 驗證 map"
  - "10 per-leaf evidence triad（共 50 份）"
  - "1 batch envelope + 1 batch rollback patch"
  - "ROI metric report（tasks.ts 縮減行數 vs helper LOC）"
validators:
  - "node atm.mjs hook pre-commit --json → ok:true"
  - "node atm.mjs atomize score → ≥95/A"
  - "npm run typecheck → exit 0"
  - "npm run validate:cli → exit 0"
  - "npm run validate:git-head-evidence → exit 0"
  - "10 個 leaf 單元測試全綠"
  - "batch rollback patch exit 0"
  - "atm test --map <mapId> 通過"
  - "tasks.ts 必須淨縮減（非淨增）— 否則 scope drift"
atomizationImpact: "首次 batch-10 + 首次 atm create-map 形成 micro-map；若 ROI 為正 → 0101 重複；累積 2 卡後 0102 開 MRP batch CLI"
outOfScope:
  - "抽小 leaf（<30 行）— 本卡優先大行數"
  - "形成跨檔 map（限本卡 source 檔內 cluster）"
  - "v2-r2 full lane transitions（map 形成即停、不走 shadow/canary/active）"
  - "重構非選中 leaf 函數"
nonGoals:
  - "dogfood 升 96+"
  - "刪除 tasks.ts 或大規模重排"
  - "走完 4-stage replacement lane"
notes: "2026-05-31 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成 (Phase 0) | 阻塞: 無"
---

# TASK-AAO-0100 Batch-10 LOC-ranked leaf extraction + atom map formation

## 摘要
首次嘗試 batch-10 大規模併行 leaf 萃取與微觀 atom micro-map 形成。依據 candidates rank 排序，按 LOC 降序選擇 10 個大型 pure leaf 函數，以 semantic cluster helper 進行重組封裝，並呼叫 `atm create-map` 形成微觀 atom map 機制。

## 驗證條件
- `node atm.mjs hook pre-commit --json` → `ok:true`
- `node atm.mjs atomize score` → `≥95/A`
- `npm run typecheck` → `exit 0`
- `npm run validate:cli` → `exit 0`
- `npm run validate:git-head-evidence` → `exit 0`
- 10 個 leaf 單元測試全綠
- batch rollback patch exit 0
- `atm test --map <mapId>` 通過
- `tasks.ts` 必須淨縮減（非淨增）— 否則 scope drift

## 交付物
- candidates rank 4 報告
- 10 個 leaf 函數抽取（按 LOC 降序、排除已抽 4 個）
- 10 個 helper modules（或 1-3 個 cluster modules，依語意分組）
- 10 個 unit test files
- `decomposition-plan.json`（含 10 atom members + edges + entrypoints）
- `atm create-map --from-plan` 形成 `atm.<cluster>-helpers-map`
- `atm test --map <mapId>` 驗證 map
- 10 per-leaf evidence triad（共 50 份）
- 1 batch envelope + 1 batch rollback patch
- ROI metric report（tasks.ts 縮減行數 vs helper LOC）

## 相關聯任務卡
- depends_on: [TASK-AAO-0099]

## 備註
- 2026-05-31 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成 (Phase 0) | 阻塞: 無
