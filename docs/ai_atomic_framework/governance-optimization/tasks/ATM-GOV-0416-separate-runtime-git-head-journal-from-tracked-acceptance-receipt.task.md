---
task_id: ATM-GOV-0416
title: Separate runtime git-head journal from tracked acceptance receipt
status: done
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
  - .gitignore
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/hook/pre-push/**
  - packages/cli/src/commands/hook/pre-commit/**
  - scripts/validate-git-head-evidence.ts
  - tests/cli/git-head-admission-owner-boundary.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-head-runtime-only-receipt.test.ts
deliverables:
  - .gitignore
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/hook/pre-push/**
  - packages/cli/src/commands/hook/pre-commit/**
  - scripts/validate-git-head-evidence.ts
  - tests/cli/git-head-admission-owner-boundary.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-head-runtime-only-receipt.test.ts
validators:
  - node --strip-types tests/cli/git-head-admission-owner-boundary.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/git-head-runtime-only-receipt.test.ts
  - npm run typecheck
  - npm run validate:git-head-evidence
  - npm run validate:cli:surface
errorCodes: []
testContributions:
  - caseId: test_runtime_only_git_head_digest_acceptance_0416
    targetGroupId: null
    semanticKey: runtime_only_git_head_digest_acceptance
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [git-head-evidence-boundary]
    responsibility: task-required
    contractEdge: git-head-evidence-contract
requiredTestCaseIds:
  - test_runtime_only_git_head_digest_acceptance_0416
tddMode: required
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore compatibility reads while retaining any already-published compact receipts; do not delete runtime archives.
atomizationImpact:
  ownerAtomOrMap: atm.git-head-evidence-boundary
  mapUpdates: []
  extractionCandidates: []
createdByCommand: atm plan card create
completed_at: "2026-09-06T12:57:50.058Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-06T12:57:50.058Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-06T12-57-50-058Z-close-9bc058599e95"
lastTransitionAt: "2026-09-06T12:57:50.058Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c7eff27dc2d1cfad9e70982c2bd5cedd1fb95f45"
---

# ATM-GOV-0416 Separate runtime git-head journal from tracked acceptance receipt

## Intent

Move high-volume git-head JSONL to an ignored runtime-only location while keeping
a compact, owner-bound tracked receipt for pre-push and close acceptance. Preserve
compatibility reads for legacy evidence and report missing or stale compact evidence
with an executable recovery command.

## Acceptance

- [ ] Raw JSONL is runtime-local and gitignored; normal acceptance never requires it to be tracked.
- [ ] A compact tracked receipt records owner, commit/candidate identity, source availability, and SHA-256 digest fields.
- [ ] Missing, stale, malformed, or owner-mismatched compact receipts fail closed with a recovery command; valid runtime-only raw storage does not block.
- [ ] Foreign staged work and historical raw evidence remain byte-preserved, with legacy reads retained.
- [ ] Red/green evidence binds `test_runtime_only_git_head_digest_acceptance_0416` to the changed public seam and candidate commit.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-06T12:29:53.746Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0416-separate-runtime-git-head-journal-from-tracked-acceptance-receipt.task.md","contentDigest":"sha256:67d35046906fd552b514c8d7ea22cedd189f0798578a8174d9a599f1d69895ec"} -->
