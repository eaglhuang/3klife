---
task_id: TASK-PRF-0062
title: Re-establish measured entry reduction after complete runtime closure
status: done
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0060]
causalGraph:
  causalDependencies: [TASK-PRF-0060]
  startConditions:
    - "A complete candidate exists whose clean-consumer core workflow passes, but the fixed 0.1.0 comparison shows fewer than 15% entry reduction."
    - "The five chart schema assets restored by TASK-PRF-0052 remain required and are covered by the candidate manifest."
  softRelations: [TASK-PRF-0053, TASK-PRF-0061]
  changedPublicSeams: [public_cli_runtime_boundary, adopter_bundle_measurement]
  causalImpactEdges: [complete_public_install, adopter_bundle_size]
  parallelFrontierInputs: [candidate-runtime-build, baseline-registry-receipt, clean-consumer-measurement]
  validatorReferences: [test_prf_complete_runtime_entry_reduction, test_prf_required_runtime_asset_closure, test_prf_boundary_negative_fixture, test_prf_boundary_provenance]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm-public.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/build-package-dist.ts
  - scripts/validate-public-npm-install.ts
  - tests/cli/npm-clean-install.test.ts
  - tests/cli/external-benchmark-protocol.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - packages/cli/dist
  - docs/reports/atm-runtime-boundary-entry-reduction.md
  - .atm/history/evidence/TASK-PRF-0062.*
  - .atm/history/task-events/TASK-PRF-0062/**
  - .atm/history/tasks/TASK-PRF-0062.json
deliverables:
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-public-npm-install.ts
  - tests/cli/npm-clean-install.test.ts
  - tests/cli/external-benchmark-protocol.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - packages/cli/dist/npm-runtime/manifest.json
  - docs/reports/atm-runtime-boundary-entry-reduction.md
validators:
  - npm run build --workspace packages/cli
  - npm run typecheck
  - npm run lint
  - node --strip-types tests/cli/npm-clean-install.test.ts
  - node --strip-types tests/cli/external-benchmark-protocol.test.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types scripts/validate-public-npm-install.ts --measure --package @ai-atomic-framework/cli --baseline-version 0.1.0 --candidate-dir packages/cli --measurement-runs 3 --measurement-output C:\\Users\\User\\atm-benchmark-sink\\TASK-PRF-0062\\baseline-vs-complete-candidate-measurement.json
testContributions:
  - caseId: test_prf_complete_runtime_entry_reduction
    semanticKey: complete_runtime_entry_reduction
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [complete_public_install, adopter_bundle_size]
    expectedRedPredicate: "A candidate that passes the full core workflow but does not reach the fixed 20% unpacked-byte and 15% entry-count reductions is accepted or reported as green."
    responsibility: task-required
    contractEdge: adopter_bundle_measurement
    resourceKey: clean-consumer-measurement
  - caseId: test_prf_required_runtime_asset_closure
    semanticKey: required_runtime_asset_closure
    coversAcceptance: [ACC-1, ACC-3]
    coversImpactEdges: [complete_public_install]
    expectedRedPredicate: "Removing any chart schema required by bootstrap, atm-chart render, or atm-chart verify still produces a passing candidate or an incomplete manifest."
    responsibility: task-required
    contractEdge: public_cli_runtime_boundary
    resourceKey: runtime-asset-manifest
  - caseId: test_prf_boundary_negative_fixture
    semanticKey: boundary_negative_fixture
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [complete_public_install, adopter_bundle_size]
    expectedRedPredicate: "A candidate using extra runtime downloads, code-splitting without a sealed disposition, or omitted required files is reported as blocked rather than accepted."
    responsibility: task-required
    contractEdge: public_cli_runtime_boundary
    resourceKey: negative-boundary-fixture
  - caseId: test_prf_boundary_provenance
    semanticKey: boundary_provenance
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [adopter_bundle_size]
    expectedRedPredicate: "A measurement receipt without fixed baseline, candidate digest, clean-consumer status, or command matrix can be presented as product proof."
    responsibility: task-required
    contractEdge: adopter_bundle_measurement
    resourceKey: measurement-receipt
requiredTestCaseIds:
  - test_prf_complete_runtime_entry_reduction
  - test_prf_required_runtime_asset_closure
  - test_prf_boundary_negative_fixture
  - test_prf_boundary_provenance
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: clean-consumer-measurement-with-fixed-baseline-and-negative-coverage
rollback:
  strategy: revert-commit-preserve-external-receipt
  notes: "只回滾本卡的 runtime boundary、validator、測試與報告；保留外部 measurement receipt 和 0049/0052 歷史 provenance，不刪除未知來源的 release 產物。"
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.public-runtime-asset-closure
      pattern: Policy Object
      source: scripts/build-cli-npm-runtime.ts
      disposition: extract
      inlineReason: null
    - atom: atm.public-runtime-measurement-contract
      pattern: Policy Object
      source: scripts/validate-public-npm-install.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T06:07:03.662Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T06:07:03.662Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T06-07-03-662Z-close-70a695d1f167"
lastTransitionAt: "2026-09-14T06:07:03.662Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "bac08a4b8353d4c3fc071ee834394aa09ab92c30"
---

# TASK-PRF-0062 Re-establish measured entry reduction after complete runtime closure

## Intent

TASK-PRF-0052 restored the chart schema assets needed for a complete public
runtime. That repair made the current candidate functionally complete, but a
fresh comparison against the fixed public `0.1.0` baseline measures only 8.97%
entry reduction (71 versus 78 entries), while the historical 0049 candidate
reached 15.38% only by omitting those required assets. This card addresses the
remaining product gap without reopening 0049: find a general, self-contained
runtime boundary that preserves all required behavior and reaches the existing
20% unpacked-byte / 15% entry-count targets, or produce a fail-closed stop
receipt if that trade-off is not safe.

The implementation must begin with reachable command and asset contracts. It
must not add runtime downloads, silently omit required files, alter acceptance
thresholds, or enable code-splitting merely to improve a counter. Candidate and
public-registry evidence remain separate; this card does not authorize npm
publication or GitHub push.

## Acceptance

- [ ] ACC-1: A clean consumer installs the candidate without workspace links or
      source residue and completes `version`, `doctor`, `bootstrap`,
      `atm-chart render`, and `atm-chart verify`; each command records exit
      code, module-resolution state, and output digest.
- [ ] ACC-2: Against the fixed public `@ai-atomic-framework/cli@0.1.0`
      baseline, the same candidate records tarball bytes, unpacked bytes, entry
      count, dependency footprint, startup p50/p95, Node/npm versions, and
      exact candidate/baseline digests; acceptance requires at least 20%
      unpacked-byte and 15% entry-count reduction.
- [ ] ACC-3: The candidate manifest proves every runtime asset required by the
      complete core workflow is present and hash-bound. Missing-asset,
      extra-download, and unsealed code-splitting negative fixtures fail closed.
- [ ] ACC-4: The result preserves one self-contained npm runtime and does not
      claim slimming when either reduction threshold or functional equivalence
      fails. If no safe design meets both thresholds, the retained receipt says
      `unproven` and records the stop reason without weakening the contract.
- [ ] ACC-5: Candidate evidence is explicitly separated from public-registry
      evidence and includes an offline replay command; no local candidate result
      can be labeled as a public release proof.
- [ ] ACC-6: Build, typecheck, lint, focused contract tests, and the
      baseline/candidate measurement validator pass; all raw evidence stays
      outside Git and the report links the receipt digest and rollback path.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T05:25:58.332Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0062-re-establish-measured-entry-reduction-after-complete-runtime-closure.task.md","contentDigest":"sha256:fb0d7d894de3bb5c6c20d747ab0a0ce6dfd49708ff34354532d7059b2b692e67"} -->
