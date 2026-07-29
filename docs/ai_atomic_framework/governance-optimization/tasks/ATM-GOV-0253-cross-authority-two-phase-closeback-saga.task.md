---
task_id: ATM-GOV-0253
title: Cross-authority two-phase closeback saga
status: done
owner: atm-taskflow
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on:
  - ATM-GOV-0252
  - TASK-ERR-0005
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns taskflow closeback consistency; the design is a durable saga over two repositories, not a new ledger or hidden Git transaction model."
scopePaths:
  - packages/cli/src/commands/taskflow/cross-authority-closeback.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/close-side-effect-reconcile.ts
  - packages/cli/src/commands/tasks/close-orchestrator.ts
  - packages/cli/src/commands/tasks/import-planning-authority.ts
  - packages/cli/src/commands/tasks/planning-mirror-close-diagnostics.ts
  - schemas/governance/cross-authority-closeback.schema.json
  - tests/cli/taskflow-cross-authority-closeback-saga.test.ts
  - tests/cli/atomic-wave-checkpoint-closeback-saga.test.ts
  - tests/cli/taskflow-cross-authority-remote-durability.test.ts
  - tests/cli/taskflow-cross-task-residue-recovery.test.ts
  - tests/cli/taskflow-close-saga-plan-parity.test.ts
  - tests/cli/planning-source-seal.test.ts
deliverables:
  - packages/cli/src/commands/taskflow/cross-authority-closeback.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - packages/cli/src/commands/taskflow/close-side-effect-reconcile.ts
  - schemas/governance/cross-authority-closeback.schema.json
  - tests/cli/taskflow-cross-authority-closeback-saga.test.ts
  - tests/cli/atomic-wave-checkpoint-closeback-saga.test.ts
  - tests/cli/taskflow-cross-authority-remote-durability.test.ts
  - tests/cli/taskflow-cross-task-residue-recovery.test.ts
  - tests/cli/taskflow-close-saga-plan-parity.test.ts
validators:
  - node --strip-types tests/cli/taskflow-cross-authority-closeback-saga.test.ts
  - node --strip-types tests/cli/atomic-wave-checkpoint-closeback-saga.test.ts
  - node --strip-types tests/cli/taskflow-cross-authority-remote-durability.test.ts
  - node --strip-types tests/cli/taskflow-cross-task-residue-recovery.test.ts
  - node --strip-types tests/cli/taskflow-close-saga-plan-parity.test.ts
  - node --strip-types tests/cli/planning-source-seal.test.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
  - npm run validate:schemas
  - npm run typecheck
errorCodes:
  - ATM_TASKFLOW_CROSS_AUTHORITY_CLOSEBACK_PENDING
evidence:
  required: cross-authority-closeback-crash-matrix
rollback:
  strategy: reconcile-existing-saga-then-revert
  notes: "Never reset either repository or replay an already committed side effect. Finish or compensate through the durable saga receipt."
atomizationImpact:
  ownerAtomOrMap: atm.taskflow.cross-authority-closeback
  mapUpdates: []
  extractionCandidates:
    - atom: atm.taskflow.cross-authority-closeback
      pattern: Durable Saga
      source: packages/cli/src/commands/taskflow/cross-authority-closeback.ts
      disposition: extract
createdByCommand: atm plan card create
skl_validator_transition:
  schema_id: atm.validatorSelection.transition.v1
  enforcement: advisory-until-TASK-SKL-0029
  causalImpactEdges:
    - authority-manifest-to-durable-closeback-state
    - remote-visibility-receipt-to-final-closeback-decision
  requiredTestCaseIds:
    - test_int_authority_closeback_two_phase_durability_fde36800
  phaseTestCaseIds:
    - test_int_plan3_final_verdict_evidence_aggregation_35563247
  advisoryTestCaseIds: []
  testContributions:
    - caseId: test_int_authority_closeback_two_phase_durability_fde36800
      targetGroupId: test_group_authority_closeback
      semanticKey: two-phase-durability
      coversImpactEdges:
        - authority-manifest-to-durable-closeback-state
        - remote-visibility-receipt-to-final-closeback-decision
completed_at: "2026-07-29T22:38:31.814Z"
completed_by_agent: "codex-git-series-captain"
closedAt: "2026-07-29T22:38:31.814Z"
closedByActor: "codex-git-series-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-29T22-38-31-814Z-close-1bd944ae0103"
lastTransitionAt: "2026-07-29T22:38:31.814Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3cf1a3bc1f4ca62efc4ef150eba7a8448e804d70"
---

# ATM-GOV-0253 Cross-authority two-phase closeback saga

## Intent

Prevent target ledger, planning source card, and plan status from presenting
contradictory completion. This task does not claim distributed Git ACID. It adds
a durable two-phase saga: prepare and seal both authorities, perform guarded
commits with an append-only journal, and expose externally complete status only
after both authority receipts are durable.

Partial success is an explicit `closeback-pending` state with deterministic
reconciliation. Retrying resumes the recorded phase and never replays target
close, notification, broker release, planning commit, or other completed side
effects.

## Acceptance

