---
doc_id: doc_index_0023
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# 原子警察家族 Task Cards

本目錄收錄「原子警察家族計畫書」的內部任務卡（`TASK-APF-0000` 到 `TASK-APF-0012`）。這批卡用於追蹤 AI-Atomic-Framework upstream police family 的產品化路線，不放入 upstream public docs，避免在 police family 尚未完整落地前誤導 adopter。

對應 design markdown 位於 `../specs/`。

## 索引

| Task ID | 標題 | 里程碑 | 狀態 | 阻擋者 |
|---|---|---|---|---|
| [TASK-APF-0000](./TASK-APF-0000-doc-finalize-governance-index.task.md) | 文件定稿與治理索引 | M0 | done | none |
| [TASK-APF-0001](./TASK-APF-0001-upstream-police-inventory.task.md) | Upstream police inventory 與狀態矩陣 | M1 | done | APF-0000 |
| [TASK-APF-0011](./TASK-APF-0011-dependency-graph-police-alignment.task.md) | Dependency Graph Police 對齊 | M1.5 | done | APF-0001 |
| [TASK-APF-0002](./TASK-APF-0002-police-finding-contract.task.md) | PoliceFinding family contract | M2 | done | APF-0001 |
| [TASK-APF-0012](./TASK-APF-0012-police-finding-evidence-bridge.task.md) | PoliceFinding evidence schema bridge | M2.5 | done | APF-0002 |
| [TASK-APF-0003](./TASK-APF-0003-dedup-police-productization.task.md) | Dedup Police 產品化 | M3 | done | APF-0002 |
| [TASK-APF-0004](./TASK-APF-0004-demand-police-productization.task.md) | Demand Police 產品化 | M3 | done | APF-0002 |
| [TASK-APF-0005](./TASK-APF-0005-quality-police-productization.task.md) | Quality Police 產品化 | M3 | done | APF-0002 |
| [TASK-APF-0006](./TASK-APF-0006-map-integration-police-productization.task.md) | Map Integration Police 產品化 | M4 | done | APF-0002 |
| [TASK-APF-0007](./TASK-APF-0007-atomization-police-productization.task.md) | Atomization Police 產品化 | M4 | done | APF-0002 |
| [TASK-APF-0008](./TASK-APF-0008-lifecycle-boundary-police-alignment.task.md) | Lifecycle / Boundary Police 對齊 | M5 | done | APF-0002 |
| [TASK-APF-0009](./TASK-APF-0009-police-orchestrator-planning.task.md) | Police orchestrator / CLI / validator profile 規劃 | M6 | done | APF-0003 / 0004 / 0005 / 0006 / 0007 / 0008 / 0011 |
| [TASK-APF-0010](./TASK-APF-0010-roadmap-backwrite-promotion-gate.task.md) | Roadmap backwrite 與 promotion gate | M6 | done | APF-0009 / 0012 |

## 共通驗收

- 任務卡進入 `done` 前，需提交對應 validation command 與證據摘要。
- 新增 upstream runtime 時不得 hard-code 3KLife、Cocos、private path 或 adopter-specific 語意。
- 新 police scanner 必須先有 positive / negative fixtures，再接 validator profile。
- police finding 不得繞過 ReviewAdvisory / HumanReviewDecision / task-router。
- `validate:police` 必須維持通過；`validate:standard` 初期只接 advisory gate。
- touched Markdown 必須通過 UTF-8 / encoding 檢查。
