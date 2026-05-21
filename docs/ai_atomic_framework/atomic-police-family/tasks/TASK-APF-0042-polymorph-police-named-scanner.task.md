---
doc_id: doc_other_0693
task_id: TASK-APF-0042
title: Polymorph Police named scanner
milestone: M12
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0041]
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
lastTransitionId: 2026-05-21T10-29-44-281Z-migrate-legacy-ledger-336f193d31cc
lastTransitionAt: 2026-05-21T10:29:44.281Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.281Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:810131244b8f433dc5fc84805d34993861401e3d5b3732282d6298041c778e83
---

# TASK-APF-0042 — Polymorph Police named scanner

## 背景

新增 `runPolymorphPolice`，掃描 template drift、instance propagation missing、variant explosion 與 polymorph dimension drift。

## 執行範圍

- 讀取 polymorph template、instance registry、instance maps、quality/evolution reports。
- 產出 `template-drift`、`instance-propagation-missing`、`variant-explosion` findings。
- route 到 `behavior.polymorphize`、`behavior.evolve` 或 follow-up review。

## 驗收標準

- template 改動未 propagation 到 instance map 時產 advisory 或 blocker finding。
- variant 數量超過 threshold 時產 `variant-explosion` finding。
- same polymorph group 不誤觸 Dedup merge。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:behavior-pack`
- `npm run validate:map-curator`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Scanner 只能產 report / finding / proposal draft，不直接 mutate template 或 registry。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runPolymorphPolice，產出 template-drift（advisory）/ instance-propagation-missing（warning + request-human-review）/ variant-explosion（warning）/ polymorph-dimension-drift（advisory）四種 triggers，route 到 behavior.polymorphize 或 behavior.evolve，directApplyAllowed=false。4 個 fixture（positive 3 + negative 1）通過；suppressionKey 機制驗證。
