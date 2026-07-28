---
doc_id: doc_TASK-GIT-0017
task_id: TASK-GIT-0017
title: "Runner publication inventory and framework-temp claim/commit-surface parity"
status: planned
owner: atm-core
priority: P0
milestone: G9
depends_on:
  - TASK-GIT-0016
related_plan: docs/ai_atomic_framework/git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/runner-build-output-inventory.ts"
  - "packages/core/src/broker/runner-sync-steward-queue.ts"
  - "packages/cli/src/commands/broker/steward-queues.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-queue-ownership.ts"
  - "packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts"
  - "packages/cli/src/commands/framework-mode.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "scripts/run-sealed-runner-build.ts"
  - "scripts/build-package-dist.ts"
  - "scripts/AtmCore/runner-build-scope.json"
  - "tests/cli/runner-publication-inventory-parity.test.ts"
  - "tests/cli/framework-temp-claim-lifecycle-parity.test.ts"
  - "tests/cli/runner-sync-publication-residue.test.ts"
validators:
  - "node --strip-types tests/cli/runner-publication-inventory-parity.test.ts"
  - "node --strip-types tests/cli/framework-temp-claim-lifecycle-parity.test.ts"
  - "node --strip-types tests/cli/runner-sync-publication-residue.test.ts"
  - "npm run validate:cli"
  - "npm run typecheck"
deliverables:
  - "A single BuildOutputInventory deep module that derives the complete publication set for a sealed runner build, including top-level packages/cli/dist outputs, release manifests, root-drop/onefile outputs, and the steward receipt."
  - "Runner-sync enqueue surfaces, framework-temp claim files, publication commit candidates, receipt ownership, and doctor freshness all consume the same inventory rather than re-deriving output lists."
  - "A framework-temp re-claim updates one lifecycle record with linkedTaskId, lane, status, heartbeat, TTL, and claimed paths; it must not mint an unrelated lane-suffixed work item."
  - "A completed steward receipt is claimed and published with its output inventory, never left as untracked residue."
  - "Doctor and runner-sync status fail closed when a sealed build has declared outputs that remain uncommitted or lack a governed retained/recovery disposition."
  - "A governed recovery path adopts the seven G8 residue inputs through an ATM transaction; raw staging, raw commit, or silent discard are not valid remedies."
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert inventory, lifecycle, and publication changes together. Do not restore independent output lists that can make doctor report a runner current while publication is incomplete."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-publication-inventory"
  mapUpdates:
    - "Map BuildOutputInventory as the only authority shared by runner-sync enqueue, framework-temp claim, receipt writer, publication commit, and doctor."
  extractionCandidates:
    - path: "packages/core/src/broker/runner-build-output-inventory.ts"
      reason: "Deleting it would force five callers to duplicate artifact discovery and reintroduce publication divergence."
outOfScope:
  - "Reopening TASK-GIT-0016 or ATM-GOV-0266."
  - "Changing which source files the runner build compiles."
  - "The unrelated next-command-facade-final-600 line-count failure."
nonGoals:
  - "Do not use raw Git to stage, commit, restore, or discard generated runner residue."
  - "Do not treat source-mtime freshness alone as proof that publication completed."
---

# TASK-GIT-0017 - Runner publication inventory and framework-temp claim/commit-surface parity

## Problem

During `TASK-GIT-0016` closeout, runner-sync accepted a build that updated top-level
`packages/cli/dist/**`, `release/atm-onefile/release-manifest.json`, and a steward
receipt. The framework-temp publication route committed only onefile and root-drop
outputs, leaving tracked dist files and an untracked receipt behind. Doctor then
reported the runner current because it compared source mtimes, not the publication
set.

The defect is not an isolated path omission. Enqueue, framework-temp claim,
publication commit, receipt writer, and doctor each own a partial output list.

## First-Principles and Deep-Module Design

The protected resource is a **sealed runner publication**, not an individual
release directory. A build either publishes all outputs defined for its sealed input
or remains recoverable-but-incomplete. Every caller asking "what did this build
produce?" must receive the same answer.

`BuildOutputInventory` is the deep module:

- **interface:** `derive({ sealedSourceSha, buildTarget, requestedSurfaces }) -> { outputs, receiptPath, inventoryDigest, publicationState }`;
- **hidden complexity:** build-target expansion, generated top-level dist files,
  release mirrors, manifest/receipt ownership, tracked-vs-untracked classification,
  and recovery disposition;
- **adapter A:** runner-sync enqueue and framework-temp claim/publication path;
- **adapter B:** doctor/status and runner-publication lifecycle verification.

Deletion test: without this module, enqueue, claim, commit, receipt, and doctor
must each rediscover the output set. The G8 incident is the concrete proof that
those independent derivations drifted.

## Required Behavior

1. A sealed runner build emits an inventory digest and explicit output list before publication. All tracked build outputs and the steward receipt are members of that list.
2. Enqueue, framework-temp claim, governed publication commit, and release require exact inventory parity. A subset commit fails with a structured missing-output diagnostic.
3. Re-claim renews or updates the original framework-temp lifecycle record. Every lock shape carries `linkedTaskId`, status, lane, heartbeat, TTL, and receipt ownership.
4. Runner status is `publication-pending` or equivalent, never current, while inventory outputs are dirty/untracked without a governed recovery disposition.
5. Existing G8 residue is admitted only through a task-scoped ATM recovery transaction that verifies the prior sealed SHA and inventory digest before publishing or producing an audited safe-discard receipt.
6. Receipt release is impossible until the receipt is attributable to the same inventory and every member has a governed disposition.

## Acceptance

- A deep-module review receipt passes before source edits, names both adapters, includes the deletion test, rollback, and causal validators.
- A runner-sync build that changes `packages/cli/dist/**`, onefile/root-drop manifests, and a steward receipt yields one complete inventory; its claim and publication commit stage exactly that set.
- A regression reproduces the G8 partial-publication shape and proves it fails closed instead of reporting `syncRequired: false`.
- A regression proves re-claim updates the original framework-temp record, preserving `linkedTaskId`, lifecycle status, lane, heartbeat, TTL, and claimed paths.
- A regression proves the steward receipt cannot remain untracked after successful publication.
- A regression proves missing, extra, stale, foreign-owned, or mismatched-seal outputs block release/publication with an executable ATM recovery command.
- A controlled fixture proves the seven G8 residue inputs can be recovered through one governed transaction without raw Git staging or discard.
- `npm run validate:cli` and `npm run typecheck` pass.

## Recovery Inputs

The initial reproduction/recovery fixture must represent these G8 residue classes:

- top-level tracked `packages/cli/dist/commands/**` outputs;
- tracked `release/atm-onefile/release-manifest.json`;
- untracked framework-temp runner-sync receipt;
- an expired lane-suffixed framework-temp lock that lacks normal lifecycle fields.

## Implementation Notes

Do not patch individual output paths into another allowlist. Make the inventory
the single public interface and let current callers become adapters. Preserve a
human-visible recovery command, but no prompt text or raw Git path may substitute
for its governed transaction.
