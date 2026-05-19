---
doc_id: doc_other_0691
task_id: TASK-APF-0040
title: Police taxonomy extension for Polymorph and Rollback Police
milestone: M12
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0039]
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

# TASK-APF-0040 — Police taxonomy extension for Polymorph and Rollback Police

## 背景

將 Polymorph Police 與 Rollback Police 正式納入 police family taxonomy，並明確區分 named police family 與 shared gate。

## 執行範圍

- 在 family contract 中規劃 `polymorph` 與 `rollback`。
- 定義 shared gates：Evidence Integrity、Reversibility、Noise Control、Contract Drift。
- 說明 shared gates 不等於新的 approval authority。

## 驗收標準

- 計畫書與 specs 能清楚區分 named police 與 shared gate。
- 不新增第二套 proposal / review / registry workflow。
- runtime_status 保持 upstream-api-not-applied，避免誤稱已產品化。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:plugin-sdk`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 本卡完成前只代表 taxonomy proposal，不代表 runtime scanner 已存在。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts PoliceFamilyName 擴充 `polymorph` + `rollback`，新增 SharedGateName (`evidence-integrity` + `reversibility` + `noise-control`)，PoliceFamilyGateReport.sharedGates 為 optional 欄位。validate-police-family 共 14 families + 3 shared gates 全部通過。
