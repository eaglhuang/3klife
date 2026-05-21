---
doc_id: doc_other_0700
task_id: TASK-APF-0049
title: Orchestrator/profile/CLI wiring for Polymorph/Rollback/shared gates
milestone: M13
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0042, TASK-APF-0044, TASK-APF-0045, TASK-APF-0046, TASK-APF-0047, TASK-APF-0048]
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
lastTransitionId: 2026-05-21T10-29-44-289Z-migrate-legacy-ledger-f8deba2dd570
lastTransitionAt: 2026-05-21T10:29:44.289Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.289Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:6a01438df9bb487ecee11b00d273520ce2f994d6318b560eedc536a76810e7c5
---

# TASK-APF-0049 — Orchestrator/profile/CLI wiring for Polymorph/Rollback/shared gates

## 背景

將 Polymorph Police、Rollback Police 與 shared gates 接入 police family orchestrator、validator profile 與 CLI report producer。

## 執行範圍

- `runPoliceFamilyGate` 增加 polymorph / rollback family。
- Orchestrator 在 family scanner 前後執行 Evidence Integrity / Reversibility / Noise Control gates。
- `atm police run` report 顯示 shared gate summary。

## 驗收標準

- `validate:standard` 會執行 shared gates 並記錄 advisory/report-only 結果。
- `validate:full` 會跑 polymorph / rollback positive 與 negative fixtures。
- CLI JSON report 可顯示 family reports 與 shared gate reports。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:standard`
- `node atm.mjs police run --profile standard --json`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Shared gates 只提供守門結果，不是新 workflow。
2026-05-19 | 狀態: done | 驗證: pass | 變更: runPoliceFamilyGate 擴充至 14 families（含 polymorph + rollback）+ 3 shared gates（evidence-integrity / reversibility / noise-control）。CLI packages/cli/src/commands/police.ts 傳入新 family/gate input 並在 evidence.sharedGates 暴露結果。standard profile 已 wired（先前 APF-0017）。validate-police-family 全部通過。
