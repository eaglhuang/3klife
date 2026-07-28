---
task_id: TASK-GIT-0020
title: Protected governance-state integrity chain and bypass detection
status: superseded
amendment_epoch: 1
superseded_by:
  - TASK-GIT-0018
  - TASK-GIT-0019
closed_reason: "Cohesion-first redesign moved protected-state provenance into content-addressed ticket coverage and shared lifecycle gate adapters."
retirement_policy: "Do not import or claim this card. The current importer may normalize superseded to planned; planning authority still forbids execution. Route implementation to TASK-GIT-0018 and TASK-GIT-0019."
owner: atm-core
priority: P0
milestone: G12
depends_on:
  - TASK-GIT-0018
causalGraph:
  causalDependencies: [TASK-GIT-0018]
  startConditions: ["Launcher receipt schema and capability digest are available."]
  softRelations: [TASK-GIT-0019]
  changedPublicSeams: ["atm.protectedStateIntegrity.v1"]
  causalImpactEdges: ["lifecycle mutation -> integrity checkpoint -> claim/commit/close/push verification"]
  parallelFrontierInputs: ["TASK-GIT-0019 adapter attestation"]
  validatorReferences: ["tests/cli/protected-governance-state-integrity.test.ts", "tests/cli/manual-lifecycle-bypass-detection.test.ts"]
  phaseOwner: "protected-state integrity"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/governance/protected-state-integrity.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/hook/pre-push.ts
  - schemas/validators/protected-governance-state-integrity.schema.json
  - docs/governance/error-code-registry.json
  - packages/core/src/error-code-registry.generated.ts
  - docs/ERROR_CODES.md
  - tests/cli/protected-governance-state-integrity.test.ts
  - tests/cli/manual-lifecycle-bypass-detection.test.ts
deliverables:
  - "One ProtectedStateIntegrityChain deep module that derives canonical digests for task ledgers, lifecycle events, direction locks, and execution receipts."
  - "Claim, governed commit, taskflow close, and protected push verify the same chain and fail closed on direct mutation, missing transition, impossible attribution, or stale execution receipt."
  - "A structured recovery report distinguishes detection from remediation: ATM may block later governance boundaries but does not claim to prevent an arbitrary host write already performed."
  - "Integrity checkpoints bind lifecycle changes to ATM command receipts rather than actor text, environment variables, or planning-only status fields."
validators:
  - node --strip-types tests/cli/protected-governance-state-integrity.test.ts
  - node --strip-types tests/cli/manual-lifecycle-bypass-detection.test.ts
  - npm run generate:error-codes
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-GIT-0020 Protected governance-state integrity chain and bypass detection

## Retirement

Superseded before target import. A standalone integrity chain would duplicate
the same task, actor, lane, scope, digest, and recovery decisions already owned
by the work-admission ticket authority. Protected-state checks are coverage
adapters in `TASK-GIT-0019`, not a third policy owner.

## Intent

Provide fail-closed detection when a process bypasses the controlled launcher
and directly modifies protected ATM governance state. This is an integrity
boundary, not a claim of retroactive OS-level prevention.

## First-Principles and Deep-Module Design

`ProtectedStateIntegrityChain.verify(checkpoint)` is the sole authority for
deriving and checking protected-state lineage. It hides canonicalization,
transition ordering, execution-receipt linkage, digest comparison, and recovery
classification. Its adapters are claim/commit admission and close/push gates.

## Acceptance

- [ ] A direct ledger, event, or evidence edit is detected before a later claim, governed commit, close, or push can succeed.
- [ ] A normal ATM lifecycle sequence remains valid without per-caller digest logic.
- [ ] A missing/forged execution receipt or planning-only status divergence fails with a canonical ErrorCode and recovery route.
- [ ] Tests distinguish a detected bypass from an unrelated dirty source file and preserve legitimate recovery flows.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T16:28:08.193Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0020-protected-governance-state-integrity-chain-and-bypass-detection.task.md","contentDigest":"sha256:9e1eb54a55ea1d77c067c781ab16eae12314d1603877f168b1d4f4eb140ccadd"} -->
