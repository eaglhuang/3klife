---
task_id: TASK-PRF-0070
title: Classify and externalize runtime execution evidence without breaking governance provenance
status: planned
owner: atm-evidence-steward
priority: P1
depends_on: [TASK-PRF-0005, TASK-PRF-0010]
causalGraph:
  causalDependencies: [TASK-PRF-0005, TASK-PRF-0010]
  startConditions:
    - "Existing evidence-ledger migration and caller-boundary cards are closed, but tracked evidence inventory still mixes governance receipts with raw runtime/provider output."
    - "No deletion, history rewrite, or evidence relocation may begin until classification, external-copy integrity, and restore/replay gates are specified."
  softRelations: [TASK-PRF-0055, TASK-PRF-0064, TASK-PRF-0067]
  changedPublicSeams: [runtime_evidence_retention_boundary, evidence_restore_reference]
  causalImpactEdges: [runtime-evidence-writes-bypass-git-history, durable-receipts-remain-offline-verifiable, evidence-provenance-preserved]
  parallelFrontierInputs: [tracked-evidence-inventory, evidence-classification-rules, external-sink-capability]
  validatorReferences: [test_prf0070_classification_contract, test_prf0070_copy_digest_restore, test_prf0070_negative_controls]
  phaseOwner: phase-3-evidence-ledger-completion
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .atm/history/evidence/**
  - docs/reports/**
  - packages/core/src/evidence/**
  - packages/cli/src/commands/evidence/**
  - packages/plugin-governance-local/src/**
  - scripts/collect-ci-burn-in-evidence.ts
  - scripts/measure-product-ci-burn-in.ts
  - scripts/validate-public-npm-install.ts
  - scripts/run-atm-external-benchmark.ts
  - .gitignore
deliverables:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-runtime-evidence-classification-and-externalization-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-runtime-evidence-classification-and-externalization-spec.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-dispatch-brief.md
planningArtifacts:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-runtime-evidence-classification-and-externalization-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-runtime-evidence-classification-and-externalization-spec.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-dispatch-brief.md
planningReadOnlyPaths:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-runtime-evidence-classification-and-externalization-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-runtime-evidence-classification-and-externalization-spec.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0070-dispatch-brief.md
validators:
  - node atm.mjs next --prompt "TASK-PRF-0070 runtime evidence classification and externalization" --json
  - node atm.mjs doctor --json
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0070-classify-and-externalize-runtime-execution-evidence-without-breaking-governance-provenance.task.md --dry-run --json
  - node --strip-types tests/cli/evidence-ledger-migration.test.ts
  - node --strip-types scripts/validate-evidence-ledger-boundary.ts
  - git diff --check -- .atm/history/evidence docs/reports packages/core/src/evidence packages/cli/src/commands/evidence
testContributions:
  - caseId: test_prf0070_classification_contract
    targetGroupId: null
    semanticKey: runtime_evidence_classification_contract
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [evidence-provenance-preserved]
    expectedRedPredicate: "A tracked evidence item is moved or deleted without an explicit retention class, owner, digest, and provenance policy."
    contributionResourceKey: evidence-classification-manifest
    responsibility: task-required
    dependencyEdge: TASK-PRF-0010
    contractEdge: runtime_evidence_retention_boundary
    resourceKey: evidence-inventory
  - caseId: test_prf0070_copy_digest_restore
    targetGroupId: null
    semanticKey: external_copy_digest_restore
    coversAcceptance: [ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [runtime-evidence-writes-bypass-git-history, durable-receipts-remain-offline-verifiable]
    expectedRedPredicate: "An externalized payload cannot be restored, replayed, and verified against its source digest and immutable reference."
    contributionResourceKey: external-evidence-sink
    responsibility: task-required
    dependencyEdge: TASK-PRF-0005
    contractEdge: evidence_restore_reference
    resourceKey: restore-drill
  - caseId: test_prf0070_negative_controls
    targetGroupId: null
    semanticKey: evidence_externalization_negative_controls
    coversAcceptance: [ACC-7, ACC-8]
    coversImpactEdges: [evidence-provenance-preserved]
    expectedRedPredicate: "Missing external artifact, digest mismatch, governance receipt relocation, or raw runtime output retained in Git is reported as FAIL/BLOCKED rather than silently accepted."
    contributionResourceKey: evidence-retention-policy
    responsibility: task-required
    dependencyEdge: TASK-PRF-0010
    contractEdge: runtime_evidence_retention_boundary
    resourceKey: negative-controls
requiredTestCaseIds: [test_prf0070_classification_contract, test_prf0070_copy_digest_restore, test_prf0070_negative_controls]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: "This card defines a planning-only classification and migration contract; target implementation and red/green tests are deferred until the Owner lifts the planning-only exception."
tddExemptions: [planning-only, external-evidence-migration-design]
methodProfiles: [expand-contract]
evidence:
  required: runtime-evidence-classification-external-copy-digest-and-restore-proof
rollback:
  strategy: dual-store-no-delete
  notes: "Keep every source path and existing ledger receipt intact. If copy, digest, restore, or replay fails, discard only the proposed migration manifest and retain the original Git history; never delete or rewrite evidence in this card."
atomizationImpact:
  ownerAtomOrMap: atm.evidence-ledger-map
  mapUpdates: [atomic_workbench/maps/atm-evidence-ledger-map.json]
  newScriptsAllowed: false
  extractionCandidates:
    - atom: atm.evidence-retention-classifier
      pattern: Policy Object
      source: packages/core/src/evidence/evidence-ledger.ts
      disposition: follow-up-card
      inlineReason: null
acceptanceEvidence: '{"runtime-evidence-externalization-proof":{"id":"runtime-evidence-externalization-proof","claim":"Raw runtime/provider execution payloads leave Git history only after explicit classification, immutable external copy, digest verification, restore/replay, and provenance-preserving references pass; governance receipts remain locally verifiable.","authoritativeSources":["tracked-evidence-inventory","classification-manifest","external-copy-digests","restore-replay-receipt","git-path-inventory"],"derivationRule":"all closure-critical predicates pass; any missing source, sink, digest, or replay observation is inconclusive or blocked","requiredRealness":"sealed-replay","verifier":{"mode":"separate-actor"},"negativeControls":[{"id":"missing-external-artifact","expectedFailureReason":"reference without immutable payload is not evidence"},{"id":"digest-mismatch","expectedFailureReason":"copied payload identity differs from source"},{"id":"governance-receipt-moved","expectedFailureReason":"closure provenance must remain offline-verifiable"},{"id":"raw-output-retained-in-git","expectedFailureReason":"runtime evidence boundary is incomplete"}],"missingDataVerdict":"inconclusive","closureCritical":true}}'
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0070 Classify and externalize runtime execution evidence without breaking governance provenance

## Intent

TASK-PRF-0005 and TASK-PRF-0010 established an evidence-ledger direction, but a
read-only inventory still finds thousands of tracked evidence/report files with
mixed governance receipts, raw stdout/stderr, provider metadata, and large
payloads. This follow-up defines a safe migration boundary before anyone
removes runtime evidence from Git history. It is planning-only: the reviewer
may inventory target files and write only the three planning-repository
artifacts listed above. No target mutation, evidence deletion, history rewrite,
publish, or task close is allowed.

The contract must distinguish (1) immutable governance receipts and closure
packets that remain locally/offline verifiable, (2) raw execution/provider
payloads eligible for an external evidence sink, and (3) compact manifests and
digest references that remain in Git. It must quantify item counts and bytes,
record source and destination digests, specify restore/replay commands, and
define fail-closed negative controls. The migration is not complete merely
because a manifest exists; external copy and an independent restore drill are
required.

## Acceptance

- [ ] **ACC-1 — Complete inventory:** Record a deterministic path inventory of
      `.atm/history/evidence` and `docs/reports`, including file counts, byte
      totals, parse status, and Git-tracking status; classify every sampled or
      excluded item as governance receipt, raw runtime/provider payload,
      compact manifest/digest, or unknown.
- [ ] **ACC-2 — Explicit retention policy:** Define schema-based allow/deny
      rules, ownership, retention period, privacy/credential redaction rules,
      and the exact boundary between locally tracked receipts and external raw
      payloads. Unknown or malformed items remain blocked, never auto-deleted.
- [ ] **ACC-3 — Provenance-preserving manifest:** Produce a machine-readable
      migration manifest mapping each eligible source path to an immutable
      external reference, source digest, destination digest, byte count, and
      original task/commit provenance. Governance receipts must be explicitly
      marked retained.
- [ ] **ACC-4 — Copy and restore proof:** Demonstrate an external-copy dry run
      plus a fresh-store restore/replay for representative small, large,
      malformed, and provider-output samples. Matching digests and replay
      commands are required; a manifest-only assertion is insufficient.
- [ ] **ACC-5 — Git-boundary proof:** Show before/after counts and bytes and a
      path inventory proving that only eligible raw payloads leave Git, while
      closure packets, task events, seals, and compact references remain
      offline-verifiable. No history rewrite is executed by this card.
- [ ] **ACC-6 — Reversible rollout:** Specify staged dual-read/dual-store,
      retention window, rollback, and recovery if the sink is unavailable or a
      digest/reference cannot be resolved.
- [ ] **ACC-7 — Negative controls:** Missing external artifact, digest mismatch,
      governance receipt mistakenly moved, raw evidence still tracked, malformed
      JSON, and credential-bearing payload must fail closed or be BLOCKED with
      an actionable reason.
- [ ] **ACC-8 — Planning-only governance:** Import dry-run, schema/contract
      checks, and the dispatch brief pass; target repo status, task ledger,
      Git history, npm registry, and runtime evidence remain unchanged.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T09:27:26.892Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0070-classify-and-externalize-runtime-execution-evidence-without-breaking-governance-provenance.task.md","contentDigest":"sha256:197c17aa8454914654b3c83831d517d66c57f01a418885ffb0751c913c83ca86"} -->
