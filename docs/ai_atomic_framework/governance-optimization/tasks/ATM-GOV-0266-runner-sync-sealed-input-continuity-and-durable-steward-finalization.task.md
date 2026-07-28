---
task_id: ATM-GOV-0266
title: Runner-sync sealed-input continuity and durable steward finalization
status: planned
owner: atm-runner-sync
priority: P0
milestone: ATM-3.1-R0Q.4
severity: P0
depends_on:
  - ATM-GOV-0265
causalGraph:
  causalDependencies:
    - ATM-GOV-0265
  startConditions:
    - current coalesced runner-sync receipt gap is preserved as read-only recovery evidence
    - a single governed recovery owner holds the runner-sync implementation scope
  softRelations:
    - ATM-BUG-2026-07-27-241
    - ATM-BUG-2026-07-27-243
  changedPublicSeams:
    - runner-sync sealed input identity
    - coalesced steward lease lifecycle
    - sealed runner publication receipt
  causalImpactEdges:
    - non-runner-head-advance-to-reusable-sealed-publication
    - runner-input-head-advance-to-reseal-and-rebuild
    - long-build-to-durable-steward-finalization
  parallelFrontierInputs:
    - TASK-SKL-0029
    - ATM-GOV-0240
    - ATM-GOV-0248
  validatorReferences:
    - test_int_runner_sync_sealed_input_continuity
    - test_int_runner_sync_build_lease_heartbeat
    - test_int_runner_sync_crash_resume
  phaseOwner: runner-sync-resilience
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "This is the post-dogfood resilience correction for shared runner-sync. It generalizes sealed-build continuity for normal parallel commits instead of adding incident-specific TTL, task-id, actor, or path exceptions."
scopePaths:
  - packages/core/src/broker/runner-sync-session.ts
  - packages/core/src/broker/runner-version-contract.ts
  - packages/core/src/broker/runner-version-registry.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/record-only-block-lifecycle-bridge.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - packages/cli/dist/commands/git-governance/implementation.js
  - packages/cli/dist/commands/hook/pre-commit/implementation.js
  - packages/cli/dist/commands/taskflow/auto-evidence-mapper.js
  - packages/cli/dist/commands/broker/steward-queues.js
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - schemas/validators/runner-version-selection-receipt.schema.json
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/core/src/error-code-registry.generated.ts
  - tests/cli/git-record-commit.test.ts
  - tests/cli/pre-commit-hook-extraction.test.ts
  - tests/cli/taskflow-stale-runner-lane.test.ts
  - tests/cli/runner-sync-sealed-input-continuity.test.ts
  - tests/cli/runner-sync-build-lease-heartbeat.test.ts
  - tests/cli/runner-sync-steward-crash-resume.test.ts
  - tests/cli/runner-version-selection.test.ts
  - tests/cli/sealed-runner-publication-lifecycle.test.ts
deliverables:
  - packages/core/src/broker/runner-sync-session.ts
  - packages/core/src/broker/runner-version-contract.ts
  - packages/core/src/broker/runner-version-registry.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/record-only-block-lifecycle-bridge.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - schemas/validators/runner-version-selection-receipt.schema.json
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/core/src/error-code-registry.generated.ts
  - tests/cli/runner-sync-sealed-input-continuity.test.ts
  - tests/cli/runner-sync-build-lease-heartbeat.test.ts
  - tests/cli/runner-sync-steward-crash-resume.test.ts
  - tests/cli/runner-version-selection.test.ts
  - tests/cli/git-record-commit.test.ts
  - tests/cli/pre-commit-hook-extraction.test.ts
  - tests/cli/taskflow-stale-runner-lane.test.ts
