---
task_id: ATM-GOV-0402
title: Make Team proposal-first blocks return a machine-actionable recovery
status: planned
owner: gemini-captain
priority: P1
depends_on: []
causalGraph:
  causalDependencies:
    - L5 Team plan/start fails proposal-first before runtime mutation but previously exposes only prose recovery.
  startConditions:
    - A hot shared surface requires atm.patchProposal.v1.
  softRelations:
    - ATM-GOV-0341
  changedPublicSeams:
    - team-proposal-first-recovery
  causalImpactEdges:
    - proposal-first-block-to-actionable-recovery
  parallelFrontierInputs:
    - canonical broker lane decision
  validatorReferences:
    - tests/cli/team-proposal-first-recovery.test.ts
  phaseOwner: gemini-captain
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: C:/Users/User/AI-Atomic-Framework
scopePaths:
  - packages/cli/src/commands/team/legacy/types.ts
  - packages/cli/src/commands/team/legacy/permission-lease-policy.ts
  - packages/cli/src/commands/team/legacy/command-runner.ts
  - packages/cli/src/commands/command-specs/team.spec.ts
  - tests/cli/team-proposal-first-recovery.test.ts
deliverables:
  - packages/cli/src/commands/team/legacy/types.ts
  - packages/cli/src/commands/team/legacy/permission-lease-policy.ts
  - packages/cli/src/commands/team/legacy/command-runner.ts
  - packages/cli/src/commands/command-specs/team.spec.ts
  - tests/cli/team-proposal-first-recovery.test.ts
validators:
  - node --strip-types tests/cli/team-proposal-first-recovery.test.ts
  - node --strip-types tests/cli/team-plan-contract.test.ts
  - npm run typecheck
testContributions:
  - caseId: proposal_first_block_returns_structured_recovery_0402
    targetGroupId: null
    semanticKey: team_proposal_recovery
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [proposal-first-block-to-actionable-recovery]
    expectedRedPredicate: proposal-first rejection lacks a structured schema and official proposal-file recovery
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: team-proposal-first-recovery
    resourceKey: null
requiredTestCaseIds:
  - proposal_first_block_returns_structured_recovery_0402
tddMode: required
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.team-command-routing
  mapUpdates: []
  extractionCandidates:
    - atom: atm.team-proposal-recovery
      pattern: Policy Object
      source: packages/cli/src/commands/team/legacy/permission-lease-policy.ts
      disposition: inline
      inlineReason: The repair extends the existing policy result, so a second resolver would duplicate broker authority.
errorCodes:
  - code: ATM_TEAM_PLAN_INVALID
    disposition: reuse
    category: guard
    trigger: Team plan is blocked pending a bounded proposal.
    retryable: true
    requiresHumanApproval: false
    recovery: Read the structured recovery and run the returned official proposal-file command.
    sourceOwner: packages/cli/src/commands/team/legacy/command-runner.ts
    registryOwnerTask: ATM-GOV-0402
    tests:
      - tests/cli/team-proposal-first-recovery.test.ts
createdByCommand: atm plan card create
---

# ATM-GOV-0402 Make Team proposal-first blocks return a machine-actionable recovery

## Intent

This quickfix source repair is delivered in `6843a288a6fbacd26003a6e7369f119a0eb4939e`
and `2e669936ce068becb68eb4671e450560c656f3ac`. It preserves proposal-first
admission while exposing a structured recovery contract for state-only Team
plan/start blocks. Frozen publication and formal closeout remain separate.

## Acceptance

- [ ] ACC-1: Proposal-first block reports schema, broker-bound subject, official proposal-file command, and no-runtime-mutation facts.
- [ ] ACC-2: Read-only preview exposes the same recovery while stale, absent, mismatched, and out-of-scope proposals remain fail-closed.
- [ ] ACC-3: Focused red/green and existing Team contract validations are command-backed; no emergency lease is used.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T16:31:46.393Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0402-make-team-proposal-first-blocks-return-a-machine-actionable-recovery.task.md","contentDigest":"sha256:aeef4bcebb4879fdd533f2b59690409e37100034d0a2f7fa8a02ecc78b279ded"} -->
