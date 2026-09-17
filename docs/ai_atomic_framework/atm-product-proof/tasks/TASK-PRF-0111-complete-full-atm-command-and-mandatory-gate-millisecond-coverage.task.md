---
task_id: TASK-PRF-0111
title: Complete full ATM command and mandatory-gate millisecond coverage
status: planned
owner: unassigned
priority: P2
depends_on: [TASK-PRF-0101]
causalGraph:
  causalDependencies: [TASK-PRF-0101]
  startConditions: []
  softRelations: [TASK-PRF-0100, TASK-PRF-0110]
  changedPublicSeams: [product-proof-performance-report, command-runtime-timing]
  causalImpactEdges: [full-command-inventory-coverage, mandatory-gate-real-samples]
  parallelFrontierInputs: [TASK-PRF-0101 latency report, TASK-PRF-0110 command-boundary findings]
  validatorReferences: [tests/cli/command-gate-latency-score.test.ts, tests/cli/mandatory-gate-telemetry.test.ts, scripts/validate-gate-telemetry-coverage.ts]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/telemetry.ts
  - packages/core/src/telemetry/index.ts
  - scripts/plan-performance-report-v4.ts
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/command-gate-latency-score.test.ts
  - tests/cli/mandatory-gate-telemetry.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/telemetry.ts
  - packages/core/src/telemetry/index.ts
  - scripts/plan-performance-report-v4.ts
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/command-gate-latency-score.test.ts
  - tests/cli/mandatory-gate-telemetry.test.ts
  - docs/reports/atm-command-gate-latency-score.md
validators:
  - node --strip-types tests/cli/command-gate-latency-score.test.ts
  - node --strip-types tests/cli/mandatory-gate-telemetry.test.ts
  - npm run typecheck
  - node --strip-types scripts/validate-gate-telemetry-coverage.ts --mode command-matrix --receipt <external-evidence-sink>/TASK-PRF-0111-command-matrix.json
  - npm run check:encoding:touched -- --files packages/cli/src/atm.ts packages/cli/src/commands/telemetry.ts packages/core/src/telemetry/index.ts scripts/plan-performance-report-v4.ts tests/cli/command-gate-latency-score.test.ts tests/cli/mandatory-gate-telemetry.test.ts docs/reports/atm-command-gate-latency-score.md
testContributions:
  - caseId: test_full_command_inventory_duration_events_7ab4d9f2
    targetGroupId: null
    semanticKey: full_command_inventory_duration_events
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [full-command-inventory-coverage, mandatory-gate-real-samples]
    expectedRedPredicate: "A command missing a real duration event, a mandatory gate with fabricated zero timing, or a stale inventory is rejected."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: command-runtime-timing
    resourceKey: null
  - caseId: test_command_matrix_unknown_stop_semantics_2c9e6a11
    targetGroupId: null
    semanticKey: command_matrix_unknown_stop_semantics
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [full-command-inventory-coverage, mandatory-gate-real-samples]
    expectedRedPredicate: "A missing command/gate sample, fabricated zero duration, or unbound identity cannot produce a green coverage receipt."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: product-proof-performance-report
    resourceKey: null
requiredTestCaseIds: [test_full_command_inventory_duration_events_7ab4d9f2, test_command_matrix_unknown_stop_semantics_2c9e6a11]
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
  notes: "Revert only the command/gate timing and report changes owned by this card; preserve external raw samples and 0101 provenance."
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.command-runtime-timing
      pattern: Adapter/Port
      source: packages/cli/src/atm.ts
      disposition: inline
      inlineReason: "Owner explicitly prioritizes zero new runtime layers; the existing dispatch wrapper is the single caller seam and a separate adapter would add maintenance cost without reducing callers."
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0111 Complete full ATM command and mandatory-gate millisecond coverage

## Intent

Close the gap between the command inventory and the latency score. Derive the
inventory from the existing command-spec/help authority, emit one real external
wall-time sample for every invoked top-level command, and bind mandatory/conditional
gate timing to workflow applicability. Reuse the existing telemetry event stream and
report; do not add a daemon, database, remote collector, second registry, or GUI.
This card establishes honest coverage and a rerunnable command-matrix receipt; it
does not decide whether an optimization is fast enough.

## Acceptance

- [ ] ACC-1: The report inventory equals the current `listCommandSpecs()`/help command
  set (no historical 21-command list); every invoked command has a real `durationMs`
  event tied to an explicit runner/version/workload identity plus task/run correlation
  and outcome. Missing identity or samples remain `unknown` and are listed; they never
  become a green result.
- [ ] ACC-2: Canonical and workflow-local mandatory gates are classified by
  applicability. Fixed-task mandatory waiting uses unioned spans (no parent/child or
  overlapping-worker double count), retains failure/timeout/retry samples, and rejects
  fixture or fabricated `duration=0` as coverage.
- [ ] ACC-3: Existing JSON+Markdown latency report ranks measured items by seconds-first
  diagnostic bucket (p95 or p50 >= 5,000 ms), then frequency-weighted cumulative
  waiting; it exposes p50/p95, cumulative ms, measurement overhead, and unknowns without
  converting human/token/bytes costs into fake milliseconds. The fixed command-matrix
  validator emits an external JSON receipt bound to runner/version/workload/commit and
  fails closed on fabricated `durationMs: 0`, missing coverage, or missing identity.

Performance reduction targets, paired baseline/treatment go-no-go, telemetry-overhead
budget, multi-AI makespan/CPU, and conflict correctness are explicitly deferred to a
separate measurement card after this coverage contract is proven.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-15T13:55:32.716Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0111-complete-full-atm-command-and-mandatory-gate-millisecond-coverage.task.md","contentDigest":"sha256:07ca166f1a20cb3e09f517389ab25818a1b7214a83d70f653d4241179c8a2fad"} -->
