---
task_id: ATM-GOV-0250
title: Receipt-bound shared-write admission and steward-only delivery
status: done
owner: atm-git-governance
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on:
  - ATM-GOV-0249
  - ATM-GOV-0254
  - TASK-ERR-0004
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns shared-delivery enforcement; one pure provenance policy is reused at all side-effect boundaries to avoid hook/CLI/commit policy drift."
scopePaths:
  - packages/core/src/broker/shared-write-provenance-policy.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/core/src/broker/index.ts
  - packages/cli/src/commands/hook/pre-commit/scope-ownership.ts
  - packages/cli/src/commands/hook/pre-commit/support.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - scripts/validate-git-hooks-enforcement/closure-cross-checks.ts
  - tests/core/shared-write-provenance-policy.test.ts
  - tests/cli/steward-receipt-pre-commit-gate.test.ts
  - tests/cli/receipt-bound-shared-delivery-commit.test.ts
deliverables:
  - packages/core/src/broker/shared-write-provenance-policy.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/cli/src/commands/hook/pre-commit/scope-ownership.ts
  - packages/cli/src/commands/hook/pre-commit/support.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/broker/batch-execute-actions.ts
  - scripts/validate-git-hooks-enforcement/closure-cross-checks.ts
  - tests/core/shared-write-provenance-policy.test.ts
  - tests/cli/steward-receipt-pre-commit-gate.test.ts
  - tests/cli/receipt-bound-shared-delivery-commit.test.ts
validators:
  - node --strip-types tests/core/shared-write-provenance-policy.test.ts
  - node --strip-types tests/cli/steward-receipt-pre-commit-gate.test.ts
  - node --strip-types tests/cli/receipt-bound-shared-delivery-commit.test.ts
  - node --strip-types scripts/validate-git-hooks-enforcement/closure-cross-checks.ts
  - npm run typecheck
errorCodes:
  - ATM_BROKER_STEWARD_RECEIPT_REQUIRED
  - ATM_BROKER_STEWARD_RECEIPT_INVALID
createdByCommand: atm plan card create
evidence:
  required: receipt-bound-shared-write-admission-and-commit-proof
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Keep private single-claim delivery available; multi-claim shared files remain fail-closed until a valid steward receipt is available."
atomizationImpact:
  ownerAtomOrMap: atm.broker.shared-write-provenance-policy
  mapUpdates: []
  extractionCandidates:
    - atom: atm.broker.shared-write-provenance-policy
      pattern: Pure Policy
      source: packages/core/src/broker/shared-write-provenance-policy.ts
      disposition: extract
completed_at: "2026-07-24T02:10:28.953Z"
completed_by_agent: "claude-002-plan31-captain"
closedAt: "2026-07-24T02:10:28.953Z"
closedByActor: "claude-002-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T02-10-28-795Z-close-ec39928305c7"
lastTransitionAt: "2026-07-24T02:10:28.953Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c979427a2903b8dd10078830b822f2c5c238361d"
---

# ATM-GOV-0250 Receipt-bound shared-write admission and steward-only delivery

## Intent

Prevent an actor from bypassing compose-first governance by editing and staging
a file that has multiple active write claims. One pure provenance verifier is
consumed by pre-commit, ATM Git delivery, and broker shared-commit execution;
the side-effect adapters supply evidence but do not reimplement policy.

This is deliberately scoped to shared files with at least two active write
claims. Private/disjoint single-claim writes keep their existing path, while a
shared mutation is admitted only when its exact staged/output blob is bound to
a valid transactional-composition and neutral-steward apply receipt.

## Acceptance

- [ ] A shared mutation is defined generically from active write-claim cardinality (`>= 2`), not task IDs, filenames, file types, or hardcoded path lists.
- [ ] The pure verifier binds canonical root, base/HEAD, composition-plan digest, serializability-proof digest, proposal/task/actor/member attribution, steward identity/role, each file's before/after digest, exact staged/commit-tree blob digest, and `canonicalWriteCount: 1`.
- [ ] The same verifier also binds a passing post-compose semantic-validation receipt to the exact candidate/output digest, sealed validator set, runner/build digest, and current base/HEAD. Missing, failed, unavailable, stale, or digest-mismatched semantic evidence cannot authorize stage, apply, or commit.
- [ ] A missing receipt for a shared staged mutation returns `ATM_BROKER_STEWARD_RECEIPT_REQUIRED`; malformed, stale, caller-shaped, attribution-mismatched, or digest-mismatched evidence returns `ATM_BROKER_STEWARD_RECEIPT_INVALID`. Both are retryable, require no human approval, and route back through broker compose/steward delivery.
- [ ] Pre-commit, the ATM Git commit route, and broker batch/shared-delivery commit all call the same verifier. Their adapters contain no separate allow/deny algorithm.
- [ ] An active `neutral-steward` lane or a committing task's own claim is not sufficient proof. Only a consumed receipt whose output digest equals the staged/commit-tree blob may admit the shared file.
- [ ] The current regression is reversed: direct edit plus `git add` of a multi-claim file without a receipt fails closed, even when the committing actor owns one of those claims.
- [ ] A real steward receipt plus its exact composed output passes; changing one byte, changing HEAD/base, substituting a task/member, adding an unreceipted shared file, or replaying a consumed/stale receipt fails closed.
- [ ] Shared-delivery attribution is derived from the validated receipt. Caller-provided `taskIds` or `fileSlices` cannot manufacture member attribution or expand the committed file set.
- [ ] The real commit test proves the committed tree blob equals the receipt-bound steward output and that one commit carries all composed member attribution without absorbing unrelated staged work.
- [ ] Private/disjoint single-claim writes remain behaviorally unchanged, and unknown receipt versions fail closed without task-specific exceptions.
- [ ] Short English comments at each adapter boundary explain that evidence is collected locally but policy lives in the core verifier.
- [ ] The shared-write enforcement card cannot close on source-only tests. The same raw-write rejection and exact-receipt acceptance probe must pass through source and frozen `node atm.mjs`, with matching behavior projection and source/frozen/build digests. A shared runner-sync build is allowed; a card-attributable parity receipt is mandatory.

## Evidence and rollback

Seal adversarial pre-commit results, receipt-consumption state, exact staged and
commit-tree blob digests, member attribution, and the real commit SHA. Rollback
retains private delivery but trips shared mutations to queue-only; no bypass
allowlist is introduced.

## Atomization impact

- owner atom/map: `atm.broker.shared-write-provenance-policy`
- extraction candidate: a side-effect-free receipt verifier shared by hook, ATM Git, and broker commit adapters.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T03:36:17.428Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0250-receipt-bound-shared-write-admission-and-steward-only-delivery.task.md","contentDigest":"sha256:8e61ccba1504334f85f33532ce2e529dc446bcad5be7802a405639d48bbd150e"} -->
