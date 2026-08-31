---
task_id: TASK-PRF-0009
title: Publish fail-closed benchmark evidence correction and verify protected-main CI
status: in-progress
started_at: 2026-08-31T13:55:23.980Z
started_by_agent: codex-gpt-5-4-mini
owner: atm-release
priority: P0
series: PRF
series_reason: Existing Product Proof family; this is the bounded recovery needed to deliver the plan's external-evidence safety correction.
depends_on: [TASK-PRF-0007]
causalGraph:
  causalDependencies: [TASK-PRF-0007]
  startConditions:
    - The candidate commit range only changes the external-benchmark acceptance gate and generated runner projections.
    - TASK-PRF-0008 remains blocked; no claimed acceptance artifact may be introduced to bypass its independent-evidence requirements.
  softRelations: [TASK-PRF-0008]
  changedPublicSeams: [external-benchmark-readiness-state, protected-main-product-ci]
  causalImpactEdges:
    - digest-only-acceptance-claims-fail-closed
    - protected-main-exposes-corrected-readiness-state
    - prf-0008-external-evidence-state-remains-blocked
  parallelFrontierInputs: [published-cli-beta, preregistered-benchmark-protocol]
  validatorReferences: [test_prf_hidden_acceptance_fail_closed_50ae84d8]
  phaseOwner: phase-5-benchmark-publication-recovery
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/evidence/external-benchmark-run.schema.json
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - scripts/lib/external-benchmark/runner.ts
  - scripts/validate-external-benchmark-protocol.ts
  - tests/cli/external-benchmark-protocol.test.ts
  - packages/cli/dist/**
  - release/atm-onefile/**
  - release/atm-root-drop/**
deliverables:
  - schemas/evidence/external-benchmark-run.schema.json
  - scripts/fixtures/atm-external-benchmark/manifest.json
  - scripts/lib/external-benchmark/runner.ts
  - scripts/validate-external-benchmark-protocol.ts
  - tests/cli/external-benchmark-protocol.test.ts
validators:
  - node --strip-types tests/cli/external-benchmark-protocol.test.ts
  - node --strip-types scripts/validate-external-benchmark-protocol.ts
  - npm run typecheck
  - protected-main CI run for the pushed candidate commit succeeds
testContributions:
  - caseId: test_prf_hidden_acceptance_fail_closed_50ae84d8
    targetGroupId: null
    semanticKey: hidden_acceptance_requires_verifiable_artifact
    coversAcceptance: [ACC-1]
    coversImpactEdges: [digest-only-acceptance-claims-fail-closed]
    expectedRedPredicate: A manifest that marks hidden-corpus acceptance sealed without a verifiable artifact is accepted.
    contributionResourceKey: hidden-corpus-acceptance
    responsibility: task-required
    dependencyEdge: acceptance-artifact-to-readiness
    contractEdge: external-benchmark-readiness-state
    resourceKey: external-benchmark-manifest
  - caseId: test_prf_protected_main_candidate_integrity_950557f6
    targetGroupId: null
    semanticKey: protected_main_candidate_runs_corrected_protocol_gate
    coversAcceptance: [ACC-2]
    coversImpactEdges: [protected-main-exposes-corrected-readiness-state]
    expectedRedPredicate: The protected-main candidate does not contain the corrected protocol gate or its required product CI fails.
    contributionResourceKey: protected-main-product-ci
    responsibility: task-required
    dependencyEdge: pushed-candidate-to-required-check
    contractEdge: protected-main-product-ci
    resourceKey: github-actions-run
  - caseId: test_prf_blocked_state_preservation_e95727b4
    targetGroupId: null
    semanticKey: publication_recovery_does_not_unblock_external_benchmark
    coversAcceptance: [ACC-3]
    coversImpactEdges: [prf-0008-external-evidence-state-remains-blocked]
    expectedRedPredicate: Publication recovery marks the external benchmark ready or sealed without independently verifiable acceptance, adjudication, and telemetry artifacts.
    contributionResourceKey: external-benchmark-readiness
    responsibility: task-required
    dependencyEdge: missing-independent-artifacts-to-blocked-state
    contractEdge: external-benchmark-readiness-state
    resourceKey: task-prf-0008-ledger
requiredTestCaseIds:
  - test_prf_hidden_acceptance_fail_closed_50ae84d8
  - test_prf_protected_main_candidate_integrity_950557f6
  - test_prf_blocked_state_preservation_e95727b4
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: The corrected assertion and generated runner projections are already committed; this recovery task transports and independently verifies that immutable delivery rather than changing behavior.
tddExemptions:
  - kind: mechanical
    reason: Protected-main publication and CI verification consume the existing red-to-green proof without rewriting source.
methodProfiles: [release-safety-recovery]
evidence:
  required: command-backed
rollback:
  strategy: Revert the published fail-closed correction commit range and rerun protected-main CI; never alter benchmark evidence to make a gate pass.
  notes: A rollback restores the prior readiness behavior and must be reported as a safety regression, not as a benchmark conclusion.
atomizationImpact:
  ownerAtomOrMap: atm.comparative-evaluation-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates:
    - atom: atm.external-benchmark-acceptance-gate
      pattern: Result Contract
      source: scripts/lib/external-benchmark/runner.ts
      disposition: inline
      inlineReason: No source extraction is permitted in this transport-only recovery slice.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0009 Publish fail-closed benchmark evidence correction and verify protected-main CI

## Intent

Publish the already-committed fail-closed correction that rejects a
digest-only hidden-corpus acceptance claim, and prove the same correction passes
the protected-main product CI. This card is deliberately separate from
`TASK-PRF-0008`: it delivers safety behavior without claiming the independent
external evidence that the product decision still lacks.

## Acceptance

- [ ] ACC-1: A manifest with `hiddenCorpusAcceptance.sealed=true` but no
  verifiable `atm.hiddenCorpusAcceptance.v1` artifact fails closed.
- [ ] ACC-2: The pushed protected-main candidate includes the exact corrected
  source and generated runner projections, and its required product CI is green.
- [ ] ACC-3: `TASK-PRF-0008` remains blocked with independent acceptance,
  adjudication, and provider-telemetry evidence unresolved; this recovery does
  not reseal or fabricate any of them.

## Out of scope

- Creating hidden-corpus, adjudication, telemetry, raw-run, or product-decision
  evidence.
- Altering `TASK-PRF-0008` from blocked to ready, running, or done.
- Changing benchmark thresholds, npm publication, or unrelated framework WIP.

## Stop rule

Stop before push if the candidate contains unrelated dirty work, if a required
validator fails, or if protected-main CI cannot prove the pushed commit. Treat a
missing independent artifact as the expected blocked state, never as a reason to
weaken the gate.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-31T13:55:23.980Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0009-publish-fail-closed-benchmark-evidence-correction-and-verify-protected-main-ci.task.md","contentDigest":"sha256:eb2d3a2969ebfc0c97dca55bf1e22244f7d51eee99f75d507b2d40589a115051"} -->
