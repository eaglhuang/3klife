---
task_id: TASK-MAO-0042
doc_id: doc_mao_0042
title: "Validator scope taxonomy and close gating"
status: done
started_at: 2026-06-17T09:50:50Z
started_by_agent: antigravity-Gemini-Flash3.5
owner: atm-core
priority: P1
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0036"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/validate.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/validate.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "scripts/validate-cli.ts"
  - "docs/governance/evidence-gates.md"
  - "docs/testing-strategy.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/validate.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/validate.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "scripts/validate-cli.ts"
  - "docs/governance/evidence-gates.md"
  - "docs/testing-strategy.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert validator taxonomy, close-gate policy, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.validator-scope-taxonomy-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Downgrading release-blocking checks to advisory"
  - "Hiding validator failures"
  - "Suppressing protected-surface neutrality checks for touched files"
nonGoals:
  - "Do not make global repo health invisible."
completed_at: "2026-06-17T13:32:59.351Z"
completed_by_agent: "antigravity-gemini-3.5-flash"
lastTransitionId: "2026-06-17T13-32-59-260Z-close-66465bc3f059"
delivery_commit: "72f80446fd290d6aac39570edee27fcafca39e49"
---

# TASK-MAO-0042 - Validator scope taxonomy and close gating

## Goal

Separate task-local blockers from global advisory findings and release blockers
so unrelated repo-wide validation findings do not block a scoped task close.

## Implementation Contract

- Classify validator results as `task-local`, `global-advisory`,
  `release-blocking`, or `diagnostic`.
- Close should block on task-local and release-blocking failures, but record
  global advisory findings to backlog/evidence without blocking unrelated work.
- Preserve protected-surface neutrality as blocking when the task touches that
  surface.
- Update command help and testing strategy docs.

## Acceptance Criteria

- A task that does not touch a global advisory surface can close while recording
  the advisory.
- Release-critical failures still block.
- The taxonomy is exposed in JSON output and command docs.
