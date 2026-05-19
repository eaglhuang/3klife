---
doc_id: doc_other_0698
task_id: TASK-APF-0047
title: Noise Control Gate shared contract
milestone: M12
status: done
artifact_status: done
runtime_status: shared-gate-active
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0036, TASK-APF-0040]
owner: atm-core
priority: P1
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

# TASK-APF-0047 — Noise Control Gate shared contract

## 背景

Advisory police 容易產生太多建議，因此需要共用 suppression、daily cap、confidence threshold 與 recurrence window。

## 執行範圍

- 定義 suppression key。
- 定義 confidence threshold、daily cap、recurrence window。
- 定義 repeated finding dedupe 與 high severity bypass。

## 驗收標準

- 同一 finding 在 suppression window 內不重複打擾 reviewer。
- confidence 過低時只產 observation report。
- high severity finding 可繞過 suppression，但仍需 human review。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Noise Control Gate 是所有 advisory family 的降噪層。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runNoiseControlGate + NoiseControlGateInput。讀取 finding.metadata.suppressionKey + suppressedKeys，advisory 命中 suppressionKey 過濾掉；高 severity (block/error) 即使命中 suppressionKey 仍 bypass 並記入 summary.bypassed，但 action 仍是 request-human-review。confidenceThreshold + dailyCap 同步生效。
