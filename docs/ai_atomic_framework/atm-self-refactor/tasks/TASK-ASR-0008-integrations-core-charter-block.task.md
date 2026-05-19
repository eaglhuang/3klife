---
doc_id: doc_other_asr_0008
task_id: TASK-ASR-0008
title: integrations-core 抽出 charter-block renderer
layer: L3
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate-integration-adapter
public_tracking: false
allowed_files:
  - packages/integrations-core/src/index.ts
  - packages/integrations-core/src/compiler/charter-block.ts
created_at: 2026-05-20T01:50:00+08:00
created_by_agent: ClaudeCode_Opus4.7
started_at: 2026-05-20T01:50:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T02:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: b54120c
---

# TASK-ASR-0008 — integrations-core 抽出 charter-block renderer

## 目標

按 integrations-core SPLIT_PLAN，抽出最小、最低耦合的 `renderCharterInvariantsBlock` 與其私有 helper `renderCharterInvariantLine`。Layer 3 的高風險（I5 manifest hash stability）但風險最低的一張卡。

## 輸出

`packages/integrations-core/src/compiler/charter-block.ts`（new）：
- `RenderedCharterInvariants` (type, re-exported from index.ts)
- `renderCharterInvariantsBlock(repositoryRoot: string)` (core)
- `renderCharterInvariantLine` (private)

`index.ts` 保留 `renderCharterInvariantsBlock(repositoryRoot = integrationsCoreRepoRoot)` 作為薄 wrapper，預設參數行為不變。

## 驗收條件

- [x] `validate-integration-adapter` ok (interface, manifest schema, Codex reference factory, and 6 installable adapters install/verify/uninstall)
- [x] I5 manifest hash 不變

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: integration-adapter:validate ok, typecheck 0 errors | 變更: charter-block 抽到 `compiler/charter-block.ts`；I5 manifest hash 不變；commit b54120c。
