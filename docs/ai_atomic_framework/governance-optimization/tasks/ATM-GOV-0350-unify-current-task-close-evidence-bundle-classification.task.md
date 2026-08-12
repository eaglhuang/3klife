---
task_id: ATM-GOV-0350
title: Unify current-task close evidence bundle classification
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  causalImpactEdges:
    - current-task-generated-evidence-to-close-bundle
    - current-task-generated-evidence-to-preclose-isolation
  validatorReferences:
    - test_atm_gov_0350_current_task_evidence_bundle_5d13c97a
  phaseOwner: Wave 3 recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target-repo
scopePaths:
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
  - packages/cli/src/commands/taskflow/current-task-close-evidence.ts
  - packages/cli/src/commands/taskflow/__tests__/current-task-close-evidence.spec.ts
deliverables:
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/historical-close-preflight.ts
  - packages/cli/src/commands/taskflow/current-task-close-evidence.ts
  - packages/cli/src/commands/taskflow/__tests__/current-task-close-evidence.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/current-task-close-evidence.spec.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0350_current_task_evidence_bundle_5d13c97a
    targetGroupId: null
    semanticKey: current_task_close_evidence_bundle
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [current-task-generated-evidence-to-close-bundle, current-task-generated-evidence-to-preclose-isolation]
    expectedRedPredicate: a task-owned generated reconciliation receipt is excluded from the close bundle or is reported as an unexpected staged file
    contributionResourceKey: taskflow-current-evidence-classification
    responsibility: task-required
    dependencyEdge: current-task-generated-evidence-to-close-bundle
    contractEdge: atm.taskflow.currentTaskCloseEvidence
    resourceKey: taskflow-current-evidence-classification
requiredTestCaseIds:
  - test_atm_gov_0350_current_task_evidence_bundle_5d13c97a
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the shared evidence classifier and its callers; foreign evidence remains fail-closed throughout.
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-current-close-evidence
  mapUpdates: []
  extractionCandidates:
    - atom: atm.taskflow-current-close-evidence
      pattern: Result Contract Object
      source: packages/cli/src/commands/taskflow/current-task-close-evidence.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-12T10:25:07.556Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-12T10:25:07.556Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-12T10-25-07-556Z-close-1ee0dac6e0e5"
lastTransitionAt: "2026-08-12T10:25:07.556Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "01d477ff5fd1bb9341ed4d6038d9bec84145562b"
---

# ATM-GOV-0350 Unify current-task close evidence bundle classification

## Intent

Repair the general closeout invariant that every current-task evidence artifact
recognized by the taskflow bundle is also recognized by pre-close isolation.
The observed failure is a successful governed commit that writes a
`*.live-index-reconciliation.json` receipt, while the next pre-close treats
that same current-task receipt as an unexpected staged file. This card owns a
schema- and ownership-based classifier, never a task-ID-specific allowlist.

## Acceptance

- [ ] ACC-1: One shared classifier returns current-task generated close evidence
  from its task identity and supported evidence schema/filename contract; both
  bundle assembly and pre-close consume that result.
- [ ] ACC-2: A current-task live-index reconciliation receipt is included in the
  governed bundle and is not reported as unexpected staged residue on a
  subsequent pre-close.
- [ ] ACC-3: A foreign task's evidence and an unknown/malformed current-task
  artifact are not silently admitted; existing foreign ownership isolation and
  fail-closed behavior remain intact.
- [ ] ACC-4: Repeating pre-close without external changes is idempotent: it
  neither creates an endless evidence-only delivery-commit loop nor widens the
  bundle beyond current-task governance evidence.

## Implementation Notes

- Extract `current-task-close-evidence.ts` as the Result Contract Object. It
  owns recognition and returns normalized relative paths; `commit-bundle-assembly`
  assembles and `historical-close-preflight` consumes it.
- Include only artifacts that are both task-identified and explicitly defined
  by the shared supported contract. Do not accept an arbitrary
  `.atm/history/evidence/<task>.*` glob.
- This is a private computation and must not introduce broker queueing,
  runner-sync, global scans, or a second lifecycle/evidence registry.
- Run the focused test first, then typecheck. Do not use a full repository
  validator as the task-required oracle.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-12T05:58:02.572Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0350-unify-current-task-close-evidence-bundle-classification.task.md","contentDigest":"sha256:c9aafea7aaf59ef227aeb4b07ba376d4a3a4022e4c990831b2568b666407a5c0"} -->
