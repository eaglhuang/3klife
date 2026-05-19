---
doc_id: doc_other_0692
task_id: TASK-APF-0041
title: Polymorph Police contract and read model
milestone: M12
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0040]
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

# TASK-APF-0041 — Polymorph Police contract and read model

## 背景

定義 Polymorph Police 需要讀取的 template / instance / map read model，讓 template drift、instance propagation 與 variant explosion 可以被 deterministic scanner 偵測。

## 執行範圍

- 定義 template record、instance record、dimension spec、instance map reference。
- 定義 drift 與 explosion thresholds。
- 定義與 Dedup / Quality / Evolution Police 的責任邊界。

## 驗收標準

- read model 可表示 template drift、instance propagation missing、variant explosion。
- 不直接修改 template 或 instance。
- finding 必須能放入 `metadata.policeFinding`。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:behavior-pack`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Polymorph Police 是 polymorph 關係守門，不是 Dedup Police 的別名。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 PolymorphTemplateRecord + PolymorphInstanceRecord + PolymorphPoliceInput + PolymorphPoliceSignalKind (`template-drift` / `instance-propagation-missing` / `variant-explosion` / `polymorph-dimension-drift`) + DEFAULT_POLYMORPH_VARIANT_THRESHOLD=12 + buildPolymorphSuppressionKey()，finding 透過 ReviewAdvisoryFinding.metadata.policeFinding 橋接，不直接 mutate template/instance。
