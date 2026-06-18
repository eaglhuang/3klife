---
task_id: TASK-MAO-0048
doc_id: doc_mao_0048
title: "MAO event replay benchmark from task history"
status: done
owner: cursor-gpt-5.2
started_at: 2026-06-18T12:30:00+08:00
started_by_agent: cursor-gpt-5.2
priority: P1
milestone: M8
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0010"
  - "TASK-MAO-0046"
  - "TASK-MAO-0047"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "scripts/validate-mao-parallel-routing.ts"
  - "scripts/lib/mao-parallel-routing-benchmark-runner.ts"
  - "scripts/fixtures/mao-parallel-routing/01-parallel-safe-disjoint.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/02-same-file-different-atom-disjoint.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/03-same-atom-write-write.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/04-read-write-overlap-watch.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/05-unknown-scope-malformed.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/06-generated-artifact-drift.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/07-route-freeze-on-pause.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/08-route-resume-after-freeze.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/09-steward-apply-safe.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/10-steward-blocked-out-of-scope.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/11-shared-surface-blocked.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/12-runner-derived-artifact-collision.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/manifest.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay.manifest.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/01-broker-shared-file-conflict.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/02-broker-disjoint-parallel-safe.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/03-task-claim-file-overlap.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/04-freeze-protocol-route-history.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/05-patch-envelope-handoff-metadata.replay.json"
  - "docs/reports/mao-parallel-routing-benchmark.md"
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/freeze.ts"
  - "packages/core/src/broker/patch-envelope.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-mao-parallel-routing.ts"
  - "scripts/lib/mao-parallel-routing-benchmark-runner.ts"
  - "scripts/fixtures/mao-parallel-routing/manifest.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay.manifest.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/01-broker-shared-file-conflict.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/02-broker-disjoint-parallel-safe.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/03-task-claim-file-overlap.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/04-freeze-protocol-route-history.replay.json"
  - "scripts/fixtures/mao-parallel-routing/event-replay/05-patch-envelope-handoff-metadata.replay.json"
  - "docs/reports/mao-parallel-routing-benchmark.md"
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/freeze.ts"
  - "packages/core/src/broker/patch-envelope.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-mao-parallel-routing.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert event replay benchmark additions, report updates, fixtures, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-event-replay-benchmark-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Distributed multi-process load testing"
  - "Rewriting the static benchmark scenarios"
  - "Importing private chat transcripts as fixtures"
nonGoals:
  - "Do not treat replay coverage as proof of all live concurrency cases."
completed_at: "2026-06-18T04:59:58.312Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "875d5e2d93fa005c47a9286db46a71dee0e89389"
---

# TASK-MAO-0048 - MAO event replay benchmark from task history

## Goal

Extend the MAO benchmark beyond static fixtures by replaying real ATM task
events or broker evidence through the conflict matrix and steward logic.

## Prior Finding

`TASK-MAO-0010` uses real `evaluateConflictMatrix` and steward logic, but its
12 scenarios are hand-authored JSON fixtures. That is valid for deterministic
logic coverage, but it does not prove that real ATM event history produces the
same protection behavior.

## Implementation Contract

- Add an event-replay fixture layer sourced from `.atm/history/task-events/`
  or broker evidence, with sanitized and deterministic fixture material.
- Keep the existing static scenario set intact.
- Report static catch rate and event-replay catch rate separately.
- Include freeze and patch-envelope signals when available from the M8 runtime
  integration tasks.
- Update the benchmark report with a short note on limitations and how to read
  the results.

## Acceptance Criteria

- The validator can run static scenarios and event-replay scenarios in one
  command.
- The benchmark report distinguishes hand-authored scenario coverage from real
  event replay coverage.
- Replay fixtures are deterministic, sanitized, and suitable for repository
  history.
