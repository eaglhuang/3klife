---
task_id: ATM-GOV-0268
title: Runner selection producer contract and snapshot provider
status: done
owner: atm-runner-sync
priority: P1
milestone: ATM-3.1-R0Q.5
severity: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - ATM-GOV-0266 Phase A version/selection contract is closed and its published types are readable
  softRelations:
    - ATM-GOV-0266
    - ATM-GOV-0267
  changedPublicSeams:
    - runner version selection receipt shape
    - runner registry snapshot serialization
    - runner execution attestation record
    - shadow feedback sink boundary
  causalImpactEdges:
    - sealed-registry-snapshot-to-independent-replay
    - selection-receipt-policy-version-to-verdict-stability
    - execution-attestation-to-runner-backed-completion-claim
  parallelFrontierInputs: []
  validatorReferences:
    - test_int_runner_registry_snapshot_roundtrip
    - test_int_runner_execution_attestation_contract
    - test_int_runner_selection_ordering_and_boundary
    - test_int_runner_shadow_feedback_sink_boundary
  phaseOwner: runner-selection-producer-contract
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Continues the ATM-GOV runner-sync version/selection family opened by ATM-GOV-0266 and consumed by ATM-GOV-0267. It is a producer-side contract completion, not a new concern, so it reuses the nearest existing series rather than opening a prefix."
scopePaths:
  - packages/core/src/broker/runner-version-contract.ts
  - packages/core/src/broker/runner-version-registry.ts
  - packages/core/src/broker/runner-registry-snapshot.ts
  - packages/core/src/broker/runner-execution-attestation.ts
  - packages/core/src/broker/runner-shadow-feedback-sink.ts
  - packages/cli/src/commands/taskflow/runner-selection-evidence.ts
  - schemas/validators/runner-version-selection-receipt.schema.json
  - schemas/validators/runner-registry-snapshot.schema.json
  - schemas/validators/runner-execution-attestation.schema.json
  - tests/cli/runner-version-selection.test.ts
  - tests/core/runner-registry-snapshot.test.ts
  - tests/core/runner-execution-attestation.test.ts
  - tests/core/runner-shadow-feedback-sink.test.ts
deliverables:
  - packages/core/src/broker/runner-registry-snapshot.ts
  - packages/core/src/broker/runner-execution-attestation.ts
  - packages/core/src/broker/runner-shadow-feedback-sink.ts
  - schemas/validators/runner-registry-snapshot.schema.json
  - schemas/validators/runner-execution-attestation.schema.json
  - tests/core/runner-registry-snapshot.test.ts
  - tests/core/runner-execution-attestation.test.ts
  - tests/core/runner-shadow-feedback-sink.test.ts
validators:
  - node --strip-types tests/core/runner-registry-snapshot.test.ts
  - node --strip-types tests/core/runner-execution-attestation.test.ts
  - node --strip-types tests/core/runner-shadow-feedback-sink.test.ts
  - node --strip-types tests/cli/runner-version-selection.test.ts
  - npm run typecheck
testContributions: []
requiredTestCaseIds:
  - test_int_runner_registry_snapshot_roundtrip
  - test_int_runner_execution_attestation_contract
  - test_int_runner_selection_ordering_and_boundary
  - test_int_runner_shadow_feedback_sink_boundary
phaseTestCaseIds: []
advisoryTestCaseIds:
  - test_cmd_typecheck
errorCodes: []
evidence:
  required: runner-selection-producer-contract-report
rollback:
  strategy: revert the additive contract fields and the three new provider modules; the ATM-GOV-0266 selection behaviour must remain byte-identical when the new fields are absent
  notes: "Every field introduced here is additive and optional-by-absence. If rollback is needed, no already-published receipt may become invalid, because absence must keep meaning exactly what it meant before this card."
atomizationImpact:
  ownerAtomOrMap: atm.runner-version-selection
  mapUpdates:
    - map: atm.runner-sync.version-selection
      change: add producer-side snapshot, attestation, and shadow-sink boundary atoms alongside the existing contract/registry atoms
  extractionCandidates:
    - atom: atm.runner-registry-snapshot
      pattern: Immutable Serializable Snapshot
      source: packages/core/src/broker/runner-registry-snapshot.ts
      disposition: extract
    - atom: atm.runner-execution-attestation
      pattern: Sealed Evidence Record
      source: packages/core/src/broker/runner-execution-attestation.ts
      disposition: extract
    - atom: atm.runner-shadow-feedback-sink
      pattern: Side-effect-free Observation Sink
      source: packages/core/src/broker/runner-shadow-feedback-sink.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-29T19:18:27.455Z"
completed_by_agent: "codex-git-series-captain"
closedAt: "2026-07-29T19:18:27.455Z"
closedByActor: "codex-git-series-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-29T19-18-27-455Z-close-e63d51a3a0d2"
lastTransitionAt: "2026-07-29T19:18:27.455Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "598bb8118ce2f8622b886dcbf243c409a45e6380"
---

# ATM-GOV-0268 Runner selection producer contract and snapshot provider

## Intent

ATM-GOV-0266 sealed the Phase A version/selection contract, but the sealed
surface is narrower than what an independent qualifier can consume. Today a
verifier cannot recompute a selection, because:

