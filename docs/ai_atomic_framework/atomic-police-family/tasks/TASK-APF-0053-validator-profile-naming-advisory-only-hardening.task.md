---
doc_id: doc_other_0715
task_id: TASK-APF-0053
title: Validator profile naming and advisory-only hardening
milestone: M14
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0051]
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
  - C:/Users/User/AI-Atomic-Framework/schemas/**
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected public docs hard-code adopter/private paths
  - C:/Users/User/AI-Atomic-Framework registry mutation from police scanners
  - C:/Users/User/AI-Atomic-Framework second approval workflow or independent task routing implementation
  - C:/Users/User/3KLife/.atm/**
non_goals:
  - 不新增第二套 approval workflow 或獨立任務路由器。
  - 不讓 police finding 直接 mutate registry。
  - 不繞過 ReviewAdvisory.machine-finding 與 HumanReviewDecision。
  - 不把 adopter/private path 寫入 upstream protected public contract。
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-294Z-migrate-legacy-ledger-4a1e3d6b5b39
lastTransitionAt: 2026-05-21T10:29:44.294Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.294Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:46cff03192c203460bd3ac16d7610f0089dd54322bc505213893eafb0ca77c47
---

# TASK-APF-0053 — Validator profile naming and advisory-only hardening

## 背景

APF 文件與任務卡同時使用 `validate:police` 與 `validate:police-family`。此外 advisory police 需要更明確的反向 fixtures，證明它們不能 mutate registry，也不能 auto-approve review。

## 執行範圍

- 釐清 `validate:police`、`validate:police-family`、`validate:standard`、`validate:full` 的關係：並存、alias、或 deprecation policy。
- 新增 advisory-only mutation denial fixture。
- 新增 advisory auto-approval denial fixture。
- 更新 validators.config / scripts naming 文件，不新增第二套 workflow。

## 驗收標準

- 文件明確說明 validator profile 命名關係。
- advisory scanner 嘗試 registry mutation 時 validator fail。
- advisory finding 嘗試直接 approved 時 validator fail。
- 所有 finding 仍需進 ReviewAdvisory.machine-finding + HumanReviewDecision。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run validate:standard`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 本卡收斂 validator naming 與 advisory-only hardening，不新增獨立任務路由器。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 VALIDATOR_PROFILE_NAMING_CONTRACT（schemaId='atm.validatorProfileNamingContract'，明定 validate:police / validate:police-family / validate:standard / validate:full 角色與彼此關係）+ verifyAdvisoryOnlyHardening()，攔截 advisory family 試圖 registry-mutation / auto-approve / direct-promotion / bypass-review 並回 rejection 原因。3 個 fixture（1 positive + 2 negative）通過；validator 同時檢查所有 advisory family findings 不得 quarantine / directApplyAllowed=true。
