---
task_id: ATM-GOV-0393
title: Make scope amendments atomically reseal delivery authority
status: done
owner: cursor-captain
priority: P0
depends_on: []
causalGraph:
  changedPublicSeams:
    - tasks-scope-add
    - work-admission-ticket
    - task-scoped-delivery-bundle
  causalImpactEdges:
    - scope-amendment -> canonical-authority-snapshot -> work-admission-ticket -> delivery-bundle
  parallelFrontierInputs:
    - Does not touch runner publication, release mirrors, or shared git index policy
  validatorReferences:
    - tests/cli/scope-amendment-work-admission-ticket.test.ts
  phaseOwner: Wave-1-framework-foundation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/legacy/implementation.ts
  - packages/cli/src/commands/tasks/scope-amendment/implementation.ts
  - packages/cli/src/commands/tasks/claim-work-admission.ts
  - packages/cli/src/commands/tasks/__tests__/scope-amendment-work-admission-ticket.test.ts
  - tests/cli/scope-amendment-work-admission-ticket.test.ts
deliverables:
  - packages/cli/src/commands/tasks/scope-amendment/implementation.ts
  - packages/cli/src/commands/tasks/claim-work-admission.ts
  - tests/cli/scope-amendment-work-admission-ticket.test.ts
validators:
  - node --strip-types packages/cli/src/commands/tasks/__tests__/scope-amendment-work-admission-ticket.test.ts
  - node --strip-types tests/cli/scope-amendment-work-admission-ticket.test.ts
  - npm run typecheck
testContributions:
  - caseId: scope_amendment_reseals_ticket_atomically_0393
    semanticKey: scope-amendment-authority-projection
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [scope-amendment -> canonical-authority-snapshot -> work-admission-ticket -> delivery-bundle]
    expectedRedPredicate: an added in-scope delivery path changes scope authority but remains absent from the ticket and governed bundle
    responsibility: task-required
    contractEdge: tasks-scope-add
  - caseId: scope_amendment_partial_projection_fails_closed_0393
    semanticKey: scope-amendment-no-partial-authority
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [scope-amendment -> canonical-authority-snapshot -> work-admission-ticket -> delivery-bundle]
    expectedRedPredicate: a ticket reseal failure leaves ledger or direction-lock scope changed while the command reports success
    responsibility: task-required
    contractEdge: work-admission-ticket
requiredTestCaseIds:
  - scope_amendment_reseals_ticket_atomically_0393
  - scope_amendment_partial_projection_fails_closed_0393
tddMode: required
methodProfiles:
  - expand-contract
atomizationImpact:
  ownerAtomOrMap: atm.task-scope-authority-projection
  mapUpdates: []
  extractionCandidates:
    - atom: atm.task-scope-authority-projection
      pattern: Transaction Script
      source: packages/cli/src/commands/tasks/legacy/implementation.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_WRITE_TICKET_SCOPE_VIOLATION
    disposition: reuse
    category: work-admission
    trigger: A current scope path is absent from the active delivery ticket.
    retryable: false
    requiresHumanApproval: false
    recovery: node atm.mjs tasks scope add --task <task-id> --add <path> --json
    sourceOwner: packages/cli/src/commands/tasks/scope-amendment/implementation.ts
    registryOwnerTask: ATM-GOV-0393
    tests:
      - tests/cli/scope-amendment-work-admission-ticket.test.ts
createdByCommand: atm plan card create
completed_at: "2026-08-15T09:14:47.371Z"
completed_by_agent: "cursor-captain"
closedAt: "2026-08-15T09:14:47.371Z"
closedByActor: "cursor-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-15T09-14-47-371Z-close-92eec6042a93"
lastTransitionAt: "2026-08-15T09:14:47.371Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "60e4daba481712972fd4fd34cf764575c05f2914"
---

# ATM-GOV-0393 Make scope amendments atomically reseal delivery authority

## Intent

Fix backlog `ATM-BUG-2026-08-13-023`: `tasks scope add` can update the ledger and direction lock but leave the work-admission ticket unchanged. A later governed delivery commit may omit the newly authorised file yet report success. The repair must project one canonical amended authority snapshot to every consumer atomically, or fail without changing any consumer-visible representation.

Planning authority: `C:/Users/User/3KLife/docs/ai_atomic_framework`. Target and closure authority: `C:/Users/User/AI-Atomic-Framework`.

The legacy task adapter is over the extraction budget. Extract the scope-amendment transaction boundary into the existing `scope-amendment` module; do not add another independent ticket resolver.

## Acceptance

- [ ] ACC-1: A successful normal `tasks scope add` reseals the active work-admission ticket from the same canonical amended scope snapshot used for the ledger, claim, and direction lock.
- [ ] ACC-2: A governed commit after an amendment includes an added delivery path when that path is in the amended task scope; the commit result cannot report unqualified success with a candidate narrower than the active ticket.
- [ ] ACC-3: The test reproduces the historical sequence (`claim -> amend scope -> write an added file -> governed commit`) and proves red before the repair and green after it.
- [ ] ACC-4: If ticket resealing, transition writing, or direction-lock projection fails, `tasks scope add` fails closed and leaves all authority representations at the same prior generation; no partial success receipt is written.
- [ ] ACC-5: The repair is generic over task ids, actors, paths, and lane ids; it reuses the existing `ATM_WRITE_TICKET_SCOPE_VIOLATION` contract rather than adding task-specific branches.

## Constraints

- Use the existing `issueWorkAdmissionTicket` / `resolveTaskWorkAdmissionFiles` authority path. Do not recreate ticket fields in the scope command.
- Do not touch runner publication, release outputs, pre-push attestation, shared index reconciliation, or other active cards.
- Do not use raw Git or hand-edit `.atm/**`. Use normal ATM claim/evidence/close/commit.
- Before the first commit, record the extraction proposal and preserve the legacy facade as routing only.

## Evidence and rollback

Bind TDD red/green evidence to both declared case IDs. Record the ticket digest/generation, allowed-file sets for ledger/direction lock/ticket, and the governed commit candidate set. Rollback is one revert commit restoring the original transaction boundary; the test must remain to document the defect until a successor explicitly retires it.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T15:16:52.556Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0393-make-scope-amendments-atomically-reseal-delivery-authority.task.md","contentDigest":"sha256:60b1da902e847bb5792fa5fc437d93e97434e7c59b035620e5714a6f1268e235"} -->
