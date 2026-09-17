---
task_id: TASK-PRF-0099
title: Deliver bounded quickfix workflow with fewer operator decisions
status: planned
owner: codex-product-proof
priority: P1
depends_on: []
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/channel-playbook.ts
  - packages/cli/src/commands/framework-development.ts
  - packages/cli/src/commands/framework-development
  - templates/skills/atm-framework-temp-claim.skill.md
  - tests/cli/quickfix-operator-convergence.test.ts
  - docs/reports/atm-quickfix-convergence.md
deliverables:
  - packages/cli/src/commands/next/channel-playbook.ts
  - packages/cli/src/commands/framework-development.ts
  - templates/skills/atm-framework-temp-claim.skill.md
  - tests/cli/quickfix-operator-convergence.test.ts
  - docs/reports/atm-quickfix-convergence.md
validators:
  - "node --strip-types tests/cli/quickfix-operator-convergence.test.ts"
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

# TASK-PRF-0099 Deliver bounded quickfix workflow with fewer operator decisions

## Intent

Exercise one bounded reproducible bug through the existing framework quickfix lane; remove repeated prerequisite work and unnecessary operator decisions. Do not create a new quickfix command, state machine or broker layer. Narrow source files after locating the existing playbook implementation.

Series: PRF, existing product-proof family. Authority: Owner convergence directive of 2026-09-14. No new governance feature is a deliverable.

## Acceptance

- [ ] ACC-1: Record baseline operator commands/decisions and runtime for one fixed small bug; candidate reduces required calls or decisions by >=30%.
- [ ] ACC-2: Retain scope ownership, real focused validation and revertable delivery; foreign WIP and failed test controls still refuse unsafe completion.
- [ ] ACC-3: Use one existing maintenance entry and one authoritative evidence record; production logic for duplicate orchestration is reduced. An advisory status-receipt issue alone must not trigger this work.

## Execution and verification

Read the related plan and relevant predecessor evidence. Establish actual source/artifact baseline before edits; docs/ledger status alone does not prove delivery. Use the listed focused validators; add assertions to them when their existing coverage does not exercise an acceptance condition. New named test files must be implemented before they count as validators. Record test assertion counts, exact commands/exits, baseline/candidate versions and external evidence locations. Negative controls must fail for the intended behavioral reason.

Only this task's concrete files may change. Directory scopes are review envelopes, not authorization for bulk rewrites. Reduce scope to inspected files before code edits. Use existing ATM task or Owner-authorized quickfix maintenance route if tooling blocks; keep a reason, bounded diff, validation and rollback. No hand-written runtime ledger or fake completion.

## Stop and rollback

## Multi-agent preservation acceptance (Owner amendment)

- Preserve useful concurrent AI execution, logical-conflict detection, actor attribution and recoverable shared commits. Serializing all workers or removing correctness checks cannot count as simplification.
- Follow the related plan's fixed 1/2/4-agent, four-scenario matrix. Own the measured coordination performance regression matrix in tests/cli/quickfix-operator-convergence.test.ts: >=10 repetitions per configuration, overlap for disjoint workers, <=5% throughput regression, >=20% control-plane CPU or coordination-call reduction, and conflict/stale-base/crash safety. Inspect and narrow any required broker paths before edits; do not expand scope silently.
- Reduce unnecessary scanning, polling and state duplication through existing implementations. A true shared-write critical section may remain serialized; unrelated preparation must stay outside it.


Stop the current hypothesis when correctness regresses, evidence is unavailable, two measured alternatives miss the threshold, or required external authority is missing. Report the failed metric without weakening acceptance. Revert only the owned patch or reviewed commit; do not reset a shared worktree. No publish, force-push or Git history rewrite is implied by card completion.

## Non-goals

New packages/commands/state machines for administrative completeness; republishing old measurements as candidate proof; reopening or rewriting predecessor provenance.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T15:08:58.843Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0099-deliver-bounded-quickfix-workflow-with-fewer-operator-decisions.task.md","contentDigest":"sha256:0c9a7eeba814b00cd15e02830525c16a6d2c148ea2dfff55c42fd85a3702c577"} -->
