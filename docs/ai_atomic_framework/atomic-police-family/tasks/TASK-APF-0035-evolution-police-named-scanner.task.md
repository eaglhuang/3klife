---
doc_id: doc_other_0676
task_id: TASK-APF-0035
title: Evolution Police named scanner
milestone: M10
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0034]
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

# TASK-APF-0035 — Evolution Police named scanner

## 背景

新增 `runEvolutionPolice`，偵測 atom 或 atomic map 是否需要 evolve / compose / merge / dedup-merge / sweep。

## 執行範圍

- 輸入 evidence pattern reports、quality comparison、map curator output、ReviewAdvisory history、registry status。
- 單一 atom 變更 route 到 `behavior.evolve`。
- map 結構變更 route 到 `behavior.compose` / `merge` / `dedup-merge` / `sweep`。
- 所有 finding 都放 `ReviewAdvisoryFinding.metadata.policeFinding`。

## 驗收標準

- recurring regression + target atom 會產 `evidence-evolution-signal` finding。
- map member stale / orphan / repeated sequence 會產 `map-evolution-signal` finding。
- host-local preference 不會自動升成 global atom contract。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:conversation-evolution`
- `npm run validate:map-curator`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Evolution Police 是 advisory scanner；是否真的 promote 仍由 existing upgrade proposal + review + human decision gates 決定。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runEvolutionPolice。trigger 支援 evidence-evolution-signal / map-evolution-signal / stale-evolution-draft。atom-level → behavior.evolve；map-level → behavior.compose（或 entry.suggestedBehavior）；stale base → behavior request-human-review。finding 進 ReviewAdvisoryFinding.metadata.policeFinding，不直接 mutate registry。
