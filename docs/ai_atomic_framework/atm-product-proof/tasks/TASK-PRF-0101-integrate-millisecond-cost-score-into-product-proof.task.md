---
task_id: TASK-PRF-0101
title: Integrate millisecond cost score into product proof
status: planned
owner: codex-product-proof
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "A fixed workload can be measured from the current runner; predecessor samples are optional inputs, not a claim blocker."
    - "No new remote telemetry service is introduced."
  softRelations: [TASK-PRF-0096, TASK-PRF-0097, TASK-PRF-0098, TASK-PRF-0099, TASK-PRF-0100]
  changedPublicSeams: ["product-proof-performance-report"]
  causalImpactEdges: ["fixed-task-wait-ms", "command-gate-hotspot-ranking", "multi-ai-makespan"]
  parallelFrontierInputs: ["TASK-PRF-0097 startup samples", "TASK-PRF-0099 quickfix samples"]
  validatorReferences: ["tests/cli/next-warm-run-latency-measurement.test.ts", "tests/cli/gate-telemetry-observed-chain.test.ts"]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
deliverables:
  - scripts/plan-performance-report-v4.ts
  - packages/core/src/telemetry/observation.ts
  - packages/cli/src/commands/telemetry.ts
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/command-gate-latency-score.test.ts
  - docs/reports/atm-command-gate-latency-score.md
validators:
  - "node --strip-types tests/cli/command-gate-latency-score.test.ts"
  - "node --strip-types tests/cli/next-warm-run-latency-measurement.test.ts"
  - "node --strip-types tests/cli/gate-telemetry-observed-chain.test.ts"
  - "npm run typecheck"
scopePaths:
  - scripts/plan-performance-report-v4.ts
  - packages/core/src/telemetry/observation.ts
  - packages/cli/src/commands/telemetry.ts
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/command-gate-latency-score.test.ts
  - docs/reports/atm-command-gate-latency-score.md
testContributions:
  - caseId: test_command_gate_latency_score_5f2a1c9e
    targetGroupId: null
    semanticKey: command_gate_latency_score
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [fixed-task-wait-ms, command-gate-hotspot-ranking, multi-ai-makespan]
    expectedRedPredicate: "Missing samples, invalid inclusive/exclusive spans, or unranked mandatory hot-spots are rejected."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: product-proof-performance-report
    resourceKey: null
requiredTestCaseIds: [test_command_gate_latency_score_5f2a1c9e]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: recommended
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert only report/instrumentation changes owned by this card; preserve external raw evidence and unrelated WIP."
atomizationImpact:
  ownerAtomOrMap: atm.telemetry-observation-map
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      inlineReason: "Reuse existing observation and performance-report seams; a new telemetry registry or service is explicitly out of scope."
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0101 Integrate millisecond cost score into product proof

## Intent

Make ATM's lightweighting measurable in milliseconds. Produce one rerunnable,
provider-neutral report that ranks every observed command and mandatory gate by
real wall-time cost, separates nested spans, and shows the cumulative waiting
cost of a fixed task. Reuse existing observation, telemetry coverage, warm-run,
and performance-report code; do not add a daemon, remote telemetry, or a second
dashboard data model.

## Acceptance

- [ ] ACC-1: Inventory public commands and mandatory/conditional gates, with
  applicability and uncovered items. A field/registry declaration without a
  real sample is reported as `unknown`, never zero.
- [ ] ACC-2: For each measured item report external wall `durationMs`,
  inclusive/exclusive time, startup/queue/I/O/execution/retry/recovery
  segments when available, frequency, failure/timeout count, and fixed-task
  cumulative waiting ms. Nested spans are unioned so parent/child time is not
  double-counted; overlapping AI workers report makespan separately from CPU
  sum.
- [ ] ACC-3: Generate a JSON plus Markdown ranking from the existing report
  path. Use p50/p95 and sample count; highlight p50 or p95 >=1,000 ms and
  diagnose >=5,000 ms first, while allowing high-frequency short calls to rank
  above rare slow calls by cumulative task cost. Raw samples stay in the
  external evidence sink and only summary/digest enters governed records.
- [ ] ACC-4: Bind the report to fixed workload, OS/cache mode, runner/commit,
  Node and lockfile. Include failed/timeout/retry samples, measurement
  overhead, and before/after savings. Product acceptance uses fixed-task
  mandatory waiting p50 (target >=20% reduction) and rejects p95 regression
  above 10%; insufficient coverage or unproven attribution is a no-go, not a
  green result.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T17:43:04.436Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0101-integrate-millisecond-cost-score-into-product-proof.task.md","contentDigest":"sha256:c2a92c2bd30fe0e9e5db3ce822cd51994d61bfc23a2df420f13eeb967d092608"} -->
