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
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
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
