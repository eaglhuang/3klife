---
task_id: TASK-PRF-0068
title: Measure complete dependency footprint bytes for npm proof
status: planned
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0060, TASK-PRF-0062, TASK-PRF-0067]
causalGraph:
  causalDependencies: [TASK-PRF-0060, TASK-PRF-0062, TASK-PRF-0067]
  startConditions:
    - "The current npm comparison records direct dependency names but no byte-accurate transitive dependency footprint from a clean consumer."
    - "The complete-runtime and entry-reduction cards are closed, so the missing dependency-cost measurement must be added without reopening their history."
  softRelations: [TASK-PRF-0056, TASK-PRF-0057]
  changedPublicSeams: [npm_dependency_footprint_evidence, clean_consumer_measurement]
  causalImpactEdges: [npm_cost_truthfulness, adopter_bundle_comparison]
  parallelFrontierInputs: [dependency_graph_resolution, byte_accounting, clean_install_isolation]
  validatorReferences: [test_prf0068_dependency_closure_bytes, test_prf0068_no_workspace_link, test_prf0068_negative_missing_dependency]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-candidate-npm-install.ts
  - scripts/validate-public-npm-install.ts
  - scripts/lib/npm-dependency-footprint.ts
  - tests/cli/npm-dependency-footprint.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-npm-dependency-footprint.md
deliverables:
  - scripts/validate-candidate-npm-install.ts
  - scripts/validate-public-npm-install.ts
  - scripts/lib/npm-dependency-footprint.ts
  - tests/cli/npm-dependency-footprint.test.ts
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-npm-dependency-footprint.md
validators:
  - npm run typecheck
  - npm run lint
  - npm run build
  - npm test
  - node --strip-types tests/cli/npm-dependency-footprint.test.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - node --strip-types scripts/validate-candidate-npm-install.ts --candidate-dir packages/cli --measurement-runs 3 --record-blocked
  - node --strip-types scripts/validate-public-npm-install.ts --version 0.1.0 --measurement-runs 3 --record-blocked
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0068-measure-complete-dependency-footprint-bytes-for-npm-proof.task.md --dry-run --json
testContributions:
  - caseId: test_prf0068_dependency_closure_bytes
    targetGroupId: null
    semanticKey: transitive_dependency_byte_accounting
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-6]
    coversImpactEdges: [npm_cost_truthfulness]
    expectedRedPredicate: "The report says dependency footprint is unchanged or complete while recording only direct dependency names and no resolved file-byte totals."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0060
    contractEdge: npm_dependency_footprint_evidence
    resourceKey: dependency-footprint
  - caseId: test_prf0068_no_workspace_link
    targetGroupId: null
    semanticKey: isolated_dependency_measurement
    coversAcceptance: [ACC-1, ACC-4]
    coversImpactEdges: [adopter_bundle_comparison]
    expectedRedPredicate: "A workspace link, pre-existing node_modules, npm cache, or unrelated consumer package is included in the measured dependency footprint."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0062
    contractEdge: clean_consumer_measurement
    resourceKey: clean-consumer
  - caseId: test_prf0068_negative_missing_dependency
    targetGroupId: null
    semanticKey: missing_transitive_dependency_negative
    coversAcceptance: [ACC-3, ACC-5]
    coversImpactEdges: [npm_cost_truthfulness]
    expectedRedPredicate: "An omitted or unresolved transitive dependency is silently counted as zero bytes or accepted as a valid comparison."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0067
    contractEdge: npm_dependency_footprint_evidence
    resourceKey: missing-dependency
requiredTestCaseIds: [test_prf0068_dependency_closure_bytes, test_prf0068_no_workspace_link, test_prf0068_negative_missing_dependency]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: clean-consumer-dependency-closure-byte-receipt
rollback:
  strategy: revert-commit-preserve-historical-size-receipts
  notes: "回滾只撤銷新的依賴量測與報告；保留 0060／0062 的歷史 receipts，不回寫其 acceptance 或 close 狀態。"
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.npm-dependency-footprint
      pattern: Policy Object
      source: scripts/lib/npm-dependency-footprint.ts
      disposition: extract
      inlineReason: null
errorCodes: []
acceptanceEvidence: '{"dependency-footprint-proof":{"id":"dependency-footprint-proof","claim":"Candidate and fixed public baseline dependency footprints are measured from isolated clean consumers as complete resolved file-byte closures.","authoritativeSources":["clean-consumer-filesystem","npm-dependency-tree","measurement-receipt"],"derivationRule":"resolve every transitive dependency and sum each unique regular file exactly once, excluding the subject package and external cache","requiredRealness":"sealed-replay","verifier":{"mode":"separate-actor"},"negativeControls":[{"id":"missing-dependency","expectedFailureReason":"unresolved dependency makes the footprint inconclusive"}],"missingDataVerdict":"inconclusive","closureCritical":true}}'
createdByCommand: atm plan card create
---

# TASK-PRF-0068 Measure complete dependency footprint bytes for npm proof

## Intent

The npm product objective requires a comparison of complete dependency
occupancy, not just the names or count of direct dependencies. Current 0060 and
0062 evidence lists `ajv` and `ajv-formats` on both sides but does not record
the resolved transitive closure, file bytes, entry count, or isolation proof.
That leaves a material cost dimension unmeasured and allows a false claim that
the bundle is smaller when the cost has merely moved into dependencies.

This card is an append-only evidence-contract repair. It must measure the
candidate and fixed public baseline from separate, freshly created clean
consumer directories, with no workspace links, pre-existing `node_modules`,
shared cache bytes, or unrelated packages included. The measurement must
resolve the complete npm dependency graph, de-duplicate files by canonical
path, and report both the dependency-only footprint and whole consumer
install footprint. Candidate/public identity, package payload, dependency
versions, Node/npm versions, install source, file counts, byte totals, and
tarball digests must be retained in a replayable receipt.

## Acceptance

- [ ] **ACC-1 — Complete closure:** For candidate and fixed baseline, resolve
      every installed direct and transitive dependency from a clean consumer;
      record package name/version/path, regular-file byte totals, file counts,
      symlink/junction treatment, and a deterministic dependency-closure digest.
- [ ] **ACC-2 — Separate cost dimensions:** The receipt reports package
      payload bytes, dependency-only footprint bytes, and whole consumer
      `node_modules` bytes separately. Dependency bytes are not inferred from
      package count or `package.json` names.
- [ ] **ACC-3 — Deterministic and complete:** Repeating the same exact tarball
      in the same clean-install protocol yields stable logical package and byte
      totals; missing or unresolved dependencies produce `inconclusive` or
      `blocked`, never zero or a passing comparison.
- [ ] **ACC-4 — Isolation:** Each arm starts from a new empty consumer with no
      workspace link, pre-existing install, unrelated dependency, or cache path
      counted. The receipt records Node/npm versions, package source, install
      command, and isolation checks.
- [ ] **ACC-5 — Historical negative preserved:** 0060／0062 reports and
      receipts remain byte-identical and are not reopened or retroactively
      promoted; the new report explicitly labels their dependency-byte field
      as missing evidence.
- [ ] **ACC-6 — Evidence quality:** typecheck, lint, build, full tests, focused
      dependency tests, and import dry-run pass. No npm publish, GitHub push,
      target-repo mutation, or task close is authorized by this planning card.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T08:51:00.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0068-measure-complete-dependency-footprint-bytes-for-npm-proof.task.md","contentDigest":"sha256:b1e8c18f268f2787befcbf4fd4d5e699131ef817f5532544b9a65a7955c118d2"} -->
