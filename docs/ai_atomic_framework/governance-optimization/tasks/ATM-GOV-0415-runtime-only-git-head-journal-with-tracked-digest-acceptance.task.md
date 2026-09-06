---
task_id: ATM-GOV-0415
title: Runtime-only git-head journal with tracked digest acceptance
status: planned
owner: atm-governance
priority: P1
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
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/hook/pre-push/**
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - scripts/validate-git-head-evidence.ts
  - tests/cli/git-head-admission-owner-boundary.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
deliverables:
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/hook/pre-push/**
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - scripts/validate-git-head-evidence.ts
  - tests/cli/git-head-admission-owner-boundary.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
validators:
  - node --strip-types tests/cli/git-head-admission-owner-boundary.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - npm run typecheck
  - npm run validate:git-head-evidence
  - npm run validate:cli:surface
testContributions:
  - caseId: test_runtime_only_git_head_digest_acceptance_0415
    targetGroupId: null
    semanticKey: runtime_only_git_head_digest_acceptance
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [git-head-evidence-boundary]
    expectedRedPredicate: pre-push accepts only a tracked digest/receipt and does not require the raw journal to be tracked
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: git-head-evidence-contract
    resourceKey: null
requiredTestCaseIds:
  - test_runtime_only_git_head_digest_acceptance_0415
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore the previous raw-journal acceptance path while retaining compatibility reads; do not delete existing runtime archives or tracked compact receipts.
atomizationImpact:
  ownerAtomOrMap: atm.git-head-evidence-boundary
  mapUpdates: []
  extractionCandidates:
    - atom: atm.git-head-evidence-boundary
      pattern: Git-head evidence boundary
      source: packages/cli/src/commands/git-head-evidence.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0415 Runtime-only git-head journal with tracked digest acceptance

## Intent

Separate high-volume raw git-head journaling from the tracked acceptance contract.
Raw JSONL remains runtime-local and gitignored; Git tracks only a compact,
owner-bound digest/receipt that pre-push and close can verify. Missing raw detail
must be reported as unavailable rather than treated as a failure when the
compact receipt is valid.

## Authorities

- planning_repo_root: C:/Users/User/3KLife/docs/ai_atomic_framework
- planning_repo_is_external_to_target: true
- target_repo_root: C:/Users/User/AI-Atomic-Framework
- source_plan_path: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
- source_task_card_path: governance-optimization/tasks/ATM-GOV-0415-runtime-only-git-head-journal-with-tracked-digest-acceptance.task.md
- target_import_method: node atm.mjs tasks import --from <card> --dry-run --json

## Acceptance

- [ ] Raw `.atm/history/evidence/git-head.jsonl` is never required to be tracked by the normal pre-push acceptance path.
- [ ] A compact tracked digest/receipt contains owner, commit/candidate identity, source availability, and verifiable digest fields.
- [ ] Missing, stale, or owner-mismatched compact evidence fails closed with an executable recovery command; valid runtime-only raw storage does not block.
- [ ] Existing foreign staged work and historical raw evidence remain byte-preserved.
- [ ] Focused red/green evidence binds `test_runtime_only_git_head_digest_acceptance_0415` to the changed public seam and candidate commit.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-06T12:09:35.676Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0415-runtime-only-git-head-journal-with-tracked-digest-acceptance.task.md","contentDigest":"sha256:4e5b2c675c1e8aa897fac47dc04ffa820aaee6ebe2446de87373c4b5f5746a21"} -->
