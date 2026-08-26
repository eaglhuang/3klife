---
task_id: ATM-GOV-0373
title: Allow committed task context for evidence-only closeback
status: done
owner: codex-gpt-5.4-mini
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The historical delivery commit and the committed task ledger are available for a Git-backed closeback fixture.
  softRelations: [ATM-GOV-0350, ATM-GOV-0362]
  changedPublicSeams: [atm.protectedEvidenceContext.v1]
  causalImpactEdges: [historical-closeback-to-evidence-commit, committed-context-to-hook-admission]
  parallelFrontierInputs: [historical-delivery-commit, evidence-only-closeback-bundle]
  validatorReferences: [hook-batch-evidence-context]
  phaseOwner: wave-3-closeback-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/hook/pre-commit/committed-task-context.ts
  - packages/cli/src/commands/hook/pre-commit/support.ts
  - scripts/validate-hook-batch-evidence-context.ts
deliverables:
  - packages/cli/src/commands/hook/pre-commit/committed-task-context.ts
  - packages/cli/src/commands/hook/pre-commit/support.ts
  - scripts/validate-hook-batch-evidence-context.ts
validators:
  - node --strip-types scripts/validate-hook-batch-evidence-context.ts
  - npm run typecheck
testContributions:
  - caseId: test_committed_task_context_allows_evidence_only_closeback_0373
    targetGroupId: test_group_plan4_final_certification
    semanticKey: committed_task_context_allows_only_exact_single_task_evidence_closeback
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [historical-closeback-to-evidence-commit, committed-context-to-hook-admission]
    contributionResourceKey: protected-evidence-context
    responsibility: task-required
    dependencyEdge: historical-closeback-context
    contractEdge: atm.protectedEvidenceContext.v1
    resourceKey: protected-evidence-context
    expectedRedPredicate: evidence-only closeback with a valid committed task context is rejected, or a missing/mismatched/multi-task context is admitted.
requiredTestCaseIds: [test_committed_task_context_allows_evidence_only_closeback_0373]
tddMode: required
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the committed-context resolver and its hook integration together; evidence-only closeback then remains fail-closed.
atomizationImpact:
  ownerAtomOrMap: atm.protected-evidence-context
  mapUpdates: []
  extractionCandidates:
    - atom: atm.committed-task-context-resolver
      pattern: Result Contract Object
      source: packages/cli/src/commands/hook/pre-commit/support.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-26T23:19:01.851Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-26T23:19:01.851Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-26T23-19-01-851Z-close-8316344014f4"
lastTransitionAt: "2026-08-26T23:19:01.851Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9b68f75ea"
---

# ATM-GOV-0373 Allow committed task context for evidence-only closeback

## Intent

Repair the general protected-evidence admission rule for a closeback whose
delivery and authoritative task context are already committed.  The hook must
accept an evidence-only candidate only when every staged evidence payload has
one identical semantic task id and a canonical committed ledger context proves
that exact task.  It must continue to reject absent, malformed, mismatched,
ambiguous and multi-task evidence.  It must not infer authority from a filename
or encode a task-specific exception.

## Acceptance

- [ ] ACC-1: A staged evidence-only closeback for exactly one semantic task is
  accepted when `HEAD` contains a parseable authoritative ledger for the same
  `workItemId`; the resolver returns attributable committed-context facts rather
  than a boolean guessed from a path.
- [ ] ACC-2: Missing ledger, malformed ledger, ledger/evidence identity mismatch,
  multiple semantic task ids, and mixed staged task contexts remain rejected by
  the same hook finding family.
- [ ] ACC-3: Existing staged-ledger/staged-event and nested-evidence behavior
  remains green; the focused command is command-backed evidence for the card.
- [ ] ACC-4: `ATM-GOV-0372` can commit its evidence-only closeback bundle through
  the normal governed commit path after this repair; no raw index edit,
  `--no-verify`, task-id allowlist, or direct task close is used.

## Atom map

The pre-commit facade is 594 lines before this work and would exceed the module
ceiling if it absorbed committed-history parsing.  Extract a result-contract
atom that owns: semantic task-id normalization, authoritative `HEAD` ledger
lookup, exact identity comparison, and failure reason assembly.  The facade
only combines staged and committed contexts.  This leaves future context
sources replaceable and preserves a single public hook decision seam.

## Stop rules

- Never admit context solely from a filename, a working-tree ledger, or a stale
  runtime lock.
- Never make a missing Git object, read error, or ambiguous evidence a pass.
- Do not alter foreign staged entries or manually edit `.atm/history/**`.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T02:34:13.536Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0373-allow-committed-task-context-for-evidence-only-closeback.task.md","contentDigest":"sha256:7b31f0b98dbd17c3dcfaf5090407c456e28ff4a4ee4a0cb1d497caad03bb05dd"} -->
