---
doc_id: doc_team_0076
task_id: TASK-TEAM-0076
title: "Broker shared-surface parallel coordination and steward queue"
status: planned
owner: atm-core
priority: P0
milestone: "Team Broker Parallel Delivery"
depends_on:
  - "TASK-TEAM-0075"
related_plan: "docs/ai_atomic_framework/team-agents/CROSS-VENDOR-TEAM-MARKDOWN-HANDOFF-PLAN-2026-07-11.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/broker/compose.ts"
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/__tests__/compose.test.ts"
  - "packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/broker/compose.ts"
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/__tests__/compose.test.ts"
  - "packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/compose.test.ts"
  - "node --strip-types packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "node --strip-types scripts/validate-team-agents.ts --case broker-shared-surface-queue"
  - "node --strip-types scripts/validate-team-agents.ts --case broker-shared-surface-compose"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Broker queue, compose, steward, CLI, documentation, and regression changes together; existing direct-write fail-closed behavior remains the fallback."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
team:
  required: true
  size: L5
outOfScope:
  - "Speculative merging of unbounded dirty worktrees"
  - "Bypassing task leases, evidence, or human-signoff requirements"
  - "Changing Git's native merge semantics"
---

# TASK-TEAM-0076 Broker shared-surface parallel coordination and steward queue

## Goal

Allow Team work to progress concurrently when task scopes overlap on shared
governance files. The Broker must admit each task's non-overlapping work and
turn only the shared-file portion into an explicit, observable queue or a
bounded merge plan. It must not fail the entire Team run merely because two
task cards name the same file.

## Acceptance Criteria

- Broker admission distinguishes private paths from shared paths. A task with
  a shared-path collision receives a `parallel-with-shared-queue` or
  `parallel-with-steward-compose` lane when its private paths are safe; it is
  not reported as globally `broker-conflict-blocked`.
- A shared-path queue records task order, owner, lease epoch, base hash,
  reason, and the exact release condition. The waiting task may execute and
  validate its private paths, but cannot mutate the queued shared path.
- Two valid bounded `PatchProposal` payloads for the same file can be composed
  when their base hash and anchors/hunks are compatible. The neutral steward
  applies only the Broker-produced merge plan and emits command-backed apply
  evidence.
- Incompatible anchors, base-hash drift, generated-file semantic conflicts,
  or unbounded proposals remain fail-closed with a precise reason and a
  next-safe command. The Broker must never guess a Markdown backlog, JSON
  atom map, or generated-map merge.
- `team plan`, `team status`, and `broker status` expose private-path progress,
  shared queue state, queue position, and the next release or steward action.
- Regression coverage proves: two tasks may start on disjoint private files
  while waiting for one shared backlog/map path; a compatible proposal pair is
  composed and steward-applied; and incompatible Markdown/JSON proposals are
  held for explicit resolution without corrupting either file.
- The documentation describes the operator workflow: direct write when alone;
  private work plus queue when sharing; proposal -> compose -> steward for
  bounded compatible changes; human resolution for semantic conflicts.

## Delivery Sequence

1. Model the shared-surface queue and lane evidence without weakening direct
   write lease ownership.
2. Expose queue-aware planning/status and next-safe commands in Broker and
   Team CLI surfaces.
3. Add bounded proposal compatibility checks and neutral-steward evidence.
4. Add deterministic validator fixtures for queue, compose, apply, and
   fail-closed semantic conflicts.
5. Run an L5 dogfood scenario with two tasks sharing a backlog/map path and
   verify that their independent implementation paths run concurrently.
