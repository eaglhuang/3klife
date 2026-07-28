---
task_id: TASK-GIT-0022
title: "Runner publication disposition enforcement and clean-worktree finalization"
status: planned
owner: unassigned
priority: P0
milestone: G14
depends_on:
  - TASK-GIT-0017
  - TASK-GIT-0019
causalGraph:
  causalDependencies:
    - taskId: TASK-GIT-0017
      reason: "Reuses BuildOutputInventory and publication lifecycle instead of re-deriving generated output sets."
    - taskId: TASK-GIT-0019
      reason: "Reproduces the post-close sealed-build publication gap against a ticketed, adapter-projected delivery."
  startConditions:
    - "No active runner-sync steward group owns the reproduced publication outputs."
    - "The target worktree has a captured sealed receipt and output inventory before any disposition mutation."
  changedPublicSeams:
    - "BuildOutputInventory publication disposition"
    - "doctor runner-current decision"
    - "framework-temp publication transaction"
  causalImpactEdges:
    - "sealed build -> inventory -> disposition -> doctor/claim admission -> governed publish or recovery"
  parallelFrontierInputs: []
  validatorReferences:
    - "tests/cli/runner-publication-disposition-gate.test.ts"
    - "tests/cli/runner-publication-inventory-parity.test.ts"
  phaseOwner: "GIT-0022"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/runner-build-output-inventory.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/doctor/run-doctor.ts"
  - "packages/cli/src/commands/broker/steward-queues.ts"
  - "packages/cli/src/commands/broker/parser.ts"
  - "packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-queue-ownership.ts"
  - "packages/cli/src/commands/internal-release/publication.ts"
  - "docs/governance/error-code-registry.json"
  - "packages/core/src/error-code-registry.generated.ts"
  - "docs/ERROR_CODES.md"
  - "scripts/run-sealed-runner-build.ts"
  - "tests/cli/runner-publication-inventory-parity.test.ts"
  - "tests/cli/runner-publication-residue-classification.test.ts"
  - "tests/cli/runner-publication-disposition-gate.test.ts"
  - "tests/cli/runner-publication-reconciliation.test.ts"
deliverables:
  - "BuildOutputInventory is the single authority for the exact sealed build output set, receipt membership, ownership, and terminal disposition."
  - "doctor reports a blocking publication-pending result whenever the current sealed build has dirty or untracked inventory members without a governed publication or recovery disposition; source mtime alone cannot report current."
  - "One governed publication/recovery transaction can either publish the exact owned inventory or retain an explicit stale/foreign recovery disposition; it never silently restores, adopts, or drops Plan3.1/TMP evidence."
  - "Runner-sync release rejects a receipt whose declared inventory is incomplete, unowned, mismatched to its sealed source, or lacks an attributable terminal disposition."
  - "A receipt-only stale-generation reconciliation is exposed through an ATM runner-sync command. It proves the prior committed receipt matches the named path, refuses any dirty generated member or foreign task ownership, restores only the verified stale receipt through ATM, and records a TASK-GIT-0022 reconciliation receipt."
  - "The current GIT-0019 build residue is either published as exact inventory or preserved under an attributable recovery receipt, leaving both repositories clean except for separately classified active Plan3.1 work."
validators:
  - "node --strip-types tests/cli/runner-publication-inventory-parity.test.ts"
  - "node --strip-types tests/cli/runner-publication-residue-classification.test.ts"
  - "node --strip-types tests/cli/runner-publication-disposition-gate.test.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
errorCodes:
  - code: "ATM_RUNNER_PUBLICATION_PENDING"
    disposition: register
    trigger: "Doctor, runner-sync release, or publication observes a sealed generation with dirty inventory members that have no terminal governed disposition."
    category: runner-publication
    retryable: true
    requiresHumanApproval: false
    recovery: "Use the receipt-bound publication or recovery transaction returned by ATM; do not restore or stage a subset manually."
    sourceOwner: "packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts"
    focusedTest: "tests/cli/runner-publication-disposition-gate.test.ts"
  - code: "ATM_RUNNER_PUBLICATION_INVENTORY_INCOMPLETE"
    disposition: register
    trigger: "A receipt, release, or publication transaction omits, adds, or attributes a member inconsistently with the sealed inventory digest."
    category: runner-publication
    retryable: true
    requiresHumanApproval: false
    recovery: "Regenerate the receipt-bound inventory for the sealed source and retry the exact ATM publication transaction."
    sourceOwner: "packages/core/src/broker/runner-build-output-inventory.ts"
    focusedTest: "tests/cli/runner-publication-inventory-parity.test.ts"
