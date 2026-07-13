---
task_id: TASK-AAO-0193
title: "Remind framework imports to author 3KLife planning cards first"
started_at: "2026-07-13T12:05:00.000Z"
started_by_agent: "cursor-grok-4.5"
status: ready
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-13-176
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/planning-root-authorship.ts"
  - "packages/cli/src/commands/tasks/__tests__/planning-root-authorship.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/tasks/planning-root-authorship.ts"
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/__tests__/planning-root-authorship.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/planning-root-authorship.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert planning-root authorship preflight if legitimate target-only imports regress."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-import-map"
  mapUpdates: []
  extractionCandidates:
    - disposition: extract
      path: packages/cli/src/commands/tasks/planning-root-authorship.ts
      inlineReason: "New pure preflight helper for AAO/TEAM planning-root authorship."
outOfScope:
  - "release/**"
  - "Changing non-AAO/TEAM import paths"
  - "Editing .atm/history or .atm/runtime by hand"
---

# TASK-AAO-0193 Remind framework imports to author 3KLife planning cards first

## Problem

`ATM-BUG-2026-07-13-176`: framework-repo agents can import AAO/TEAM work from
`.atm/task-plans/` without a matching 3KLife planning card under
`docs/ai_atomic_framework/**/tasks/`.

## Goal

- On framework-repo `tasks import` of AAO/TEAM cards from `.atm/task-plans/`,
  detect missing planning-root authorship.
- `--write` fails closed with a copyable 3KLife path/command unless
  `--waive-planning-root --reason ...` is explicit.
- Dry-run emits a high-priority warning with the same remediation.
- Mark backlog row fixed.
