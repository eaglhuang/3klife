---
doc_id: doc_index_0019
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# Replacement Protocol Task Cards

本目錄是 `map-replacement-protocol` 的任務卡集合。每張卡都應可獨立認領、獨立驗收，並保留 machine-readable evidence / report 路徑。v2-r2 後，索引以 `TASK-MRP-0000` 到 `TASK-MRP-0027` 為準。

## 索引

| Task ID | 標題 | Milestone | 狀態 | 前置依賴 |
|---|---|---|---|---|
| [TASK-MRP-0000](./TASK-MRP-0000-doc-finalize.task.md) | 文件定稿與 cross-link | M1 | done | none |
| [TASK-MRP-0001](./TASK-MRP-0001-architecture-crosslink.task.md) | Replacement Protocol 概念對齊 ARCHITECTURE | M1 | done | 0000 |
| [TASK-MRP-0002](./TASK-MRP-0002-schema-0.2.0.task.md) | Atomic Map Schema 0.2.0 | M2 | done | 0000 |
| [TASK-MRP-0003](./TASK-MRP-0003-equivalence-schema.task.md) | Map Equivalence Report Schema | M3 | done | 0002 |
| [TASK-MRP-0004](./TASK-MRP-0004-equivalence-cli.task.md) | Map Equivalence Test CLI | M4 | done | 0003 |
| [TASK-MRP-0005](./TASK-MRP-0005-upgrade-gates.task.md) | Upgrade Gates: equivalence + rollback | M5 | done | 0003, 0004 |
| [TASK-MRP-0006](./TASK-MRP-0006-replacement-lane.task.md) | Replacement Lane Transition | M6 | done | 0002 |
| [TASK-MRP-0007](./TASK-MRP-0007-decomposition-plan.task.md) | Decomposition Plan to Map | M7 | done | 0002, 0006 |
| [TASK-MRP-0008](./TASK-MRP-0008-scopelock-polymorph.task.md) | ScopeLock 0.2.0 + Polymorph Impact | M8 | done | 0006 |
| [TASK-MRP-0009](./TASK-MRP-0009-create-map-from-spec-next-hints.task.md) | Create Map From Spec + Replacement Next Hints | M9 | done | 0002 |
| [TASK-MRP-0010](./TASK-MRP-0010-evidence-closure-retirement-proof.task.md) | Replacement Evidence Closure + Retirement Proof | M10 | done | 0003, 0004, 0005, 0006 |
| [TASK-MRP-0011](./TASK-MRP-0011-semantic-fingerprint-monitor.task.md) | Atom Semantic Fingerprint 持續監控 | M11 | done | none |
| [TASK-MRP-0012](./TASK-MRP-0012-edge-contract-auto-test.task.md) | Map Edge Contract 自動合約測試 | M12 | planned | 0011 |
| [TASK-MRP-0013](./TASK-MRP-0013-progression-automation.task.md) | Map 升級自動推進 | M13 | planned | 0012, 0020, 0025 |
| [TASK-MRP-0014](./TASK-MRP-0014-atom-memoization-cache.task.md) | 跨 Atom 邊界結果快取 | M14 | planned | 0012 |
| [TASK-MRP-0015](./TASK-MRP-0015-atom-telemetry-dashboard.task.md) | Atom Telemetry 健康儀表板 | M15 | planned | 0011, 0012 |
| [TASK-MRP-0016](./TASK-MRP-0016-behavior-reshape.task.md) | 受控 Atom 邊界調整 | M16 | planned | 0013, 0015, 0017, 0020 |
| [TASK-MRP-0017](./TASK-MRP-0017-behavior-retire.task.md) | Atom 退役流程 | M17 | planned | 0010 |
| [TASK-MRP-0018](./TASK-MRP-0018-content-addressed-atom-federation.task.md) | Content-Addressed Atom Federation | M18 | done | 0017 |
| [TASK-MRP-0019](./TASK-MRP-0019-mermaid-auto-gen.task.md) | Map 拓樸圖 Mermaid 自動生成 | M19 | planned | 0011 |
| [TASK-MRP-0020](./TASK-MRP-0020-shadow-ab-metrics.task.md) | Shadow 模式 A/B 定量比對報告 | M20 | planned | 0010 |
| [TASK-MRP-0021](./TASK-MRP-0021-map-capsule-mid.task.md) | Map Capsule map:cid 機制 | M21 | done | 0018 |
| [TASK-MRP-0022](./TASK-MRP-0022-atm-daemon-mode.task.md) | ATM Daemon Mode | M22 | planned | 0011, 0026, 0027 |
| [TASK-MRP-0023](./TASK-MRP-0023-atm-do-task.task.md) | atm do --task X | M23 | planned | 0025, 0027 |
| [TASK-MRP-0024](./TASK-MRP-0024-persistent-guide-cache.task.md) | Persistent Guide Cache | M24 | planned | 0026, 0027 |
| [TASK-MRP-0025](./TASK-MRP-0025-diff-as-evidence.task.md) | Diff-as-evidence | M25 | planned | 0010 |
| [TASK-MRP-0026](./TASK-MRP-0026-rescue-police-family.task.md) | Rescue Police Family | M26 | in-progress | 0018, 0021 |
| [TASK-MRP-0027](./TASK-MRP-0027-disaster-recovery-cli.task.md) | Disaster Recovery & Atom Reload CLI | M27 | planned | 0018, 0021, 0026 |

## v2-r2 共通驗收

- 任務進入 `done` 前，必須附 machine-readable evidence / report 路徑。
- 任何 derived artifact 必須標 `generatedAt`、`toolVersion`，且可由 source-of-truth 重建。
- Public upstream surface 必須 repo-neutral，不得含 3KLife / Cocos / npc-brain 等 adopter 私有脈絡。
- 自動化功能只能產生 proposal 或 advisory；實際 apply / close 必須通過 evidence gate 與必要的人類審核。
- Cache / daemon 類功能預設 off，且必須有 rescue / clear / kill-switch 路徑。

## 操作注意

`TASK-MRP-0026` 目前為進行中狀態，且存在外部鎖定脈絡。若要修改該卡或接續實作，需先確認鎖持有者交接，避免覆蓋進行中變更。
