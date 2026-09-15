---
task_id: TASK-PRF-0106
title: Reduce governance readiness Git process startup
status: done
owner: atm-performance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0105 profiling identifies build-governance-readiness as a 500-550ms mandatory route cost
    - current dirty/staged classification behavior has a reproducible fixture
    - existing telemetry and external sink are available
  softRelations:
    - TASK-PRF-0105
    - TASK-PRF-0101
  changedPublicSeams:
    - atm.cli.next.governance-readiness
  causalImpactEdges:
    - governance-readiness-process-startup
    - multi-ai-dirty-ownership-classification
  parallelFrontierInputs:
    - TASK-PRF-0105
  validatorReferences:
    - governance-readiness-git-status-regression
  phaseOwner: null
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
  - tests/cli/governance-readiness-git-status.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - one reversible reduction of Git process startup in governance readiness
  - regression test proving staged, tracked-dirty, untracked, and ownership classifications remain unchanged
  - latency report update with same-runner AB/BA+A/A receipt and exact rerun command
  - external receipt kept outside Git history
validators:
  - node --strip-types tests/cli/governance-readiness-git-status.test.ts
  - npm run typecheck -- --pretty false
testContributions:
  - caseId: test_task_prf0106_git_status_classification_9a3e7c12
    targetGroupId: null
    semanticKey: governance_readiness_git_status_classification
    coversAcceptance: [ACC-1, ACC-3]
    coversImpactEdges: [governance-readiness-process-startup, multi-ai-dirty-ownership-classification]
    expectedRedPredicate: the single status parser changes staged, tracked-dirty, untracked, or ownership classification
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: multi-ai-dirty-ownership-classification
    contractEdge: atm.cli.next.governance-readiness
    resourceKey: governance-readiness
  - caseId: test_task_prf0106_git_status_latency_receipt_51c4e2a8
    targetGroupId: null
    semanticKey: governance_readiness_git_status_latency_receipt
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: [governance-readiness-process-startup]
    expectedRedPredicate: latency receipt is missing AB/BA+A/A evidence or records an unapproved new runtime surface
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: governance-readiness-process-startup
    contractEdge: external-receipt-boundary
    resourceKey: external-receipt
requiredTestCaseIds:
  - test_task_prf0106_git_status_classification_9a3e7c12
  - test_task_prf0106_git_status_latency_receipt_51c4e2a8
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
  notes: revert the single active-work-summary change and retain external failed measurements
atomizationImpact:
  ownerAtomOrMap: atm-cli-command-router
  mapUpdates:
    - atomic_workbench/maps/atm-cli-command-router/map.spec.json
  extractionCandidates:
    - atom: atm.cli.next.governance-readiness
      pattern: Policy Object
      source: packages/cli/src/commands/next/playbook-projection/active-work-summary.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-15T01:11:06.339Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-15T01:11:06.339Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-15T01-11-06-339Z-close-2e9c9e039c20"
lastTransitionAt: "2026-09-15T01:11:06.339Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "fb2a3ce767b9cedf51870797bbf9f8a2cc106128"
---

# TASK-PRF-0106 Reduce governance readiness Git process startup

## Intent

`build-governance-readiness` is currently the largest measured control-plane
substep on an explicit task route. `readDirtyWorktreeFiles` starts separate
Git processes for tracked changes and untracked files. Replace those reads with
one porcelain `git status --porcelain=v1 -z` call and a local parser, without
changing ownership, broker, claim, lock, or multi-AI private-read semantics.

## Method

1. Capture the current parser's classification and timing on a fixed fixture.
2. Implement the smallest single-process replacement.
3. Run the fixture and focused route tests, then typecheck.
4. Run 15 AB/BA pairs plus A/A controls in the external sink, recording p50,
   p95, cumulative milliseconds, and every classification.

## Acceptance

- [ ] ACC-1: staged, tracked-dirty, untracked, and mixed-path classifications
      match the baseline fixture exactly.
- [ ] ACC-2: same-runner governance-readiness p50 decreases at least 20% and
      p95 does not regress by more than 10%; otherwise mark inconclusive and
      stop expanding the change.
- [ ] ACC-3: foreign, unowned, and current-agent dirty ownership results remain
      unchanged, preserving multi-AI parallel private reads.
- [ ] ACC-4: no new ATM command, gate, registry, daemon, database, or state
      source is introduced; receipt and raw runtime evidence stay external.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T19:38:57.170Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0106-reduce-governance-readiness-git-process-startup.task.md","contentDigest":"sha256:1dfc4aacdbe9b215812d18eaf9c461ed9f8d7be715bcacb84629df72d4bf3c48"} -->
