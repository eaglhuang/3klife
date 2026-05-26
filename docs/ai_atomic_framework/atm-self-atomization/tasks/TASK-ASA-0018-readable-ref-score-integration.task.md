---
doc_id: doc_other_1025
task_id: TASK-ASA-0018
title: 修正 readable ref scoring 整合
milestone: M18
status: planned
owner: atm-release
priority: P0
depends_on: [TASK-ASA-0013, TASK-ASA-0016]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
public_tracking: false
started_at: null
started_by_agent: null
completed_at: null
---

# TASK-ASA-0018 修正 readable ref scoring 整合

## 背景

ASA-0013 已完成 readable entrypoint dogfood migration，`validate:atom-callsite-readability` 也能通過，但 final score 仍顯示 `runAtm_with_readable_ref: 0`。這代表 scorer 沒有納入 readable ref validator 的結果。

## 目標

讓 score gate 可以計入 semantic readable ref validator output，避免已通過的 readable ref governance 在 graduation score 中被算成 0。

## 交付物

- 更新 scorer 的 readable ref metric 計算來源。
- 將 `validate:atom-callsite-readability` 的可機器讀結果接入 dogfood score report。
- 更新 dogfood score `.json` / `.md`，說明剩餘真實缺口。

## 驗收標準

- `runAtm_with_readable_ref` 不再是假性 0。
- `npm run validate:atom-callsite-readability` 通過。
- 若有未符合 readable ref 的 callsite，score report 必須列出具體檔案與位置。

## 驗證命令

```bash
npm run validate:atom-callsite-readability
node atm.mjs atomize score --repo . --json
```

## Rollback

Revert readable ref scorer integration and restore previous dogfood score behavior.

## Notes

- 2026-05-26 | status: planned | evidence: pending | reason: ASA graduation exposed readable ref scorer integration gap.
