---
task_id: TASK-MAO-0031
doc_id: doc_mao_0031
title: "Coordinator-only git and closeout guard for waves"
status: done
closeback_note: "Delivered + governed-closed in AI-Atomic-Framework on 2026-06-17 (actor claude-code-opus-4-7); planning mirror synced to done."
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0030"
  - "TASK-MAO-0009"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/team-wave.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/__tests__/team-wave-closeout-guard.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/__tests__/team-wave-closeout-guard.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/team-wave-closeout-guard.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert wave closeout guard, hook integration, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-closeout-guard-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Allowing workers to commit directly"
  - "Bypassing existing hooks"
nonGoals:
  - "Do not grant git.write or task.lifecycle to non-coordinator roles."
---

# TASK-MAO-0031 - Coordinator-only git and closeout guard for waves

## Goal

Ensure Team Agents wave speed does not bypass coordinator ownership of git writes and task closeout.

## Implementation Contract

- Enforce coordinator-only commit and checkpoint ownership for wave runs.
- Block worker attempts to close tasks or stage unrelated files through wave surfaces.
- Preserve existing hook and batch checkpoint protections.
- Record clear diagnostics when a worker report includes unapproved file writes.

## Acceptance Criteria

- Non-coordinator wave roles cannot close tasks.
- Non-coordinator wave roles cannot declare successful closeout.
- Hook / CLI diagnostics point to the correct coordinator command.
