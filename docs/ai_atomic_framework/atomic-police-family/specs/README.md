---
doc_id: doc_index_0024 -->
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# 原子警察家族 Specs

本目錄放 APF 任務卡的設計補充規格。M14 起，spec 文件必須避免把 3KLife control-plane wording 寫成 upstream protected public contract。

## M14 Specs

| Spec | 內容 |
|---|---|
| [APF-0051](./APF-0051-apf-roadmap-task-metadata-consistency-repair.md) | roadmap/task metadata consistency repair |
| [APF-0052](./APF-0052-adopter-neutrality-scanner-negative-fixtures.md) | adopter-neutrality scanner and negative fixtures |
| [APF-0053](./APF-0053-validator-profile-naming-advisory-only-hardening.md) | validator profile naming and advisory-only hardening |

## M15 Specs

M15 specs are open/draft control-plane contracts for janitor apply planning. They do not mark runtime apply, scheduler execution, registry mutation, or janitor CLI as complete.

| Spec | 內容 |
|---|---|
| [APF-0054](./APF-0054-finding-to-janitor-apply-plan-contract.md) | finding-to-janitor apply plan contract |
| [APF-0055](./APF-0055-structural-apply-scheduler-contract.md) | structural apply scheduler contract |
| [APF-0056](./APF-0056-janitor-apply-plan-schema-and-validator.md) | janitor apply plan schema and validator |
| [APF-0057](./APF-0057-structural-apply-conflict-model.md) | structural apply conflict model |

## Status rule

- Spec `done` 表示規格文件完成。
- Runtime 是否完成以對應 task card 的 `runtime_status` 與 upstream validator 證據為準。
