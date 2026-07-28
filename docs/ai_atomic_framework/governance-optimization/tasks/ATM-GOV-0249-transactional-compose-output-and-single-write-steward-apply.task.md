---
task_id: ATM-GOV-0249
title: Transactional compose output and single-write steward apply
status: done
owner: atm-broker
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on:
  - ATM-GOV-0247
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the Plan 3.1 compose-first proof; this card closes the existing composer-to-steward apply seam without creating a second merge engine."
scopePaths:
  - packages/core/src/broker/transactional-composer.ts
  - packages/core/src/broker/steward-transactional-apply.ts
  - packages/core/src/broker/steward.ts
  - packages/core/src/broker/types.ts
  - packages/core/src/broker/index.ts
  - tests/core/transactional-steward-single-write.test.ts
  - tests/core/transactional-steward-rollback.test.ts
deliverables:
  - packages/core/src/broker/steward-transactional-apply.ts
  - packages/core/src/broker/steward.ts
  - packages/core/src/broker/index.ts
  - tests/core/transactional-steward-single-write.test.ts
  - tests/core/transactional-steward-rollback.test.ts
validators:
  - node --strip-types tests/core/transactional-steward-single-write.test.ts
  - node --strip-types tests/core/transactional-steward-rollback.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: transactional-composition-and-single-write-steward-receipts
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Retain immutable proposals and composition evidence; do not fall back to worker writes or per-proposal live-file mutation."
atomizationImpact:
  ownerAtomOrMap: atm.broker.steward-transactional-apply
  mapUpdates: []
  extractionCandidates:
    - atom: atm.broker.steward-transactional-apply
      pattern: Transactional Apply
      source: packages/core/src/broker/steward-transactional-apply.ts
      disposition: extract
completed_at: "2026-07-22T09:41:36.517Z"
completed_by_agent: "codex-plan31-captain-2"
closedAt: "2026-07-22T09:41:36.517Z"
closedByActor: "codex-plan31-captain-2"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-22T09-41-36-444Z-close-016942bcc2fc"
lastTransitionAt: "2026-07-22T09:41:36.517Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "18cdc6076cb10be7d0fa156056aee60dff70a7c0"
---

# ATM-GOV-0249 Transactional compose output and single-write steward apply

## Intent

Close the gap between the existing in-memory transactional composer and the
neutral steward. A composition plan must be built from one immutable base and
applied as a transaction: the steward validates every precondition first,
materializes all outputs outside the canonical tree, and performs exactly one
canonical write for each composed output file.

Workers remain proposal-only. This card does not introduce a second broker,
merge engine, or Git topology layer; `steward.ts` delegates to a small pure
transactional-apply atom and retains orchestration only.

## Acceptance

- [ ] The apply API accepts `TransactionalCompositionPlan.outputFiles`; it does not replay proposals against the live file one by one.
- [ ] The plan is derived from one immutable base snapshot and binds canonical root, base/HEAD, proposal digests, member task/actor attribution, serializability proof digest, and every file's before/after hash.
- [ ] Before any canonical write, the steward verifies all CAS/base/HEAD and declared-output preconditions and materializes every candidate output in a non-canonical temporary area. A stale base, unsupported operation, undeclared output, or failed serializability proof causes zero canonical writes.
- [ ] The apply boundary exposes one explicit semantic-validation admission seam: it accepts only the exact candidate/output digest authorized by a passing post-compose validation receipt. Validator selection and execution remain outside this card's transactional writer module.
- [ ] The authenticated writer role is `neutral-steward`; no worker-facing API can invoke the live-file write primitive directly.
- [ ] Each successful composed output file records `canonicalWriteCount: 1`. Two same-file disjoint proposals therefore produce one composed blob and one canonical write, not two sequential writes.
- [ ] A steward apply receipt binds the composition-plan digest, serializability-proof digest, member attribution, writer identity/role, before/after hashes, and canonical write count for downstream admission and commit verification.
- [ ] Multi-file failure handling is deterministic: either atomic replacement succeeds for the complete declared set or a durable journal/compensation receipt proves restoration before another attempt. Partial success cannot be reported as delivery.
- [ ] `steward.ts` delegates to the new atom and contains no duplicate composition or per-file policy algorithm.
- [ ] Short English comments explain immutable-base composition, the single-write invariant, and why only the neutral steward owns the canonical write primitive.
- [ ] Short English comments also mark the seam between serializability, semantic validation, and side effects so future maintainers do not add validators or language policy to `steward.ts`.
- [ ] Focused tests prove same-file disjoint composition, exact one-write instrumentation, stale-base zero-write rejection, true-conflict queue/revalidation, and rollback/compensation after an injected apply failure.
- [ ] The steward safety path cannot close on source-only tests. The same single-write/stale-base behavior probe must pass through source and frozen `node atm.mjs`, bind source/frozen/build/projection digests, and retain a card-attributable parity receipt even when the runner-sync build receipt is shared.

## Evidence and rollback

Seal the input proposal digests, composition plan, serializability proof,
temporary-output hashes, steward journal, write-count instrumentation, and the
final apply receipt. Rollback retains proposals and trips queue-only; it never
restores direct worker writes or per-proposal canonical writes.

## Atomization impact

- owner atom/map: `atm.broker.steward-transactional-apply`
- extraction candidate: the new module owns plan verification and transactional file replacement only; overlap decisions stay in the existing broker/composer.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T03:36:16.196Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0249-transactional-compose-output-and-single-write-steward-apply.task.md","contentDigest":"sha256:15a180f24065d3fda80ceb2c1418ad470a9c06ff431baf3b9853d20f9c1b0a3b"} -->
