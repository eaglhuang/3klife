---
doc_id: doc_team_0015
task_id: TASK-TEAM-0015
title: "Next/playbook team recommendation"
status: done
completed_at: "2026-06-14T13:54:00+08:00"
completed_by_agent: "008"
owner: atm-core
priority: P1
milestone: M6
depends_on:
  - "TASK-TEAM-0011"
  - "TASK-TEAM-0012"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "node atm.mjs next --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert next/playbook team recommendation changes and atom map updates."
atomizationImpact:
  ownerAtomOrMap: "atm.next-guidance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Starting team runtime automatically"
  - "Claiming tasks for subagents"
  - "Changing task selection priority"
nonGoals:
  - "Do not replace the channel playbook"
  - "Do not require Team Agents for all users"
---
# TASK-TEAM-0015 — Next/playbook team recommendation

## Goal

Add structured team recommendations to `next` guidance and channel playbooks.

## Why

After team planning and runtime exist, agents should see the recommended team action directly in the normal ATM route instead of guessing when to run `team plan` or `team start`.

## Implementation Contract

- Add optional `teamRecommendation` data to `next` responses.
- Include plan/start/status commands without automatically executing them.
- Keep Fast, Normal, and Batch channel behavior unchanged except for guidance.

## Deliverables

- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`
- `node atm.mjs next --json`
- `git diff --check`

## Acceptance Criteria

- `next --json` can include a `teamRecommendation` object when a task is claimable.
- The recommendation includes `planCommand`, optional `startCommand`, `statusCommand`, role summary, and reason.
- Channel playbooks mention team planning only as guidance.
- Existing non-team routes remain valid.
- The output is compact enough not to bury the required command.

## Rollback

Revert next/playbook changes and map updates.

## Atomization Impact

- Owner atom/map: `atm.next-guidance-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card makes Team Agents discoverable from the normal ATM entrypoint.

## Completion Notes

- 完成版本由外部 worker 008 實作，完成並在 `path_to-atom-map`、`next`、`team` 及驗證腳本同步更新。
- 2026-06-14 已完成以下驗證：`npm run typecheck`、`npm run validate:cli`、`node --strip-types scripts/validate-prompt-scoped-next.ts`、`git diff --check`、`npm run build` + `node atm.mjs next --json`。
- 依規範本次不提交 `release/**`。
