---
doc_id: ""
task_id: TASK-AAO-0132
title: "frozen runner alignment before TASK-AAO-0018 clean redelivery"
milestone: M17
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
created: "2026-06-05"
created_by_agent: codex-gpt-5.4-mini
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-frozen-runner-alignment-before-task-aao-0018-clean-redelivery
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-AAO-0018
depends: []
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/dist/**
  - C:/Users/User/AI-Atomic-Framework/release/atm-onefile/**
  - C:/Users/User/AI-Atomic-Framework/release/atm-root-drop/**
forbidden_files:
  - source implementation surfaces
  - TASK-AAO-0018 source deliverables
  - .atm runtime / history manual edits
  - scratch / .playwright-mcp / unrelated dirty
non_goals:
  - "Do not touch AI-Atomic-Framework source in Phase 0."
  - "Do not fold TASK-AAO-0018 implementation work into this card."
  - "Do not write runner sync changes back into TASK-AAO-0018."
  - "Do not use atm.dev.mjs to bypass frozen runner lag."
  - "Do not mix npm run build into TASK-AAO-0018 redelivery."
notes: "2026-06-05 | status: open | validation: pending | change: Phase 0 open card for frozen runner alignment before TASK-AAO-0018 clean redelivery | blocker: none"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from open."
---

# TASK-AAO-0132 frozen runner alignment before TASK-AAO-0018 clean redelivery

## 目標
先開一張獨立的 runner sync 卡，處理 frozen runner 與 framework source 的對齊問題，讓 `TASK-AAO-0018` 可以維持乾淨 redelivery。
這張卡只做 3KLife Phase 0 開卡，不碰 AI-Atomic-Framework source。

## 背景
在 clean worktree 送出 `TASK-AAO-0018` 時，曾回報 `ATM_RUNNER_SYNC_REQUIRED`。
這表示 frozen runner 落後 framework source，不能用 `node atm.dev.mjs` 繞過，也不能把 `npm run build` 混進 `TASK-AAO-0018`。
所以先把 runner sync 拆成獨立卡，讓 0018 保持乾淨。

## Phase 0 Scope
- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。
- 不把 runner sync 寫回 `TASK-AAO-0018`。
- 不把 `TASK-AAO-0018` 的 source deliverables 混進這張卡。

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/dist/**`
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/**`
- `C:/Users/User/AI-Atomic-Framework/release/atm-root-drop/**`

## Phase 1 Forbidden Surfaces
- source implementation surfaces
- TASK-AAO-0018 source deliverables
- `.atm` runtime / history manual edits
- scratch / `.playwright-mcp` / unrelated dirty

## Acceptance Criteria
- `npm run build` can produce runner outputs.
- `node atm.mjs next --prompt "TASK-AAO-0018 Neutrality scanner staged-only mode clean redelivery" --json` no longer reports `ATM_RUNNER_SYNC_REQUIRED`.
- `TASK-AAO-0018` source deliverables remain untouched by this card.

## Validators
### Phase 0 Planning Validators
- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators
- `npm run build`
- `node atm.mjs next --prompt "TASK-AAO-0018 Neutrality scanner staged-only mode clean redelivery" --json`
- `git diff --check`

## Plain-language Anchor
This card syncs the engine first.
After that, 007 can return to `TASK-AAO-0018` without the frozen runner getting in the way.
