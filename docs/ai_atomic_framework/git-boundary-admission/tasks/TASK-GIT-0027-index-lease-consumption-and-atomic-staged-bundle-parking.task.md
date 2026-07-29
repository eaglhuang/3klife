---
task_id: TASK-GIT-0027
title: Index lease consumption and atomic staged-bundle parking
status: planned
owner: unassigned
priority: P0
milestone: G7.1
depends_on:
  - TASK-GIT-0015
causalGraph:
  causalDependencies:
    - "G7 Broker-owned staging index arbitration"
  startConditions:
    - "A valid stage-override lease exists but task-scoped commit resolution still rejects its exact foreign staged entries."
  softRelations:
    - "Unblocks delivery and closeout retries for TASK-GIT-0024, TASK-GIT-0025, and TASK-GIT-0026 without giving any of them special-case policy."
  changedPublicSeams:
    - "GitIndexLeaseAuthority park-and-restore decision"
  - "validated park-and-restore plan for later task-scoped commit adapters"
  causalImpactEdges:
  - "human-approved exact lease -> validated atomic park/restore plan -> byte-identical foreign index restore"
  parallelFrontierInputs: []
  validatorReferences:
    - "tests/cli/git-commit-task-scoped-staging.test.ts"
    - "tests/cli/git-index-override-lease-consumption.test.ts"
  phaseOwner: atm.git-boundary-admission
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-index-ownership.ts"
  - "packages/cli/src/commands/git-governance/commit-bundle-filter.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "tests/cli/git-index-override-lease-consumption.test.ts"
deliverables:
  - "One GitIndexLeaseAuthority interface that consumes a non-expired, single-use stage-override lease only when its actor, task, normalized paths, staged blob IDs, and staged modes exactly match the live foreign index entries."
  - "A validated, atomic park/restore plan for only the authorized foreign entries; TASK-GIT-0028 is the sole owner of wiring that plan into task-scoped commit and closeout adapters."
  - "Fail-closed diagnostics for missing, expired, consumed, partial, mismatched-path, mismatched-blob, mismatched-mode, or restore-failed leases; no raw Git recovery instruction and no task/actor/path incident allowlist."
validators:
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "node --strip-types tests/cli/git-index-override-lease-consumption.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
errorCodes:
  - "ATM_INDEX_FOREIGN_ACTIVE_STAGED"
createdByCommand: atm plan card create
---

# TASK-GIT-0027 Index lease consumption and atomic staged-bundle parking

## Intent

Make the G7 stage-override lease a real, content-bound capability. Today the
CLI can mint an audited lease but no one validates its actor, task and exact
index identity as one decision. This card repairs the authority-to-effect gap
without weakening index ownership. TASK-GIT-0028 subsequently wires the
validated plan into the two commit callers.

## First-Principles and Deep-Module Design

The protected resource is the exact staged index entry, not a filename and not
a task label. One owner module, `GitIndexLeaseAuthority`, must hide lease
parsing, expiration, one-time consumption, identity fencing, and index
park/restore mechanics behind a small decision interface. The later caller
supplies a requested current-task bundle and receives either a verified plan
or a fail-closed diagnostic.

Deletion test: without this authority, every commit and closeout caller would
need to parse leases, compare blobs and modes, and invent its own index
authority. The public test surface is the decision plus the resulting index
identities, not private helper sequencing. GIT-0028 supplies the two adapters:
ordinary task-scoped commit and taskflow close-bundle assembly. Dependencies
are in-process Git index operations, local-substitutable lease storage, and no
remote-owned or true-external dependency.

## Acceptance

- [ ] A valid lease authorizes a plan that parks only its exact foreign staged
  entries; after park and restore, each entry has the same path, blob ID and
  mode as before parking.
- [ ] Missing, expired, already-consumed, partial, path-mismatched,
  blob-mismatched, and mode-mismatched leases fail before any index mutation.
- [ ] The authority contains no TASK-GIT incident ID, actor ID, date, or
  hard-coded path policy. GIT-0028 is responsible for the two caller adapters
  and commit-failure receipt lifecycle.
- [ ] Focused staging, lease-consumption, typecheck, and CLI validation pass.

## Non-Goals

- Do not unstage, discard, commit, close, or alter the preserved G8 Lock B and
  seven-residue fixture.
- Do not permit native Git or shell mutation as a worker recovery route.
- Do not make a stage override a broad bypass for Broker conflicts, protected
  governance state, delivery scope, validators, or close gates.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T23:51:03.061Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0027-index-lease-consumption-and-atomic-staged-bundle-parking.task.md","contentDigest":"sha256:7dccdee059df995ed28c7198417c94904f25fb389059727a8dc9f81aae511ae8"} -->
