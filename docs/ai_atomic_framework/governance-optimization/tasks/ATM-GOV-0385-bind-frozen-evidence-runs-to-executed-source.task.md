---
task_id: ATM-GOV-0385
title: Bind all local evidence command runs to their executed source commit
status: planned
owner: atm-evidence
priority: P0
causalGraph:
  startConditions: [Frozen-runner command receipts can pass while omitting sourceCommit, so independent completion evidence fails closed.] 
  softRelations: [ATM-GOV-0380, ATM-GOV-0381]
  changedPublicSeams: [atm.commandRunProvenance.v1]
  causalImpactEdges: [frozen-runner-source-attribution, evidence-cache-identity, runbook-receipt-freshness]
  parallelFrontierInputs: [command-run-normalizer, evidence-receipts, runbook-completion-report]
  validatorReferences: [command-runs.spec, runbook-completion-evidence]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/evidence/command-runs.ts
  - packages/cli/src/commands/evidence/__tests__/command-runs.spec.ts
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop
deliverables:
  - packages/cli/src/commands/evidence/command-runs.ts
  - packages/cli/src/commands/evidence/__tests__/command-runs.spec.ts
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop
validators:
  - node --strip-types packages/cli/src/commands/evidence/__tests__/command-runs.spec.ts
  - npm run typecheck
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
testContributions:
  - caseId: test_atm_gov_0385_frozen_runner_source_provenance
    targetGroupId: test_group_plan3x4x_wave_0
    semanticKey: frozen_runner_command_run_source_provenance
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [frozen-runner-source-attribution, evidence-cache-identity, runbook-receipt-freshness]
    expectedRedPredicate: a local frozen-runner receipt without an explicit sourceCommit omits executed HEAD or collides in cache identity
    contributionResourceKey: evidence-command-runs
    responsibility: task-required
    contractEdge: atm.commandRunProvenance.v1
    resourceKey: evidence-command-runs
requiredTestCaseIds: [test_atm_gov_0385_frozen_runner_source_provenance]
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert producer and focused test together; never infer a missing sourceCommit in a consumer.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope: [Backfilling existing receipts, treating an external execution as local, changing runbook completion policy]
nonGoals: [Making an absent or unverifiable source commit pass]
---

# ATM-GOV-0385 Bind all local evidence command runs to their executed source commit

## Problem

`normalizeEvidenceCommandRuns` reads the current commit but attaches it only to
`dev-source` runs. A locally executed `frozen-runner` command therefore emits a
successful receipt with no source provenance. Consumers correctly reject that
receipt, but no consumer can repair the missing producer fact.

## Acceptance

- [ ] ACC-1 Every locally executed evidence command run records the verified
  current HEAD when the caller did not supply an explicit source commit,
  regardless of whether it uses the frozen or development runner.
- [ ] ACC-2 A supplied source commit remains authoritative and the cache key
  uses the exact resolved provenance value.
- [ ] ACC-3 External or unverifiable execution remains without local provenance
  and is rejected by consumers that require it.
