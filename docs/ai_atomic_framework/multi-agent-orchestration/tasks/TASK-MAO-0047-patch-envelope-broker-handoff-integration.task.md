---
task_id: TASK-MAO-0047
doc_id: doc_mao_0047
title: "Patch envelope broker export and handoff integration"
status: done
owner: cursor-gpt-5.2
started_at: 2026-06-18T05:00:00+08:00
started_by_agent: cursor-gpt-5.2
priority: P1
milestone: M8
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0008"
  - "TASK-MAO-0009"
  - "TASK-MAO-0046"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/broker/patch-envelope.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/patch-envelope.test.ts"
  - "packages/core/src/broker/__tests__/steward-arbitration.test.ts"
  - "packages/cli/src/commands/route.ts"
  - "packages/cli/src/commands/command-specs/route.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "schemas/patch-envelope.schema.json"
  - "tests/cli/route-patch-envelope-handoff.test.ts"
  - "docs/specs/mao-logical-routing-v1.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/broker/patch-envelope.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/steward-arbitration.test.ts"
  - "packages/cli/src/commands/route.ts"
  - "packages/cli/src/commands/command-specs/route.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "schemas/patch-envelope.schema.json"
  - "packages/core/src/broker/__tests__/patch-envelope.test.ts"
  - "tests/cli/route-patch-envelope-handoff.test.ts"
  - "docs/specs/mao-logical-routing-v1.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/patch-envelope.test.ts"
  - "node --strip-types tests/cli/route-patch-envelope-handoff.test.ts"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert patch-envelope broker export, handoff integration, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.patch-envelope-handoff-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Applying patch envelopes to the worktree"
  - "Humanless conflict resolution"
  - "Replacing steward arbitration"
nonGoals:
  - "Do not implement a full patch-apply engine."
  - "Do not create a second broker submission store."
completed_at: "2026-06-18T04:43:20.080Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "a4975ae04"
---

# TASK-MAO-0047 - Patch envelope broker export and handoff integration

## Goal

Make the patch envelope contract available through the broker public surface and
connect it to at least one runtime handoff path.

## Prior Finding

`packages/core/src/broker/patch-envelope.ts` has a complete API and tests, but
it is not exported from the broker index and has no non-test runtime consumer.

## Implementation Contract

- Export the patch envelope API from the broker public surface.
- Wire one runtime handoff path to create, validate, or compare a patch
  envelope.
- Preserve `TASK-MAO-0008`'s original boundary: this card integrates handoff, not
  worktree apply.
- Update route help/spec with the implemented handoff path.

## Acceptance Criteria

- At least one non-test runtime file imports and uses `patch-envelope.ts`.
- CLI or core tests prove the handoff path emits or consumes a valid patch
  envelope.
- Docs clearly state that worktree application remains out of scope.
