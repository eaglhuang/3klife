---
doc_id: doc_other_0714
task_id: TASK-APF-0052
title: Adopter-neutrality scanner and negative fixtures
milestone: M14
status: done
artifact_status: done
runtime_status: registry-consistency-extension-active
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
lastTransitionId: 2026-05-21T10-29-44-292Z-migrate-legacy-ledger-2dd96c0c12f3
lastTransitionAt: 2026-05-21T10:29:44.292Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.292Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:4f4f70cfbd92fd9b53b794efb4f9ad024b1e464e4de61de599b5c3d7c93b5507
---

# TASK-APF-0052 — Adopter-neutrality scanner and negative fixtures

## 背景

APF 已有 private/adopter path negative fixture，但仍需要明確的 adopter-neutrality scanner / fixture policy，防止 upstream protected surface 混入 adopter-specific terms、private path、host-only assumptions。

## 執行範圍

- 規劃 protected upstream surface detector：docs、schemas、packages/core、packages/plugin-sdk、fixtures。
- negative fixtures 覆蓋 adopter-specific project name、engine name、private absolute path、host-only asset path。
- `validate:standard` 先 advisory；`validate:full` 可升 blocker。
- finding 走 `metadata.policeFinding`，不得直接修改 upstream docs。

## 驗收標準

- 有 positive / negative fixtures。
- detector report 可指出 scope、matchedTermClass、filePath、suggestedAction。
- protected public docs 出現 adopter/private term 時，full profile 必須阻擋。
- standard profile 只產 advisory finding，不 mutate registry。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:full`
- `npm run validate:standard`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 本卡處理 adopter-neutrality hardening，不新增 police family；可由 Registry Consistency / Boundary surface scanner 承載。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runAdopterNeutralityCheck + AdopterNeutralityTermClass (`adopter-project-name` / `adopter-engine-name` / `adopter-private-path` / `adopter-host-only-asset` / `adopter-private-tooling`) + AdopterNeutralityBannedTerm + AdopterNeutralityProtectedFile + AdopterNeutralityCheckInput。standard profile 產 severity='advisory'，full profile 產 severity='block'（status='fail'）。輸出由 registry-consistency family 承載；trigger='adopter-neutrality-violation'，metadata 含 filePath/matchedTermClass/scope/suggestedAction/profile。5 個 fixture（1 positive + 4 negative）皆通過；allowlist 機制驗證。
