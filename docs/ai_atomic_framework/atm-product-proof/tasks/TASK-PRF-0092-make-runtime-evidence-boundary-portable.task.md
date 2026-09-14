---
task_id: TASK-PRF-0092
title: Make the runtime evidence boundary portable across clean clones
status: done
owner: atm-evidence
priority: P0
depends_on: [TASK-PRF-0010]
causalGraph:
  causalDependencies: [TASK-PRF-0010]
  startConditions:
    - TASK-PRF-0091 audit is retained as the baseline for tracked counts and bytes.
    - No history rewrite, deletion, redaction, or migration cutover is authorized by this card.
    - A clean-clone fixture must not inherit the operator's .git/info/exclude.
  softRelations: [TASK-PRF-0070, TASK-PRF-0071, TASK-PRF-0072]
  changedPublicSeams: [repository-ignore-boundary, runtime-evidence-validator]
  causalImpactEdges:
    - clean-clone-runtime-evidence-remains-untracked
    - validator-rejects-tracked-runtime-ledger
    - historical-footprint-separated-from-future-growth
  parallelFrontierInputs: [runtime-ledger-path-policy, tracked-history-baseline, retention-classification]
  validatorReferences:
    - test_prf_clean_clone_ignores_runtime_ledger_4f0c8d21
    - test_prf_validator_rejects_tracked_runtime_ledger_7b6f3e10
    - test_prf_history_baseline_is_non_destructive_1a8e5c42
  phaseOwner: phase-3-evidence-ledger-completion
planning_repo_root: C:/Users/User/3KLife
planning_repo_is_external_to_target: true
source_plan_path: docs/ai_atomic_framework/atm-product-proof/atm-product-proof-plan.md
source_task_card_path: docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0092-make-runtime-evidence-boundary-portable.task.md
target_repo_root: C:/Users/User/AI-Atomic-Framework
target_import_method: node atm.mjs tasks import --from <this-card> --dry-run --json
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .gitignore
  - scripts/validate-evidence-ledger-boundary.ts
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - tests/cli/evidence-ledger-migration.test.ts
  - docs/EVIDENCE_LEDGER.md
  - docs/reports/evidence-ledger-boundary-baseline.md
deliverables:
  - .gitignore
  - scripts/validate-evidence-ledger-boundary.ts
  - tests/cli/runtime-evidence-git-boundary.test.ts
  - tests/cli/evidence-ledger-migration.test.ts
  - docs/EVIDENCE_LEDGER.md
  - docs/reports/evidence-ledger-boundary-baseline.md
validators:
  - node --strip-types tests/cli/runtime-evidence-git-boundary.test.ts
  - node --strip-types tests/cli/evidence-ledger-migration.test.ts
  - node --strip-types scripts/validate-evidence-ledger-boundary.ts
  - npm run typecheck
testContributions:
  - caseId: test_prf_clean_clone_ignores_runtime_ledger_4f0c8d21
    targetGroupId: null
    semanticKey: clean_clone_runtime_ledger_ignore
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [clean-clone-runtime-evidence-remains-untracked]
    expectedRedPredicate: A clean fixture repository without local excludes reports a runtime-ledger payload as untracked.
    contributionResourceKey: repository-ignore
    responsibility: task-required
    dependencyEdge: runtime-ledger-path-to-git-ignore
    contractEdge: portable-runtime-boundary
    resourceKey: clean-clone-fixture
  - caseId: test_prf_validator_rejects_tracked_runtime_ledger_7b6f3e10
    targetGroupId: null
    semanticKey: tracked_runtime_ledger_rejection
    coversAcceptance: [ACC-3]
    coversImpactEdges: [validator-rejects-tracked-runtime-ledger]
    expectedRedPredicate: The boundary validator returns success when a runtime-ledger path is tracked or not ignored by the repository.
    contributionResourceKey: evidence-boundary-validator
    responsibility: task-required
    dependencyEdge: runtime-ledger-to-boundary-validator
    contractEdge: fail-closed-runtime-boundary
    resourceKey: validator-contract
  - caseId: test_prf_history_baseline_is_non_destructive_1a8e5c42
    targetGroupId: null
    semanticKey: non_destructive_history_baseline
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [historical-footprint-separated-from-future-growth]
    expectedRedPredicate: A baseline report omits tracked legacy files or presents future-growth reduction as historical shrinkage.
    contributionResourceKey: history-baseline-report
    responsibility: task-required
    dependencyEdge: legacy-inventory-to-retention-report
    contractEdge: non-destructive-migration-boundary
    resourceKey: migration-baseline
