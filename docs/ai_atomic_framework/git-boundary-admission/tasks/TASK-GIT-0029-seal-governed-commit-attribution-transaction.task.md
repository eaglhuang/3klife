---
task_id: TASK-GIT-0029
title: Seal governed commit attribution transaction
status: done
owner: claude-006
priority: P0
milestone: G17
depends_on:
  - TASK-GIT-0028
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git-governance/**"
  - "packages/cli/src/commands/broker/batch-execute-actions.ts"
  - "packages/core/src/**"
  - "schemas/evidence/**"
  - "tests/cli/**"
  - "tests/fixtures/governance-incidents/shared-index-commit-attribution/**"
  - "tests/catalog/groups/**"
deliverables:
  - "Sealed commit bundle records path, mode, blobId or contentDigest, and provenance before any commit-tree/update-ref mutation."
  - "Temporary-index assembly consumes sealed entries rather than re-reading mutable live index content for admitted paths."
  - "Broker --apply performs all admission and shared-delivery planning before commit-tree/update-ref; a rejected plan leaves HEAD unchanged."
  - "Actual candidate tree is asserted exactly against the sealed bundle before ref mutation; missing, extra, or same-path different-blob entries fail closed."
  - "Governed commit receipt and committedFileCount are derived from the actual committed tree and include an exact bundle-vs-tree proof."
  - "Empty scoped bundle no longer falls back to a live-index commit; it fails closed or routes through an explicit documented no-op path."
  - "Generic incident fixture family for shared-index commit attribution, with no task id, actor, date, or local path in production control flow."
validators:
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "new focused commit attribution tests created by this task"
  - "new focused broker admission-order tests created by this task"
  - "npm run typecheck"
  - "npm run validate:cli"
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-admission"
  extractionCandidates:
    - source: "packages/cli/src/commands/broker/batch-execute-actions.ts"
      pattern: "Transaction Ordering Policy"
      disposition: "extract"
    - source: "packages/cli/src/commands/git-governance/**"
      pattern: "Sealed Bundle / Result Contract"
      disposition: "extract"
  reason: "This is one behavior boundary: admitted commit content must be sealed and applied transactionally."
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-07-31T04:53:26.238Z"
completed_by_agent: "claude-006"
closedAt: "2026-07-31T04:53:26.238Z"
closedByActor: "claude-006"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T04-53-26-238Z-close-f95e77d36f19"
lastTransitionAt: "2026-07-31T04:53:26.238Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4bfd6c2970b78957d962928b35b7c3ef0e753b2d"
---

# TASK-GIT-0029 Seal governed commit attribution transaction

## Intent

Close the remaining success-path commit attribution gap after `TASK-GIT-0028`.
The current main path already uses temporary-index task-scoped commit execution;
this card must not reopen that solved isolation work. Instead, make the admitted
bundle itself the transaction authority: a governed commit may only update HEAD
when the exact candidate tree equals the sealed admitted bundle.

This card also fixes the broker apply-order risk: shared-delivery admission and
plan rejection must happen before any `commit-tree` or `update-ref` effect.

## Concurrency Model

The intended multi-captain solution is not daily `override lease`. Captains may
prepare task-scoped sealed bundles in parallel, but the shared branch ref update
is a broker-managed gate. The broker either returns a queue/wait ticket or runs a
CAS retry after revalidating the sealed bundle against the new base. If another
captain commits first, the correct operator behavior is to wait/retry through
the broker, not to override foreign staged work.

Override lease remains an exceptional, explicit repair authority for named
foreign staged entries. It is not the normal answer to shared-index commit
attribution.

## Required Test Contributions

- `test_task_git_commit_sealed_content_attribution`: covered by new focused
  tests created in this task.
- `test_broker_apply_admission_before_ref_update`: covered by new focused
  tests created in this task.

## Acceptance

- [ ] Repro/evidence confirms or falsifies both suspected gaps: broker apply
  before admission, and same-path staged blob replacement between admission and
  temp-index assembly.
- [ ] A successful governed commit proves `actual tree diff == sealed bundle`
  at path, mode, blob/content digest, and provenance granularity.
- [ ] Rejected admission, unexpected path, missing path, and same-path
  different-blob cases fail before HEAD moves.
- [ ] Receipts report actual committed tree counts and bundle-vs-tree proof, not
  expected slice counts only.
- [ ] Generic incident fixtures exist under
  `governance-incidents/shared-index-commit-attribution/`.
- [ ] Focused tests, typecheck, and CLI validation pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T03:00:13.777Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0029-seal-governed-commit-attribution-transaction.task.md","contentDigest":"sha256:820c78391485b2fd06562a991cf7fb333695e7c97075a0760064d55535591589"} -->
