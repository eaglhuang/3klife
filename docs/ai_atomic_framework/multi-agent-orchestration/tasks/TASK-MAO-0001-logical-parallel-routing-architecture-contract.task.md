---
task_id: TASK-MAO-0001
title: "logical parallel routing architecture contract"
status: done
completed_at: "2026-06-14T11:22:06.854Z"
completed_by_agent: "captain"
owner: atm-core
priority: P0
milestone: M0
closure_authority: target_repo
ledger_closure:
  source: "AI-Atomic-Framework/.atm/history/tasks/TASK-MAO-0001.json"
  closed_at: "2026-06-14T11:22:06.854Z"
  closed_by_actor: "captain"
  closure_packet: ".atm/history/evidence/TASK-MAO-0001.closure-packet.json"
depends_on: []
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "docs/specs/mao-logical-routing-v1.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/specs/mao-logical-routing-v1.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "git diff --check"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the MAO v1 spec and atomization map addition."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-routing-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Implementing route CLI commands"
  - "Changing broker runtime behavior"
  - "Adding patch envelope storage"
---

# TASK-MAO-0001 - logical parallel routing architecture contract

## Goal

Create the neutral framework specification for MAO v1: root router, route context, broker admission, freeze/resume, patch envelope, and steward arbitration.

## Implementation Contract

- Define root router versus route context responsibility.
- State that route contexts may hold local memory but cannot own global truth.
- Define the initial command vocabulary without implementing it.
- Define conflict vocabulary: `allow`, `watch`, `freeze`, `serialize`, `steward-required`, `blocked`.
- Document why logical scope admission is preferred over worktree-only isolation.

## Acceptance Criteria

- The spec gives enough detail for `TASK-MAO-0002` through `TASK-MAO-0004` to implement schemas and CLI shape.
- The spec explicitly preserves ATM as the single global authority.
- The spec does not introduce a second task registry.
- The atomization map is updated for the new spec surface.
