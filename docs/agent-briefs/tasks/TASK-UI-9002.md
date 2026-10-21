---
doc_id: doc_TASK-UI-9002
task_id: TASK-UI-9002
title: "整合 DS3 人物頁與 master 變更"
status: in-progress
started_at: 2026-10-21T07:18:00Z
started_by_agent: codex-gpt-6
amendment_epoch: 1
owner: codex-gpt-6
priority: P2
depends_on:
[]
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "assets/scripts/ui/components/GeneralDetailComposite.ts"
  - "tests/ucuf/architectureGovernance.test.ts"
  - "docs/ui-quality-todo.json"
  - "docs/agent-briefs/tasks_index.md"
  - "docs/ui-quality-tasks/TASK-UI-9002.json"
validators:
  - "npm run test:ucuf"
  - "git diff --check"
deliverables:
  - "assets/scripts/ui/components/GeneralDetailComposite.ts"
  - "tests/ucuf/architectureGovernance.test.ts"
  - "docs/ui-quality-todo.json"
  - "docs/agent-briefs/tasks_index.md"
  - "docs/ui-quality-tasks/TASK-UI-9002.json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the delivery commit if the change fails validation."
outOfScope: []
nonGoals: []
---

# TASK-UI-9002 - 整合 DS3 人物頁與 master 變更

## Goal

修復 PR734 四個合併衝突，保留雙方邏輯與測試，不改寫舊交付，不自行合併 master。

## Scope

Edit only the files listed in `scopePaths`. Ask for a new task card instead of widening the scope.

## Acceptance

- Every command in `validators` passes and is recorded with `node atm.mjs evidence run`.
- The change is committed with `node atm.mjs git commit --task TASK-UI-9002` and closed with `node atm.mjs taskflow close --task TASK-UI-9002`.
