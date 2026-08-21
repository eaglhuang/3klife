---
task_id: ATM-GOV-0389
title: Fail fast and avoid unnecessary runner publication on governed closeout
status: done
owner: codex-captain-recovery
priority: P0
depends_on: []
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/hook/pre-commit/close-transaction-receipt.ts
  - packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/close-transaction-hook-receipt.ts
  - packages/cli/src/commands/taskflow/__tests__/close-transaction-hook-receipt.spec.ts
deliverables:
  - packages/cli/src/commands/hook/pre-commit/close-transaction-receipt.ts
  - packages/cli/src/commands/taskflow/close-transaction-hook-receipt.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/__tests__/close-transaction-hook-receipt.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/close-transaction-hook-receipt.spec.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the receipt protocol and its two integrations together; the normal pre-commit path remains the fallback whenever receipt binding is missing or invalid.
atomizationImpact:
  extractionCandidates:
    - ownerModule: packages/cli/src/commands/taskflow/close-transaction-hook-receipt.ts
      pattern: Result Contract Object
      responsibility: Bind one validated pre-commit result to one close transaction and expose only fail-closed reuse eligibility.
    - ownerModule: packages/cli/src/commands/hook/pre-commit/close-transaction-receipt.ts
      pattern: Policy Object
      responsibility: Decide whether a hook invocation may consume a transaction-bound validation receipt.
tddMode: required
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-21T09:25:30.699Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-21T09:25:30.699Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-21T09-25-30-699Z-close-d83b43ee4c3e"
lastTransitionAt: "2026-08-21T09:25:30.699Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "79896c2e2fc1e4c2cf76c7f63007fe51ee9b445b"
---

# ATM-GOV-0389 Fail fast and avoid unnecessary runner publication on governed closeout

## Intent

Eliminate repeated expensive pre-commit evaluation inside one governed close transaction without weakening Git-hook protection. The first candidate commit remains fully validated. A subsequent governance-only commit may reuse that result only when the task id, transaction id, parent HEAD, task-scoped index lease, and candidate digest exactly match the sealed receipt; any mismatch must run the normal hook again.

This is a fast-path repair for the control plane. Runner publication and declared large test suites remain execution-plane operations and are never silently skipped.

## Required Work

- Extract a canonical close-transaction hook receipt contract from the large hook/taskflow owners.
- Have the first taskflow delivery commit publish the immutable receipt after normal hook success.
- Let the second transaction-local governance commit consume it only through the exact binding policy; otherwise use normal hook execution.
- Keep direct Git commits, other tasks, changed HEAD/index lease/candidate, expired receipts, and missing receipts on the normal hook path.
- Emit compact timing evidence distinguishing reused control-plane validation from a real skipped validation.

## Acceptance

- [ ] First close-transaction candidate invokes normal pre-commit validation and produces a receipt.
- [ ] Matching governance-only follow-up consumes exactly that receipt without a second expensive hook invocation.
- [ ] Any changed task, HEAD, index lease, candidate digest, expired receipt, or direct Git invocation fails closed to normal hook validation.
- [ ] Focused hook and transaction-receipt tests pass.
- [ ] `npm run typecheck` passes.
- [ ] No runner build, validator, or external commit can use the receipt as a bypass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T13:35:39.648Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0389-fail-fast-and-avoid-unnecessary-runner-publication-on-governed-closeout.task.md","contentDigest":"sha256:d82a503bbc53b935ef56ae0e458d4e9fc68768f1c4266384e8c95dab56b9a67f"} -->
