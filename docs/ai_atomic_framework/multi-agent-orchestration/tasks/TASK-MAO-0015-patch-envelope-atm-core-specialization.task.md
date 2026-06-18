---
task_id: TASK-MAO-0015
title: "patch envelope ATM core specialization"
status: done
owner: atm-core
priority: P2
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0008"
  - "TASK-MAO-0013"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "schemas/patch-envelope.schema.json"
  - "packages/core/src/broker/patch-envelope.ts"
  - "packages/core/src/broker/types.ts"
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
  - "node --strip-types packages/core/src/broker/__tests__/patch-envelope.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert ATM-core additive envelope fields, tests, schema updates, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-patch-envelope-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Applying submitted patches"
  - "Publishing runner refs"
  - "Creating a second patch envelope schema"
---

# TASK-MAO-0015 - patch envelope ATM core specialization

## Goal

Extend the existing MAO patch envelope with ATM core runner fields without creating a second envelope format. This is part of the deferred full-Broker escalation path, not the v1 steward baseline.

## Implementation Contract

- Add optional `targetArtifact: "atm-core-runner"` and `atmCoreClassification` fields to the base patch envelope schema.
- Validate matched scope paths, declared atom IDs, declared CID IDs, baseline commit SHA, and patch digest.
- Preserve compatibility for non-core envelopes where the new fields are absent.
- Document and test standard git diff capture for uncommitted worktree changes.
- Keep the v1 steward lane independent from this task; ordinary source tasks should not need patch-envelope literacy to cooperate with runner publication.

## Acceptance Criteria

- Base MAO envelopes remain valid.
- ATM core envelopes require valid classification metadata.
- Invalid core envelopes with missing baseline, missing patch digest, or undeclared core writes fail closed.
- Tests cover untracked-file capture expectations or explicit rejection.
- The task can remain unimplemented while `TASK-MAO-0011` to `TASK-MAO-0013` still deliver useful governance value.
