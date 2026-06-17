---
task_id: TASK-MAO-0046
doc_id: doc_mao_0046
title: "Route freeze protocol runtime integration"
status: planned
owner: atm-core
priority: P0
milestone: M8
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0007"
  - "TASK-MAO-0036"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/route.ts"
  - "packages/cli/src/commands/command-specs/route.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "packages/core/src/broker/freeze.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/freeze-protocol.test.ts"
  - "tests/cli/route-freeze-runtime.test.ts"
  - "docs/specs/mao-logical-routing-v1.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/route.ts"
  - "packages/cli/src/commands/command-specs/route.spec.ts"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "packages/core/src/broker/freeze.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/freeze-protocol.test.ts"
  - "tests/cli/route-freeze-runtime.test.ts"
  - "docs/specs/mao-logical-routing-v1.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/freeze-protocol.test.ts"
  - "node --strip-types tests/cli/route-freeze-runtime.test.ts"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert route freeze runtime integration, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.route-freeze-runtime-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Automatic interruption of an in-flight LLM response"
  - "Patch envelope submission or apply"
  - "Changing taskflow closeback behavior"
nonGoals:
  - "Do not replace the route context state schema."
  - "Do not implement distributed process coordination."
---

# TASK-MAO-0046 - Route freeze protocol runtime integration

## Goal

Connect the existing freeze protocol module to the route pause/freeze/resume
runtime path so `TASK-MAO-0007` is no longer contract-only code.

## Prior Finding

`packages/core/src/broker/freeze.ts` defines `createFreezeSignal`,
`acknowledgeFreeze`, `resolveFreezeDecision`, and `resumeFreeze`, but the route
CLI pause/freeze path currently records a freeze verdict without exercising the
protocol module.

## Implementation Contract

- Route pause/freeze must call the freeze protocol module when building the
  route freeze state.
- Route resume must consume the freeze decision or resume helper rather than
  treating freeze as a plain string flag.
- WIP snapshot, ack timeout, blocked fallback, and resume behavior must be
  exposed in structured JSON output where applicable.
- Update route help/spec and MAO routing spec so operators can distinguish
  runtime freeze from a reserved protocol interface.

## Acceptance Criteria

- A CLI-level route freeze test proves `route.ts` imports and exercises
  `freeze.ts`.
- Existing freeze unit tests remain meaningful after the runtime integration.
- If a sub-feature is intentionally deferred, the docs explicitly mark it as
  reserved rather than silently leaving dead code.
