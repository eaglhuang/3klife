---
doc_id: doc_task_aao_0043
task_id: TASK-AAO-0043
title: "planning repo root resolver"
status: done
started_at: 2026-06-20T11:05:00.000Z
started_by_agent: cursor-gpt-5.2
owner: atm-core
priority: P1
milestone: M14
depends_on:
  - "TASK-AAO-0038"
  - "TASK-AAO-0039"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/lifecycle-state.ts"
  - "packages/cli/src/commands/planning-repo-root.ts"
  - "packages/cli/src/commands/__tests__/planning-repo-root.test.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks/lifecycle-state.ts"
  - "packages/cli/src/commands/planning-repo-root.ts"
  - "packages/cli/src/commands/__tests__/planning-repo-root.test.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert planning-root resolver changes and return to existing path handling."
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Moving 3KLife planning files"
  - "Making planning files writable target deliverables"
nonGoals:
  - "A cross-repo package manager"
completed_at: "2026-06-20T13:41:08.671Z"
completed_by_agent: "antigravity-gemini-3.5-flash"
lastTransitionId: "2026-06-20T13-41-08-598Z-close-261a4aefa7de"
delivery_commit: "0feeb741c1f0689db03dea1b3d1c09397ab2a632"
---
# TASK-AAO-0043 — planning repo root resolver

## Goal

Stop hard-coding planning paths such as `../3KLife/...` inside locks and routing records. Resolve planning roots through config or environment.

## Why

Cross-repo planning is useful, but absolute or fragile relative paths confuse agents and break if the planning repo moves.

## Implementation Contract

- Support a planning root from `.atm/config.json` or `ATM_PLANNING_REPO_ROOT`.
- Store planning paths relative to the planning root where possible.
- Runtime output may show resolved absolute paths for diagnostics, but direction locks must keep planning paths read-only and separate from target work.
- Missing planning root must produce a clear diagnostic and suggested config, not unrelated task fallback.

## Deliverables

- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/task-direction.ts`
- `packages/cli/src/commands/work-channels.ts`
- `packages/cli/src/commands/command-specs/next.spec.ts`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`
- `scripts/validate-prompt-scoped-next.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`

## Acceptance Criteria

- A task imported from 3KLife records planning paths relative to the configured planning root.
- `next --prompt <plan name>` can resolve the plan through the planning root without broad repo scanning.
- If the planning root is missing or stale, ATM returns a planning-root diagnostic with a required config action.
- Planning paths remain read-only and never enter target `allowedFiles` unless the task is explicitly a planning task.

## Rollback

Revert the task commit and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.next-router-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This task reduces cross-repo confusion without changing the idea that 3KLife remains the AAO planning truth.
