---
task_id: TASK-ERR-0013
title: Make closure repair commit ticket durable and consumable
status: done
owner: atm-captain
priority: P0
depends_on: []
causalGraph:
  startConditions: [repair-closure-stages-a-packet-for-a-terminal-task]
  softRelations: [ATM-BUG-2026-07-31-002, TASK-ERR-0012, ATM-GOV-0346]
  changedPublicSeams: [closure-repair-commit-admission]
  causalImpactEdges: [repair-to-durable-ticket, durable-ticket-to-governed-commit, failed-repair-to-no-consumed-lease]
  parallelFrontierInputs: [canonical-git-index, task-lifecycle-ledger, work-admission-ticket]
  validatorReferences: [test_closure_repair_ticket_commit_0013, test_repair_lease_failure_atomicity_0013]
  phaseOwner: correction-wave-0-unblock
related_plan: error-governance/error-governance-plan.md
planning_repo: docs
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/tasks/repairclose-orchestrator.ts
  - packages/cli/src/commands/git-governance/work-admission-check.ts
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - packages/cli/src/commands/write-ticket.ts
  - packages/core/src/broker/write-ticket.ts
  - tests/cli/closure-repair-write-ticket-commit.test.ts
  - tests/cli/repair-closure-emergency-atomicity.test.ts
deliverables:
  - packages/cli/src/commands/tasks/repairclose-orchestrator.ts
  - packages/cli/src/commands/git-governance/work-admission-check.ts
  - packages/cli/src/commands/git-governance/implementation/commit-command.ts
  - packages/core/src/broker/write-ticket.ts
  - tests/cli/closure-repair-write-ticket-commit.test.ts
  - tests/cli/repair-closure-emergency-atomicity.test.ts
validators:
  - node --strip-types tests/cli/closure-repair-write-ticket-commit.test.ts
  - node --strip-types tests/cli/repair-closure-emergency-atomicity.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_closure_repair_ticket_commit_0013
    semanticKey: closure_repair_commit_uses_durable_ticket_authority
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [repair-to-durable-ticket, durable-ticket-to-governed-commit]
    expectedRedPredicate: repair-closure stages a valid packet but its returned governed commit is rejected with ATM_WRITE_TICKET_STALE
    responsibility: task-required
    contractEdge: closure-repair-commit-admission
  - caseId: test_repair_lease_failure_atomicity_0013
    semanticKey: failed_repair_does_not_consume_authorization_or_stage_partial_state
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [failed-repair-to-no-consumed-lease]
    expectedRedPredicate: a pre-write freshness or flag gate consumes a repair lease or leaves partial packet/index state
    responsibility: task-required
    contractEdge: repair-closure-transaction
requiredTestCaseIds: [test_closure_repair_ticket_commit_0013, test_repair_lease_failure_atomicity_0013]
phaseTestCaseIds: [typecheck, validate:cli]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [repair-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the shared ticket adapter and both fixture tests together; do not restore closure packets, task records, or index bytes by hand.
atomizationImpact:
  ownerAtomOrMap: atm.work-admission-ticket
  mapUpdates: []
  extractionCandidates:
    - atom: atm.closure-repair-commit-admission
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/work-admission-check.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_WRITE_TICKET_STALE
    disposition: reuse
    category: git-governance
    trigger: a governed commit lacks a current durable task-scoped work-admission ticket
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs write-ticket status --task <task-id> --actor <actor-id> --files <paths> --json
    sourceOwner: packages/cli/src/commands/git-governance/work-admission-check.ts
    registryOwnerTask: TASK-ERR-0002
    tests: [tests/cli/closure-repair-write-ticket-commit.test.ts]
  - code: ATM_RUNNER_STALE_WRITE_REFUSED
    disposition: reuse
    category: framework-development
    trigger: a behavioral write uses a frozen runner older than source without an approved recovery route
    retryable: true
    requiresHumanApproval: true
    recovery: ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
    sourceOwner: packages/cli/src/commands/framework-development.ts
    registryOwnerTask: TASK-ERR-0002
    tests: [tests/cli/repair-closure-emergency-atomicity.test.ts]
createdByCommand: atm plan card create
completed_at: "2026-08-11T14:23:38.885Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-11T14:23:38.885Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-11T14-23-38-885Z-close-da90c719d011"
lastTransitionAt: "2026-08-11T14:23:38.885Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9c4d712e342c9e7c8ce550aeac20556a95182056"
---

# TASK-ERR-0013 Make closure repair commit ticket durable and consumable

## Intent

Repair the generic closure-repair commit boundary. `tasks repair-closure` must
not return a governed commit command unless it has established a durable,
task-scoped authority that the commit adapter can verify and consume. The
implementation must share one ticket authority between repair, explicit
write-ticket operations, and governed commit; it must not special-case a task
id, an evidence filename, a terminal status, or this incident.

## Acceptance

- [ ] ACC-1: In a clean fixture, `repair-closure → returned governed commit`
  succeeds without a raw Git fallback when the repair stages a valid packet for
  a terminal task.
- [ ] ACC-2: The commit adapter consumes the same durable ticket authority as
  repair and explicit `write-ticket acquire/check`; no stdout-only ticket or
  duplicate ticket predicate exists.
- [ ] ACC-3: Ticket scope is exact: the repair packet, task record, repair
  event, and generated Git-head evidence are admitted, while unrelated staged
  or dirty bytes remain excluded and protected.
- [ ] ACC-4: Every pre-write rejection (including stale-runner and an
  unapproved flag) is atomic: it consumes neither a repair lease nor a ticket,
  writes no packet/transition, and stages nothing.
- [ ] ACC-5: A successful repair records a command-backed receipt containing
  the durable ticket identity and the eventual commit SHA; a failed repair
  cannot claim that either exists.

## Engineering constraints

- First principles: write authority and byte identity are durable facts, not
  inferred from process output or a current task status.
- Deep module: expose one compact repair-to-commit admission contract; callers
  must not reimplement terminal-task or closure-packet exceptions.
- Charter: index and commit are Tier 2 shared writes. Return execute-now,
  queue, or an actionable recovery ticket (INV-ATM-008); preserve one canonical
  worktree (INV-ATM-010); implement the smallest evidence-supported general
  rule (INV-ATM-009).
- Do not broaden `--no-verify`, stage override, stale-runner override, or raw
  Git permissions. Those are recovery inputs to the shared authority, never a
  substitute for it.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-11T10:21:44.069Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0013-make-closure-repair-commit-ticket-durable-and-consumable.task.md","contentDigest":"sha256:cac369a28c94467f1b38218c3a3b8e6cd51ab77162cc73cd464fca5c2b87fef9"} -->
