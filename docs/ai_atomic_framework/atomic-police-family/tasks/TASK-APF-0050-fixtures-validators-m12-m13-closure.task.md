---
doc_id: doc_other_0701
task_id: TASK-APF-0050
title: Fixtures, validators, and M12/M13 closure
milestone: M13
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0049]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: upstream-runtime-change
non_goals:
  - 不新增第二套 approval workflow 或獨立任務路由器。
  - 不讓 police finding 直接 mutate registry。
  - 不繞過 ReviewAdvisory.machine-finding 與 HumanReviewDecision。
  - 不把 adopter/private path 寫入 upstream protected public contract。
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected public docs hard-code adopter/private paths
  - C:/Users/User/AI-Atomic-Framework registry mutation from police scanners
  - C:/Users/User/AI-Atomic-Framework second approval workflow or independent task routing implementation
  - C:/Users/User/3KLife/.atm/**
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
  - C:/Users/User/AI-Atomic-Framework/schemas/**
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0050 — Fixtures, validators, and M12/M13 closure

## 背景

補齊 Polymorph/Rollback/shared gates 的 fixtures、validators，並在 runtime 產品化後回寫 APF 狀態矩陣與風險表。

## 執行範圍

- Polymorph fixtures：template drift、instance propagation missing、variant explosion。
- Rollback fixtures：rollback proof missing、irreversible proposal、equivalence proof missing。
- Shared gate fixtures：stale evidence、duplicate evidence、suppression、contract drift。
- 回寫狀態到 `productized-gate-active` 或 `shared-gate-active`。

## 驗收標準

- `validate:police-family` 覆蓋 polymorph / rollback / shared gates。
- `validate:review-advisory` 確認 finding 不自動 approved。
- APF docs 的風險矩陣更新為 closed 或仍 planned，不能混淆。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run check:encoding:touched`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 沒有 fixtures 與 validator coverage 前，不得宣稱 M12/M13 產品化完成。
2026-05-19 | 狀態: done | 驗證: pass | 變更: 新增 fixtures/police-family/polymorph/* (4 個) + fixtures/police-family/rollback/* (4 個) + fixtures/police-family/shared-gates/* (6 個) + fixtures/police-family/contract-drift/* (2 個)，共 16 個 fixture。validate-police-family 14 families + 3 shared gates 全部通過；validate-police 與 validate-review-advisory 也通過；protected public surface 不含 adopter-specific term。
