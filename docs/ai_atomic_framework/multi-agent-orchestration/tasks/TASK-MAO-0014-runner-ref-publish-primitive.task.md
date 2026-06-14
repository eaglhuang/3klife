---
task_id: TASK-MAO-0014
title: "runner ref publish primitive"
status: planned
owner: atm-core
priority: P0
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0011"
  - "TASK-MAO-0012"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/runner-ref-store.ts"
  - "packages/core/src/broker/__tests__/runner-ref-store.test.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "scripts/validate-runner-refs.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/runner-ref-store.ts"
  - "packages/core/src/broker/__tests__/runner-ref-store.test.ts"
  - "scripts/validate-runner-refs.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/runner-ref-store.test.ts"
  - "node --strip-types scripts/validate-runner-refs.ts --mode validate"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove runner ref store, CLI surface, validator, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-ref-store-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Processing submitted patches"
  - "Closure packet binding"
  - "External contributor workflow"
---

# TASK-MAO-0014 - runner ref publish primitive

## Goal

Add the low-level primitive for immutable runner version refs and the moving `in-dev/HEAD` control ref.

## Implementation Contract

- Implement pure helpers for ref names, monotonic version allocation, artifact digest records, and immutable publish checks.
- Treat `refs/atm-runner/built/v<N>` and `refs/atm-runner/in-dev/v<N>-dev.<k>` as immutable version refs.
- Treat `refs/atm-runner/in-dev/HEAD` as a moving control ref, not a published immutable version.
- Add validation that publish attempts cannot overwrite existing version refs.

## Acceptance Criteria

- Tests prove built ref publish, in-dev ref publish, moving HEAD advance, and overwrite rejection.
- Artifact digest records include source commit SHA, artifact manifest hash, publisher actor, and reproducibility flag.
- Ref storage can run in a local git fixture without network access.
- No task closure behavior changes in this card.

