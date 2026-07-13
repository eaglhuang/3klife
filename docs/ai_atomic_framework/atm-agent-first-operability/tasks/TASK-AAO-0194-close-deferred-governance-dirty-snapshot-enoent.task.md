---
task_id: TASK-AAO-0194
title: "Make taskflow close tolerate deferred foreign governance-dirty snapshots"
started_at: "2026-07-13T12:26:00.000Z"
started_by_agent: "cursor-grok-4.5"
status: done
notes: "Fixed ATM-BUG-2026-07-13-180 in aa4744c24; foreign governance-dirty deferral no longer restores other tasks or throws on missing snapshots."
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-13-180
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert governance-dirty defer scoping if current-task close windows regress."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-close-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "release/**"
  - "Changing non-close governance dirty policies for unrelated commands"
  - "Editing .atm/history or .atm/runtime by hand"
---

# TASK-AAO-0194 Make taskflow close tolerate deferred foreign governance-dirty snapshots

## Problem

`ATM-BUG-2026-07-13-180`: `taskflow close --write --defer-foreign-state` can
already land the close commit and mark the ledger done, then throw
`ATM_CLI_UNHANDLED` / `ENOENT` while restoring a close-window snapshot for a
foreign dirty `.bundle-manifest.json`.

## Goal

- Scope governance-dirty deferral to `git-head.jsonl` and the **current task**
  bundle-manifest only; do not `git restore` foreign-task evidence files.
- `restoreDeferredGovernanceDirtyFiles` must skip missing snapshots instead of
  throwing after a successful close.
- Mark backlog row fixed with a regression in commit-bundle-assembly specs.
