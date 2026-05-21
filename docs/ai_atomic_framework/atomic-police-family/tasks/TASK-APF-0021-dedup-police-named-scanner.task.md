---
doc_id: doc_other_0651
task_id: TASK-APF-0021
title: Dedup Police named scanner
milestone: M8
status: done
artifact_status: done
runtime_status: productized-gate-active
upstream_mutation_status: applied
design_source_task: TASK-APF-0003
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: "codex"
blocked_by: [TASK-APF-0019, TASK-APF-0003]
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
lastTransitionId: 2026-05-21T10-29-44-257Z-migrate-legacy-ledger-83ae84ac5a0c
lastTransitionAt: 2026-05-21T10:29:44.257Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.257Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:92110a772a0d4c145c21aea56451de58fa3e72d72855e68b6701a407eb68733f
---

# TASK-APF-0021 — Dedup Police named scanner

## 背景

M8 目標是把 M7 的 gate activation 升級為 productized gate-active：每個 police family 都要有 named scanner / facade / report producer，不能再用空 adapter 或 fixture-only 語意宣稱產品化。

## 目標

新增 runDedupPolice，使用 RegistryIndex semantic fingerprint exact/prefix lookup。

## 主要修改範圍

packages/core/src/police/family.ts::runDedupPolice；RegistryIndex；quality comparison dedupCandidates

## 驗收條件

- [x] exact/prefix hit、same-polymorph ignored、large registry hot path 皆有 validator 驗收。
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

2026-05-19 | 狀態: done | 驗證: pass | 變更: M8 Dedup Police named scanner 已落地並由 validate:police-family 覆蓋 | 完成
2026-05-19 | 狀態: done | 驗證: M14 metadata repair | 變更: 本卡為 named runtime scanner 落地卡，承接 TASK-APF-0003 design spec；blocked_by 已補上 design source。
