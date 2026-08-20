---
task_id: TASK-ERR-0015
title: Bind taskflow close blockers to canonical authority snapshots and registered recovery contracts
status: done
owner: atm-captain
priority: P1
depends_on: []
causalGraph:
  startConditions: [taskflow-close-codes-are-emitted-but-not-canonically-registered]
  softRelations: [ATM-GOV-0398, ATM-GOV-0369]
  changedPublicSeams: [taskflow-error-code-registry-contract]
  causalImpactEdges: [taskflow-blocker-to-canonical-registry-recovery, registered-code-to-generated-operator-documentation]
  parallelFrontierInputs: [docs/governance/error-code-registry.json]
  validatorReferences: [test_taskflow_error_registry_projection_0015]
  phaseOwner: correction-wave-closeout-unblock
related_plan: error-governance/error-governance-plan.md
planning_repo: C:\Users\User\3KLife\docs\ai_atomic_framework
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths: [docs/governance/error-code-registry.json, docs/ERROR_CODES.md, packages/core/src/error-code-registry.generated.ts, tests/cli/taskflow-close-error-code-registry.test.ts]
deliverables: [docs/governance/error-code-registry.json, docs/ERROR_CODES.md, packages/core/src/error-code-registry.generated.ts, tests/cli/taskflow-close-error-code-registry.test.ts]
validators: [npm run generate:error-codes, node --strip-types tests/cli/taskflow-close-error-code-registry.test.ts]
testContributions:
  - caseId: test_taskflow_error_registry_projection_0015
    semanticKey: taskflow_close_blockers_have_canonical_operator_contracts
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [taskflow-blocker-to-canonical-registry-recovery, registered-code-to-generated-operator-documentation]
    expectedRedPredicate: the taskflow close blocker codes are absent from the registry or their generated projections do not contain the exact contracts
    responsibility: task-required
    contractEdge: taskflow-error-code-registry-contract
requiredTestCaseIds: [test_taskflow_error_registry_projection_0015]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the registry and generated documentation together; do not hand-edit generated documentation.
atomizationImpact:
  ownerAtomOrMap: atm.error-code-registry
  mapUpdates: []
  extractionCandidates:
    - atom: atm.error-code-registry
      pattern: Registry Projection
      source: docs/governance/error-code-registry.json
      disposition: inline
      inlineReason: Registry entries and generated operator documentation are one existing atomic projection boundary; this card changes only three records and must keep them generated together.
errorCodes:
  - code: ATM_TASKFLOW_PRECLOSE_BLOCKED
    disposition: register
    category: taskflow
    trigger: taskflow pre-close discovers one or more blocking readiness conditions
    retryable: true
    requiresHumanApproval: false
    recovery: inspect the named blocker and execute that blocker's own registry-derived recovery
    sourceOwner: packages/cli/src/commands/taskflow/implementation.ts
    registryOwnerTask: TASK-ERR-0015
    tests: [test_taskflow_error_registry_projection_0015]
  - code: ATM_TASKFLOW_CLOSE_WRITE_NOT_READY
    disposition: register
    category: taskflow
    trigger: taskflow close dry-run finds write-readiness blockers
    retryable: true
    requiresHumanApproval: false
    recovery: inspect write readiness and execute the named blocker's own registry-derived recovery before retrying close
    sourceOwner: packages/cli/src/commands/taskflow/implementation.ts
    registryOwnerTask: TASK-ERR-0015
    tests: [test_taskflow_error_registry_projection_0015]
  - code: ATM_TASKFLOW_CLOSE_OWNED_DIRTY_PENDING
    disposition: register
    category: taskflow
    trigger: taskflow close finds task-owned files classified blocking by the canonical dirty authority snapshot
    retryable: true
    requiresHumanApproval: false
    recovery: inspect the named owned blocking files and reconcile, deliver, or remove the actual blocker through its governing taskflow route
    sourceOwner: packages/cli/src/commands/taskflow/implementation.ts
    registryOwnerTask: TASK-ERR-0015
    tests: [test_taskflow_error_registry_projection_0015]
createdByCommand: atm plan card create
completed_at: "2026-08-20T17:26:23.385Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-20T17:26:23.385Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-20T17-26-23-385Z-close-400fb4ef848e"
lastTransitionAt: "2026-08-20T17:26:23.385Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3432fa95d568432a3f96eda181ffa8b07b5955e2"
---

# TASK-ERR-0015 Bind taskflow close blockers to canonical authority snapshots and registered recovery contracts

## Intent

Three taskflow close error codes currently control operator behaviour without a
canonical registry contract. The adjacent implementation follow-up belongs to
ATM-GOV-0398; this card owns only the shared registry and generated-document
contract that lets that implementation derive recovery from its own code.

## Acceptance

- [ ] ACC-1 Register the three declared taskflow codes with exact trigger,
  category, retryability, approval rule, source owner, and code-specific
  recovery. A recovery must not be borrowed from an adjacent blocker.
- [ ] ACC-2 Regenerate and validate generated ErrorCode documentation from the
  registry; no generated file is hand-edited.
- [ ] ACC-3 OWNED_DIRTY_PENDING applies only to files classified blocking by
  the canonical dirty authority snapshot. Advisory files may be reported but
  cannot become close blockers.

## Out of scope

- Taskflow implementation and fixtures; ATM-GOV-0398 owns that source seam.
- Runner publication, build, task close, certificate, or release work.
- Any card-, actor-, date-, or filename-specific registry rule.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T15:43:21.371Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0015-bind-taskflow-close-blockers-to-canonical-authority-snapshots-and-registered-recovery-contracts.task.md","contentDigest":"sha256:5bed7bb2777994ce8de13f4985ad191c0af037c932456fe81e6815e751ef8813"} -->