- [ ] Before implementation, invoke `atm-deep-module-refactor` on taskflow close/preflight/write/backend call sites. Seal the proposed `executeTaskCloseSaga(request, snapshot, ports)` interface, adapter inventory, deletion test, and `deep-module-review:b0331fea` baseline.
- [ ] `executeTaskCloseSaga` produces the single immutable close plan consumed by dry-run, write, task backend close, and reconcile. The plan contains blockers, ordered steps, expected files, authority CAS, idempotency keys, compensations, and exact recovery commands.
- [ ] Taskflow CLI, task-ledger close, planning closeback, and batch checkpoint are adapters. They do not maintain separate phase tables, dirty-file classifications, or close readiness policies.
- [ ] Prepare validates both repository roots, current HEAD/CAS, source-card identity/status, target task/closure packet, required acceptance-evidence gate, cleanly isolated commit bundle, and authority writeability before either authority mutates.
- [ ] The saga receipt seals task/source identity, target and planning roots, prepared HEADs, target bundle digest, planning patch digest, plan/source status transition, acceptance-evidence digest, phase, and exactly-once side-effect journal.
- [ ] Target ledger `done`, planning card `done`, and any plan-level terminal status are not exposed as a globally completed closeback until both authority commit receipts are durable. An intermediate state is reported as `closeback-pending`, never as success.
- [ ] The sealed authority manifest declares, per repository, whether global completion requires remote visibility and the canonical remote/ref. When required, local commit durability is only an intermediate phase: the exact commit SHA must be remote-reachable and bound to a command-backed or named human-push receipt before global completion; unavailable remote evidence remains `closeback-pending`.
- [ ] Remote durability policy is repository-neutral and data-driven. It does not hardcode a host path, branch, provider, or assumption that every authority auto-pushes; target and planning authorities are evaluated from the same manifest contract.
- [ ] If target commit succeeds and planning commit fails, retry reuses the target receipt, does not close/release/notify twice, and either commits the sealed planning change or returns the same pending condition with exact diagnosis.
- [ ] If planning HEAD/source-card CAS moves after prepare, ATM does not overwrite or silently rebase it. It returns `ATM_TASKFLOW_CROSS_AUTHORITY_CLOSEBACK_PENDING` and requires reconcile/re-prepare against the observed authority.
- [ ] The imported task durably binds planning source identity/hash across repositories; drift during an active target task is detected before delivery or close and follows the saga reconcile path (`ATM-BUG-2026-07-12-119`).
- [ ] If target HEAD moves, source identity changes, a commit crashes after object creation, or the process stops after any journal phase, restart deterministically detects the durable outcome and continues at most once.
- [ ] Plan-level status remains `active` until all required source cards and target closures pass their declared gates; one caller cannot set the plan to complete early by passing a boolean.
- [ ] The saga preserves unrelated dirty/staged work in both repositories and commits only the sealed bundle for each authority.
- [ ] Dry-run prints both prepared bundles, phases, CAS expectations, and recovery action without writing either repository.
- [ ] A crash matrix injects failure before/after each prepare, commit, receipt, and finalization boundary; every cell ends in both-committed or explicit pending, with zero duplicate side effects and no contradictory global completion.
- [ ] Repeated close/reconcile calls are idempotent and never require manual `.atm` edits, `git reset`, branch/worktree merge, or task-specific repair code.
- [ ] Plan parity tests feed the same snapshot to dry-run, write, backend close, and reconcile and assert the same blocker/step digest. Crash tests prove restart resumes the sealed plan rather than recomputing a different one.
- [ ] Deletion tests remove duplicate close readiness and phase derivation from adapters; deleting the saga planner makes every protected close path fail closed.
- [ ] A done/released task's stale close residue beside another active task receives a scoped reconcile/advisory recovery without circularly requiring the active task to commit first (`ATM-BUG-2026-07-12-126`).
- [ ] Protected override audit/provenance files are included only through the sealed authority bundle and direction-lock model; no unowned audit sidecar can block or leak into another task's close (`ATM-BUG-2026-07-13-163`).
- [ ] Before the first delivery commit, the implementer inventories adjacent taskflow types, shared helpers, mutex/lock modules, and tests; any required linked surface is added once through governed scope amendment rather than copied into the new saga module.
- [ ] Short English comments explain phase ownership, the no-distributed-ACID boundary, and why global completion is derived only after both receipts exist.
- [ ] This cross-authority enforcement path has its own source/frozen behavior-parity receipt before close. A shared runner-sync build is allowed, but the saga's phase and pending behavior must be attributable to this card and cannot rely only on the later 0244 aggregate drill.

## Evidence and rollback

Seal every crash-matrix journal, both commit SHAs, source/target digests, retry
counts, and duplicate-side-effect counters. Rollback first finishes or
compensates the existing saga, then reverts code; it never rewrites history.

## Atomization impact

The durable state machine belongs in one module. Existing close orchestration,
commit-bundle assembly, and reconciliation are adapters and must not grow
independent phase tables.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T04:46:00.082Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0253-cross-authority-two-phase-closeback-saga.task.md","contentDigest":"sha256:662579cbfd369570ab07a63d7f66ca0c10e3a14ede3d82ebe6516d8054174d86"} -->
