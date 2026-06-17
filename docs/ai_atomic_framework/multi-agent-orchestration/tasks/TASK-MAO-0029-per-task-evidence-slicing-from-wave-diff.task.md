---
task_id: TASK-MAO-0029
doc_id: doc_mao_0029
title: "Per-task evidence slicing from wave diff"
status: done
closeback_note: "Delivered + governed-closed in AI-Atomic-Framework on 2026-06-17 (actor claude-code-opus-4-7); planning mirror synced to done."
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0028"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/team-wave-evidence.ts"
  - "packages/core/src/broker/__tests__/team-wave-evidence.test.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/team-wave-evidence.ts"
  - "packages/core/src/broker/__tests__/team-wave-evidence.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/team-wave-evidence.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert wave evidence slicing helpers, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-evidence-slicing-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Closing tasks"
  - "Automatic semantic ownership inference"
nonGoals:
  - "Do not mark a task done if its deliverables cannot be isolated."
---

# TASK-MAO-0029 - Per-task evidence slicing from wave diff

## Goal

Convert one wave-level diff and worker report set into per-task evidence slices.

## Implementation Contract

- Map changed files and validator results back to task deliverables.
- Identify ambiguous files that belong to multiple task cards.
- Require explicit worker attribution for shared files.
- Produce per-task evidence candidates without closing tasks.

## Acceptance Criteria

- A wave with four independent tasks yields four evidence slices.
- Ambiguous shared files require steward/reviewer confirmation.
- A task with no matching deliverable changes remains partial or not-started.
