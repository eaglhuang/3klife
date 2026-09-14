---
task_id: TASK-PRF-0096
title: Converge adopter workflows and retire redundant command implementations
status: done
owner: codex-product-proof
priority: P1
depends_on: ["TASK-PRF-0095"]
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm-public.ts
  - packages/cli/src/commands/command-specs
  - packages/cli/src/commands/guide.ts
  - packages/cli/src/commands/welcome.ts
  - packages/cli/src/commands/orient.ts
  - packages/cli/src/commands/start.ts
  - tests/cli/npm-clean-install.test.ts
  - docs/SELF_HOSTING_ALPHA.md
  - docs/reports/atm-command-convergence.md
deliverables:
  - packages/cli/src/atm-public.ts
  - packages/cli/src/commands/guide.ts
  - packages/cli/src/commands/welcome.ts
  - packages/cli/src/commands/orient.ts
  - packages/cli/src/commands/start.ts
  - tests/cli/npm-clean-install.test.ts
  - docs/SELF_HOSTING_ALPHA.md
  - docs/reports/atm-command-convergence.md
validators:
  - "node --strip-types tests/cli/npm-clean-install.test.ts"
  - "npm run typecheck"
methodProfiles: [deep-module-refactor]
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
completed_at: "2026-09-14T15:42:24.173Z"
completed_by_agent: "codex-product-proof"
closedAt: "2026-09-14T15:42:24.173Z"
closedByActor: "codex-product-proof"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T15-42-24-173Z-close-b5a1b040508d"
lastTransitionAt: "2026-09-14T15:42:24.173Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1ca70a70773fb8381f76b357763666a12c03aca4"
---

# TASK-PRF-0096 Converge adopter workflows and retire redundant command implementations

## Intent

Measure onboarding and routine change workflows, then merge redundant behavior behind existing entrypoints. Preserve aliases during migration; remove real duplicated implementations, not only help entries.

Series: PRF, existing product-proof family. Authority: Owner convergence directive of 2026-09-14. No new governance feature is a deliverable.

## Acceptance

- [ ] ACC-1: Freeze a command/subcommand/flag inventory and core-workflow call counts before editing; classify keep, merge, internal-only, retire with call-site and user-impact evidence.
- [ ] ACC-2: Reduce recommended beginner entrypoints to at most 5 and routine operator decisions by at least 30% on the fixed baseline workflow; count aliases separately.
- [ ] ACC-3: Remove at least one duplicated behavior implementation with net production-code reduction; all retained workflows and compatibility aliases pass end-to-end. If no safe deletion qualifies, report not-met and stop, without relaxing thresholds.

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

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T15:08:49.995Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0096-converge-adopter-workflows-and-retire-redundant-command-implementations.task.md","contentDigest":"sha256:265f47d66c920d69ac919fed99ceb342fc737d7d3cebb640b93911080f840d19"} -->
