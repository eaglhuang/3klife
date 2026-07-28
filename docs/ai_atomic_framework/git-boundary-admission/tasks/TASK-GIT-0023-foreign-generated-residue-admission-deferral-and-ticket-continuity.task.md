---
task_id: TASK-GIT-0023
title: Foreign generated residue admission deferral and ticket continuity
status: done
owner: unassigned
priority: P1
milestone: G15
depends_on:
  - TASK-GIT-0017
  - TASK-GIT-0018
  - TASK-GIT-0019
causalGraph:
  causalDependencies:
    - taskId: TASK-GIT-0017
      reason: "Consumes BuildOutputInventory before considering any deferred foreign generated residue; it never recreates runner-output membership."
    - taskId: TASK-GIT-0018
      reason: "Extends the claim-issued ticket with auditable deferred-residue evidence without widening ticket write authority."
    - taskId: TASK-GIT-0019
      reason: "Projects one disposition result through admission, ticket renewal, write-readiness, and close coverage gates."
  startConditions:
    - "A reproduced foreign generated artifact is outside the candidate task delivery scope and remains preserved without staging, restore, deletion, or ownership transfer."
    - "No active runner-sync steward owns a BuildOutputInventory member selected by the fixture."
  softRelations:
    - taskId: TASK-GIT-0022
      reason: "GIT-0022 is the dogfood case: its close ticket is blocked by the independently owned skill-corpus audit artifact. It is not a formal completion dependency because this card unblocks it."
  changedPublicSeams:
    - "ForeignGeneratedResidueDisposition"
    - "work-admission ticket deferredResidue evidence"
    - "claim / renewal / close readiness shared admission result"
  causalImpactEdges:
    - "observed foreign path -> BuildOutputInventory membership query -> provenance verification -> deferred-or-blocked disposition -> ticket evidence -> renew/close gate"
  parallelFrontierInputs:
    - "TASK-GIT-0022 historical delivery and preserved skill-corpus audit artifact"
  validatorReferences:
    - "tests/cli/foreign-generated-residue-ticket-continuity.test.ts"
    - "packages/cli/src/commands/next/__tests__/claim-admission.spec.ts"
    - "packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts"
  phaseOwner: "GIT-0023"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/foreign-generated-residue-disposition.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/broker/runner-build-output-inventory.ts"
  - "packages/core/src/broker/work-admission-ticket.ts"
  - "packages/cli/src/commands/next/foreign-dirty-wip-admission.ts"
  - "packages/cli/src/commands/next/route-resolution/pending-worktree.ts"
  - "packages/cli/src/commands/tasks/claim-work-admission.ts"
  - "packages/cli/src/commands/tasks/claim-orchestrator.ts"
  - "packages/cli/src/commands/git-governance/work-admission-check.ts"
  - "packages/cli/src/commands/taskflow/write-readiness.ts"
  - "packages/cli/src/commands/hook/pre-commit/failure-envelope.ts"
  - "packages/cli/src/commands/hook/pre-commit/implementation.ts"
  - "packages/cli/src/commands/next/__tests__/claim-admission.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts"
  - "tests/cli/foreign-generated-residue-ticket-continuity.test.ts"
  - "packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts"
deliverables:
  - "One ForeignGeneratedResidueDisposition deep module that first queries BuildOutputInventory and then classifies a non-member only from verifiable producer/provenance facts, ownership, and base/observed digests."
  - "A deferred disposition records path, producer identity, owner/task attribution when available, base digest, observed digest, and reason in the work-admission ticket evidence; it grants no write, stage, commit, restore, delete, or close-bundle authority over that path."
  - "Claim admission, ticket renewal, governed write-readiness, and taskflow close consume the same disposition result. Unknown, semantic, stale, or unverifiable foreign WIP remains a hard block through the existing admission error route."
  - "Pre-commit consumes the same disposition result before it emits generated-residue findings, so hook and ticket cannot disagree about a verified deferred foreign artifact."
  - "BuildOutputInventory remains the only authority for runner-output membership and terminal publication disposition. Any inventory member is rejected from the deferred branch and follows GIT-0017/GIT-0022 publication recovery."
  - "The TASK-GIT-0022 dogfood artifact may be deferred with its canonical skill producer proof, allowing a fresh task ticket and close readiness while preserving that artifact for its SKL owner."
validators:
  - "node --strip-types tests/cli/foreign-generated-residue-ticket-continuity.test.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/claim-admission.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
