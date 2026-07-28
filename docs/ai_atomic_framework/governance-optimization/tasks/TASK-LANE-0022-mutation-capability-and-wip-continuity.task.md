---
task_id: TASK-LANE-0022
title: Mutation capability parity and WIP ownership continuity
status: done
owner: atm-lane-authority
priority: P0
milestone: ATM-3.1-R0Q.2
severity: P0
depends_on:
  - TASK-LANE-0021
causalGraph:
  causalDependencies:
    - TASK-LANE-0021
  startConditions:
    - TASK-LANE-0021 is done and its capability issuer/verifier contract is available
  softRelations:
    - ATM-BUG-2026-07-22-229
  changedPublicSeams:
    - lane mutation authorization
    - task WIP ownership transition
  causalImpactEdges:
    - lane-capability-to-mutation-admission
    - release-handoff-to-wip-ownership-continuity
  parallelFrontierInputs:
    - TASK-SKL-0026
  validatorReferences:
    - test_int_lane_mutation_capability_parity
    - test_int_lane_wip_ownership_continuity
  phaseOwner: lane-runtime-hardening
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "LANE owns actor/lane capability and WIP ownership continuity. One vertical card avoids splitting authority, release, reclaim, and recovery into mutually blocking microcards."
scopePaths:
  - packages/core/src/lane/lane-capability.ts
  - packages/core/src/lane/lane-capability-provider.ts
  - packages/core/src/lane/wip-ownership-transition.ts
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/release-orchestrator.ts
  - packages/cli/src/commands/tasks/handoff-orchestrator.ts
  - packages/cli/src/commands/framework-mode.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - tests/cli/lane-mutation-capability-parity.test.ts
  - tests/cli/lane-wip-ownership-continuity.test.ts
deliverables:
  - packages/core/src/lane/lane-capability-provider.ts
  - packages/core/src/lane/wip-ownership-transition.ts
  - tests/cli/lane-mutation-capability-parity.test.ts
  - tests/cli/lane-wip-ownership-continuity.test.ts
validators:
  - node --strip-types tests/cli/lane-mutation-capability-parity.test.ts
  - node --strip-types tests/cli/lane-wip-ownership-continuity.test.ts
  - npm run typecheck
errorCodes:
  - ATM_LANE_CAPABILITY_REQUIRED
  - ATM_LANE_CAPABILITY_SUBJECT_MISMATCH
  - ATM_LANE_CAPABILITY_REPLAYED
  - ATM_CLAIM_FOREIGN_UNSTAGED_WIP
evidence:
  required: lane-mutation-parity-and-wip-continuity-receipt
rollback:
  strategy: revert-adapters-and-fail-closed-on-unverified-mutation
  notes: "Preserve WIP journal records. Reverting adapters must never re-enable actor-id-only mutation authority or discard uncommitted content."
atomizationImpact:
  ownerAtomOrMap: atm.lane.authority
  mapUpdates: []
  extractionCandidates:
    - atom: atm.lane.mutation-capability-provider
      pattern: Deep Module
      source: packages/core/src/lane/lane-capability-provider.ts
      disposition: extract
    - atom: atm.lane.wip-ownership-transition
      pattern: State Transition Policy
      source: packages/core/src/lane/wip-ownership-transition.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-25T02:20:35.946Z"
completed_by_agent: "claude-003-plan31-captain"
closedAt: "2026-07-25T02:20:35.946Z"
closedByActor: "claude-003-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-25T02-20-35-776Z-close-69f00db2edbe"
lastTransitionAt: "2026-07-25T02:20:35.946Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "8a112a863325e7427048f579b84e66bd4b3f1990"
---

# TASK-LANE-0022 Mutation capability parity and WIP ownership continuity

## Intent

Complete the lane-security vertical slice left open after TASK-LANE-0021.
Every protected mutation uses one capability verifier, while release, handoff,
reclaim, and interrupted work use one durable WIP ownership transition policy.
The card deliberately keeps these coupled lane-continuity responsibilities
together so that no intermediate microcard leaves a usable authority bypass or
ownerless WIP state.

## Acceptance

- [ ] Before implementation, invoke `atm-deep-module-refactor` against the lane mutation and WIP transition seams. Seal the review receipt, proposed narrow interfaces, adapter inventory, deletion test, and `deep-module-review:300bfd3e` baseline; the skill guides the refactor but does not replace this card's validators.
- [ ] `authorizeMutationCapability(request, authoritySnapshot, policy)` is the only protected mutation authorization decision. Task renew/release/handoff/takeover, governed commit/push, framework-mode claim/release, runner-sync reservation/publication, and taskflow close consume it through thin adapters.
- [ ] Actor id, task id, lane id, environment variables, disclosed lease ids, or possession of another captain's command text are not sufficient authority.
- [ ] Capability tokens are audience-, operation-, task-, lane-, generation-, expiry-, and resource-bound; successful mutation consumes the token once and cross-command replay fails closed.
- [ ] Status, diagnostics, dashboards, receipts, and recovery commands expose only fingerprints and safe metadata, never reusable capability, lease, ticket, or proxy secrets.
- [ ] `planWipTransition(request, snapshot, policy)` owns release/handoff/reclaim/discard decisions and emits an append-only ownership journal plus exact executable recovery.
- [ ] A task with in-scope dirty WIP cannot become ownerless on release. The original authorized lane can resume its recorded WIP, a sealed handoff can transfer it, and explicit discard requires a destructive-action receipt.
- [ ] The ATM-BUG-2026-07-22-229 counterexample is replayed: release followed by same-task reclaim no longer produces unowned/foreign dirty with no recovery command.
- [ ] Cross-command tests prove a capability issued for one mutation cannot authorize another, and that a second actor cannot borrow the original captain's lease, lane, command, environment, or ticket.
- [ ] Deletion tests remove old actor-id-only allow branches and duplicate WIP ownership inference; no adapter retains a second authority or ownership policy.
- [ ] Source and frozen runner behavior match before close. The receipt records authorized/blocked counts, replay attempts, ownerless-WIP count, recovery-command executability, and manual captain interventions.

## Execution boundary

This card has one hard dependency, `TASK-LANE-0021`. It may run in parallel
with SKL validator/catalog work. It must finish before ATM-GOV-0265 and the
Plan3.1 real dogfood proof. Do not split capability call-site parity, WIP
ownership, or their cross-command regression tests into follow-up cards merely
to avoid a local tooling or scope problem.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T16:50:21.376Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/TASK-LANE-0022-mutation-capability-and-wip-continuity.task.md","contentDigest":"sha256:1853628e0e102ae9f89b10a2f56cea2b78373edc96a55fd810703465b7ad94b7"} -->
