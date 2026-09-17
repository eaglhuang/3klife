---
task_id: TASK-PRF-0098
title: Simplify evidence ownership while preserving deviation traceability
status: planned
owner: codex-product-proof
priority: P1
depends_on: []
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-evidence-ledger-boundary.ts
  - packages/cli/src/commands/evidence.ts
  - packages/cli/src/commands/evidence
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - tests/cli/evidence-ledger-migration.test.ts
  - docs/reports/evidence-ledger-boundary-baseline.md
deliverables:
  - scripts/validate-evidence-ledger-boundary.ts
  - packages/cli/src/commands/evidence.ts
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - tests/cli/evidence-ledger-migration.test.ts
  - docs/reports/evidence-ledger-boundary-baseline.md
validators:
  - "node --strip-types tests/cli/runtime-evidence-git-boundary.test.ts"
  - "node --strip-types tests/cli/evidence-ledger-migration.test.ts"
  - "npm run typecheck"
methodProfiles: [expand-contract]
tddMode: recommended
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only this task's reviewed changes; preserve foreign WIP and external evidence.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      inlineReason: Owner explicitly prioritizes bounded quickfixes and deletion over additional abstraction; scope must shrink to observed behavior before editing.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0098 Simplify evidence ownership while preserving deviation traceability

## Intent

Reuse completed PRF-0092/0093 external-evidence work. Remove one verified redundant evidence persistence path while retaining compact goal/change/validation/deviation references. Historical Git rewrite is a separate reviewed operation, not part of this card.

Series: PRF, existing product-proof family. Authority: Owner convergence directive of 2026-09-14. No new governance feature is a deliverable.

## Acceptance

- [ ] ACC-1: Map current writers/readers and identify authoritative evidence vs projections; retain original intent, change commit, validator exit/output digest and deviation reason.
- [ ] ACC-2: Delete at least one redundant writer/storage representation and its unused production code; replay legacy references or provide reversible read compatibility.
- [ ] ACC-3: Missing/tampered external evidence fails required verification; no raw logs/traces enter new Git commits or npm artifacts. Compare tracked bytes and evidence operations before/after; historical retention is reported separately.

## Execution and verification

Read the related plan and relevant predecessor evidence. Establish actual source/artifact baseline before edits; docs/ledger status alone does not prove delivery. Use the listed focused validators; add assertions to them when their existing coverage does not exercise an acceptance condition. New named test files must be implemented before they count as validators. Record test assertion counts, exact commands/exits, baseline/candidate versions and external evidence locations. Negative controls must fail for the intended behavioral reason.

Only this task's concrete files may change. Directory scopes are review envelopes, not authorization for bulk rewrites. Reduce scope to inspected files before code edits. Use existing ATM task or Owner-authorized quickfix maintenance route if tooling blocks; keep a reason, bounded diff, validation and rollback. No hand-written runtime ledger or fake completion.

## Stop and rollback

## Multi-agent preservation acceptance (Owner amendment)

- Preserve useful concurrent AI execution, logical-conflict detection, actor attribution and recoverable shared commits. Serializing all workers or removing correctness checks cannot count as simplification.
- Follow the related plan's fixed 1/2/4-agent, four-scenario matrix. Consume the coordination evidence produced by TASK-PRF-0099 before final acceptance; ensure this card's changes do not invalidate its candidate binding.
- Reduce unnecessary scanning, polling and state duplication through existing implementations. A true shared-write critical section may remain serialized; unrelated preparation must stay outside it.


Stop the current hypothesis when correctness regresses, evidence is unavailable, two measured alternatives miss the threshold, or required external authority is missing. Report the failed metric without weakening acceptance. Revert only the owned patch or reviewed commit; do not reset a shared worktree. No publish, force-push or Git history rewrite is implied by card completion.

## Non-goals

New packages/commands/state machines for administrative completeness; republishing old measurements as candidate proof; reopening or rewriting predecessor provenance.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T15:08:55.883Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0098-simplify-evidence-ownership-while-preserving-deviation-traceability.task.md","contentDigest":"sha256:da9597e2d9be05b5cbeab421dba45bbfdc671c7fce07a5f6c624755180b8f83a"} -->
