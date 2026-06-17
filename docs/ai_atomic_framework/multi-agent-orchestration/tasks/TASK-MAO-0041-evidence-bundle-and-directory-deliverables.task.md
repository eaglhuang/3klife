---
task_id: TASK-MAO-0041
doc_id: doc_mao_0041
title: "Evidence bundle manifest and directory deliverables"
status: planned
owner: atm-core
priority: P1
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0036"
  - "TASK-MAO-0040"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/tasks/historical-delivery.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/evidence.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "schemas/governance/evidence.schema.json"
  - "docs/governance/evidence-gates.md"
  - "tests/cli/evidence-bundle-manifest.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/tasks/historical-delivery.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/command-specs/evidence.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "schemas/governance/evidence.schema.json"
  - "docs/governance/evidence-gates.md"
  - "tests/cli/evidence-bundle-manifest.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/evidence-bundle-manifest.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert evidence bundle manifest, directory expansion, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.evidence-bundle-manifest-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Accepting stale evidence as fresh"
  - "Bundling unrelated task evidence"
  - "Changing historical batch slice semantics without tests"
nonGoals:
  - "Do not make evidence run stage files globally."
---

# TASK-MAO-0041 - Evidence bundle manifest and directory deliverables

## Goal

Attach successful evidence runs to a task-bound bundle manifest and expand
directory-style deliverables into a verifiable manifest before closeback.

## Implementation Contract

- `atm evidence run` success should produce or update a task-bound bundle
  manifest that the commit bundle resolver can consume.
- Stale or historical-reference evidence must not be treated as fresh live
  evidence unless signed same-wave reuse is implemented.
- Import and closeback should expand directory deliverables into a manifest plus
  file list so metadata validation does not fail only because the deliverable is
  directory-shaped.
- Update evidence docs and command help for the bundle behavior.

## Acceptance Criteria

- Directory deliverables such as fixture folders can close through metadata
  validation when their contents match the manifest.
- This task consolidates backlog items `ATM-BUG-2026-06-15-010`,
  `ATM-BUG-2026-06-16-012`, and `ATM-BUG-2026-06-16-014` where applicable.
- Evidence bundle behavior works with the task-scoped commit bundle resolver.
