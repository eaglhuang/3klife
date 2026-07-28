---
task_id: TASK-MAO-0049
doc_id: doc_mao_0049
title: "Task scope add audit lane"
status: done
owner: atm-core
priority: P0
milestone: M7
closure_authority: target_repo
depends_on: []
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/git-governance-contract.md"
  - "docs/governance/historical-batch-evidence.md"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli/task-scope-amendment.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/git-governance-contract.md"
  - "docs/governance/historical-batch-evidence.md"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli/task-scope-amendment.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/task-scope-amendment.test.ts"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert scope-amendment command path, audit events, docs, tests, help snapshots, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.task-scope-amendment-audit-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Silently widening task scope without an audit record"
  - "Treating scope amendment as proof that out-of-scope source edits were valid"
  - "Replacing emergency waiver flow for true governance exceptions"
nonGoals:
  - "Do not auto-approve cross-feature scope expansion."
  - "Do not let task scope amendment mutate unrelated ledger state."
completed_at: "2026-06-17T03:31:00.475Z"
completed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-17T03-31-00-396Z-close-7616dcbab4f9"
delivery_commit: "310e5c6"
---

# TASK-MAO-0049 - Task scope add audit lane

## Goal

Create a normal governed lane for `tasks scope add` so operators can add linked
files with reasoned audit history instead of routing routine scope fixes through
emergency approval.

## Implementation Contract

- Add a governed CLI path aligned to normal semantics:
  `tasks scope add --task <id> --add <csv> --json`.
  This is the only regular operator path for linked-surface growth.
- Add a separate maintenance/remediation surface with distinct semantics so AI
  operators are less likely to misuse it, e.g. `tasks scope repair ...` with
  stricter preconditions and `--emergency-approval`.  
  (Implement as a protected maintenance lane in this task scope to avoid natural
  language confusion.)
- Add a governed task-scope amendment event payload that records:
  - task id;
  - actor;
  - added paths;
  - amendment reason;
  - whether this was normal scope add or maintenance repair;
  - amendment class such as `doc-sync`, `help-snapshot-sync`,
    `test-alignment`, `generated-artifact`, or `linked-surface`;
  - whether the amendment happened before implementation, during implementation, or
    at closeout.
- Keep true out-of-scope source delivery, historical mixed commits, and waiver
  scenarios on their existing protected governance lanes.
- Expose amendment history in task inspection output and closeback summaries so
  reviewers can distinguish routine linked-surface growth from suspicious scope
  drift.
- Update operator docs to state that normal scope amendment is auditable and is
  not the same as emergency override.
- Keep command output machine-readable: `taskflow close --json`, `tasks status --json`,
  and `tasks status --residue --json` should expose amendment action
  and phase metadata.

## Acceptance Criteria

- A task can add linked CLI docs, help snapshots, tests, or generated artifacts
  through a normal audited `tasks scope add` flow without emergency approval.
- Amendment output is machine-readable and remains visible during closeout.
- Reviewers can tell why a scope changed and whether it remained within the
  original task intent.
- This task reduces routine emergency use while preserving strict handling for
  real governance exceptions.
