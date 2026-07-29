---
task_id: ATM-GOV-0267
title: Runner version selection qualification and feedback loop
status: done
owner: atm-runner-sync
priority: P1
milestone: ATM-3.1-R0Q.5
severity: P1
depends_on:
  - ATM-GOV-0268
causalGraph:
  causalDependencies:
    - ATM-GOV-0268
  startConditions:
    - ATM-GOV-0268 producer contract is delivered, so a registry snapshot, a policy-versioned selection receipt, an explicit candidate ordering, a revalidation boundary, and an execution attestation are all readable values
    - ATM-GOV-0266 Phase A version/selection contract handoff digest is sealed and available read-only
  softRelations:
    - ATM-GOV-0266
    - TASK-SKL-0029
  changedPublicSeams:
    - runner selection verification ports
    - runner selection qualification verdict
    - runner selection qualification report
  causalImpactEdges:
    - task-requirement-to-compatible-runner-selection
    - runner-selection-receipt-to-independent-verdict
    - qualified-report-to-policy-promotion-record
  parallelFrontierInputs: []
  validatorReferences:
    - test_int_runner_selection_receipt_verification
    - test_int_runner_selection_counterfactual_replay
    - test_int_runner_selection_verdict_taxonomy
  phaseOwner: runner-selection-qualification
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "Selection telemetry is not proof of selection correctness. This card independently recomputes and qualifies version choices before any feedback can influence the policy. It stays in the ATM-GOV runner-sync family opened by ATM-GOV-0266."
scopePaths:
  - packages/core/src/broker/runner-selection-verification-ports.ts
  - packages/core/src/broker/runner-version-selection-verifier.ts
  - scripts/runner-version-selection-replay.ts
  - schemas/validators/runner-selection-qualification-report.schema.json
  - tests/core/runner-version-selection-verifier.test.ts
  - tests/cli/runner-selection-counterfactual-replay.test.ts
deliverables:
  - packages/core/src/broker/runner-selection-verification-ports.ts
  - packages/core/src/broker/runner-version-selection-verifier.ts
  - scripts/runner-version-selection-replay.ts
  - schemas/validators/runner-selection-qualification-report.schema.json
  - tests/core/runner-version-selection-verifier.test.ts
  - tests/cli/runner-selection-counterfactual-replay.test.ts
validators:
  - node --strip-types tests/core/runner-version-selection-verifier.test.ts
  - node --strip-types tests/cli/runner-selection-counterfactual-replay.test.ts
  - node --strip-types tests/cli/runner-version-selection.test.ts
  - npm run typecheck
testContributions: []
requiredTestCaseIds:
  - test_int_runner_selection_receipt_verification
  - test_int_runner_selection_counterfactual_replay
  - test_int_runner_selection_verdict_taxonomy
phaseTestCaseIds: []
advisoryTestCaseIds:
  - test_cmd_typecheck
errorCodes: []
evidence:
  required: independent-runner-selection-qualification-report
rollback:
  strategy: delete the verifier, ports, replay script, and report schema; nothing in production selection depends on them
  notes: "This card adds no production decision path, so rollback is a pure removal. Feedback may change policy only through a sealed, independently verified promotion record. Never infer policy correctness from a task's exit code alone."
atomizationImpact:
  ownerAtomOrMap: atm.runner-version-selection-qualification
  mapUpdates:
    - map: atm.runner-sync.version-selection
      change: add an independent qualification atom that consumes the producer atoms without owning any production decision
  extractionCandidates:
    - atom: atm.runner-version-selection-verifier
      pattern: Pure Policy Verifier
      source: packages/core/src/broker/runner-version-selection-verifier.ts
      disposition: extract
      rationale: "Deep module: one narrow entry point hides eligibility recomputation, total candidate ordering, rejection attribution, boundary expiry, and attestation cross-checking. It performs no IO, so it is exhaustively testable from plain values."
    - atom: atm.runner-selection-verification-ports
      pattern: Consumer-owned Port Interfaces
      source: packages/core/src/broker/runner-selection-verification-ports.ts
      disposition: extract
      rationale: "Dependency inversion boundary. The verifier declares what it needs to read; ATM-GOV-0268 provides implementations. Prevents fs/git/task-lifecycle leakage into the verifier."
createdByCommand: atm plan card create
completed_at: "2026-07-29T19:36:36.749Z"
completed_by_agent: "codex-git-series-captain"
closedAt: "2026-07-29T19:36:36.749Z"
closedByActor: "codex-git-series-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-29T19-36-36-749Z-close-0412cda3aa12"
lastTransitionAt: "2026-07-29T19:36:36.749Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "36093ba8ad0984aa53462f81d720e1193a2ddd3f"
---

# ATM-GOV-0267 Runner version selection qualification and feedback loop

## Intent

Prove that runner-version selection is correct independently of whether a task
happened to pass. Recompute each selection from a sealed registry snapshot and
exercise a deterministic counterfactual corpus. A successful task is telemetry,
never proof that the selection policy was correct or safe to promote.

This card is a **verifier and a report**, not a second selection engine. The
registry remains the sole production decision owner, and nothing delivered here
is allowed to change which runner any task is granted.

## Module shape

The card delivers exactly two modules plus a thin script:

1. `runner-selection-verification-ports.ts` — the interfaces the verifier reads
   through. The verifier owns these declarations; ATM-GOV-0268 supplies the
   implementations. Minimum set: a registry-snapshot source, a selection-evidence
   source (receipt plus optional attestation), and a clock. No implementation of
   any port lives in this card's scope.
2. `runner-version-selection-verifier.ts` — one pure entry point,
   `verifyRunnerSelection(requirement, registrySnapshot, evidence, options)`,
   returning a verdict value. It touches no filesystem, no git, no task ledger,
   no environment variable, and no wall clock except through the clock port.
