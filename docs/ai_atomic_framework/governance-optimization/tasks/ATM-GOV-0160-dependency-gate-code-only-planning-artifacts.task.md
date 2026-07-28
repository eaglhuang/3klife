---
task_id: ATM-GOV-0160
title: Make dependency gates block code only and allow planning artifacts
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0159
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/dependency-gate.ts
  - packages/cli/src/commands/tasks/dependency-gates.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
  - tests/cli/prompt-scoped-next-claim-dependency-scope.test.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
deliverables:
  - packages/cli/src/commands/tasks/dependency-gate.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
  - tests/cli/prompt-scoped-next-claim-dependency-scope.test.ts
validators:
  - node --strip-types packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
  - node --strip-types tests/cli/prompt-scoped-next-claim-dependency-scope.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-dependency-admission
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.dependency-gate-code-scope-policy
      pattern: Policy Object
      source: packages/cli/src/commands/tasks/dependency-gate.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T07:37:28.224Z"
completed_by_agent: "atm-core"
closedAt: "2026-07-18T07:37:28.224Z"
closedByActor: "atm-core"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T07-37-27-575Z-close-5fef9dabf420"
lastTransitionAt: "2026-07-18T07:37:28.224Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "92934bc1f6a9cbd03a19311d130d5e25be6794f7"
---

# ATM-GOV-0160 - Make Dependency Gates Block Code Only And Allow Planning Artifacts

## Context

F2 implements ruling R2: semantic dependencies protect code mutation, not
planning progress. A dependency-blocked card should still allow docs, ledger,
card-field, blueprint, and planning artifact updates so another lane can prepare
work while waiting for the code dependency to close.

## Required Behavior

- Use the shared `scopeClass` from `ATM-GOV-0159` during claim admission.
- If dependencies are unresolved and the requested claim files are only
  `docs` and/or `ledger`, admit the claim.
- If dependencies are unresolved and any requested claim file is `code`, keep
  the dependency blocker.
- Blocked dependency diagnostics must include:
  - `blockedByDependency`
  - `dependencyTaskIds`
  - `scopeClass`
  - `codeFilesBlocked`
  - the docs/ledger/planning route that remains allowed.
- Add `planningArtifacts` support to the task-card contract so blueprints or
  dependency-era notes can be recorded as handoff-ready artifacts for the later
  implementation lane.
- Preserve R1: same-card second-lane claim conflicts remain `ATM_LOCK_CONFLICT`
  and do not become dependency waitlist entries.

## Acceptance Criteria

- A task with an unresolved dependency can claim docs-only files.
- The same task is blocked when the claim includes any code-class file.
- After the dependency closes, the code-class claim is admitted.
- `planningArtifacts` are imported from Markdown cards and preserved in target
  task snapshots.
- Error details identify the exact code files that made the dependency gate
  apply.

## Validation

Run:

```shell
node --strip-types packages/cli/src/commands/tasks/__tests__/dependency-gate.test.ts
node --strip-types tests/cli/prompt-scoped-next-claim-dependency-scope.test.ts
npm run typecheck
npm run validate:cli
```

## Rollback

Revert the implementation and tests. The previous conservative dependency gate
will return and planning lanes may again serialize behind code dependencies.
