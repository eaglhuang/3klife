---
task_id: TASK-AAO-0098
title: "MRP pilot — leaf-by-leaf governed extraction（target by atm candidates rank）"
status: in_progress
priority: high
created_at: 2026-05-30T21:51:28+08:00
created_by_agent: antigravity-gemini-3.5-flash
started_at: 2026-05-30T21:51:28+08:00
started_by_agent: antigravity-gemini-3.5-flash
closure_authority: target_repo
depends_on:
  - TASK-MRP-0007
  - TASK-MRP-0011
  - TASK-MRP-0026
scopePaths:
  - .atm/history/reports/candidates/
  - .atm/history/reports/
  - (依 candidates rank 結果動態決定)
deliverables:
  - "candidate ranking JSON + source-inventory + police-family + guidance-drift-police 4 報告"
  - "1 leaf 函數從 top candidate 抽取至獨立 helper 模組"
  - "smoke evidence 2 份（governance dry-run + leaf behavior）"
  - "rollback-ready patch + rollback-proof JSON（git apply --check --reverse exit 0）"
  - "actual-patch-evidence 彙整 JSON"
validators:
  - "node atm.mjs hook pre-commit --json → ok:true"
  - "node atm.mjs atomize score → ≥95/A 不退步"
  - "npm run typecheck → exit 0"
  - "candidates rank 4 報告完整"
  - "extracted leaf 之單元測試或行為 smoke 通過"
  - "rollback patch exit 0 (git apply --check --reverse)"
atomizationImpact: "驗證 sanguo-rag 實證 leaf workflow 在 AAF TS 是否適用；為 Window 3 campaign 規模化奠基"
outOfScope:
  - "完整 v2-r2 map workflow（map-spec.json / equivalence runner / lane transitions）— 留 Window 3"
  - "MRP-0028 / MRP-0029 gap cards — 依 pilot 結果決定是否補"
  - "手切其他 cluster — wave 3-B 已 cancel"
  - "改 tasks.ts 或 next.ts 源碼結構（除被選中 leaf 函數抽取外）"
nonGoals:
  - "一次抽多個 leaves（pilot 只抽 1）"
  - "達到 dogfood 96+"
  - "刪除原 tasks.ts 或 next.ts"
notes: "2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成 (Phase 0) | 阻塞: 無"
---

# TASK-AAO-0098 MRP pilot — leaf-by-leaf governed extraction（target by atm candidates rank）

## 摘要
Captain 校正：放棄手切 wave 3-B，改用「sanguo-rag 實證的 leaf-by-leaf governed extraction」workflow，由 ATM 自己的 `atm candidates rank` 排序選 target。本卡是 pilot 試水溫，不直接套 v2-r2 全套 map workflow。

## 驗證條件
- `node atm.mjs hook pre-commit --json` → `ok:true`
- `node atm.mjs atomize score` → `≥95/A 不退步`
- `npm run typecheck` → `exit 0`
- `candidates rank` 4 報告完整
- `extracted leaf` 之單元測試或行為 smoke 通過
- `rollback patch exit 0` (`git apply --check --reverse`)

## 交付物
- candidate ranking JSON + source-inventory + police-family + guidance-drift-police 4 報告
- 1 leaf 函數從 top candidate 抽取至獨立 helper 模組
- smoke evidence 2 份（governance dry-run + leaf behavior）
- rollback-ready patch + rollback-proof JSON（`git apply --check --reverse` exit 0）
- actual-patch-evidence 彙整 JSON

## 相關聯任務卡
- depends_on: [TASK-MRP-0007, TASK-MRP-0011, TASK-MRP-0026]

## 備註
- 2026-05-30 | 狀態: in-progress | 驗證: pending | 變更: 開卡完成 (Phase 0) | 阻塞: 無
