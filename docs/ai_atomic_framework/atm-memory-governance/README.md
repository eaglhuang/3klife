---
doc_id: doc_index_mem_root
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: mixed (3KLife tooling/docs; AI-Atomic-Framework skill templates)
public_tracking: false
last_updated: 2026-07-13
---

# ATM 跨專案記憶治理（MEM）

以既有 keep 機制（keep.summary.md 導流 + keep-shards 分片 + shard-manager 工具）為底座，
仿照 Claude Code 已驗證的記憶原理，補上事實粒度的 `keep-memory/` 沉澱層、
`atm-memory-consolidate` 整併 skill、主動寫入觸發契約、跨專案 registry 與過期巡邏。

- 唯一規劃真相來源：`ATM 跨專案記憶治理計畫書.md`
- 任務卡：`tasks/TASK-MEM-*.task.md`（atm-task-card-authoring 合約，含 extractionCandidates）
- lane 前綴：`TASK-MEM`（0001 起）

## 分層一句話

| 層 | 位置 | 收什麼 | 節奏 |
|---|---|---|---|
| 共識（憲法） | `docs/keep-shards/` | 架構、規則、資料流 | 改得慢、人審 |
| 記憶（沉澱層） | `docs/keep-memory/`（本計畫新增） | 踩坑解法、操作直覺、收口快照 | 寫得快、會過期、定期整併 |
| 缺陷 | `ATM_BUG_OPTIMIZATION_BACKLOG.md` | 框架要修什麼 | 隨修隨銷 |
| 索引 | `docs/keep.summary.md` | 一行一則導流 | 預算內、工具重建 |
