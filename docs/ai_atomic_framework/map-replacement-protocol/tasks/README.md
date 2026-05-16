---
doc_id: doc_index_0019
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# Replacement Protocol Task Cards

本目錄收錄「拆解大型功能優化原子 map 計畫書」的所有內部任務卡（TASK-MRP-0000 ~ TASK-MRP-0008）。這批卡屬於 3KLife 對 AI-Atomic-Framework upstream 改造的工作台，不放入 ATM repo，避免污染 ATM 未來開源時的核心文件面。

任務卡 = 一張可獨立認領、可獨立驗收的工作單。每張卡都對應計畫書 §15 的某個里程碑或子里程碑。

## 索引

| Task ID | 標題 | 里程碑 | 阻擋者 |
|---|---|---|---|
| [TASK-MRP-0000](./TASK-MRP-0000-doc-finalize.task.md) | 文件定稿與 cross-link | M1 | — |
| [TASK-MRP-0001](./TASK-MRP-0001-architecture-crosslink.task.md) | Replacement Protocol 概念對齊 ARCHITECTURE | M1 | 0000 |
| [TASK-MRP-0002](./TASK-MRP-0002-schema-0.2.0.task.md) | Atomic Map Schema 0.2.0 | M2 | 0000 |
| [TASK-MRP-0003](./TASK-MRP-0003-equivalence-schema.task.md) | Map Equivalence Report Schema | M3 | 0002 |
| [TASK-MRP-0004](./TASK-MRP-0004-equivalence-cli.task.md) | Map Equivalence Test CLI | M4 | 0003 |
| [TASK-MRP-0005](./TASK-MRP-0005-upgrade-gates.task.md) | Upgrade Gates: equivalence + rollback | M5 | 0003 / 0004 |
| [TASK-MRP-0006](./TASK-MRP-0006-replacement-lane.task.md) | Replacement Lane Transition | M6 | 0002 |
| [TASK-MRP-0007](./TASK-MRP-0007-decomposition-plan.task.md) | Decomposition Plan → Map | M7 | 0002 / 0006 |
| [TASK-MRP-0008](./TASK-MRP-0008-scopelock-polymorph.task.md) | ScopeLock 0.2.0 + Polymorph Impact | M8 | 0006 |

## 共通驗收

- 任何任務卡進入 `done` 前，需提交對應 fixture / report 證據路徑。
- 任務卡只能修改自身宣告的檔案；跨卡共修需在 `notes` 註明並建立 lineage 連結。
- 所有 schema 修改禁止破壞既有 0.1.0 spec；以 `specVersion` enum 擴充並補 migration 測試。
