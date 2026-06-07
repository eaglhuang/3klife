---
task_id: TASK-AAO-0102
title: "Map formation retry — ATM-MAP-0003 + integration test stub"
status: done
priority: high
created_at: 2026-05-31T20:29:07+08:00
created_by_agent: codex-gpt-5
closure_authority: target_repo
depends_on:
  - TASK-AAO-0100
  - TASK-AAO-0101
scopePaths:
  - plans/
  - atomic_workbench/maps/ATM-MAP-0003/
  - .atm/history/reports/
  - .atm/history/evidence/
deliverables:
  - "plans/TASK-AAO-0102-tasks-helpers-batch10.plan.json（mapId 改 ATM-MAP-0003）"
  - "atomic_workbench/maps/ATM-MAP-0003/map.spec.json（atm create-map 產出）"
  - "atomic_workbench/maps/ATM-MAP-0003/map.integration.test.ts（手寫 stub，imports + assert 10 members 存在）"
  - "atomic_workbench/maps/ATM-MAP-0003/map.test.report.json（atm test --map 產出）"
  - "batch envelope + ROI report"
  - "framework UX gap 紀錄（為 MRP-0028 鋪路）"
validators:
  - "node atm.mjs spec --validate → PASS"
  - "node atm.mjs create-map --from-plan → 產 map.spec.json"
  - "node atm.mjs test --map ATM-MAP-0003 → PASS"
  - "node atm.mjs atomize score → ≥95/A"
  - "node atm.mjs hook pre-commit --json → ok:true"
atomizationImpact: "完成 0101 撞牆的 map formation 重試；改用 sequential mapId ATM-MAP-0003，並補 integration test stub，讓 v2-r2 三件套可在本卡閉環。"
outOfScope:
  - "抽新 leaf"
  - "改 framework source 支援 slug mapId（屬 MRP-0028 範疇）"
  - "v2-r2 lane transitions（map 形成即停）"
  - "改 0100 已抽 helpers"
nonGoals:
  - "dogfood 升 96+"
  - "auto-generate integration test（屬 framework 功能、MRP-0028）"
notes: "2026-05-31 | 狀態: open | 驗證: pending | 變更: Phase 0 開卡重試；mapId 改 ATM-MAP-0003；手寫 integration test stub；ledger 排在 0101 之後 | 阻塞: 無"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from open."
---

# TASK-AAO-0102 Map formation retry — ATM-MAP-0003 + integration test stub

## 摘要
重試 TASK-AAO-0101 的 map formation，改用 sequential mapId `ATM-MAP-0003`，並補手寫 `map.integration.test.ts` stub，讓 `atm test --map` 可在本卡白名單內閉環。

## 驗證目標
- `node atm.mjs spec --validate plans/TASK-AAO-0102-tasks-helpers-batch10.plan.json -> PASS`
- `node atm.mjs create-map --from-plan plans/TASK-AAO-0102-tasks-helpers-batch10.plan.json -> 產 map.spec.json`
- `node atm.mjs test --map ATM-MAP-0003 -> PASS`
- `node atm.mjs atomize score -> >=95/A`
- `node atm.mjs hook pre-commit --json -> ok:true`

## 交付物
- `plans/TASK-AAO-0102-tasks-helpers-batch10.plan.json`
- `atomic_workbench/maps/ATM-MAP-0003/map.spec.json`
- `atomic_workbench/maps/ATM-MAP-0003/map.integration.test.ts`
- `atomic_workbench/maps/ATM-MAP-0003/map.test.report.json`
- batch envelope + ROI report
- framework UX gap 紀錄（為 MRP-0028 鋪路）

## 範圍外
- 抽新 leaf
- 改 framework source 支援 slug mapId
- v2-r2 lane transitions
- 改 0100 已抽 helpers

## 非目標
- dogfood 升 96+
- auto-generate integration test
