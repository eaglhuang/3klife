---
task_id: TASK-PRF-0095
title: Unify public command registry and reject inherited command names
status: done
owner: codex-product-proof
priority: P0
depends_on: []
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm-public.ts
  - tests/cli/public-command-registry.test.ts
deliverables:
  - packages/cli/src/atm-public.ts
  - tests/cli/public-command-registry.test.ts
validators:
  - "node --strip-types tests/cli/public-command-registry.test.ts"
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
completed_at: "2026-09-14T15:31:35.967Z"
completed_by_agent: "codex-product-proof"
closedAt: "2026-09-14T15:31:35.967Z"
closedByActor: "codex-product-proof"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T15-31-35-967Z-close-58c10ba5b52a"
lastTransitionAt: "2026-09-14T15:31:35.967Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "33a9631c902902eab8dacdc2fdc80d4002768292"
---

# TASK-PRF-0095 Unify public command registry and reject inherited command names

## Intent

Collapse the duplicated public command-name list into the existing runner table and reject inherited object properties before command dispatch. No new command, package, lifecycle or permission gate.

Series: PRF, existing product-proof family. Authority: Owner convergence directive of 2026-09-14. No new governance feature is a deliverable.

## Acceptance

- [ ] ACC-1: One executable table determines public help and accepted command names; all 21 existing public commands remain available.
- [ ] ACC-2: toString, constructor, valueOf, hasOwnProperty and __proto__ return the existing unknown-command result with nonzero exit, both directly and through help; no unhandled exception or accidental runner invocation.
- [ ] ACC-3: Every advertised command has a callable runner and --help succeeds; focused red/green and typecheck pass. Report removed duplication, not bundle reduction.

## Execution and verification

Read the related plan and relevant predecessor evidence. Establish actual source/artifact baseline before edits; docs/ledger status alone does not prove delivery. Use the listed focused validators; add assertions to them when their existing coverage does not exercise an acceptance condition. New named test files must be implemented before they count as validators. Record test assertion counts, exact commands/exits, baseline/candidate versions and external evidence locations. Negative controls must fail for the intended behavioral reason.

Only this task's concrete files may change. Directory scopes are review envelopes, not authorization for bulk rewrites. Reduce scope to inspected files before code edits. Use existing ATM task or Owner-authorized quickfix maintenance route if tooling blocks; keep a reason, bounded diff, validation and rollback. No hand-written runtime ledger or fake completion.

## Stop and rollback

Stop the current hypothesis when correctness regresses, evidence is unavailable, two measured alternatives miss the threshold, or required external authority is missing. Report the failed metric without weakening acceptance. Revert only the owned patch or reviewed commit; do not reset a shared worktree. No publish, force-push or Git history rewrite is implied by card completion.

## Non-goals

New packages/commands/state machines for administrative completeness; republishing old measurements as candidate proof; reopening or rewriting predecessor provenance.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T15:08:47.075Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0095-unify-public-command-registry-and-reject-inherited-command-names.task.md","contentDigest":"sha256:65f897bf283e444812a0e6d2e393ab0f8d52782f2ae81e9732531f64c753ad19"} -->
