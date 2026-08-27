---
task_id: TASK-PRF-0005
title: Migrate runtime evidence to the Evidence Ledger
status: done
owner: atm-evidence
priority: P1
series: PRF
series_reason: Closest approved family because evidence storage cost and integrity are ATM product-proof outcomes.
depends_on: [TASK-PRF-0004]
causalGraph:
  causalDependencies: [TASK-PRF-0004]
  startConditions:
    - Public npm clean-install proof is green.
    - Legacy evidence inventory, caller inventory and content digests are sealed.
  softRelations: [TASK-PRF-0006]
  changedPublicSeams: [evidence-ledger-port, evidence-resolution, evidence-retention-boundary]
  causalImpactEdges:
    - callers-do-not-know-legacy-evidence-path
    - evidence-resolves-by-immutable-digest
    - recovery-restores-verifiable-evidence
  parallelFrontierInputs: [legacy-evidence-caller-inventory, legacy-evidence-size-and-history-baseline]
  validatorReferences:
    - test_prf_evidence_ledger_contract_2f0b97d1
    - test_prf_legacy_path_guard_a6cd3014
    - test_prf_evidence_restore_drill_03c7f66e
  phaseOwner: phase-3-evidence-ledger-migration
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/evidence-ledger.ts
  - packages/core/src/evidence/index.ts
  - packages/cli/src/commands/evidence/evidence-store.ts
  - packages/plugin-governance-local/src/stores.ts
  - packages/plugin-sdk/src/governance/stores.ts
  - scripts/validate-evidence-ledger-boundary.ts
  - scripts/migrate-evidence-ledger.ts
  - tests/cli/evidence-ledger-migration.test.ts
  - docs/reports/evidence-ledger-migration-manifest.json
deliverables:
  - packages/core/src/evidence/evidence-ledger.ts
  - packages/cli/src/commands/evidence/evidence-store.ts
  - packages/plugin-governance-local/src/stores.ts
  - packages/plugin-sdk/src/governance/stores.ts
  - scripts/validate-evidence-ledger-boundary.ts
  - scripts/migrate-evidence-ledger.ts
  - tests/cli/evidence-ledger-migration.test.ts
  - docs/reports/evidence-ledger-migration-manifest.json
validators:
  - node --strip-types tests/cli/evidence-ledger-migration.test.ts
  - node --strip-types scripts/validate-evidence-ledger-boundary.ts
testContributions:
  - caseId: test_prf_evidence_ledger_contract_2f0b97d1
    targetGroupId: null
    semanticKey: evidence_ledger_contract
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [evidence-resolves-by-immutable-digest]
    expectedRedPredicate: Append, resolve, verify or checkpoint depends on the legacy Git path or changes digest.
    contributionResourceKey: evidence-ledger-port
    responsibility: task-required
    dependencyEdge: evidence-command-to-ledger-adapter
    contractEdge: evidence-ledger-port
    resourceKey: evidence-store
  - caseId: test_prf_legacy_path_guard_a6cd3014
    targetGroupId: null
    semanticKey: legacy_evidence_path_guard
    coversAcceptance: [ACC-3]
    coversImpactEdges: [callers-do-not-know-legacy-evidence-path]
    expectedRedPredicate: Runtime source outside the legacy adapter directly references .atm/history/evidence.
    contributionResourceKey: evidence-path-inventory
    responsibility: task-required
    dependencyEdge: runtime-caller-to-evidence-adapter
    contractEdge: evidence-retention-boundary
    resourceKey: source-tree
  - caseId: test_prf_evidence_restore_drill_03c7f66e
    targetGroupId: null
    semanticKey: evidence_restore_drill
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [recovery-restores-verifiable-evidence]
    expectedRedPredicate: Exported evidence cannot be restored and verified with matching digest and provenance.
    contributionResourceKey: evidence-migration-manifest
    responsibility: task-required
    dependencyEdge: migration-export-to-recovery
    contractEdge: evidence-resolution
    resourceKey: immutable-evidence-store
requiredTestCaseIds:
  - test_prf_evidence_ledger_contract_2f0b97d1
  - test_prf_legacy_path_guard_a6cd3014
  - test_prf_evidence_restore_drill_03c7f66e
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract, deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: dual-read-revert
  notes: Retain the export and temporary legacy read adapter until restore proof passes; never delete either store during rollback.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-ledger-map
  mapUpdates: [atomic_workbench/maps/atm-evidence-ledger-map.json]
  newScriptsAllowed: true
  extractionCandidates:
    - atom: atm.evidence-ledger-port
      pattern: Ports and Adapters
      source: packages/cli/src/commands/evidence/evidence-store.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-27T16:20:19.094Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-27T16:20:19.094Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-27T16-20-19-094Z-close-ae497cc051cc"
lastTransitionAt: "2026-08-27T16:20:19.094Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "76f77a9395fe4e5f5c35cca79fea668bebcfd6b5"
---

# TASK-PRF-0005 Migrate runtime evidence to the Evidence Ledger

## Intent

Move runtime evidence behind a small replaceable ledger contract while
preserving immutable identity, integrity, offline behavior and recovery.

## Acceptance

- [ ] ACC-1: `append`, `resolve`, `verify` and `checkpoint` are exposed through a provider-neutral Evidence Ledger port.
- [ ] ACC-2: A content-addressed local adapter writes new runtime evidence outside Git while preserving digest and provenance.
- [ ] ACC-3: No runtime caller references `.atm/history/evidence` outside the bounded legacy read adapter, and a static guard prevents regression.
- [ ] ACC-4: The migration manifest maps sealed legacy records to identical resolved digests in the new store.
- [ ] ACC-5: Retention, access, offline behavior, checkpointing and a restore drill are documented and command-backed.

## Out of scope

- Rewriting Git history or deleting legacy evidence before restore proof.
- Introducing a second task, error-code or evidence authority.

## Stop rule

Stop before disabling legacy reads if any sampled record changes digest,
provenance cannot be reconstructed, or the restore drill fails. Git history
rewrite requires a separate owner-approved task after this card closes.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-20T14:42:31.885Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0005-migrate-runtime-evidence-to-the-evidence-ledger.task.md","contentDigest":"sha256:cf47762092f9bc878fa58e7677037aab552c9fe18d44532cc338577e7705dd84"} -->
