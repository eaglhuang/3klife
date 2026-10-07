---
task_id: TASK-PRF-0129
title: Stop writing runtime git-head evidence into Git history
status: done
owner: atm-product-proof
priority: P1
depends_on: []
causalGraph:
  causalDependencies: [TASK-PRF-0010]
  startConditions: []
  softRelations: [ATM-GOV-0416, TASK-PRF-0092, TASK-PRF-0093]
  changedPublicSeams: [git-head-runtime-evidence-write-boundary, governed-commit-provenance]
  causalImpactEdges:
    - new-runtime-git-head-evidence-is-not-committed
    - git-metadata-retains-task-and-actor-provenance
    - legacy-tracked-receipts-remain-readable
  parallelFrontierInputs: [git-head-evidence-writer-inventory, commit-candidate-path-inventory, current-tracked-evidence-footprint]
  validatorReferences:
    - test_prf_git_head_runtime_evidence_is_not_tracked_20261006
    - test_prf_git_commit_provenance_without_runtime_receipt_20261006
    - test_prf_git_head_legacy_read_compatibility_20261006
  phaseOwner: phase-runtime-evidence-boundary
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .atm/history/evidence/git-head.json
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/git-process-port.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/commit-candidate-preparation.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/git-governance/implementation/record-bundle-inspection.ts
  - packages/cli/src/commands/git-governance/work-admission-check.ts
  - packages/cli/src/commands/hook/pre-commit/input-state.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/core/src/broker/work-admission-ticket.ts
  - tests/cli/git-head-runtime-only-receipt.test.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/git-record-commit.test.ts
  - packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts
  - scripts/test-catalog.config.json
  - docs/EVIDENCE_LEDGER.md
deliverables:
  - packages/cli/src/commands/git-head-evidence.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/git-process-port.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/commit-candidate-preparation.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/git-governance/implementation/record-bundle-inspection.ts
  - packages/cli/src/commands/git-governance/work-admission-check.ts
  - packages/cli/src/commands/hook/pre-commit/input-state.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/core/src/broker/work-admission-ticket.ts
  - tests/cli/git-head-runtime-only-receipt.test.ts
  - scripts/test-catalog.config.json
  - docs/EVIDENCE_LEDGER.md
  - .atm/history/evidence/git-head.json
validators:
  - node --strip-types tests/cli/git-head-runtime-only-receipt.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/git-record-commit.test.ts
  - node --strip-types packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts
  - node --strip-types scripts/validate-evidence-ledger-boundary.ts
  - npm run check:encoding:touched
testContributions:
  - caseId: test_prf_git_head_runtime_evidence_is_not_tracked_20261006
    targetGroupId: null
    semanticKey: git_head_runtime_only
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [new-runtime-git-head-evidence-is-not-committed]
    expectedRedPredicate: A real governed commit writes or stages a git-head runtime receipt under .atm/history/evidence.
    contributionResourceKey: git-head-evidence-store
    responsibility: task-required
    dependencyEdge: commit-operation-to-runtime-evidence
    contractEdge: git-head-runtime-evidence-write-boundary
    resourceKey: temporary-git-index-and-tree
  - caseId: test_prf_git_commit_provenance_without_runtime_receipt_20261006
    targetGroupId: null
    semanticKey: git_commit_provenance_without_receipt
    coversAcceptance: [ACC-3]
    coversImpactEdges: [git-metadata-retains-task-and-actor-provenance]
    expectedRedPredicate: Removing the runtime receipt removes actor or task attribution from the actual commit metadata/trailers.
    contributionResourceKey: governed-commit-provenance
    responsibility: task-required
    dependencyEdge: commit-metadata-to-provenance
    contractEdge: governed-commit-provenance
    resourceKey: temporary-git-commit
  - caseId: test_prf_git_head_legacy_read_compatibility_20261006
    targetGroupId: null
    semanticKey: git_head_legacy_read_compatibility
    coversAcceptance: [ACC-4]
    coversImpactEdges: [legacy-tracked-receipts-remain-readable]
    expectedRedPredicate: A previously written legacy tracked receipt can no longer be read where a compatibility consumer still requires it.
    contributionResourceKey: git-head-legacy-reader
    responsibility: task-required
    dependencyEdge: legacy-receipt-to-compatible-reader
    contractEdge: git-head-legacy-read-compatibility
    resourceKey: legacy-fixture-receipt
  - caseId: test_prf_git_head_boundary_footprint_20261006
    targetGroupId: null
    semanticKey: git_head_boundary_footprint
    coversAcceptance: [ACC-5]
    coversImpactEdges: [new-runtime-git-head-evidence-is-not-committed]
    expectedRedPredicate: The evidence documentation or test catalog omits the runtime-only boundary, or tracked-history bytes are conflated with future-growth reduction.
    contributionResourceKey: git-head-evidence-boundary-report
    responsibility: task-required
    dependencyEdge: runtime-evidence-boundary-to-measurement
    contractEdge: git-head-runtime-evidence-write-boundary
    resourceKey: tracked-evidence-inventory