recoveryEvidencePaths:
  - packages/cli/dist/commands/git-governance/implementation.js
  - packages/cli/dist/commands/hook/pre-commit/implementation.js
  - packages/cli/dist/commands/taskflow/auto-evidence-mapper.js
  - packages/cli/dist/commands/broker/steward-queues.js
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/**
validators:
  - node --strip-types tests/cli/runner-sync-sealed-input-continuity.test.ts
  - node --strip-types tests/cli/runner-sync-build-lease-heartbeat.test.ts
  - node --strip-types tests/cli/runner-sync-steward-crash-resume.test.ts
  - node --strip-types tests/cli/runner-version-selection.test.ts
  - node --strip-types tests/cli/sealed-runner-publication-lifecycle.test.ts
  - node --strip-types tests/cli/git-record-commit.test.ts
  - node --strip-types tests/cli/pre-commit-hook-extraction.test.ts
  - node --strip-types tests/cli/taskflow-stale-runner-lane.test.ts
  - npm run generate:error-codes
  - npm run typecheck
  - npm run validate:cli
testContributions: []
requiredTestCaseIds:
  - test_int_runner_sync_sealed_input_continuity
  - test_int_runner_sync_build_lease_heartbeat
  - test_int_runner_sync_crash_resume
  - test_int_runner_version_selection
phaseTestCaseIds:
  - test_int_sealed_runner_publication_lifecycle
advisoryTestCaseIds:
  - test_cmd_typecheck
  - test_cmd_validate_cli
errorCodes:
  - ATM_RUNNER_SYNC_SEAL_REVALIDATION_REQUIRED
  - ATM_RUNNER_SYNC_STEWARD_LEASE_EXPIRED
  - ATM_RUNNER_SYNC_RESUME_REQUIRED
  - ATM_RUNNER_SYNC_COALESCED_ATTRIBUTION_MISSING
evidence:
  required: runner-sync-sealed-input-continuity-and-durable-finalization-receipt
rollback:
  strategy: disable reusable-publication and require a fresh sealed build while retaining durable receipts for reconciliation
  notes: "Do not delete queue locks, provisional receipts, or release artifacts manually. Reconciliation must be driven by the session state machine and fenced receipt generation."
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-session
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-sync-session
      pattern: Durable State Machine
      source: packages/core/src/broker/runner-sync-session.ts
      disposition: extract
    - atom: atm.runner-sync-admission-adapter
      pattern: Adapter
      source: packages/cli/src/commands/framework-development/runner-sync-admission.ts
      disposition: retain-thin
createdByCommand: atm plan card create
---

# ATM-GOV-0266 Runner-sync sealed-input continuity and durable steward finalization

## Intent

Make a coalesced runner-sync build safe under ordinary parallel development.
The public operation is a single runner-sync session: it owns immutable sealed
inputs, a content-addressed input/output graph, lease liveness, build progress,
provisional receipt persistence, and publication/reconciliation. Admission,
queue, build scripts, taskflow close, and internal release become adapters and
must not independently reinterpret HEAD movement, lease expiry, or receipt
validity.

## Deep-module review requirement

Before implementation, create an `atm.deepModuleReviewReport.v1` for
`atm.runner-sync-session`. It must compare at least two interfaces and seal the
chosen public surface, two real adapters, dependency classes, rollback, and
causal validators.

The selected interface must be equivalent in responsibility to:

```text
startRunnerSyncSession(request, snapshot, ports)
renewRunnerSyncSession(session, clock, ports)
recordRunnerSyncBuild(session, buildResult, ports)
finalizeRunnerSyncPublication(session, currentHead, ports)
reconcileRunnerSyncSession(session, observation, ports)
```

Deletion test: deleting this module must force sealed-input comparison, lease
renewal, head-delta classification, receipt ordering, and recovery rules back
into several callers. If that is not true, the proposed module is too shallow.

## Phase A contract handoff

Before any session mutation work, publish a sealed contract handoff containing
the version/selection receipt schema, public requirement and version types, and
deterministic fixture pack. This handoff is a stable read-only input for
ATM-GOV-0267. It permits that card's verifier and counterfactual replay work to
start early; it does not authorize either card to change the other's owner
module.

## Acceptance

- [ ] The session records immutable `sealedSourceSha`, an aggregate `runnerInputTreeHash`, and a content-addressed `runnerInputGraph`. The graph maps schema-declared input segments to package/release-entry outputs and their input/output digests; the aggregate is a consistency summary, not the only rebuild key.
- [ ] Phase A emits the version/selection receipt contract, public requirement/version types, and deterministic fixtures with a sealed contract digest. Later session work is backward-compatible with this handoff or advances it through an explicit versioned migration.
- [ ] Existing dirty dist/release outputs from the head-owner-only recovery are claim-admission inputs only. They must remain preserved and unstaged; they are not 0266 delivery artifacts and cannot be committed, published, or used for a non-head task close until the repaired group manifest and child receipts exist.
- [ ] Publication compares the seal with current HEAD by a schema-owned runner-affecting path classifier. A commit that changes only non-runner paths, including planning or backlog documentation, may advance HEAD without invalidating an otherwise matching sealed build.
- [ ] A runner-affecting commit after the seal is classified against the input graph. Only the affected graph closure is rebuilt; unaffected package and release-entry outputs are reused only when their recorded input digests still match. The final aggregate manifest is regenerated and fenced to one coherent runner version.
- [ ] An input change with no valid graph owner fails closed with `ATM_RUNNER_SYNC_SEAL_REVALIDATION_REQUIRED` and returns one executable graph-refresh/rebuild path. It must never publish a runner assembled from mixed or unproven input generations.
- [ ] The queue lifecycle is durable and fenced: `queued -> building -> built-provisional -> publication-ready -> published` with explicit terminal `reconciled` and `abandoned` paths. Queue expiry cannot silently erase a live build.
- [ ] The build child renews the steward lease through a bounded heartbeat while it is alive. Expiry decisions use the recorded fencing generation and liveness observation, not a fixed wall-clock TTL alone.
- [ ] A successful build atomically persists a provisional receipt before release/publication. The receipt includes session/fence, coalesced member attribution, `sealedSourceSha`, `runnerInputTreeHash`, output digests, observed current HEAD, classified head delta, timing, and heartbeat evidence.
- [ ] A coalesced build writes one immutable group manifest containing every `memberTaskId`, member actor/lane authority, member request digest, and shared sealed input/output digest. It also writes an attributable child receipt for each member; a head-owner task id or queue position alone is never evidence that another task received the build.
- [ ] The durable queue retains an explicit `receipt-published` state after build and before terminal `released` or `reconciled`. It must not erase the steward group while emitting an `autoReleaseCommand`; release/reconcile fails closed when the group manifest or any member child receipt is missing.
- [ ] One version manifest owns the complete runner lineage: a mutable development candidate, an immutable sealed-and-verified runner, local frozen surfaces, and the externally published release. Each transition records parent version, input/output graph digests, compatibility identity, and publication state; no surface may invent an independent version label.
- [ ] A partial graph rebuild creates a new coherent sealed runner version that references reused output nodes by digest. It never presents a development candidate, provisional receipt, local frozen artifact, or external release as the same lifecycle state.
- [ ] Task admission asks the runner session registry for the highest trusted version compatible with the task's declared capability, validator-contract/schema range, required surfaces, and sealed-input constraints. `latest` is a preference, not a correctness requirement.
- [ ] When the registry selects a non-latest runner, its selection receipt names the selected version, parent/current versions, compatibility proof, excluded newer input segments, and expiry/revalidation boundary. An unproven older runner fails closed rather than being silently reused.
- [ ] Admission persists an immutable `runnerSelectionReceipt` in the task execution evidence before the task invokes a runner. It binds the task requirement digest, selection-policy version, sealed registry snapshot digest, candidate set digest, selected runner version/digests, rejected candidates with reasons, and revalidation boundary.
- [ ] Close persists a `runnerExecutionAttestation` that binds the exact selected runner receipt to command-backed validator results, frozen entrypoint/output digests, task change digest, and any runner transition. A task cannot claim runner-backed completion when either record is missing or inconsistent.
- [ ] Crash or child interruption after build start is recoverable through `reconcileRunnerSyncSession`. Resume is allowed only when the provisional receipt and sealed input proof are intact; otherwise the returned recovery is reseal/rebuild. No raw runtime-lock deletion or manually fabricated receipt is permitted.
- [ ] `git record-commit` can persist exactly one already-`blocked`/`released` task's ledger plus its matching `block` event while another framework task has an active claim. The exception is record-only, requires the target task's retained actor/lease attribution, rejects source, evidence, close, release, and non-block lifecycle files, and never admits a mixed-task payload.
- [ ] The active framework claim's source bundle remains isolated while the record-only lifecycle commit is prepared. The command neither stages active-claim source nor defers, snapshots, unstages, or changes foreign worktree content; it returns a fail-closed diagnostic when the target task is not `blocked`/`released` or the pair is incomplete.
- [ ] The pre-commit hook consumes the same block-lifecycle classifier as `git record-commit`. It permits the eligible two-file record-only bundle without bypassing hooks, while preserving `ATM_CROSS_TASK_MUTATION_BLOCKED` for every ineligible, mixed-task, source, or non-block-history payload.
- [ ] The canonical error-code registry and generated projection define `ATM_RUNNER_SYNC_SEAL_REVALIDATION_REQUIRED`, `ATM_RUNNER_SYNC_STEWARD_LEASE_EXPIRED`, `ATM_RUNNER_SYNC_RESUME_REQUIRED`, and `ATM_RUNNER_SYNC_COALESCED_ATTRIBUTION_MISSING`; each exposes an executable recovery path and is covered by registry generation validation.
- [ ] Taskflow close and internal release use the same session result. They do not require a worker to predict that all unrelated captains will refrain from committing while a shared build runs.
- [ ] Close-preflight runner receipt validation uses the durable receipt's `runnerInputTreeHash` and a schema-owned runner-affecting diff from `sealedSourceSha` to current HEAD. A sealed source may be a HEAD ancestor only when the ancestor-to-HEAD delta is non-runner-affecting lifecycle/evidence work and the current runner input hash still matches the receipt.
- [ ] Any delta under runner-affecting inputs (`packages/`, `scripts/`, `templates/`, `schemas/`, `atomic_workbench/`, root package/tsconfig release inputs) keeps failing closed with a rebuild requirement even if the previous receipt was finalizable.
- [ ] Regression proves delivery -> build receipt -> receipt+renew commit -> pre-close ALLOW without a second build, while runner-input drift, missing attribution, and stale child receipt cases still fail closed.
- [ ] Regression proves a docs-only commit during a coalesced build can publish the matching sealed runner without rebuild or false stale verdict.
- [ ] Regression proves a runner-input commit during a coalesced build rebuilds only the declared affected graph closure, preserves valid unaffected outputs, regenerates the aggregate manifest, and rejects publication of the old or mixed input generation.
- [ ] Regression proves a deterministic long build exceeds the former 30-minute lease interval without losing its queue ownership or coalesced member attribution. Use an injected clock, not sleeps.
- [ ] Regression proves process interruption after build success but before final release resumes from the provisional receipt exactly once; duplicate publication remains impossible.
- [ ] Regression reproduces a head-owner-only receipt for a three-member coalesced build. Child receipt lookup, release, and non-head task close must fail closed until the group manifest and all member receipts are present.
- [ ] Regression proves one version lineage can distinguish a development candidate, a sealed local runner, and an externally published release while preserving their parent/digest provenance across a partial rebuild.
- [ ] Regression proves two concurrent task cards can receive different compatible trusted runner versions from the registry, with attributable selection receipts, while a card whose required capability is absent fails closed.
- [ ] Interface tests replace duplicated private queue/admission/publication policy tests where the new session owns the decision. Existing public CLI contracts remain compatible.

## Execution boundary

This card follows ATM-GOV-0265. A current coalesced closeout window with a
missing member receipt or erased pre-release queue is itself a governed recovery
trigger for this card: preserve the evidence, transfer/park the blocked closeout
lanes through normal lifecycle commands, then claim this implementation. It does
not retroactively invalidate a build whose sealed input proof is already correct,
but it must repair the receipt/reconcile path before that build is used to close
non-head member tasks. Before the next multi-captain runner-sync window, it is
the required resilience gate: normal parallel commits must be classified by
runner-input impact rather than prohibited by a whole-HEAD equality rule.

`ATM-GOV-0267` independently qualifies selection correctness after this card is
available. It may consume receipts and shadow-recommend versions, but it must
not alter the selection policy merely because an individual task passed.

## Active-claim lifecycle-record recovery

The recovery fixture exposed a second atomicity boundary: parking several
coalesced cards can leave one ledger/event pair per card while a new framework
claim is active. Those records must not be folded into the new task's delivery,
and releasing the recovery task merely to persist them can make its source WIP
unowned again. This card therefore owns the narrow record-only bridge above.
It is not a general cross-task commit bypass: it applies only to a complete
blocked/released pair and preserves each parked card's own history.