requiredTestCaseIds:
  - test_prf_clean_clone_ignores_runtime_ledger_4f0c8d21
  - test_prf_validator_rejects_tracked_runtime_ledger_7b6f3e10
  - test_prf_history_baseline_is_non_destructive_1a8e5c42
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the ignore/validator/docs commit as one governed unit; retain the 0091 baseline and all legacy evidence. Do not delete or rewrite history during rollback.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-ledger-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates: []
errorCodes: []
completed_at: "2026-09-14T13:47:23.833Z"
completed_by_agent: "codex-product-proof"
closedAt: "2026-09-14T13:47:23.833Z"
closedByActor: "codex-product-proof"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T13-47-23-833Z-close-dd52db22f822"
lastTransitionAt: "2026-09-14T13:47:23.833Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "473425e09d5ee0f6134866450737e0fca099c4cb"
---

# TASK-PRF-0092 Make the runtime evidence boundary portable across clean clones

## Intent

Make the existing runtime Evidence Ledger boundary portable and fail-closed.
The repository must carry its own ignore rule and validator contract so that a
new clone does not depend on an operator-local `.git/info/exclude`. The card
must preserve the distinction between future runtime growth and the historical
legacy evidence already present in Git.

## Known false-green in the current test

The existing `runtime-evidence-git-boundary.test.ts` creates a fixture
`.gitignore` containing `.atm/runtime/` before it writes runtime evidence. That
fixture cannot detect the current target defect (the target repository
`.gitignore` lacks `.atm/runtime/evidence-ledger/`). The implementation must
remove this injected-rule assumption and assert the repository-owned rule in a
fresh clone with global and local excludes disabled.

## Acceptance

- [ ] ACC-1: `.gitignore` contains a repository-owned rule covering
  `.atm/runtime/evidence-ledger/`, and a clean fixture with no local excludes
  confirms that runtime bundles, records and work-item indexes are ignored.
- [ ] ACC-2: The runtime boundary test proves the ignore source is the checked-in
  `.gitignore`, not `.git/info/exclude`, and verifies runtime evidence remains
  readable while `git status --porcelain` stays empty.
- [ ] ACC-3: `validate-evidence-ledger-boundary.ts` fails closed when any runtime
  ledger path is tracked or when the repository-owned ignore rule is absent;
  the existing durable legacy allowlist remains unchanged.
- [ ] ACC-4: A baseline report records the TASK-PRF-0091 counts and bytes,
  explicitly labels them as historical, and reports future Git growth avoided
  separately. It must not claim that history was shrunk.
- [ ] ACC-5: Documentation states the clean-clone requirement, retention
  classes, non-destructive rollback, and that history rewrite requires a later
  owner-authorized migration card with export/restore evidence.

## Out of scope

- Deleting, redacting, relocating, or rewriting `.atm/history/evidence`.
- Force-pushing, repacking published history, changing the durable receipt
  allowlist, publishing npm artifacts, or starting the external A/B benchmark.
- Changing ATM task/event authority or introducing a second evidence store.

## Stop rule

Stop before implementation is considered complete if the clean fixture relies
on local Git excludes, if a tracked runtime-ledger path is accepted, if the
baseline report conflates future growth with historical shrinkage, or if any
legacy evidence is modified.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create (dependency correction)","createdAt":"2026-09-14T13:39:00.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0092-make-runtime-evidence-boundary-portable.task.md","contentDigest":"sha256:b120a2e9b8618f2e64fa151be4876d6e59e3a1ebce65a14a4c292caa8f1b893b"} -->
