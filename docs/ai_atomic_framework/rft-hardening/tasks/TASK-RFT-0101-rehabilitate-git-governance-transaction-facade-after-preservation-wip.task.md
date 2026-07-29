---
task_id: TASK-RFT-0101
title: Rehabilitate git-governance transaction facade after preservation WIP
status: done
owner: atm-core
priority: P0
depends_on: []
causalGraph:
  causalDependencies:
    - "G7.1 exact staged-entry lease authority is landed, but its consuming implementation was preserved as a 5,734-line non-delivery WIP diff."
  startConditions:
    - "G7.1 delivery 0de8db0a4 is an ancestor of the target HEAD; TASK-GIT-0027 may remain open because this card repairs the oversized test and facade that currently prevent its close."
    - "The preserved implementation diff is explicitly treated as recovery input, not delivery evidence."
  softRelations:
    - "TASK-GIT-0028 consumes the stable transaction interface after this card; it must not repeat this extraction."
  changedPublicSeams:
    - "TaskScopedCommitTransaction request/result interface"
    - "git-governance CLI facade boundary"
  causalImpactEdges:
    - "preserved transaction WIP -> bounded transaction ports -> thin CLI facade -> safe G7.2 production wiring"
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/task-scoped-commit-transaction.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-commit-task-scoped-staging/**
  - tests/cli/git-index-override-lease-consumption.test.ts
  - docs/reports/git-governance-transaction-atomic-map.md
deliverables:
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/task-scoped-commit-transaction.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-commit-task-scoped-staging/**
  - docs/reports/git-governance-transaction-atomic-map.md
validators:
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/git-index-override-lease-consumption.test.ts
  - npm run typecheck
  - npm run validate:cli
  - git diff --check
  - node atm.mjs doctor --json
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-transaction-map
  extractionCandidates:
    - atom: atm.git-governance-cli-facade
      pattern: Thin Adapter
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: extract
      inlineReason: null
    - atom: atm.task-scoped-commit-transaction
      pattern: Deep Transaction Module
      source: packages/cli/src/commands/git-governance/task-scoped-commit-transaction.ts
      disposition: preserve-and-deepen
      inlineReason: null
    - atom: atm.git-commit-transaction-fixtures
      pattern: Test Support Modules
      source: tests/cli/git-commit-task-scoped-staging.test.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-07-29T17:10:40.055Z"
completed_by_agent: "codex-git-series-captain"
closedAt: "2026-07-29T17:10:40.055Z"
closedByActor: "codex-git-series-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-29T17-10-40-055Z-close-786265595741"
lastTransitionAt: "2026-07-29T17:10:40.055Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "dff658e7abc3e145876b4342f861296c7c86edfb"
---

# TASK-RFT-0101 Rehabilitate git-governance transaction facade after preservation WIP

## Intent

Rehabilitate the high-risk preservation WIP recorded in commit `39b13905f`.
That commit contains a 5,734-line change to `git-governance/implementation.ts`
and is explicitly non-delivery evidence. This card turns the recovery input
into a bounded, testable deep module before GIT-0028 wires the transaction into
normal commit and close flows.

## Delivery-First Start Rule

This card deliberately consumes the landed G7.1 delivery rather than waiting
for `TASK-GIT-0027` close. Requiring a closed predecessor would create a
cycle: GIT-0027 pre-close observes the over-budget staging-test WIP that this
card owns and must split. The immutable ancestor check on `0de8db0a4` is the
causal gate; GIT-0027 close remains a later lifecycle operation, not a
behavioral prerequisite.

## First-Principles Boundary

The product need is narrow: commit one task bundle while preserving exactly the
authorized foreign index entries. Parsing flags, reading lease storage,
constructing a filtered bundle, parking/restoring entries, and translating
failures are different reasons to change. A CLI facade must not own all of
them. The transaction module owns the difficult atomic lifecycle through ports;
the facade only maps CLI input to stable contracts.

Deletion test: if `TaskScopedCommitTransaction` disappeared, both normal
governed commit and taskflow close would reimplement park/restore/error policy.
If the facade disappeared, command parsing would need a replacement but the
transaction safety contract would remain intact. Therefore the transaction is
the deep module and the facade must stay thin.

## Atomic Boundary

- Start with a written baseline of the `39b13905f` preservation diff; do not
  cite it as delivery or silently absorb unrelated behavior.
- Reduce `implementation.ts` to a typed facade at or below 600 physical lines.
- Keep transaction orchestration behind one small public interface. It may use
  injected Git ports, but must not hard-code task ids, actor ids, dates, local
  paths, or incident-specific policy.
- Split the over-budget staging test into an executable facade plus bounded
  fixture/support modules; every touched TypeScript file stays at or below 600
  physical lines.
- Preserve byte-identical path/blob/mode restoration for success, commit
  failure, and restore failure. The latter must create a durable diagnostic.
- GIT-0028 may only consume the resulting interface; it must not repeat this
  extraction or extend the facade beyond its bounded role.

## Acceptance

- [ ] The report records the preservation baseline and proves that no
  non-delivery WIP is treated as functional completion.
- [ ] `implementation.ts` has no `@ts-nocheck`, is at or below 600 lines, and
  delegates all park/restore/lease and transaction policy to bounded modules.
- [ ] The transaction module has one public request/result contract used by
  both ordinary task commits and close-bundle assembly.
- [ ] The staging test facade and every extracted support module are at or
  below 600 lines while retaining existing exact-entry restoration coverage.
- [ ] Focused tests, typecheck, CLI validation, doctor, and diff check pass as
  command-backed evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-29T02:25:30.685Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"rft-hardening/tasks/TASK-RFT-0101-rehabilitate-git-governance-transaction-facade-after-preservation-wip.task.md","contentDigest":"sha256:0a1cbf72adc3942f10c2173b0c2705cdf66b72284a9febd12ce792696828044d"} -->
