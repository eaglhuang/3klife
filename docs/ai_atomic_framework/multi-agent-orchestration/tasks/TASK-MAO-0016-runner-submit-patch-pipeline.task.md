---
task_id: TASK-MAO-0016
title: "runner submit-patch pipeline"
status: planned
owner: atm-core
priority: P2
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0008"
  - "TASK-MAO-0011"
  - "TASK-MAO-0014"
  - "TASK-MAO-0015"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/runner-submit-pipeline.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/cli/src/commands/route.ts"
  - "tests/cli/runner-submit-patch.test.ts"
  - "scripts/validate-runner-submit-pipeline.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/runner-submit-pipeline.ts"
  - "tests/cli/runner-submit-patch.test.ts"
  - "scripts/validate-runner-submit-pipeline.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types tests/cli/runner-submit-patch.test.ts"
  - "node --strip-types scripts/validate-runner-submit-pipeline.ts --mode validate"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert submit-patch pipeline, route CLI integration, tests, validator, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-submit-pipeline-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "External contributor PR ingestion"
  - "Full multi-process distributed broker consensus"
  - "Humanless semantic merge"
---

# TASK-MAO-0016 - runner submit-patch pipeline

## Goal

Serialize ATM core patch submissions through the Broker, build the runner, verify reproducibility, and publish a new in-dev runner ref. This is the step after v1 single-writer stewardship, not the initial operator workflow.

## Implementation Contract

- Add `route submit-patch` behavior for ATM core envelopes.
- Apply patches on the Broker workspace with 3-way fallback and steward-required diagnostics on conflict.
- Commit source changes as the Broker actor identity.
- Run the reproducible runner build gate from `TASK-MAO-0011`.
- Publish a new `refs/atm-runner/in-dev/v<N+1>-dev.<k>` ref and advance `in-dev/HEAD`.
- Return source commit SHA, runner version, runner artifact sha256, and reproducibility evidence.
- Do not make this task a prerequisite for the lighter model where source tasks hand off runner publication to a steward lane.

## Acceptance Criteria

- Tests prove clean patch acceptance, scope drift rejection, undeclared core write rejection, build failure rejection, and reproducibility failure rejection.
- The pipeline does not write `release/**` from non-Broker actor identity.
- Patch application is idempotent or protected by a submission idempotency key.
- Existing non-core route behavior remains unchanged.
- The task remains explicitly deferred until the steward-only path demonstrates real coordination pain.
