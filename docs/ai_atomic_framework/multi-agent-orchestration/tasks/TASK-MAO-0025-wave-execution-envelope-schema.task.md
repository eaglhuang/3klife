---
task_id: TASK-MAO-0025
doc_id: doc_mao_0025
title: "Wave execution envelope schema"
status: done
closeback_note: "Delivered + governed-closed in AI-Atomic-Framework on 2026-06-17 (actor claude-code-opus-4-7); planning mirror synced to done."
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0023"
  - "TASK-MAO-0008"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "schemas/team-wave-envelope.schema.json"
  - "packages/core/src/broker/team-wave-envelope.ts"
  - "packages/core/src/broker/__tests__/team-wave-envelope.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/team-wave-envelope.schema.json"
  - "packages/core/src/broker/team-wave-envelope.ts"
  - "packages/core/src/broker/__tests__/team-wave-envelope.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "node --strip-types packages/core/src/broker/__tests__/team-wave-envelope.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert wave envelope schema/module/tests and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-envelope-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Worker report ingestion"
  - "Patch application"
nonGoals:
  - "Do not create a second patch envelope format."
---

# TASK-MAO-0025 - Wave execution envelope schema

## Goal

Define the execution envelope that a Team Agents wave gives to planner, writer, validator, reviewer, and evidence roles.

## Implementation Contract

- Include wave id, task ids, ordered dependencies, allowed files, role permissions, validators, expected deliverables, out-of-scope paths, and rollback hints.
- Link to existing patch envelope semantics instead of replacing them.
- Declare coordinator-only lifecycle and git-write authority.
- Support partial wave result states.

## Acceptance Criteria

- Schema validation covers valid, partial, and invalid envelopes.
- The envelope is enough to brief a worker subagent without giving it unrelated repo context.
- The envelope cannot grant lifecycle or git.write to non-coordinator roles.
