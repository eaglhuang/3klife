---
doc_id: doc_other_0678
task_id: TASK-APF-0037
title: Orchestrator, profile, and CLI wiring for Decomposition/Evolution Police
milestone: M11
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0032, TASK-APF-0035]
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

# TASK-APF-0037 — Orchestrator, profile, and CLI wiring for Decomposition/Evolution Police

## 背景

將兩支新警察接入 police family orchestrator、validator profile 與 CLI report producer。

## 執行範圍

- standard profile 跑 Decomposition/Evolution advisory，不因 finding fail CI。
- full profile 跑完整 positive/negative fixtures 與 stale-base/promotion assertions。
- `atm police run` 支援 `--config` 或 governance bundle threshold，不把 1000 行硬編成唯一規則。

## 驗收標準

- `validate:standard` 會呼叫兩支新警察並記錄 report。
- `validate:full` 驗證大型 source fixture、evidence recurrence fixture、suppression fixture。
- CLI JSON report `families[]` 包含 `decomposition` 與 `evolution`。

## 建議驗證

- `npm run validate:standard`
- `npm run validate:full`
- `node atm.mjs police run --profile standard --json`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 初期兩者維持 advisory；升 blocker 需另走 APF-0010 promotion rule。
2026-05-19 | 狀態: done | 驗證: pass | 變更: runPoliceFamilyGate 加入 decomposition + evolution，gate report families 由 10 升為 12。CLI packages/cli/src/commands/police.ts 新增 --max-file-lines 旗標、傳入 decomposition.inventory + evolution.evidencePatterns。validate-police-family 在 validate:standard profile 已 wired（先前 APF-0017 完成）。
