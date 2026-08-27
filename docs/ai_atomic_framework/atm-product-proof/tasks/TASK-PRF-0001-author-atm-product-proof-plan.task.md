---
task_id: TASK-PRF-0001
title: Author ATM Product Proof Plan
status: planned
owner: codex-captain
priority: P2
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:\\Users\\User\\3KLife\\docs\\ai_atomic_framework
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: planning-repo
scopePaths:
  - docs/ai_atomic_framework/atm-product-proof/atm-product-proof-plan.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0001-author-atm-product-proof-plan.task.md
deliverables:
  - docs/ai_atomic_framework/atm-product-proof/atm-product-proof-plan.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0002-restore-packaged-runner-and-plan-import-compatibility.task.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0003-separate-required-product-ci-and-enforce-protected-main.task.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0004-publish-installable-npm-packages-with-clean-install-proof.task.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0005-migrate-runtime-evidence-to-the-evidence-ledger.task.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0006-minimize-adopter-artifacts-and-enforce-bundle-budgets.task.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0007-preregister-an-independent-external-atm-benchmark.task.md
  - docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0008-execute-the-external-benchmark-and-issue-the-product-decision.task.md
validators:
  - node atm.mjs tasks import --from ../3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0001-author-atm-product-proof-plan.task.md --dry-run --json
evidence:
  required: command-backed
rollback:
  strategy: revert-planning-commit
tddMode: reasoned-not-applicable
tddNotApplicableReason: Planning-authoring task; the deterministic import route is the required executable validation.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0001 Author ATM Product Proof Plan

## Intent

Author the authoritative Product Proof Plan that defines ATM's external product
claim, phase gates, failure/stop rules, and the seven delivery contracts that
turn the plan into executable target-repository tasks.

## Acceptance

- [x] The plan defines the product thesis, observed baseline, five phase gates,
  independent-benchmark decision rule, stop rule, rollback boundary, and
  explicit distinction between measured and unknown evidence.
- [x] TASK-PRF-0002 through TASK-PRF-0008 exist as the plan's executable
  delivery contracts; their ordering does not serialize claim admission unless
  a typed hard-causal dependency proves it necessary.
- [x] The plan imports deterministically through the target ATM task importer
  without losing the causal graph or planning authority.
- [x] Deliverables and validators are declared before final import and close.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T16:07:26.570Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0001-author-atm-product-proof-plan.task.md","contentDigest":"sha256:dc0b35e0cb084ab58fa08ac91a357c1ef8562cbcdaea1130f4576a8641a960dc"} -->
