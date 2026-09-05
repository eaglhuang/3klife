---
task_id: TASK-GIT-0032
title: Broker-managed transactional commit queue and receipt closeout
status: done
owner: atm-core
priority: P1
depends_on:
  - TASK-GIT-0029
  - TASK-GIT-0030
  - TASK-GIT-0031
causalGraph:
  causalDependencies:
    - TASK-GIT-0029
    - TASK-GIT-0030
    - TASK-GIT-0031
  startConditions:
    - sealed commit attribution and deletion tombstones are available
    - runner publication inventory remains the canonical artifact authority
  softRelations:
    - ATM-BUG-2026-07-22-228
  changedPublicSeams:
    - broker transactional commit request and receipt status
    - governed runner-sync receipt disposition
  causalImpactEdges:
    - broker-shared-index-transaction
    - runner-sync-receipt-closeout
  parallelFrontierInputs:
    - sealed-commit-bundle
    - build-output-inventory
  validatorReferences:
    - broker-transactional-commit-queue
    - runner-sync-receipt-closeout
  phaseOwner: atm-core
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/broker/shared-delivery-commit-transaction.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/broker/command-router.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/framework-development/runner-publication-receipt.ts
  - tests/cli/broker-transactional-commit-queue.test.ts
  - tests/cli/runner-sync-receipt-closeout.test.ts
deliverables:
  - packages/cli/src/commands/broker/shared-delivery-commit-transaction.ts
  - packages/cli/src/commands/broker/steward-queues.ts
  - packages/cli/src/commands/broker/command-router.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - packages/cli/src/commands/framework-development/runner-publication-receipt.ts
  - tests/cli/broker-transactional-commit-queue.test.ts
  - tests/cli/runner-sync-receipt-closeout.test.ts
validators:
  - node --strip-types tests/cli/broker-transactional-commit-queue.test.ts
  - node --strip-types tests/cli/runner-sync-receipt-closeout.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed red/green evidence runs bound to both declared case IDs, plus queue and receipt digests
rollback:
  strategy: revert-commit
  notes: Revert the delivery commit and remove only receipt-listed generated runtime artifacts whose owner and digest still match.
atomizationImpact:
  ownerAtomOrMap: atm.broker.shared-delivery-commit-transaction
  mapUpdates:
    - atomic_workbench/maps/atm-broker-shared-delivery-map.json
  extractionCandidates:
    - atom: atm.broker.transactional-commit-queue
      pattern: Adapter/Port
      source: packages/cli/src/commands/broker/steward-queues.ts
      disposition: follow-up-card
      inlineReason: null
    - atom: atm.broker.receipt-terminal-disposition
      pattern: Result Contract Object
      source: packages/cli/src/commands/framework-development/runner-publication-receipt.ts
      disposition: follow-up-card
      inlineReason: null
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
testContributions:
  - caseId: test_broker_transactional_commit_queue_6d2a9f41
    targetGroupId: null
    semanticKey: broker_transactional_commit_queue
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-5]
    coversImpactEdges: [broker-shared-index-transaction]
    expectedRedPredicate: concurrent scoped requests cannot currently complete through one broker receipt
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: broker-transactional-submit-status-wait
    resourceKey: git-index
  - caseId: test_runner_sync_receipt_closeout_91c0d4a2
    targetGroupId: null
    semanticKey: runner_sync_receipt_closeout
    coversAcceptance: [ACC-4, ACC-6]
    coversImpactEdges: [runner-sync-receipt-closeout]
    expectedRedPredicate: runner-sync completion still requires manual receipt cleanup or leaves unowned residue
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: runner-sync-terminal-disposition
    resourceKey: runner-sync-receipt
requiredTestCaseIds:
  - test_broker_transactional_commit_queue_6d2a9f41
  - test_runner_sync_receipt_closeout_91c0d4a2
phaseTestCaseIds: []
advisoryTestCaseIds: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-GIT-0032 Broker-managed transactional commit queue and receipt closeout

## Intent

Provide a broker-managed, transactional delivery path for bounded commit
requests and terminal runner-sync receipt disposition. Preparation, validation,
and evidence generation remain outside the Tier 2 shared-write interval; only
the irreducible index/ref transition is serialized. The request must bind actor,
task, allowed files, sealed base/source digest, evidence references, commit
message, and artifact surface. The broker must return an executable status or
wait/recovery result and release capacity immediately after success or a
resumable failure.

This card is the implementation follow-up for `ATM-BUG-2026-07-22-228`. It
must reuse sealed attribution, build-output inventory, broker ticket, and
receipt authorities. It must not create a second queue, auto-drain another
task's reconciliation residue, weaken close admission, or replace the owner
policy still required by `ATM-BUG-2026-08-12-001`.

## Acceptance

- [ ] ACC-1 Two disjoint scoped requests in one canonical worktree can prepare in
      parallel and enter one broker-owned transactional commit queue without
      mixing staged files or requiring manual captain staging.
- [ ] ACC-2 Queue ordering, queue-head ownership, CAS/head movement, success,
      rejection, and resumable failure are explicit receipts with executable
      status/wait/recovery commands; queue residency covers only the shared
      index/ref transition.
- [ ] ACC-3 Each successful delivery stages exactly the admitted sealed bundle,
      preserves foreign staged bytes, emits governed attribution, and leaves no
      unowned index residue.
- [ ] ACC-4 Runner-sync publication and post-close receipt disposition consume the
      existing build-output inventory and end in a durable terminal disposition
      without manual cleanup or a second artifact registry.
- [ ] ACC-5 The Critical cross-card residue authority boundary remains fail-closed;
      this card does not consume or mutate another task's reconciliation debt.
- [ ] ACC-6 Red/green evidence binds both required case IDs to the same public seams,
      acceptance criteria, and candidate lineage; rollback is a revert commit
      plus removal of any generated runtime receipt listed by that commit.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-05T08:23:14.122Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0032-broker-managed-transactional-commit-queue-and-receipt-closeout.task.md","contentDigest":"sha256:c45cc94ee4032178fc4a2cc270712ff7566ef54c57cd376328f0945db6cfcaad"} -->