errorCodes: []
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the shared disposition adapter and ticket projection together. Preserve deferred-residue evidence as historical attribution; do not delete or absorb the foreign artifact."
atomizationImpact:
  ownerAtomOrMap: "atm.work-admission-ticket"
  mapUpdates:
    - "Map ForeignGeneratedResidueDisposition as an admission adapter beneath WorkAdmissionTicketAuthority; BuildOutputInventory remains a consumed runner-membership provider."
  extractionCandidates:
    - path: "packages/core/src/broker/foreign-generated-residue-disposition.ts"
      reason: "Without this module, claim, renewal, and close would duplicate foreign-generated provenance rules and inevitably disagree."
outOfScope:
  - "Changing, regenerating, staging, restoring, deleting, or committing the foreign artifact used by the dogfood fixture."
  - "Changing SKL corpus generation, its canonical templates, or its task ownership."
  - "Reopening TASK-GIT-0017, TASK-GIT-0018, or TASK-GIT-0019."
  - "A second generated-artifact registry, path allowlist, or task-specific exception."
nonGoals:
  - "No automatic cleanup or adoption of foreign residue."
  - "No relaxation for unknown source, semantic WIP, or any BuildOutputInventory member."
createdByCommand: atm plan card create
completed_at: "2026-07-28T22:28:03.951Z"
completed_by_agent: "codex-git-0023-captain"
closedAt: "2026-07-28T22:28:03.951Z"
closedByActor: "codex-git-0023-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-28T22-28-03-951Z-close-efefdda86bbe"
lastTransitionAt: "2026-07-28T22:28:03.951Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "bf99dd0ffd52f9fe2548526600045041fcf2b679"
---

# TASK-GIT-0023 Foreign generated residue admission deferral and ticket continuity

## Intent

Prevent independently owned, verifiably generated residue from deadlocking a
valid task's ticket renewal or close while preserving fail-closed admission for
unknown or semantic WIP. The initial dogfood case is TASK-GIT-0022 versus the
skill-corpus audit artifact, which belongs to the SKL producer rather than the
runner-publication transaction.

## First-Principles and Deep-Module Design

The protected resource is not a clean-looking worktree. It is the authority to
advance a task's own mutation into accepted delivery. A foreign path must never
gain write authority merely because it is known to be generated; conversely, a
task should not lose its own ticket solely because a separately provable producer
left a non-delivery artifact in the shared worktree.

`ForeignGeneratedResidueDisposition` is the one deep module:

- **interface:** `classify(observedPath, task, ticket, inventory, provenance) -> blocked | deferred`;
- **hidden complexity:** runner-inventory exclusion, producer/provenance proof,
  owner liveness, digest binding, semantic-risk rejection, and evidence shape;
- **adapters:** claim/renew admission and write-readiness/close coverage.

Deletion test: removing this module would make claim, ticket renewal, and close
each invent its own definition of harmless foreign generated residue. Extending
BuildOutputInventory instead would make the runner-output module own all
generated artifacts and recreate the broad registry it was designed to avoid.

## Acceptance

- [ ] The GIT-0022 fixture with `artifacts/generated/skill-corpus-audit.json`
  receives a deferred result only after canonical producer/provenance and digest
  verification; GIT-0022's task ticket contains the attribution but no write
  grant for the artifact.
- [ ] The same ticket can renew and reach close readiness without changing,
  staging, committing, restoring, deleting, or adding that artifact to the
  GIT-0022 close bundle.
- [ ] A dirty unknown source file, semantic artifact, missing producer proof,
  digest mismatch, or stale/unverifiable owner remains blocked by the existing
  fail-closed admission path.
- [ ] A path returned by BuildOutputInventory is never deferred, including a
  stale or foreign runner output; it remains subject to the GIT-0017
  publication/recovery disposition.
- [ ] Claim admission, renewal, write-readiness, and close observe identical
  deferred/block outcomes from one content-addressed evidence record.
- [ ] Pre-commit produces the same deferred/block outcome as claim and ticket
  for the identical artifact fixture; it never defers a staged foreign artifact.
- [ ] Focused tests, typecheck, and `validate:cli` pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T21:52:57.443Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0023-foreign-generated-residue-admission-deferral-and-ticket-continuity.task.md","contentDigest":"sha256:b68c50577cd0f7008ffd4502ac15f4cc7c9ab7df7c8e7d15777dbb3e77ee23b8"} -->
