---
doc_id: doc_other_1028
task_id: TASK-ASA-0021
title: 重跑 score-based graduation gate 並更新決策紀錄
milestone: M21
status: planned
owner: atm-release
priority: P0
depends_on: [TASK-ASA-0017, TASK-ASA-0018, TASK-ASA-0019, TASK-ASA-0020]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
public_tracking: false
started_at: null
started_by_agent: null
completed_at: null
---

# TASK-ASA-0021 重跑 score-based graduation gate 並更新決策紀錄

## 背景

ASA-0016 建立了 graduation gate，但結論是 `STRUCTURAL-PASS, SCORE-PENDING`。0017-0020 修正 scorer instrumentation、ownership closure 與 rollback policy 後，需要重跑 gate 並更新正式決策紀錄。

## 目標

用修正後的 scorer 與 policy 重新產生 graduation evidence，讓 maintainer 可以明確決定是否從 `SCORE-PENDING` 升級到 `SCORE-PASS`，或保留具體 release-blocking 缺口。

## 交付物

- 更新 `atomic_workbench/graduation-gate/final-checklist.json`。
- 更新 `atomic_workbench/reports/atm-self-atomization-final-report.json`。
- 更新 graduation decision record。
- 補齊 command-backed evidence。

## 驗收標準

- `npm run validate:atm-self-atomization` 可重現輸出最終狀態。
- final decision record 不再只說 scorer gap，而是清楚寫出 `SCORE-PASS` 或剩餘 release blockers。
- 所有分數項目都有對應 source、evidence 或 policy 說明。

## 驗證命令

```bash
npm run validate:atm-self-atomization
node atm.mjs doctor --json
npm run validate:cli
```

## Rollback

Revert final checklist, final report, and decision record updates to the ASA-0016 structural-pass baseline.

## Notes

- 2026-05-26 | status: planned | evidence: pending | reason: close the ASA score-based graduation loop after follow-up scorer fixes.
