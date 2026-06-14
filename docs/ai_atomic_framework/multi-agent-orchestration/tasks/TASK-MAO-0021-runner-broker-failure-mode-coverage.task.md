---
task_id: TASK-MAO-0021
title: "runner broker failure-mode coverage"
status: planned
owner: atm-core
priority: P1
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0017"
  - "TASK-MAO-0020"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "scripts/validate-runner-broker-failures.ts"
  - "scripts/fixtures/runner-broker-failures/"
  - "docs/reports/runner-broker-failure-coverage.md"
  - "packages/core/src/broker/__tests__/runner-failure-modes.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-runner-broker-failures.ts"
  - "scripts/fixtures/runner-broker-failures/"
  - "docs/reports/runner-broker-failure-coverage.md"
  - "packages/core/src/broker/__tests__/runner-failure-modes.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-runner-broker-failures.ts --mode validate"
  - "node --strip-types packages/core/src/broker/__tests__/runner-failure-modes.test.ts"
  - "npm run validate:standard"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove failure validator, fixtures, report, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-broker-failure-coverage-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Real multi-process load testing"
  - "Network chaos testing against external services"
---

# TASK-MAO-0021 - runner broker failure-mode coverage

## Goal

Prove the runner Broker handles the failure modes named in the design document with deterministic local fixtures.

## Implementation Contract

- Add fixtures for AI crash, patch apply conflict, build failure, reproducibility mismatch, Broker restart, host-loss manual escalation, idempotent retry, CID overlap, and non-Broker `release/**` write attempts.
- Add a validator that fails if a known unsafe case is allowed.
- Produce a report mapping each failure mode to its detection signal and recovery command.
- Keep the coverage local and deterministic.

## Acceptance Criteria

- At least nine failure scenarios are covered.
- The validator distinguishes rejected, frozen, steward-required, and human-required outcomes.
- Non-Broker `release/**` write attempts are detected.
- The report identifies any remaining unautomated manual recovery boundary.

