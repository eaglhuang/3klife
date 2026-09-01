---
task_id: ATM-GOV-0324
title: recent governance operator regression closure and transaction-status receipts
status: planned
owner: unassigned
priority: P2
depends_on:
  - ATM-GOV-0307
  - ATM-GOV-0287
causalGraph:
  causalDependencies:
    - ATM-GOV-0307
    - ATM-GOV-0287
  startConditions:
    - Incident replay contract and legal recovery projections are sealed.
    - Each 002–008 regression has a reproducible command-backed observation.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams:
    - packages/cli/src/commands/taskflow/transaction-status.ts
    - packages/cli/src/commands/git/record-commit.ts
    - packages/cli/src/commands/runner-sync.ts
  causalImpactEdges:
    - from=ATM-GOV-0324; relation=operator-regression-closure; to=ATM-GOV-0317
    - from=ATM-GOV-0324; relation=transaction-status-receipt; to=ATM-GOV-0316
  parallelFrontierInputs:
    - packages/cli/src/commands/taskflow/transaction-status.ts
    - packages/cli/src/commands/git/record-commit.ts
  validatorReferences:
    - node --strip-types tests/cli/plan4-operator-regression-closure.test.ts
    - node --strip-types tests/cli/plan4-transaction-status-receipts.test.ts
  phaseOwner: plan4-final-verdict-blockers
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/transaction-status.ts
  - packages/cli/src/commands/git/record-commit.ts
  - packages/cli/src/commands/runner-sync.ts
  - schemas/evidence/operator-regression-closure.schema.json
  - tests/catalog/groups/test_group_plan4_operator_regression_closure.shard.json
  - tests/cli/plan4-operator-regression-closure.test.ts
  - tests/cli/plan4-transaction-status-receipts.test.ts
deliverables:
  - packages/cli/src/commands/taskflow/transaction-status.ts
  - packages/cli/src/commands/git/record-commit.ts
  - packages/cli/src/commands/runner-sync.ts
  - schemas/evidence/operator-regression-closure.schema.json
  - tests/catalog/groups/test_group_plan4_operator_regression_closure.shard.json
  - tests/cli/plan4-operator-regression-closure.test.ts
  - tests/cli/plan4-transaction-status-receipts.test.ts
validators:
  - node --strip-types tests/cli/plan4-operator-regression-closure.test.ts
  - node --strip-types tests/cli/plan4-transaction-status-receipts.test.ts
  - npm run typecheck
  - npm run validate:cli
requiredTestCaseIds:
  - test_task_atm_gov_0324_operator_regression_4e8c2a71
  - test_task_atm_gov_0324_transaction_status_7d1f5b03
testContributions:
  - caseId: test_task_atm_gov_0324_operator_regression_4e8c2a71
    targetGroupId: test_group_plan4_operator_regression_closure
    semanticKey: plan4_operator_regression_closure
    coversAcceptance: [ACC-1, ACC-2, ACC-5]
    coversImpactEdges: ["from=ATM-GOV-0324; relation=operator-regression-closure; to=ATM-GOV-0317"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0324_transaction_status_7d1f5b03
    targetGroupId: test_group_plan4_operator_regression_closure
    semanticKey: plan4_transaction_status_receipts
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["from=ATM-GOV-0324; relation=transaction-status-receipt; to=ATM-GOV-0316"]
    responsibility: task-required
evidence:
  required: command-backed
  realness: fresh-sealed-and-replayable
rollback:
  strategy: revert-commit-and-remove-generated-receipts
atomizationImpact:
  ownerAtomOrMap: atm.cli-governance-routing
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.operator-regression-closure
      pattern: Policy Object
      source: packages/cli/src/commands/taskflow/transaction-status.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0324 recent governance operator regression closure and transaction-status receipts

## Intent

Close the newly observed 2026-07-31 operator-regression cluster without
silently folding it into older incident families. The card must provide one
durable transaction-status authority for repair-closure/write-ticket,
record-commit, dry-run no-mutation, runner-sync publication, cross-task import
attribution, and close timeout recovery.

## Acceptance

- [ ] ACC-1: bugs 002–008 each have a red reproduction, explicit owner mapping,
  repair result, and generic fixture/incident-family link.
- [ ] ACC-2: repair-closure, write-ticket, record-commit, and runner-sync
  publication share durable ticket identity; stdout-only handoff is rejected.
- [ ] ACC-3: dry-run proves HEAD/index/worktree no-write invariants and import
  records cannot trigger cross-task attribution false positives.
- [ ] ACC-4: timeout/close status receipts expose phase markers and a safe
  read-only recovery command; retries are idempotent.
- [ ] ACC-5: all seven bug rows have fresh sealed evidence, rollback proof, and
  no emergency/override lease in the success path.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T16:18:07.794Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0324-recent-governance-operator-regression-closure-and-transaction-status-receipts.task.md","contentDigest":"sha256:d5bc02171cb17b4ad7693a084c6a1c862117a39407c8bd8bcdd545ccc3403378"} -->