3. `scripts/runner-version-selection-replay.ts` — the only place allowed to
   resolve real ports, load a corpus, and print a qualification report. It
   contains no verification logic of its own.

## Verdict taxonomy

The verifier returns exactly one verdict. The taxonomy is data-shaped: the
verdict is a value with a machine-readable reason list, never a thrown error and
never a new `ATM_*` code.

- **`qualified`** — the verifier independently recomputed eligibility, total
  candidate ordering, the selected version, and every rejection reason from the
  snapshot alone, and its recomputation agrees with the receipt. When an
  execution attestation is present it also matches the selected receipt digest,
  the command-backed validator results, and the frozen output digests. Only a
  `qualified` verdict may appear in a promotion record.
- **`unqualified`** — the inputs were complete enough to recompute, and the
  recomputation **disagrees** with the receipt: a different selected version, a
  missing or invented rejection reason, an ordering inversion, a capability the
  candidate cannot prove, or an attestation that does not bind to the receipt it
  claims. This is a real defect signal and must name the specific disagreement.
- **`pending-contract`** — the inputs are not complete enough to reach a verdict
  because the producer contract does not yet expose a required field: a receipt
  below `specVersion` `0.2.0`, an absent `policyVersion` or
  `registrySnapshotDigest`, an absent candidate ordering, or an absent execution
  attestation. This is explicitly **not** a failure of the selection; it is a
  statement about contract coverage. It must record which field was missing so
  the gap is countable, and it must never be reported as `qualified` or silently
  upgraded.
- **`revalidation-required`** — the receipt is internally consistent but its
  sealed input boundary has expired relative to the snapshot's boundary
  generation. The historical verdict is preserved; the finding is that the
  selection may not be reused now.

Verdict receipt behaviour:

- Every verdict carries the `registrySnapshotDigest`, the `policyVersion`, and
  the input receipt's `selectionDigest` it was computed against, so a verdict is
  itself replayable.
- A verdict is a pure function of its inputs. Re-running the verifier on the same
  inputs must produce a byte-identical verdict, including reason ordering.
- The verdict contains no task id, actor, date, or local path in control flow.
  Such fields may be carried as opaque labels for reporting only.

## Acceptance

- [ ] `verifyRunnerSelection` is pure and independently recomputes eligibility,
      total ordering, selected version, per-candidate rejection reasons, and the
      revalidation boundary without trusting the receipt's own conclusion.
- [ ] The verifier reads only through the ports declared in
      `runner-selection-verification-ports.ts`. A test asserts it can run with
      purely in-memory port doubles and no filesystem, git, or ledger access.
- [ ] The four verdicts — `qualified`, `unqualified`, `pending-contract`,
      `revalidation-required` — are each produced by at least one deterministic
      case, and `pending-contract` names the specific missing contract field.
- [ ] A deterministic counterfactual corpus covers: highest-trusted-compatible
      selection, compatible non-latest selection, missing required capability,
      schema incompatibility, expired revalidation boundary, untrusted lifecycle
      state, and a newer runner-input segment that must not be reused. Every case
      declares its expected verdict before the verifier runs.
- [ ] Historical receipts replay against their original sealed registry snapshot
      and retain their original verdict. A current snapshot may be compared for
      diagnosis, but must never rewrite historical selection evidence.
- [ ] The qualification report exposes selection age, latest-version gap,
      revalidation rate, fallback rate, false-reject rate, false-compatible rate,
      per-capability coverage, and the `pending-contract` field-gap counts. Its
      shape is fixed by
      `schemas/validators/runner-selection-qualification-report.schema.json`.
- [ ] Policy promotion requires a sealed independent qualification report, zero
      false-compatible grants across the corpus, explicit counterfactual
      coverage, zero `pending-contract` verdicts, and an owner-approved promotion
      record. Passing task commands, popularity of a version, or a lower rebuild
      count are individually and jointly insufficient. This card defines the
      promotion precondition; it does not perform a promotion.
- [ ] `tests/cli/runner-version-selection.test.ts` (the ATM-GOV-0266 behaviour
      test) passes unchanged, proving this card altered no production selection.

## Execution boundary

Starts after ATM-GOV-0268 delivers the producer contract. In scope: ports,
verifier, counterfactual corpus, replay script, report schema. Out of scope and
owned elsewhere: the registry and selection engine (ATM-GOV-0266), the snapshot,
attestation, ordering comparator, and shadow feedback sink (ATM-GOV-0268), live
shadow-mode rollout against real task cards (Order 3 integration card), and the
policy promotion itself (Order 4).

Shadow feedback was deliberately removed from this card. Its sink boundary is an
ATM-GOV-0268 deliverable, and running it against real future task cards requires
a production integration point that does not exist yet — the taskflow selection
adapter currently has no caller.

## Stop rule

Stop and report instead of proceeding when any of the following is true:

- a change is needed in `runner-version-registry.ts`,
  `runner-version-contract.ts`, or `runner-selection-evidence.ts` — those are
  ATM-GOV-0266/0268 property, and the plan's Order 2B forbids this card from
  editing the registry or the lifecycle evidence adapter;
- a producer field is missing and the temptation is to add it here rather than
  return `pending-contract`;
- an `ATM_*` error code appears to be required — the verdict taxonomy is
  data-shaped by design, and any real code must go through the shared error-code
  skill with the canonical registry in the owning card's scope;
- the work starts touching task admission, close-readiness, or the runner-sync
  steward queue;
- a claim is blocked by dirty-tree or budget admission — do not hand-edit the
  ledger, runtime lock, or task card to get past it.
