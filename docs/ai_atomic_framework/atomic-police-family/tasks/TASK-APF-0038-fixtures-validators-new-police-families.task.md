---
doc_id: doc_other_0679
task_id: TASK-APF-0038
title: Fixtures and validators for new police families
milestone: M11
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0037]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: upstream-runtime-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0038 — Fixtures and validators for new police families

## 背景

補齊 Decomposition/Evolution Police 的 positive / negative fixtures 與 validator acceptance。

## 執行範圍

- Decomposition fixtures：>1000 LOC hit、below threshold、ignored path、existing replacement map suppression。
- Evolution fixtures：recurring regression hit、usage-only suppressed、host-local preference suppressed、stale base blocker。
- ReviewAdvisory bridge fixture：metadata.policeFinding 保留且不自動 approved。

## 驗收標準

- `validate:police-family` 覆蓋兩支新 family。
- `validate:review-advisory` 可吃進兩種新 finding。
- protected public docs 不含 3KLife / private path policy。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run validate:neutrality`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 沒有 fixture 的 scanner 不得宣稱 productized-gate-active。
2026-05-19 | 狀態: done | 驗證: pass | 變更: 新增 fixtures/police-family/decomposition/{positive-oversized, negative-below-threshold, negative-ignored-path, negative-existing-replacement-map}.json 與 fixtures/police-family/evolution/{positive-recurring-regression, negative-usage-only, negative-host-local, negative-stale-base}.json，共 8 個。validate-police-family 全部 12 家族檢查通過；validate-review-advisory 與 validate-police 也通過；protected public surface 未含 adopter-specific term。
