---
task_id: ATM-GOV-0263
title: Autonomous continuation and executable recovery parity
status: planned
owner: atm-routing
priority: P0
milestone: ATM-3.1-R0.15
severity: P0
depends_on:
  - ATM-GOV-0257
  - ATM-GOV-0261
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 autonomous governed continuation. This card repairs next/batch/command-manifest parity without creating a second dispatcher or task lifecycle."
scopePaths:
  - packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
  - packages/cli/src/commands/next/route-resolution/**
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/work-channels.ts
  - packages/cli/src/commands/batch/implementation.ts
  - packages/cli/src/commands/shared/command-manifest.ts
  - tests/cli/next-emitted-command-executability.test.ts
  - tests/cli/batch-done-task-pruning.test.ts
  - tests/cli/autonomous-task-continuation.test.ts
deliverables:
  - packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
  - packages/cli/src/commands/next/route-resolution/queue-inspection.ts
  - packages/cli/src/commands/task-direction.ts
  - packages/cli/src/commands/work-channels.ts
  - tests/cli/next-emitted-command-executability.test.ts
  - tests/cli/batch-done-task-pruning.test.ts
  - tests/cli/autonomous-task-continuation.test.ts
validators:
  - node --strip-types tests/cli/next-emitted-command-executability.test.ts
  - node --strip-types tests/cli/batch-done-task-pruning.test.ts
  - node --strip-types tests/cli/autonomous-task-continuation.test.ts
  - npm run validate:cli
  - npm run typecheck
errorCodes: []
evidence:
  required: autonomous-continuation-command-manifest-red-green
rollback:
  strategy: revert-commit-and-require-explicit-stop
  notes: "Rollback must not advertise a non-runnable recovery command or count captain intervention as autonomous success."
atomizationImpact:
  ownerAtomOrMap: atm.next-autonomous-continuation
  mapUpdates: []
  extractionCandidates:
    - atom: atm.next.executable-guidance-projector
      pattern: Projection Adapter
      source: packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0263 Autonomous continuation and executable recovery parity

## Intent

Convert the routing failures in `ATM-BUG-2026-07-20-206`,
`ATM-BUG-2026-07-21-219`, `ATM-BUG-2026-07-22-227`, and
`ATM-BUG-2026-07-22-237` into one generalized autonomous-continuation gate.
After a task card is correct, an AI captain should be able to follow the
returned playbook through the next safe action without a human rewriting
invalid status commands, pruning already-done queue heads, or supplying
missing lifecycle instructions from chat.

This card does not duplicate task-card content or create a second dispatcher.
It makes every machine-advertised status/recovery action a canonical command
manifest and makes `next`/batch continuation derive from current ledger/DAG
state.

## Acceptance

- [ ] Every `statusCommand`, `requiredCommand`, `recoveryCommand`, and `nextSafeResolutionCommand` emitted by the covered `next`/batch paths has an `atm.commandManifest.v1` form with executable, argv, cwd, allowlisted env, timeout, digest, and `shell: false` by default.
- [ ] Fixture-expanded emitted commands execute without `ATM_CLI_USAGE`; active-work guidance uses `broker status`, and task status commands include the required task id or use a valid aggregate command.
- [ ] Completed, abandoned, or otherwise terminal tasks are pruned before batch queue-head selection; a full-plan prompt advances to the next unblocked DAG task instead of returning an already-done prerequisite.
- [ ] Explicit task ids plus data-driven multilingual continuation/closeout verbs enter task-scoped routing without a task-specific lexical branch.
- [ ] Same-actor adopted lane and explicit actor authority are preserved in continuation manifests; ambient identity cannot silently change the worker.
- [ ] A bounded replay runs at least two sequential cards with one recoverable broker/runner/close condition and reaches the next safe action with zero human command repair and zero captain-authored lifecycle prose.
- [ ] A genuine unsatisfied dependency, safety failure, owner approval requirement, or missing/incorrect task-card contract remains a hard stop; autonomy does not mean bypass.
- [ ] Metrics report route hops, emitted-command executions, usage errors, automatic continuations, manual interventions, false stops, and terminal-task pruning count.
- [ ] Delivery evidence gives terminal dispositions to `ATM-BUG-2026-07-20-206`, `ATM-BUG-2026-07-21-219`, `ATM-BUG-2026-07-22-227`, and `ATM-BUG-2026-07-22-237` before Plan 3.1 dogfood.

## Evidence and rollback

Seal the emitted manifests, execution receipts, queue snapshots, and manual
intervention counter. Any advertised command that returns usage-error, or any
done task selected as queue head, keeps Plan 3.1 in `remain-open`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-23T01:23:01.617Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0263-autonomous-continuation-and-executable-recovery-parity.task.md","contentDigest":"sha256:3968c42aa157130f29be2d385bbf5a5a52b53b04fe9c05bd674f2387fd79eba4"} -->
