---
task_id: ATM-GOV-0363
title: Make governed operations own and clean their transient residue
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - Project owner approved the transient-artifact lifecycle principle as an L4 AtomicCharter invariant.
  softRelations: [ATM-GOV-0359, ATM-GOV-0360]
  changedPublicSeams: [AtomicCharter, atm.operationCleanupReceipt.v1, atm-residue-cleanup]
  causalImpactEdges: [operation-outcome-to-clean-worktree, failure-to-owned-recovery-receipt, residue-diagnostic-to-idempotent-cleanup]
  parallelFrontierInputs: [operation-created-path-inventory, pre-operation-digest, post-operation-digest, owner-lineage]
  validatorReferences: [transient-artifact-lifecycle, charter, skill-templates]
  phaseOwner: governance-substrate
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .atm/charter/atomic-charter.md
  - .atm/charter/charter-invariants.json
  - templates/root-drop/.atm/charter/charter-invariants.template.json
  - fixtures/charter/default-charter.json
  - docs/governance/transient-artifact-lifecycle-charter.md
  - packages/core/src/governance/operation-cleanup-contract.ts
  - packages/core/src/governance/operation-cleanup-contract.test.ts
  - packages/core/src/index.ts
  - packages/cli/src/commands/cleanup/**
  - packages/cli/src/atm.ts
  - templates/skills/atm-residue-cleanup.skill.md
  - templates/skills/atm-dispatch.skill.md
  - scripts/validate-transient-artifact-lifecycle.ts
  - tests/cli/transient-artifact-lifecycle.test.ts
  - .atm/history/evidence/ATM-GOV-0363.*
  - .atm/history/task-events/ATM-GOV-0363/**
  - .atm/history/tasks/ATM-GOV-0363.json
deliverables:
  - .atm/charter/atomic-charter.md
  - .atm/charter/charter-invariants.json
  - templates/root-drop/.atm/charter/charter-invariants.template.json
  - fixtures/charter/default-charter.json
  - docs/governance/transient-artifact-lifecycle-charter.md
  - packages/core/src/governance/operation-cleanup-contract.ts
  - packages/core/src/governance/operation-cleanup-contract.test.ts
  - packages/cli/src/commands/cleanup/index.ts
  - packages/cli/src/commands/cleanup/run.ts
  - templates/skills/atm-residue-cleanup.skill.md
  - templates/skills/atm-dispatch.skill.md
  - scripts/validate-transient-artifact-lifecycle.ts
  - tests/cli/transient-artifact-lifecycle.test.ts
validators:
  - node --strip-types packages/core/src/governance/operation-cleanup-contract.test.ts
  - node --strip-types tests/cli/transient-artifact-lifecycle.test.ts
  - node --strip-types scripts/validate-transient-artifact-lifecycle.ts --mode validate
  - npm run validate:charter
  - node --strip-types scripts/validate-skill-templates.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0363_transient_artifact_lifecycle
    targetGroupId: null
    semanticKey: every_governed_operation_owns_cleanup_or_durable_recovery
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [operation-outcome-to-clean-worktree, failure-to-owned-recovery-receipt, residue-diagnostic-to-idempotent-cleanup]
    contributionResourceKey: transient-artifact-lifecycle
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.operationCleanupReceipt.v1
    resourceKey: transient-artifact-lifecycle
    expectedRedPredicate: an injected failure, timeout or cancellation leaves unowned residue or a cleanup receipt without verifiable pre/post digests
requiredTestCaseIds: [test_atm_gov_0363_transient_artifact_lifecycle]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract, deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the invariant, contract, CLI and skill projection as one unit; preserve cleanup receipts as historical evidence and never delete user-authored source.
atomizationImpact:
  ownerAtomOrMap: atm.governed-operation-lifecycle
  mapUpdates: []
  extractionCandidates:
    - atom: atm.operation-cleanup-contract
      pattern: Policy Object
      source: packages/core/src/governance/operation-cleanup-contract.ts
      disposition: extract
      inlineReason: null
    - atom: atm.residue-cleanup-command
      pattern: Facade
      source: packages/cli/src/commands/cleanup/run.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0363 Make governed operations own and clean their transient residue

## Intent

Promote operation-owned transient-artifact lifecycle management to the
AtomicCharter and implement it as a reusable contract, normal CLI recovery
surface and agent skill. A governed operation must not externalize cleanup cost
to the next actor merely because its primary action failed closed.

## Owner-approved invariant

Every governed operation owns the full lifecycle of the transient artifacts it
creates. Success, failure, timeout and cancellation must atomically restore the
pre-operation state or leave a durable, task/actor-bound, digest-verifiable and
idempotently resumable recovery receipt. Unowned residue is forbidden. When
automatic cleanup cannot safely finish, ATM must route the exact residue to the
normal `atm-residue-cleanup` skill/CLI path instead of requiring ad-hoc shell
repair or an emergency bypass.

## Acceptance

- ACC-1 Add `INV-ATM-012` as a repository-neutral lifecycle invariant, bump the charter minor version, synchronize every canonical charter fixture/template and validate the exact charter hash.
- ACC-2 Define one deep `atm.operationCleanupReceipt.v1` contract with operation identity, owner lineage, exact created/touched path inventory, before/after digests, outcome, cleanup disposition, retry token and terminal status. It must not contain task-ID, actor-ID, path or incident-specific control flow.
- ACC-3 Provide a normal `atm cleanup` diagnostic/apply facade and `atm-residue-cleanup` skill. Diagnose is read-only. Apply requires current ownership or an explicit governed takeover receipt, changes only receipt-listed transient paths, is idempotent, and never deletes user-authored source or foreign owned WIP.
- ACC-4 Add failure-injection coverage for success, assertion failure, process exception, timeout, cancellation, stale-CAS and interrupted publication. Each case must prove either byte-identical restoration or a valid owned recovery receipt that a fresh process can resume to a clean terminal state.
- ACC-5 Integrate the rule into dispatch guidance: an AI may not report a failed operation as safely stopped while its own transient residue remains unowned. It must finish automatic cleanup or invoke the dedicated cleanup route before releasing ownership.

## Stop rules

- Do not classify every dirty file as garbage; only operation-created or receipt-owned transient paths are eligible.
- Do not use raw Git, broad reset/clean, recursive deletion, task-specific allowlists or actor-specific exceptions.
- Do not convert a failed primary operation into success because cleanup succeeded.
- Do not release claim, lock, queue or owner lineage until cleanup reaches a terminal clean state or a durable recovery receipt has transferred ownership explicitly.
- Existing source WIP and independently authored artifacts remain protected even when they intersect a generated surface.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T13:57:57.073Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0363-make-governed-operations-own-and-clean-their-transient-residue.task.md","contentDigest":"sha256:95859f154e9bc4c76dd92e7cd8342863a4c8ec5e72d25097e4ee6ea34b9c19c9"} -->
