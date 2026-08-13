---
task_id: ATM-GOV-0368
title: Let one command satisfy every emergency permission it needs
status: done
owner: unassigned
priority: P1
depends_on: []
causalGraph:
  startConditions:
    - A command that selects two protected surfaces cannot be authorized, because the approval argument binds exactly one lease.
  softRelations: [ATM-GOV-0367]
  causalImpactEdges: [single-lease-argument-closes-the-emergency-lane]
  parallelFrontierInputs: [emergency-lane]
  validatorReferences: [emergency-gate, validate-cli]
  phaseOwner: governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/emergency/gate.ts
  - packages/cli/src/commands/emergency/__tests__/gate.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-025.json
deliverables:
  - packages/cli/src/commands/emergency/gate.ts
  - packages/cli/src/commands/emergency/__tests__/gate.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-13-025.json
validators:
  - node --strip-types packages/cli/src/commands/emergency/__tests__/gate.test.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0368_one_command_satisfies_every_permission_it_needs
    targetGroupId: null
    semanticKey: an_approval_argument_carries_a_set_of_leases
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [single-lease-argument-closes-the-emergency-lane]
    contributionResourceKey: emergency-lane-authorization
    responsibility: task-required
    contractEdge: atm.emergencyMaintenanceLease.v1
    resourceKey: emergency-lane-authorization
    expectedRedPredicate: a command needing two protected permissions is refused whichever single lease it presents, so the emergency lane is closed to it entirely
requiredTestCaseIds:
  - test_atm_gov_0368_one_command_satisfies_every_permission_it_needs
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Reverting restores a lane that cannot authorize a two-permission command at all. It does not restore any protection, because each lease is validated exactly as before.
atomizationImpact:
  ownerAtomOrMap: atm.emergency-lane
  mapUpdates: []
  extractionCandidates: []
errorCodes:
  - ATM_EMERGENCY_PERMISSION_MISMATCH
outOfScope:
  - packages/cli/src/commands/emergency/leases.ts
  - packages/cli/src/commands/emergency/registry.ts
  - packages/cli/src/commands/tasks
  - packages/cli/src/commands/taskflow
nonGoals:
  - Changing what any single lease authorizes. Task, actor, flag, expiry and use-count bounds are untouched.
  - Refactoring the many call sites that pass the approval through as a string. The argument stays one string; only its contents gain set semantics.
createdByCommand: atm plan card create
completed_at: "2026-08-13T18:03:00.668Z"
completed_by_agent: "claude-008-gov-0366"
closedAt: "2026-08-13T18:03:00.668Z"
closedByActor: "claude-008-gov-0366"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T18-03-00-668Z-close-26c8de6402eb"
lastTransitionAt: "2026-08-13T18:03:00.668Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4429f761dc35625381e69d3135e9b81ebf1991f8"
---

# ATM-GOV-0368 Let one command satisfy every emergency permission it needs

## Problem

`tasks close --allow-stale-runner --historical-delivery` selects two protected
surfaces: stale-runner recovery needs `backend.runnerRecovery`, and the close
itself needs `backend.tasks.close`. `--emergency-approval` binds exactly one
lease, so whichever lease is supplied, the other check refuses it. Supplying
both does not help — the option is last-wins, so one is simply discarded.

The emergency lane is therefore closed to any command that legitimately needs
two permissions, which is the class of command most likely to need it. Recorded
as `ATM-BUG-2026-08-13-025`, hit live on ATM-GOV-0367, where four leases were
approved in sequence and every one was refused by the half it did not cover.

## Design

The approval argument gains set semantics without changing its type. A single
`--emergency-approval` value may carry a comma-separated list of lease ids, in
the same shape `--paths` and `--scope` already use. Every call site that
forwards the value as a string keeps working untouched.

`assertEmergencyApproval` then selects, from the supplied set, the lease whose
permission matches the surface being authorized, and consumes only that one.
Selection is the entire change. Each selected lease is still validated exactly
as before — status, permission, task, actor, expiry, remaining uses, and
allowed flags — so nothing an operator must approve today becomes optional.

When no supplied lease matches, the refusal names every lease presented with the
permission it actually carries, alongside the permission required. Today it
names one side of the comparison, which is the same defect class as
`ATM-BUG-2026-08-13-021`.

## Acceptance

- ACC-1 A single lease id behaves exactly as it does today, including every
  existing refusal code and its details payload.
- ACC-2 A comma-separated set authorizes a surface when one member carries the
  required permission, and consumes only that member.
- ACC-3 When no member matches, the refusal is `ATM_EMERGENCY_PERMISSION_MISMATCH`
  and its details list every supplied lease with its permission, plus the
  permission required. No member is consumed.
