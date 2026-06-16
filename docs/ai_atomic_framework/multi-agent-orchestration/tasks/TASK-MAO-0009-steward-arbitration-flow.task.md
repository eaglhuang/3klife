---
task_id: TASK-MAO-0009
title: "steward arbitration flow"
status: done
started_at: "2026-06-16T20:21:00+08:00"
started_by_agent: agent-007
completed_at: "2026-06-16T20:28:00+08:00"
owner: atm-core
priority: P1
milestone: M3
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0006"
  - "TASK-MAO-0008"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/cli/src/commands/route.ts"
  - "packages/core/src/broker/__tests__/steward-arbitration.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/steward.ts"
  - "packages/cli/src/commands/route.ts"
  - "packages/core/src/broker/__tests__/steward-arbitration.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/steward-arbitration.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert steward arbitration flow, route CLI integration, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-steward-arbitration-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "General-purpose semantic merge"
  - "Humanless resolution of ambiguous conflicts"
---

# TASK-MAO-0009 - steward arbitration flow

## Goal

Add a neutral steward path for applying or rejecting conflicting patch envelopes after broker admission freezes normal writers.

## Implementation Contract

- Route conflicts can request `steward-required`.
- Steward input is one or more patch envelopes plus current route conflict evidence.
- Steward can produce `apply`, `merge-required`, `blocked`, or `human-required`.
- Steward identity and permission checks must allow a specialized derived-artifact writer, such as the ATM core Runner Broker, without weakening the generic steward path.
- Applying through steward must record route/task/evidence links.
- Ambiguous or unsafe patch combinations fail closed.

## Acceptance Criteria

- Tests prove steward applies non-conflicting envelopes and blocks same-atom unsafe envelopes.
- CLI output identifies which route/task owns the steward decision.
- No broad `git add .` or hidden worktree sweep is introduced.
- Derived-artifact single-writer behavior can be layered on top of steward decisions by M5.
- Human-required verdict is available for unresolved ambiguity.
