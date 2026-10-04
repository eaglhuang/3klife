---
task_id: TASK-PRF-0119
title: Exclude unreachable schemas from the public npm runtime with clean-install proof
status: planned
owner: codex-gpt-5.4-mini
priority: P1
depends_on: []
causalGraph:
  startConditions:
    - clean negative-control tarball proves the exact three schema omissions preserve adopter-core behavior
    - foreign WIP in the target worktree has been arbitrated before shared mutation
  softRelations: [TASK-PRF-0097, TASK-PRF-0102, TASK-PRF-0107, TASK-PRF-0110]
  changedPublicSeams: [npm-runtime-asset-boundary, public-clean-install]
  causalImpactEdges: [bundle-unpacked-bytes, bundle-entry-count, clean-install-correctness, parallel-command-preservation]
  parallelFrontierInputs: [fixed-public-0.1.2-metrics, schema-omission-negative-control]
  validatorReferences:
    - tests/cli/adopter-artifact-budget.test.ts
    - tests/cli/npm-runtime-schema-omission.test.ts
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - tests/cli/npm-runtime-schema-omission.test.ts
deliverables:
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - tests/cli/adopter-artifact-budget.test.ts
  - tests/cli/npm-runtime-schema-omission.test.ts
validators:
  - node --strip-types tests/cli/adopter-artifact-budget.test.ts
  - node --strip-types tests/cli/npm-runtime-schema-omission.test.ts
  - npm run build --workspace @ai-atomic-framework/cli
  - node --strip-types scripts/validate-adopter-artifact-manifest.ts
  - clean npm pack plus clean consumer install and core command matrix
  - full 22-command --help --json matrix with zero candidate/reference mismatches
  - dependency footprint and fixed-version tarball/unpacked/entry receipt
  - npm run typecheck
testContributions:
  - caseId: test_prf0119_exact_schema_omission_allowlist
    targetGroupId: null
    semanticKey: exact_schema_omission_allowlist
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [bundle-unpacked-bytes, bundle-entry-count]
    expectedRedPredicate: an omitted path differs from the exact three approved schema paths, or a required source schema is absent from the repository runtime
    contributionResourceKey: npm-runtime-omission-allowlist
    responsibility: task-required
    dependencyEdge: npm-runtime-asset-boundary
    contractEdge: exact-omission-contract
    resourceKey: exact-schema-set
  - caseId: test_prf0119_clean_install_preserves_adopter_core
    targetGroupId: null
    semanticKey: clean_install_preserves_adopter_core
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [clean-install-correctness, parallel-command-preservation]
    expectedRedPredicate: clean candidate install cannot complete bootstrap/chart lifecycle or a public command/help surface is missing or behaviorally different
    contributionResourceKey: clean-install-core-matrix
    responsibility: task-required
    dependencyEdge: public-clean-install
    contractEdge: adopter-core-contract
    resourceKey: clean-consumer
  - caseId: test_prf0119_reduction_receipt_is_reproducible
    targetGroupId: null
    semanticKey: reduction_receipt_is_reproducible
    coversAcceptance: [ACC-5]
    coversImpactEdges: [bundle-unpacked-bytes, bundle-entry-count]
    expectedRedPredicate: formal release build does not reproduce at least 1.0 percent unpacked-byte reduction and four-entry reduction against fixed public 0.1.2, or metrics are not bound to tarball digest
    contributionResourceKey: fixed-version-size-receipt
    responsibility: task-required
    dependencyEdge: npm-runtime-asset-boundary
    contractEdge: reproducible-size-receipt
    resourceKey: size-receipt
  - caseId: test_prf0119_rollback_keeps_schema_assets_available
    targetGroupId: null
    semanticKey: rollback_keeps_schema_assets_available
    coversAcceptance: [ACC-6]
    coversImpactEdges: [clean-install-correctness]
    expectedRedPredicate: rollback or a missing-schema negative control cannot restore the prior package boundary without preserving all source schemas and prior artifact evidence
    contributionResourceKey: rollback-contract
    responsibility: task-required
    dependencyEdge: npm-runtime-asset-boundary
    contractEdge: rollback-preserves-source
    resourceKey: rollback
requiredTestCaseIds:
  - test_prf0119_exact_schema_omission_allowlist
  - test_prf0119_clean_install_preserves_adopter_core
  - test_prf0119_reduction_receipt_is_reproducible
  - test_prf0119_rollback_keeps_schema_assets_available
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed-fixed-version-tarball-and-clean-install-receipt
rollback:
  strategy: revert-commit
  notes: Remove only the exact omission allowlist and restore the prior release-build output; retain all failed receipts and external tarball evidence.
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-runtime-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0119 Exclude unreachable schemas from the public npm runtime with clean-install proof

## Intent

Formalize the already measured, narrow schema-omission candidate as a release
packaging change only. Remove three unreachable schema assets from the public
npm runtime while preserving the complete adopter-core workflow and all
multi-agent command surfaces. This card must produce a reproducible clean
tarball and dependency/size receipt; it must not claim that ATM is globally
slim or faster.

## Acceptance

- [ ] **ACC-1 — Exact boundary:** The formal release build excludes exactly
      `layout/schemas/registry.schema.json`,
      `layout/schemas/test-report.schema.json`, and
      `layout/schemas/test-report/metrics.schema.json`; no wildcard or
      source-repository deletion is allowed.
- [ ] **ACC-2 — Source and manifest integrity:** All source schemas remain
      present; the generated manifest, file count, bytes, and digests describe
      the actual tarball and do not silently list omitted paths.
- [ ] **ACC-3 — Clean install:** A clean consumer installs the candidate
      tarball and passes `--version`, `doctor --json`, `bootstrap --json`,
      `atm-chart render --json`, `atm-chart verify --json`, `tasks --help`,
      `broker status --json`, `integration list --json`, and the parameterized
      `create --dry-run --json` flow.
- [ ] **ACC-4 — Surface preservation:** All 22 public command
      `--help --json` invocations exit successfully and match fixed public
      `0.1.2` behavior; `tasks`, `broker`, and `taskflow` remain present and
      usable for multi-agent work.
- [ ] **ACC-5 — Measured reduction:** Against the fixed public `0.1.2`
      baseline, the formal candidate reproduces at least 1.0% unpacked-byte
      reduction and at least four fewer packed entries, with tarball digest,
      unpacked bytes, entries, dependency bytes/files, and npm dependency-path
      count recorded. Startup timing is recorded but is not declared improved
      unless a longer controlled AB run proves it.
- [ ] **ACC-6 — Stop and rollback:** Any missing required schema, command
      regression, dependency increase outside the measured receipt, or failure
      to reproduce the reduction blocks closure. Rollback is one revertable
      change; no publish, push, splitting, runtime download, benchmark, or
      historical evidence rewrite is included.

## Stop rules

If a schema becomes reachable from adopter-core, if the clean install fails,
if the 22-command matrix diverges, or if the formal build cannot reproduce the
negative-control reduction, retain the counter-evidence and stop. Do not add a
second package, code splitting, hidden download, or a new governance layer to
make this card pass.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T02:02:06.543Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0119-exclude-unreachable-schemas-from-the-public-npm-runtime-with-clean-install-proof.task.md","contentDigest":"sha256:83d23d939f4a2d147718b77611d31ebde8e74f41ade511fa3618fb9536e9b9cb"} -->