requiredTestCaseIds:
  - test_prf_git_head_runtime_evidence_is_not_tracked_20261006
  - test_prf_git_commit_provenance_without_runtime_receipt_20261006
  - test_prf_git_head_legacy_read_compatibility_20261006
  - test_prf_git_head_boundary_footprint_20261006
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract, deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore the prior writer/stager behavior and tracked current snapshot in one revert; do not rewrite history or delete legacy evidence.
atomizationImpact:
  ownerAtomOrMap: atm.git-head-evidence-path-policy
  mapUpdates: [docs/EVIDENCE_LEDGER.md]
  newScriptsAllowed: false
  extractionCandidates:
    - atom: atm.git-head-evidence-path-policy
      pattern: Policy Object
      source: packages/cli/src/commands/git-head-evidence.ts
      disposition: inline
      inlineReason: Owner's first-principles directive prioritizes reducing retained complexity; reuse the existing evidence-path seam, add no new abstraction or gate, and extract only if doing so reduces total code and runtime cost.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0129 Stop writing runtime git-head evidence into Git history

## Intent

Remove mutable, command-produced git-head runtime receipts from the tracked
`.atm/history/evidence` surface and stop staging them during governed commits or
pre-commit hooks. Keep attribution in existing Git commit metadata and
`ATM-*` trailers. New observations remain local under `.atm/runtime/telemetry`;
legacy tracked receipts remain read-only compatibility inputs. This is a
behavioral successor to TASK-PRF-0010 and ATM-GOV-0416, whose old contract
explicitly allowed compact tracked receipts. It does not rewrite published Git
history; historical purge is a separate owner-approved operation.

## Acceptance

- [ ] ACC-1: A real governed commit in a fresh temporary Git repository records new git-head evidence only under the runtime-local telemetry store. No new tracked `.atm/history/evidence/git-head.json` or `git-head.jsonl` is written.
- [ ] ACC-2: Task-scoped candidate preparation, index staging, record-bundle inspection, and pre-commit hook all agree on the runtime-only boundary. The test inspects both `git diff --cached` and the resulting commit tree; neither contains a newly generated git-head runtime receipt. Remove the currently tracked mutable `.atm/history/evidence/git-head.json` from HEAD in the same scoped delivery.
- [ ] ACC-3: The actual commit retains existing actor/task `ATM-*` trailers and normal Git author/committer, parent, and tree metadata; removing the runtime receipt does not weaken attribution or required closeout evidence.
- [ ] ACC-4: Any consumer that still needs a historical git-head snapshot can read a legacy fixture without writing, staging, or refreshing it. Runtime-only mode is the default for new observations.
- [ ] ACC-5: Update the existing evidence-ledger documentation and focused test catalog for the changed boundary. Report current tracked receipt bytes/count and expected future-growth reduction separately; do not claim that historical Git objects were removed.

## Out of scope and stop rule

- Do not filter or rewrite published Git history, force-push, delete legacy task/closure evidence, change npm packaging, or publish a release.
- Do not add a public command, second ledger, persistent cache, daemon, or required gate, or weaken deletion/rename commit, stale-base, or multi-agent attribution guards.
- Stop before implementation if actor/task trailers cannot prove the provenance presently supplied by the compact receipt, if any supported recovery flow requires the receipt to be mutable and tracked, or if the runtime-only receipt cannot be recovered from the documented local evidence store.
- A separate historical-history purge plan must quantify affected refs/tags/clones, preserve a recoverable backup, and obtain explicit Owner authorization before any rewrite or push.

## Rollback

Revert the scoped writer/stager and regression changes together, restoring the prior tracked snapshot behavior. Preserve the external test evidence and do not rewrite prior history.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-10-06T04:11:35.665Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0129-stop-writing-runtime-git-head-evidence-into-git-history.task.md","contentDigest":"sha256:96de539f752290d91117b4331f36150dc5de79bb95de925e1286c6ef0e415d60"} -->