recoveryEvidencePaths:
  - "packages/cli/dist/**"
  - "release/atm-onefile/**"
  - "release/atm-root-drop/**"
  - ".atm/history/evidence/TASK-GIT-0019.runner-sync-receipt.json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert inventory authority, doctor adapter, and publication transaction together; retain recovery receipts for forensic attribution."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-publication-inventory"
  mapUpdates:
    - "BuildOutputInventory remains the only source for output membership and disposition; doctor, runner-sync release, and publication transaction are adapters."
  extractionCandidates:
    - path: "packages/core/src/broker/runner-build-output-inventory.ts"
      reason: "Deleting it would again force build, doctor, claim admission, and release to rediscover different output sets."
    - path: "packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts"
      reason: "Keep lifecycle transition logic behind a single small state-machine interface rather than scattering publication phases across callers."
outOfScope:
  - "Discarding, staging, or committing Plan3.1/TMP evidence not attributable to the selected sealed inventory."
  - "Changing source files compiled by the runner build."
  - "Reopening GIT-0017 or GIT-0019."
nonGoals:
  - "No raw Git restore, reset, or pathspec cleanup for generated runner outputs."
  - "No blanket worktree cleanup that treats foreign evidence as runner output."
  - "No second output registry or doctor-specific output allowlist."
createdByCommand: atm plan card create
---

# TASK-GIT-0022 - Runner Publication Disposition Enforcement and Clean-Worktree Finalization

## Problem

`TASK-GIT-0017` introduced `BuildOutputInventory`, yet the sealed GIT-0019
build left tracked `packages/cli/dist/**`, release mirrors, and its receipt
dirty while `doctor` still returned OK. The failure is not that a build created
files: it is that publication membership, terminal disposition, and doctor
freshness are still evaluated through different paths.

## First-Principles and Deep-Module Design

The protected resource is a **sealed runner publication generation**. A
generation is either fully published, retained under a named recovery
disposition, or publication-pending. It cannot be "current" merely because a
timestamp looks recent.

`BuildOutputInventory` remains the one deep module. Its interface must answer:

`derive(sealed source, receipt, observed outputs, ownership) -> exact members + disposition + digest`

Its hidden complexity includes build-target expansion, receipt inclusion,
ownership/liveness, stale recovery input, terminal publication state, and the
distinction between selected inventory and unrelated task evidence. Doctor,
runner-sync release, and publication commit are thin adapters over that answer.

Deletion test: removing the inventory would force doctor, release, and cleanup
to independently decide which outputs a build owns. The observed GIT-0019
residue is the proof that those decisions must not diverge.

## Acceptance

- [ ] A fixture reproduces the current shape: a sealed runner receipt, dirty
  dist/release members, and unrelated TMP/Plan3.1 evidence. It proves only the
  inventory members become publication-pending.
- [ ] Doctor fails closed with `ATM_RUNNER_PUBLICATION_PENDING` for incomplete
  current-generation inventory, and returns current only after exact
  publication or recorded recovery disposition.
- [ ] Publication and release consume the same inventory digest; missing,
  extra, foreign, stale-seal, or unattributed receipt members fail with a
  structured remediation.
- [ ] The GIT-0019 receipt-only residue is reconciled through the ATM
  runner-sync route, not a raw Git command; the route refuses to touch any
  dirty dist/release member or a receipt whose committed predecessor does not
  match the requested task-owned evidence path.
- [ ] A governed recovery transaction handles the GIT-0019 generation without
  raw Git and leaves unrelated Plan3.1/TMP evidence untouched.
- [ ] The final target worktree is clean except only independently active,
  explicitly preserved Plan3.1 work; planning worktree is clean.
- [ ] Focused tests, typecheck, and `validate:cli` pass.
- [ ] Canonical error-code registry, generated TypeScript registry, and generated
  error-code documentation describe both G14 publication gates; no caller keeps
  private recovery prose for either error.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T20:33:18.953Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0022-runner-publication-disposition-enforcement-and-clean-worktree-finalization.task.md","contentDigest":"sha256:3eeeb99dddd4486cd51068f5ff2f4e97e48fd5360cb41e14f293fddca7fcf6ea"} -->
