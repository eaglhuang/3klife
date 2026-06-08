---
doc_id: ""
task_id: TASK-AAO-0138
title: "hook audit findings staged-only vs tree-wide classification"
milestone: M17
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
created: "2026-06-08"
created_by_agent: captain-incident-review-2026-06-08
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-hook-audit-findings-staged-only-vs-tree-wide-classification
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-CID-0018
depends: []
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
forbidden_files:
  - .atm runtime / history manual edits
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not weaken framework-critical staged-file gating."
  - "Do not silence tree-wide findings altogether — they must still surface."
  - "Do not change INV-ATM invariant enforcement layer."
notes: "2026-06-08 | status: open | validation: pending | change: Phase 0 open card for hook audit findings staged-only vs tree-wide classification | blocker: none"
---

# TASK-AAO-0138 hook audit findings staged-only vs tree-wide classification

## 目標

pre-commit hook 對 `.atm/history/tasks/**` 做的 audit findings，要區分：

1. **Staged**：當次 commit staging area 內有的問題 → 維持 fail-closed blocker
2. **Tree-wide**：staging area 外但工作樹其他地方有的問題 → 降為 warning，不 block 不相關的 commit

## 背景

2026-06-08 captain incident：
- 早上 11:05 由別的 session 的 `tasks import` 在主 repo 留下 9 張 AAO ledger（status=done 但無 ATM CLI 收口 metadata）
- 隊長嘗試 commit CID-0018 的 close artifacts 時被 pre-commit hook block
- block 原因不是 staged 的檔案有問題，而是工作樹另一處的「manual done」audit findings × 6
- 結果隊長被迫先刪除那 9 張不相關的 ledger 才能 commit 自己的 close artifacts

設計問題：hook 把「tree-wide audit findings」當成 blocker 是 over-fail-closed。應該只 block staged 內容。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Candidate Allowed Files

- `packages/cli/src/commands/hook.ts`（`runPreCommitHook`、audit aggregation）
- `packages/cli/src/commands/framework-development.ts`（task audit findings 分類）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm` runtime / history manual edits
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

- audit findings 每筆都帶 `scope: 'staged' | 'tree-wide'` 欄位。
- pre-commit hook 行為：
  - `scope: 'staged'` → fail-closed blocker（維持現行）
  - `scope: 'tree-wide'` → warning only，輸出但不阻擋 commit
- INV-ATM-* 違反在 staged 內仍 100% block（不能因此被降為 warning）。
- hook output 摘要分兩段：`blockingStagedFindings` 與 `advisoryTreeWideFindings`。
- 整合測試：staged file 乾淨 + 工作樹他處有 manual-done → commit 通過 + warning 顯示。
- 整合測試：staged file 違反 invariant → 仍 block。

## Validators

### Phase 0 Planning Validators

- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm test -- --grep "hook.*audit"`
- `git diff --check`

## Plain-language Anchor

別人留下的 ledger 髒污不該擋我 commit 自己的東西。Hook 只看我這次要送什麼，工作樹他處的問題告訴我就好。
