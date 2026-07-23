---
task_id: ATM-GOV-0256
title: Runner-sync source snapshot and cache-hit freshness gate
status: planned
owner: atm-runner-sync
priority: P0
milestone: ATM-3.1-R0.8
severity: P0
depends_on:
  - ATM-GOV-0230
  - ATM-GOV-0231
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 runner freshness and closeability; this card strengthens the existing runner-sync steward rather than adding a parallel build lane."
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - tests/cli/runner-sync-build-source-preservation.test.ts
  - tests/cli/runner-sync-build-actor-continuity.test.ts
  - tests/cli/runner-sync-self-hosting-loop.test.ts
  - tests/cli/runner-sync-stale-sha-recovery.test.ts
  - tests/cli/runner-sync-manifest-atomic-write.test.ts
  - tests/cli/runner-sync-post-close-receipt-publication.test.ts
deliverables:
  - scripts/run-sealed-runner-build.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - tests/cli/runner-sync-build-source-preservation.test.ts
  - tests/cli/runner-sync-self-hosting-loop.test.ts
  - tests/cli/runner-sync-stale-sha-recovery.test.ts
  - tests/cli/runner-sync-manifest-atomic-write.test.ts
  - tests/cli/runner-sync-post-close-receipt-publication.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-build-source-preservation.test.ts
  - node --strip-types tests/cli/runner-sync-build-actor-continuity.test.ts
  - node --strip-types tests/cli/runner-sync-self-hosting-loop.test.ts
  - node --strip-types tests/cli/runner-sync-stale-sha-recovery.test.ts
  - node --strip-types tests/cli/runner-sync-manifest-atomic-write.test.ts
  - node --strip-types tests/cli/runner-sync-post-close-receipt-publication.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: sealed-source-freshness-and-cache-hit-red-green
rollback:
  strategy: revert-commit-and-force-full-rebuild
  notes: "A rollback may disable cache-hit reuse, but must not mark a stale frozen runner synchronized or publish release artifacts from an unsealed dirty source snapshot."
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-steward
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-sync-source-freshness-policy
      pattern: Policy Object
      source: packages/cli/src/commands/framework-development/runner-sync-admission.ts
      disposition: extract
---

# ATM-GOV-0256 Runner-sync source snapshot and cache-hit freshness gate

## Intent

Bind runner-sync enqueue, build decision, receipt, and release to one immutable source snapshot. A `cacheHitSkip` is valid only when the cache key proves equivalence to the current sealed source and required outputs; it must never leave `ATM_RUNNER_SYNC_REQUIRED` active while reporting a successful synchronization.

## Acceptance

- [ ] Queue tickets record the exact sealed source, source inventory/config digest, required outputs, and actor/lane authority used by the build.
- [ ] Dirty or newer framework source not represented by the sealed snapshot prevents `cacheHitSkip` from being treated as synchronization success.
- [ ] A valid cache hit either clears runner drift with receipt-backed output equivalence or returns an explicit no-op/revalidation state that does not claim sync completion.
- [ ] No-op cache hits do not dirty tracked release manifests solely with timing or decision metadata.
- [ ] A regression reproduces the Plan 3.1 case: build prints `cacheHitSkip` from an older commit while source is newer; the runner remains stale and the command emits a safe next action instead of a false-green receipt.
- [ ] Source-first/frozen self-hosting has a bootstrap-safe sealed-source route; newer source, adapter/template drift, or emergency-landed source cannot be declared synchronized by an older frozen hook/build (`ATM-BUG-2026-07-14-183`, `ATM-BUG-2026-07-22-234`).
- [ ] Windows release-manifest writes are retryable and atomic; interruption cannot expose a partial root-drop manifest (`ATM-BUG-2026-07-20-212`).
- [ ] Post-close runner-sync receipts and release outputs have one governed publication/runtime-only disposition with a runnable recovery command and no protected-evidence manual-review residue (`ATM-BUG-2026-07-21-220`).
- [ ] Backlog item `ATM-BUG-2026-07-22-225` is linked in delivery evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T09:12:36.053Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0256-runner-sync-source-snapshot-and-cache-hit-freshness-gate.task.md","contentDigest":"sha256:4dad6fa037f860e44952ac41c82745d45d2bad5fbecb723372b40fb3ad3cabd8"} -->