- there is no serializable, content-addressed registry snapshot — the registry
  exists only as an in-process index built from a caller-supplied array;
- the selection receipt records no `policyVersion`, so two different policies
  produce indistinguishable receipts;
- there is no ordering concept at all, so "the highest trusted compatible
  version" described in the plan cannot be recomputed or falsified;
- seal continuity is a bare boolean with no boundary generation, so an expired
  revalidation boundary is unrepresentable;
- `runnerExecutionAttestation` exists only as prose in the ATM-GOV-0266 card and
  has no type, schema, or producer;
- there is no place to record shadow observations that is provably incapable of
  changing what runner a task is granted.

This card completes the producer side of that contract so that ATM-GOV-0267 can
be a pure consumer. It does not verify anything and does not decide policy
quality; it only makes the existing decision observable, serializable, and
independently replayable.

## Contract change discipline

This card touches files delivered and closed by ATM-GOV-0266. That is deliberate
and owner-visible, not smuggled: ATM-GOV-0266 is closed, so no concurrent owner
exists, and ATM-GOV-0267 is explicitly forbidden by the plan (Order 2B) from
editing the registry or the lifecycle evidence adapter. The rules for touching
them here are:

- **Additive only.** No existing field is removed, renamed, or retyped. Every new
  receipt field is optional-by-absence, and absence must reproduce the exact
  pre-existing selection outcome.
- **Versioned.** The selection receipt `specVersion` moves from `0.1.0` to
  `0.2.0`. A `0.1.0` receipt stays valid and replayable forever.
- **Behaviour-frozen.** `tests/cli/runner-version-selection.test.ts` (the
  ATM-GOV-0266 behaviour test) must pass unchanged in intent; new cases may be
  appended, existing expectations may not be relaxed.
- If any requirement here can only be met by a **breaking** change to an
  ATM-GOV-0266 public seam, stop and escalate to the owner. Do not soften the
  requirement and do not proceed under a widened interpretation.

## Acceptance

- [ ] `RunnerRegistrySnapshot` is an immutable, serializable, order-stable value:
      a sorted published-version list plus a `snapshotDigest` over canonical JSON.
      `createRunnerVersionRegistry(snapshot.versions)` reproduces the identical
      index, and `snapshot -> JSON -> snapshot` round-trips to the same digest.
- [ ] A `RunnerRegistrySnapshotSource` provider produces a snapshot from the
      durable published set. Reading is the provider's job; every consumer of a
      snapshot receives a plain value and performs no IO of its own.
- [ ] `RunnerVersionSelectionReceipt` gains `policyVersion` and the embedded
      `registrySnapshotDigest` it was decided against. `specVersion` becomes
      `0.2.0`; a receipt without these fields is still accepted and is reported
      as `pending-contract` by downstream consumers rather than as invalid.
- [ ] Selection ordering is explicit and total: a documented, pure comparator
      resolves multiple trusted compatible candidates to exactly one selected
      version, and the receipt records both the selected version and the ordered
      candidate list with a per-candidate rejection reason. "Highest trusted
      compatible version" becomes a recomputable claim rather than prose.
- [ ] `SealContinuityResult` gains an explicit revalidation boundary: the
      boundary generation the seal was valid within, so that "expired
      revalidation boundary" is a representable, testable state instead of an
      inference from a boolean.
- [ ] `RunnerExecutionAttestation` exists as a type, a schema, and a producer. It
      binds the selected runner receipt digest to command-backed validator
      results, frozen entrypoint/output digests, the task change digest, and any
      runner transition observed during execution. It is a pure record builder;
      it does not itself gate close.
- [ ] `ShadowFeedbackSink` is an interface plus an in-memory default that is
      structurally incapable of influencing admission: it exposes only append and
      read, it receives no registry or lifecycle handle, and a test proves that
      running a full selection with a recording sink attached yields a
      byte-identical receipt to running it with no sink.
- [ ] No new `ATM_*` error code is introduced by this card. Producer-side
      failures reuse the existing `RUNNER_SYNC_ERROR_CODES`; enforcement paths
      that would need a new code belong to the later integration card, and any
      such code must go through the shared error-code skill with the canonical
      registry and generated docs in that card's scope.
- [ ] Every ATM-GOV-0266 validator listed in this card's `validators` still
      passes, and the `0.1.0` receipt fixtures still select identically.

## Execution boundary

In scope: data shapes, comparators, snapshot/attestation/sink providers, and the
thin taskflow adapter that already exists. Out of scope: wiring selection into
task admission or close enforcement (Order 3), any verifier or qualification
logic (ATM-GOV-0267), and policy promotion (Order 4). This card must not make a
task fail that would have passed before it.

## Stop rule

Stop and report instead of proceeding when any of the following is true:

- a requirement needs a breaking change to an ATM-GOV-0266 public seam;
- a change would alter which runner an existing task is granted;
- an `ATM_*` error code appears to be required;
- the work starts touching admission, close-readiness, or the runner-sync
  steward queue.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T11:08:47.054Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0268-runner-selection-producer-contract-and-snapshot-provider.task.md","contentDigest":"sha256:59a9da9c85fbb19fd20e1eed408d5863db32673e723c5eee9cc8201a7014f7be"} -->
