---
task_id: TASK-MAO-0008
title: "patch envelope contract"
status: done
owner: atm-core
priority: P1
milestone: M3
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0007"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "schemas/patch-envelope.schema.json"
  - "packages/core/src/broker/patch-envelope.ts"
  - "packages/core/src/broker/__tests__/patch-envelope.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/patch-envelope.schema.json"
  - "packages/core/src/broker/patch-envelope.ts"
  - "packages/core/src/broker/__tests__/patch-envelope.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/patch-envelope.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove patch envelope schema/module/tests and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-patch-envelope-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Applying patch envelopes to the worktree"
  - "Steward arbitration"
completed_at: "2026-06-16T12:00:47.085Z"
completed_by_agent: "codex-captain-continuation"
delivery_commit: "803ffc335"
---

# TASK-MAO-0008 - patch envelope contract

## Goal

Represent agent WIP as a structured logical transaction instead of relying on dirty worktree state as the only handoff artifact.

## Implementation Contract

- Define a schema for patch envelopes with route, task, actor, base commit, declared touched files, atom CIDs, diff payload reference, validator evidence, and conflict metadata.
- Allow additive specialization fields for derived artifacts such as `targetArtifact` and classification metadata, while keeping one base patch envelope schema.
- Add pure helpers to validate, summarize, and compare envelopes.
- Include support for partial WIP envelopes that are not yet eligible for apply.
- Do not apply patches in this card.

## Acceptance Criteria

- Valid envelope and partial WIP envelope examples pass schema validation.
- Invalid missing route/task/base fields fail.
- Helper tests prove summary and comparison behavior.
- Envelope contract can be consumed by steward arbitration.
- The schema does not force M5 to create a second ATM-core-only envelope format.
