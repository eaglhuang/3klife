---
task_id: TASK-PRF-0010
title: Complete runtime evidence caller migration and Git boundary
status: done
owner: atm-evidence
priority: P0
depends_on: [TASK-PRF-0005]
causalGraph:
  causalDependencies: [TASK-PRF-0005]
  startConditions:
    - The PRF-0005 migration prototype and its legacy-read fallback remain available.
    - The caller inventory and tracked-size baseline are recorded before mutation.
  softRelations: [TASK-PRF-0006, TASK-PRF-0007]
  changedPublicSeams: [evidence-ledger-port, evidence-path-resolution, durable-receipt-boundary]
  causalImpactEdges:
    - runtime-evidence-writes-bypass-git-history
    - production-callers-use-one-ledger-boundary
    - durable-receipts-remain-offline-verifiable
  parallelFrontierInputs: [runtime-caller-inventory, tracked-evidence-baseline, receipt-retention-classification]
  validatorReferences:
    - test_prf_runtime_evidence_git_boundary_7d2c0e91
    - test_prf_production_caller_boundary_0adf812e
    - test_prf_checkpoint_restore_roundtrip_82e54a6b
  phaseOwner: phase-3-evidence-ledger-completion
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/evidence-ledger.ts
  - packages/core/src/evidence/index.ts
  - packages/plugin-sdk/src/governance/stores.ts
  - packages/plugin-governance-local/src/stores.ts
  - packages/plugin-governance-local/src/layout.ts
  - packages/cli/src/commands/evidence/
  - packages/cli/src/commands/governance-runtime.ts
  - packages/cli/src/commands/git-head-evidence.ts
  - scripts/validate-evidence-ledger-boundary.ts
  - scripts/migrate-evidence-ledger.ts
  - tests/cli/evidence-ledger-migration.test.ts
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - docs/EVIDENCE_LEDGER.md
deliverables:
  - packages/core/src/evidence/evidence-ledger.ts
  - packages/plugin-governance-local/src/stores.ts
  - packages/cli/src/commands/evidence/
  - scripts/validate-evidence-ledger-boundary.ts
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - docs/EVIDENCE_LEDGER.md
validators:
  - node --strip-types tests/cli/evidence-ledger-migration.test.ts
  - node --strip-types tests/cli/runtime-evidence-git-boundary.test.ts
  - node --strip-types scripts/validate-evidence-ledger-boundary.ts
testContributions:
  - caseId: test_prf_runtime_evidence_git_boundary_7d2c0e91
    targetGroupId: null
    semanticKey: runtime_evidence_git_boundary
    coversAcceptance: [ACC-1, ACC-2, ACC-6]
    coversImpactEdges: [runtime-evidence-writes-bypass-git-history]
    expectedRedPredicate: A clean-repository runtime command creates a Git-trackable ephemeral evidence payload.
    contributionResourceKey: runtime-evidence-store
    responsibility: task-required
    dependencyEdge: runtime-command-to-evidence-ledger
    contractEdge: durable-receipt-boundary
    resourceKey: evidence-ledger-root
  - caseId: test_prf_production_caller_boundary_0adf812e
    targetGroupId: null
    semanticKey: production_caller_boundary
    coversAcceptance: [ACC-3]
    coversImpactEdges: [production-callers-use-one-ledger-boundary]
    expectedRedPredicate: Production source outside the bounded legacy adapter directly references .atm/history/evidence.
    contributionResourceKey: evidence-caller-inventory
    responsibility: task-required
    dependencyEdge: production-caller-to-ledger-port
    contractEdge: evidence-path-resolution
    resourceKey: production-source-tree
  - caseId: test_prf_checkpoint_restore_roundtrip_82e54a6b
    targetGroupId: null
    semanticKey: checkpoint_restore_roundtrip
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [durable-receipts-remain-offline-verifiable]
    expectedRedPredicate: Export, fresh-store restore, offline resolve or digest verification changes identity or provenance.
    contributionResourceKey: evidence-checkpoint
    responsibility: task-required
    dependencyEdge: ledger-checkpoint-to-restore
    contractEdge: evidence-ledger-port
    resourceKey: immutable-evidence-store
requiredTestCaseIds:
  - test_prf_runtime_evidence_git_boundary_7d2c0e91
  - test_prf_production_caller_boundary_0adf812e
  - test_prf_checkpoint_restore_roundtrip_82e54a6b
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
  notes: Keep legacy reads and all pre-migration files intact until a fresh-store restore reproduces every sampled digest; revert caller routing without deleting either store.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-ledger-map
  mapUpdates: [atomic_workbench/maps/atm-evidence-ledger-map.json]
  newScriptsAllowed: false
  extractionCandidates:
    - atom: atm.evidence-ledger-path-policy
      pattern: Policy Object
      source: packages/cli/src/commands/evidence/evidence-store.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-10T14:21:47.873Z"
completed_by_agent: "codex-product-proof"
closedAt: "2026-09-10T14:21:47.873Z"
closedByActor: "codex-product-proof"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-10T14-21-47-873Z-close-c8d77c4696ad"
lastTransitionAt: "2026-09-10T14:21:47.873Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "34012f8120514f9ccfc1cec18dad09ac2d7ca8d7"
---

# TASK-PRF-0010 Complete runtime evidence caller migration and Git boundary

## Intent

Finish the migration that PRF-0005 began: make the Evidence Ledger the single
deep boundary for newly produced runtime evidence, while preserving a narrow
legacy read adapter and compact Git-tracked governance receipts.

## Acceptance

- [ ] ACC-1: Evidence classes are explicitly partitioned into ephemeral payloads, durable checkpoint receipts and bounded legacy inputs; only the durable allowlist is Git-eligible.
- [ ] ACC-2: In a clean fixture repository, representative evidence-producing commands write ephemeral payloads to the content-addressed ledger outside Git and `git status --porcelain` reports no such payload.
- [ ] ACC-3: Every production caller resolves paths or records through the Evidence Ledger boundary; a full production-source static scan permits `.atm/history/evidence` only in the bounded legacy reader and documented durable-receipt projection.
- [ ] ACC-4: Migration plus export/restore into a fresh store preserves digest, work-item identity and provenance for every migrated record, with corrupt or missing objects failing closed.
- [ ] ACC-5: `docs/EVIDENCE_LEDGER.md` defines retention, offline access, checkpoint/export, restore, garbage-collection safety and the exact non-destructive legacy cutover procedure, all backed by executable tests.
- [ ] ACC-6: No legacy evidence is deleted and no Git history is rewritten by this task; a measured before/after report states tracked count/bytes and the expected future-growth reduction separately from historical repository size.

## Out of scope

- Rewriting published Git history, force-pushing, deleting sealed legacy evidence, or publishing npm artifacts.
- Moving task/event authority out of the canonical ATM ledger.
- Treating all receipts as ephemeral; closure, release and checkpoint receipts remain durable when the retention policy requires them.

## Stop rule

Stop before cutover if any migrated digest or provenance changes, a fresh-store
restore fails, a runtime caller requires direct legacy writes, or the durable
receipt allowlist cannot be expressed without a second evidence authority.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-09T23:12:18.520Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0010-complete-runtime-evidence-caller-migration-and-git-boundary.task.md","contentDigest":"sha256:384144a3dd73111bf5f14ba0595afc972d3ee4d2381b63929431aa0483463093"} -->
