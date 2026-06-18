---
task_id: TASK-MAO-0020
title: "broker bootstrap self-update recovery"
status: done
owner: atm-core
priority: P3
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0017"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/recovery.ts"
  - "packages/core/src/broker/orphan-cleanup.ts"
  - "packages/core/src/broker/runner-bootstrap.ts"
  - "packages/core/src/broker/__tests__/runner-bootstrap.test.ts"
  - "packages/core/src/broker/__tests__/recovery.test.ts"
  - "docs/reports/runner-broker-recovery.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/runner-bootstrap.ts"
  - "packages/core/src/broker/__tests__/runner-bootstrap.test.ts"
  - "docs/reports/runner-broker-recovery.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/runner-bootstrap.test.ts"
  - "node --strip-types packages/core/src/broker/__tests__/recovery.test.ts"
  - "npm run validate:broker-recovery"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert bootstrap/recovery module, tests, report, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-broker-recovery-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Production hot-standby infrastructure"
  - "Distributed broker consensus"
  - "Automatic humanless disaster recovery for ambiguous state"
completed_at: "2026-06-18T05:20:46.731Z"
completed_by_agent: "claude-code-opus-4-7"
delivery_commit: "40aeed4a5bd4531463e49b625ea261da432220ed"
---

# TASK-MAO-0020 - broker bootstrap self-update recovery

## Goal

Define and test how the full runner Broker starts from a known built runner, self-updates safely, and recovers from crash or stale route state. This is long-horizon self-hosting work, not part of the first steward rollout.

## Implementation Contract

- Record the Broker version that produced each runner ref.
- Prevent hot-swapping Broker code mid-flight.
- Drain submissions before self-restart after built promotion.
- Reconstruct route and submission state from durable refs, route records, and audit logs.
- Document manual recovery limits for destroyed hosts and ambiguous in-flight submissions.
- Keep the first rollout free of these concerns by using a simpler steward lane until restart complexity becomes worth paying for.

## Acceptance Criteria

- Tests prove bootstrap from a known built ref, graceful self-update scheduling, crash restart, stale submission detection, and operator-review fallback.
- Recovery never mutates immutable published version refs.
- The report states which state is durable and which state is intentionally recoverable from heritage docs.
- Existing broker recovery validators still pass.
- The task can remain deferred without reducing the usefulness of `TASK-MAO-0011` to `TASK-MAO-0013`.
