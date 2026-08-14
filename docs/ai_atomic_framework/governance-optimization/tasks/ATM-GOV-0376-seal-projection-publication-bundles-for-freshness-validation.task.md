---
task_id: ATM-GOV-0376
title: Seal projection publication bundles for freshness validation
status: done
owner: codex-captain-recovery
priority: P0
depends_on: [ATM-GOV-0374, ATM-GOV-0375]
causalGraph:
  causalDependencies: [ATM-GOV-0374, ATM-GOV-0375]
  startConditions:
    - A generated projection becomes stale after a closeback that changes only generated projections and durable governance receipts.
  softRelations: [ATM-GOV-0360]
  changedPublicSeams: [atm.runbookCompletionEvidence.v1, atm.sealedProjectionPublicationBundle.v1]
  causalImpactEdges: [publication-only-freshness, projection-consumer-snapshot-parity, closeback-revalidation]
  parallelFrontierInputs: [sealed-observation-head, declared-publication-artifacts, durable-governance-receipts]
  validatorReferences: [compile-runbook-completion-evidence, validate-runbook-completion-evidence]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/compile-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
deliverables:
  - scripts/compile-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
validators:
  - node --strip-types tests/cli/runbook-completion-evidence.test.ts
  - node --strip-types scripts/compile-runbook-completion-evidence.ts --mode validate
testContributions:
  - caseId: test_atm_gov_0376_publication_bundle_replays_closeback_delta
    targetGroupId: test_group_plan4_final_certification
    semanticKey: declared_publication_bundle_allows_only_its_own_closeback_delta
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [publication-only-freshness, projection-consumer-snapshot-parity, closeback-revalidation]
    expectedRedPredicate: a projection validation rejects a descendant that contains only declared generated artifacts and durable governance receipts
    contributionResourceKey: runbook-projection-publication-bundle
    responsibility: task-required
    dependencyEdge: ATM-GOV-0374
    contractEdge: atm.sealedProjectionPublicationBundle.v1
    resourceKey: runbook-projection-publication-bundle
requiredTestCaseIds: [test_atm_gov_0376_publication_bundle_replays_closeback_delta]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the bundle contract and its generated projection together; never widen freshness acceptance for undeclared paths.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runbook-completion-evidence-projection
      pattern: Generated projection artifact
      source: docs/reports/plan-3x-4x-runbook-completion-evidence.json
      disposition: inline
      inlineReason: Generated evidence is an output of the sealed publication bundle, not an implementation module; extracting it would create a competing authority.
errorCodes: []
outOfScope:
  - Marking any runbook row, Wave exit, certificate dimension, or release verdict as complete.
  - Whitelisting a task id, commit SHA, or arbitrary report path in freshness control flow.
nonGoals:
  - Making the four-plan verdict proven.
completed_at: "2026-08-14T07:24:35.308Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T07:24:35.308Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T07-24-35-308Z-close-8448fb2e4a0b"
lastTransitionAt: "2026-08-14T07:24:35.308Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b67d5b35f8aa30f28d8e40e978ff958ccab29582"
---

# ATM-GOV-0376 Seal projection publication bundles for freshness validation

## Problem

The runbook completion projection declares that its own output and durable
governance receipts may form a publication-only descendant delta. In practice,
the same closeout also writes a related generated projection, so validation
rejects a semantically non-source delta and immediately makes the dashboard
stale again. Repeated regeneration cannot converge.

## Acceptance

- ACC-1 The projection schema records a sealed, data-declared publication
  bundle of every generated artifact that the publication transaction owns.
  Validation replays the observed target snapshot when and only when the
  descendant changes are inside that bundle or are durable governance receipts.
- ACC-2 A focused negative/positive regression proves that a declared bundle
  artifact plus `.atm/history/**` validates, while an undeclared source or
  authority input change remains stale and fails closed.
- ACC-3 Regenerated current output remains `not-complete` until the underlying
  112 rows, 11 exits, independent review, and remote release conditions are
  genuinely proven.

## Implementation boundary

Represent publication membership as evidence data owned by the projection, not
as task-specific path exceptions. Reuse one snapshot decision for compiler and
validator behavior. Do not consume the independent certificate as an input and
do not relax source, planning, remote, or authority freshness checks.
