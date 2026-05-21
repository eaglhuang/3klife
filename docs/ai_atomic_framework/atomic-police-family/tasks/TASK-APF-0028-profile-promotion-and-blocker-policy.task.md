---
doc_id: doc_other_0658
task_id: TASK-APF-0028
title: Profile promotion and blocker policy
milestone: M8
status: done
artifact_status: done
runtime_status: productized-gate-active
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: "codex"
blocked_by: [TASK-APF-0026]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: upstream-runtime-change
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected docs hard-code 3KLife
  - C:/Users/User/AI-Atomic-Framework registry mutation from police scanners
  - C:/Users/User/3KLife/.atm/**
non_goals:
  - 不建立第二套 approval workflow
  - 不讓非 lifecycle police 直接 mutate registry
  - 不讓 advisory finding 自動 approved
  - 不把 3KLife / Cocos / private path 寫入 upstream protected public contract
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
lastTransitionId: 2026-05-21T10-29-44-265Z-migrate-legacy-ledger-7545dacd9fa4
lastTransitionAt: 2026-05-21T10:29:44.265Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.265Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:26c9288cb651d919a67246cb621a33e989058356a51262317f5389036339ee6b
---

# TASK-APF-0028 — Profile promotion and blocker policy

## 背景

M8 目標是把 M7 的 gate activation 升級為 productized gate-active：每個 police family 都要有 named scanner / facade / report producer，不能再用空 adapter 或 fixture-only 語意宣稱產品化。

## 目標

standard 跑所有 named scanner；Dedup/Demand/Map/Atomization 先 advisory，Quality/Core blocker。

## 主要修改範圍

validators.config.json；package.json；validate-police-family.ts

## 驗收條件

- [x] 升 blocker 仍依 APF-0010 false-positive / fixture / release rule。
- [x] 所有 finding 仍走 `ReviewAdvisory.machine-finding + metadata.policeFinding + HumanReviewDecision`。
- [x] 本卡 done 代表 M8 upstream runtime / 文件 artifact 已完成；advisory family 是否升 blocker 仍受 APF-0010 promotion gate 控制。

## 驗證方式

~~~bash
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police-family
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:plugin-sdk
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:review-advisory
~~~

## 回滾策略

若此卡造成 validator regression，先保留 public contract，回退對應 scanner facade 到 advisory-only，不回退 ReviewAdvisory / HumanReviewDecision 既有審核路徑。

## Notes

2026-05-19 | 狀態: done | 驗證: pass | 變更: M8 Profile promotion and blocker policy 已落地並由 validate:police-family 覆蓋 | 完成
