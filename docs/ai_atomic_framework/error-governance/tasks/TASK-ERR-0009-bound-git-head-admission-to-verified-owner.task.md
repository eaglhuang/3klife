---
task_id: TASK-ERR-0009
title: Bound git-head admission to the verified receipt owner
status: planned
owner: atm-captain
priority: P0
depends_on: [TASK-ERR-0008]
causalGraph:
  changedPublicSeams: [work-admission-ticket-file-write-grants]
  causalImpactEdges: [renew-to-index-ownership-preservation]
  parallelFrontierInputs: [staged-git-head-receipt]
  validatorReferences: [test_git_head_admission_owner_boundary_0009, typecheck, validate:cli]
  phaseOwner: ATM-GOV-0328
related_plan: error-governance/error-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/claim-work-admission.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - tests/cli/git-head-admission-owner-boundary.test.ts
deliverables:
  - packages/cli/src/commands/tasks/claim-work-admission.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - tests/cli/git-head-admission-owner-boundary.test.ts
validators:
  - node --strip-types tests/cli/git-head-admission-owner-boundary.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_git_head_admission_owner_boundary_0009
    semanticKey: git_head_admission_owner_boundary
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [renew-to-index-ownership-preservation]
    expectedRedPredicate: renewing an unrelated task grants file-write for a foreign staged git-head receipt
    responsibility: task-required
    contractEdge: work-admission-ticket-file-write-grants
requiredTestCaseIds: [test_git_head_admission_owner_boundary_0009]
phaseTestCaseIds: [typecheck]
tddMode: required
methodProfiles: [repair-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.work-admission-ticket
  mapUpdates: []
  extractionCandidates:
    - atom: atm.git-head-owner-grant
      pattern: Policy
      source: packages/cli/src/commands/tasks/claim-work-admission.ts
      disposition: inline
      inlineReason: Receipt-owner grant is a small policy inside the existing admission deep module; a second grant facade would split authority.
createdByCommand: atm plan card create
---

# TASK-ERR-0009 Bound git-head admission to the verified receipt owner

## Intent

Repair the global lifecycle grant that currently adds
`.atm/history/evidence/git-head.jsonl` to every task's write ticket. A staged
receipt is a shared index artifact with one verified owner; renewing or claiming
an unrelated task must never transfer that ownership.

## Acceptance

- [ ] ACC-1: Ordinary claim and renew tickets do not contain `git-head.jsonl`
  merely because it is a lifecycle artifact.
- [ ] ACC-2: A task receives an exact git-head grant only when the canonical
  ownership provider verifies that task as the current receipt owner.
- [ ] ACC-3: With a staged receipt owned by task A, renewing task B preserves
  A as owner and B's ticket cannot authorize a commit or lease over that path.
- [ ] ACC-4: The owner task can still renew and safely close its own receipt;
  no broad waiver, actor exception, or filename-only inference is introduced.
- [ ] ACC-5: Regression, typecheck, and CLI validation are recorded as
  command-backed evidence.

## Engineering method

- First principles: file-write authority follows verified ownership, never
  convenience or a live index side effect.
- Deep module: one admission-grant policy decides whether git-head belongs in a
  ticket; callers receive only the final grant set.
- Preserve existing fail-closed behavior when ownership cannot be verified.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T11:57:00.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0009-bound-git-head-admission-to-verified-owner.task.md"} -->
