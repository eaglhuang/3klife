---
doc_id: doc_other_1026
task_id: TASK-ASA-0019
title: 收斂 source ownership coverage 缺口
milestone: M19
status: planned
owner: atm-release
priority: P0
depends_on: [TASK-ASA-0007, TASK-ASA-0016, TASK-ASA-0017]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
public_tracking: false
started_at: null
started_by_agent: null
completed_at: null
---

# TASK-ASA-0019 收斂 source ownership coverage 缺口

## 背景

ASA final dogfood score 顯示 `source_ownership_coverage: 78`，接近但未達 fail threshold 80 / pass threshold 95。這可能是少量 path-to-atom map 缺口、exclusion reason 缺口，或 scorer 對既有 map 的讀取不足。

## 目標

把 source ownership coverage 從 scorer 視角收斂到 release gate 可接受狀態，並確保缺口清單具體、可重現、可審核。

## 交付物

- 更新 `atomic_workbench/atomization-coverage/path-to-atom-map.json` 或 exclusion inventory。
- 更新 ownership gap report，列出被補齊或被排除的路徑與理由。
- 更新 dogfood score report。

## 驗收標準

- `source_ownership_coverage` 至少達到 fail threshold 80，目標朝 pass threshold 95 收斂。
- 所有新增 exclusion 都必須有機器可讀 reason。
- 不得用空泛 wildcard 掩蓋 production source debt。

## 驗證命令

```bash
node atm.mjs atomize inventory --repo . --json
node atm.mjs atomize score --repo . --json
npm run validate:atomization-coverage
```

## Rollback

Revert map/exclusion updates and restore previous inventory/score reports.

## Notes

- 2026-05-26 | status: planned | evidence: pending | reason: ASA score gate shows source ownership coverage still below release threshold.
