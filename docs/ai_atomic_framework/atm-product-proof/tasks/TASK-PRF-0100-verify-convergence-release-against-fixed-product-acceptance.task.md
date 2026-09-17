---
task_id: TASK-PRF-0100
title: Verify convergence release against fixed product acceptance
status: planned
owner: codex-product-proof
priority: P1
depends_on: ["TASK-PRF-0096","TASK-PRF-0097","TASK-PRF-0098","TASK-PRF-0099"]
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - docs/reports/atm-product-proof-checkpoints.md
  - docs/reports/atm-public-npm-install-proof.md
  - docs/reports/atm-convergence-decision.md
  - tests/cli/product-proof-evidence-boundary.test.ts
deliverables:
  - docs/reports/atm-product-proof-checkpoints.md
  - docs/reports/atm-public-npm-install-proof.md
  - docs/reports/atm-convergence-decision.md
  - tests/cli/product-proof-evidence-boundary.test.ts
validators:
  - "node --strip-types tests/cli/product-proof-evidence-boundary.test.ts"
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

# TASK-PRF-0100 Verify convergence release against fixed product acceptance

## Intent

Integrate delivered simplifications with existing public npm, sustained-CI and independent benchmark cards. Produce a go/no-go decision from fixed thresholds; do not duplicate their collectors, implement a new governance gate, or manufacture a successful release.

Series: PRF, existing product-proof family. Authority: Owner convergence directive of 2026-09-14. No new governance feature is a deliverable.

## Acceptance

- [ ] ACC-1: Map every original product goal to exact candidate artifact, test or explicit unresolved status; separate installed product, CI observation and benchmark conclusions.
- [ ] ACC-2: Public npm fixed-version install and core workflow proof from PRF-0053/0054, sustained CI proof from PRF-0059/0066 and held-out replication from PRF-0041/0042 meet their original contracts before a full product claim.
- [ ] ACC-3: Publish before/after command count, production LOC, unpacked/dependency bytes, latency, false block, missed conflict, human minutes, tokens and USD with denominators, missing values and uncertainty. Consume TASK-PRF-0101's millisecond report: every measured command/mandatory gate has p50/p95, sample count, frequency and cumulative fixed-task waiting ms; uncovered paths remain explicit and block a product-proven performance claim.
- [ ] ACC-3a: Treat fixed-task mandatory waiting ms as the primary lightweighting score. Require the candidate to meet the preregistered p50 reduction target (>=20%) without a >10% p95 regression; do not trade away correctness, conflict detection, or multi-AI makespan to obtain a lower number.
- [ ] ACC-4: Feature retirement has migration/rollback notes. Report no-go or inconclusive if any gate is unproven; a code-complete milestone may not be renamed product-proven.

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

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T15:09:01.798Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0100-verify-convergence-release-against-fixed-product-acceptance.task.md","contentDigest":"sha256:b00e118fb0e5b6e9927642c0af6fe339e5ed93f05ecd89f9dbdda74e872ff9d2"} -->
