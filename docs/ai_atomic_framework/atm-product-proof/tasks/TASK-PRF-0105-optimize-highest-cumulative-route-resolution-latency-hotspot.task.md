---
task_id: TASK-PRF-0105
title: Optimize highest cumulative route-resolution latency hotspot
status: done
owner: atm-performance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0104 report identifies next.route-resolution as the highest cumulative mandatory-wait hotspot
    - existing command/gate telemetry and external sink are available
    - candidate change can be measured with the same runner, Node version, cache policy, and fixed workload
  softRelations:
    - TASK-PRF-0104
    - TASK-PRF-0099
    - TASK-PRF-0101
  changedPublicSeams:
    - atm.cli.next.route-resolution
  causalImpactEdges:
    - route-resolution-cumulative-mandatory-wait
    - multi-ai-private-read-parallelism
  parallelFrontierInputs:
    - TASK-PRF-0104
  validatorReferences:
    - route-resolution-latency-regression
  phaseOwner: null
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/route-resolution.ts
  - packages/cli/src/commands/next/route-resolution/*.ts
  - packages/cli/src/commands/next/route-predicates.ts
  - tests/cli/next-route-resolution-latency.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - one measured route-resolution optimization at the highest evidenced cost seam, with no new command, registry, daemon, or second state source
  - route-resolution regression test bound to the measured behavior and multi-AI private-read parallelism contract
  - latency report update containing baseline/candidate p50, p95, cumulative milliseconds, failure/retry semantics, and the external rerun command
  - external-sink receipt with AB/BA ordering and A/A noise control; raw runtime evidence remains outside Git history
validators:
  - node --strip-types tests/cli/next-route-resolution-latency.test.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/next-action-assembly.spec.ts
  - npm run typecheck -- --pretty false
testContributions:
  - caseId: test_task_prf0105_route_resolution_latency_6b29d4a1
    targetGroupId: null
    semanticKey: route_resolution_latency_regression
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [route-resolution-cumulative-mandatory-wait, multi-ai-private-read-parallelism]
    expectedRedPredicate: route-resolution optimization fails to reduce the selected hotspot or changes routing semantics
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: route-resolution-cumulative-mandatory-wait
    contractEdge: atm.cli.next.route-resolution
    resourceKey: route-resolution
  - caseId: test_task_prf0105_external_receipt_boundary_1f7c2e90
    targetGroupId: null
    semanticKey: external_receipt_boundary
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [route-resolution-cumulative-mandatory-wait]
    expectedRedPredicate: receipt is not rerunnable or the change introduces an unapproved governance surface
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: route-resolution-cumulative-mandatory-wait
    contractEdge: external-receipt-boundary
    resourceKey: external-receipt
requiredTestCaseIds:
  - test_task_prf0105_route_resolution_latency_6b29d4a1
  - test_task_prf0105_external_receipt_boundary_1f7c2e90
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: revert the single candidate commit and retain the external receipt and failed measurements
atomizationImpact:
  ownerAtomOrMap: atm-cli-command-router
  mapUpdates:
    - atomic_workbench/maps/atm-cli-command-router/map.spec.json
  extractionCandidates:
    - atom: atm.cli.next.route-resolution
      pattern: Policy Object
      source: packages/cli/src/commands/next/route-resolution/*.ts
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-15T00:54:53.724Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-15T00:54:53.724Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-15T00-54-53-724Z-close-1a94095d47ce"
lastTransitionAt: "2026-09-15T00:54:53.724Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "32219a899942a402c4f29fd021f6f749481e36f9"
---

# TASK-PRF-0105 Optimize highest cumulative route-resolution latency hotspot

## Intent

Use the 0104 millisecond score as a hard prioritization rule. `next.route-resolution`
currently has the highest frequency-weighted cumulative mandatory wait (about
380,415 ms in the observed chain), so this card investigates and optimizes only
that seam. The goal is lower real adopter wait while keeping ATM's multi-AI model:
private reads and private evidence remain parallel; only true shared writes use
the existing broker. This card must not add a command, registry, daemon, database,
or another governance workflow.

## Method

1. Capture a same-runner baseline with monotonic millisecond timing and the
   existing route-resolution telemetry. Break down only the selected seam enough
   to identify the largest evidenced cost (for example repeated ledger scans,
   `spawnSync`, or path resolution); unknown remains unknown.
2. Write a red regression case for the selected behavior, then implement one
   smallest reversible change at that seam. Do not optimize by removing conflict,
   dependency, or task-selection correctness checks.
3. Run the same fixed workload in AB/BA order plus A/A noise control. Preserve
   failures, blocked runs, retries, and exit semantics in the external receipt.

## Acceptance

- [ ] At least 30 valid baseline and 30 valid candidate samples cover the selected
      route-resolution workload; each sample has monotonic duration in milliseconds,
      runner/Node/cache metadata, and outcome state.
- [ ] The report ranks the selected route-resolution substep by cumulative wait,
      p95, then p50, and names the exact optimization boundary. No missing sample
      is converted to zero.
- [ ] Candidate route-resolution p50 decreases by at least 20% and p95 does not
      regress by more than 10%; otherwise record inconclusive/FAIL and stop further
      expansion.
- [ ] Routing semantics, false-block behavior, dependency handling, and private
      multi-AI read parallelism remain unchanged under focused regression tests.
- [ ] External AB/BA and A/A receipt is rerunnable from a clean checkout using
      documented commands; raw runtime evidence, secrets, and absolute machine
      paths are not committed.
- [ ] No new ATM command, gate, registry, daemon, database, or full-history scan
      is introduced; rollback is one revertable commit.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T19:17:35.950Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0105-optimize-highest-cumulative-route-resolution-latency-hotspot.task.md","contentDigest":"sha256:e9d254834e6f712b55b6ae21dd111c9491a10c7d91a79eeb62f418fce2834714"} -->
