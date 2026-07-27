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
    - current coalesced runner-sync closeout window has reached a terminal published or reconciled state
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
  - packages/core/src/broker/runner-version-registry.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - tests/cli/runner-sync-sealed-input-continuity.test.ts
  - tests/cli/runner-sync-build-lease-heartbeat.test.ts
  - tests/cli/runner-sync-steward-crash-resume.test.ts
  - tests/cli/runner-version-selection.test.ts
  - tests/cli/sealed-runner-publication-lifecycle.test.ts
deliverables:
  - packages/core/src/broker/runner-sync-session.ts
  - packages/core/src/broker/runner-version-registry.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/runner-publication-lifecycle.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - tests/cli/runner-sync-sealed-input-continuity.test.ts
  - tests/cli/runner-sync-build-lease-heartbeat.test.ts
  - tests/cli/runner-sync-steward-crash-resume.test.ts
  - tests/cli/runner-version-selection.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-sealed-input-continuity.test.ts
  - node --strip-types tests/cli/runner-sync-build-lease-heartbeat.test.ts
  - node --strip-types tests/cli/runner-sync-steward-crash-resume.test.ts
  - node --strip-types tests/cli/runner-version-selection.test.ts
  - node --strip-types tests/cli/sealed-runner-publication-lifecycle.test.ts
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

## Acceptance

- [ ] The session records immutable `sealedSourceSha`, an aggregate `runnerInputTreeHash`, and a content-addressed `runnerInputGraph`. The graph maps schema-declared input segments to package/release-entry outputs and their input/output digests; the aggregate is a consistency summary, not the only rebuild key.
- [ ] Publication compares the seal with current HEAD by a schema-owned runner-affecting path classifier. A commit that changes only non-runner paths, including planning or backlog documentation, may advance HEAD without invalidating an otherwise matching sealed build.
- [ ] A runner-affecting commit after the seal is classified against the input graph. Only the affected graph closure is rebuilt; unaffected package and release-entry outputs are reused only when their recorded input digests still match. The final aggregate manifest is regenerated and fenced to one coherent runner version.
- [ ] An input change with no valid graph owner fails closed with `ATM_RUNNER_SYNC_SEAL_REVALIDATION_REQUIRED` and returns one executable graph-refresh/rebuild path. It must never publish a runner assembled from mixed or unproven input generations.
- [ ] The queue lifecycle is durable and fenced: `queued -> building -> built-provisional -> publication-ready -> published` with explicit terminal `reconciled` and `abandoned` paths. Queue expiry cannot silently erase a live build.
- [ ] The build child renews the steward lease through a bounded heartbeat while it is alive. Expiry decisions use the recorded fencing generation and liveness observation, not a fixed wall-clock TTL alone.
- [ ] A successful build atomically persists a provisional receipt before release/publication. The receipt includes session/fence, coalesced member attribution, `sealedSourceSha`, `runnerInputTreeHash`, output digests, observed current HEAD, classified head delta, timing, and heartbeat evidence.
- [ ] One version manifest owns the complete runner lineage: a mutable development candidate, an immutable sealed-and-verified runner, local frozen surfaces, and the externally published release. Each transition records parent version, input/output graph digests, compatibility identity, and publication state; no surface may invent an independent version label.
- [ ] A partial graph rebuild creates a new coherent sealed runner version that references reused output nodes by digest. It never presents a development candidate, provisional receipt, local frozen artifact, or external release as the same lifecycle state.
- [ ] Task admission asks the runner session registry for the highest trusted version compatible with the task's declared capability, validator-contract/schema range, required surfaces, and sealed-input constraints. `latest` is a preference, not a correctness requirement.
- [ ] When the registry selects a non-latest runner, its selection receipt names the selected version, parent/current versions, compatibility proof, excluded newer input segments, and expiry/revalidation boundary. An unproven older runner fails closed rather than being silently reused.
- [ ] Admission persists an immutable `runnerSelectionReceipt` in the task execution evidence before the task invokes a runner. It binds the task requirement digest, selection-policy version, sealed registry snapshot digest, candidate set digest, selected runner version/digests, rejected candidates with reasons, and revalidation boundary.
- [ ] Close persists a `runnerExecutionAttestation` that binds the exact selected runner receipt to command-backed validator results, frozen entrypoint/output digests, task change digest, and any runner transition. A task cannot claim runner-backed completion when either record is missing or inconsistent.
- [ ] Crash or child interruption after build start is recoverable through `reconcileRunnerSyncSession`. Resume is allowed only when the provisional receipt and sealed input proof are intact; otherwise the returned recovery is reseal/rebuild. No raw runtime-lock deletion or manually fabricated receipt is permitted.
- [ ] Taskflow close and internal release use the same session result. They do not require a worker to predict that all unrelated captains will refrain from committing while a shared build runs.
- [ ] Regression proves a docs-only commit during a coalesced build can publish the matching sealed runner without rebuild or false stale verdict.
- [ ] Regression proves a runner-input commit during a coalesced build rebuilds only the declared affected graph closure, preserves valid unaffected outputs, regenerates the aggregate manifest, and rejects publication of the old or mixed input generation.
- [ ] Regression proves a deterministic long build exceeds the former 30-minute lease interval without losing its queue ownership or coalesced member attribution. Use an injected clock, not sleeps.
- [ ] Regression proves process interruption after build success but before final release resumes from the provisional receipt exactly once; duplicate publication remains impossible.
- [ ] Regression proves one version lineage can distinguish a development candidate, a sealed local runner, and an externally published release while preserving their parent/digest provenance across a partial rebuild.
- [ ] Regression proves two concurrent task cards can receive different compatible trusted runner versions from the registry, with attributable selection receipts, while a card whose required capability is absent fails closed.
- [ ] Interface tests replace duplicated private queue/admission/publication policy tests where the new session owns the decision. Existing public CLI contracts remain compatible.

## Execution boundary

This card follows ATM-GOV-0265 and begins only after the presently active
coalesced closeout window reaches a terminal published or reconciled state. It
does not retroactively invalidate a build whose sealed input proof is already
correct. Before the next multi-captain runner-sync window, it is the required
resilience gate: normal parallel commits must be classified by runner-input
impact rather than prohibited by a whole-HEAD equality rule.

`ATM-GOV-0267` independently qualifies selection correctness after this card is
available. It may consume receipts and shadow-recommend versions, but it must
not alter the selection policy merely because an individual task passed.
