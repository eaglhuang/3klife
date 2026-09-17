---
task_id: TASK-PRF-0071
title: Instrument complete incremental ATM cost accounting for the external benchmark
status: planned
owner: benchmark-custodian
priority: P1
depends_on: [TASK-PRF-0007, TASK-PRF-0019, TASK-PRF-0034]
causalGraph:
  causalDependencies: [TASK-PRF-0007, TASK-PRF-0019, TASK-PRF-0034]
  startConditions:
    - "The benchmark protocol and versioned evidence contract exist, but total ATM cost must include costs outside task execution before a superiority claim is possible."
    - "No benchmark run may be promoted while any incremental-cost component is missing, modeled, or silently treated as zero."
  softRelations: [TASK-PRF-0040, TASK-PRF-0070]
  changedPublicSeams: [benchmark-cost-ledger, product-decision-net-benefit]
  causalImpactEdges: [atm-overhead-is-measured, net-benefit-is-reproducible, complexity-stop-rule-is-enforced]
  parallelFrontierInputs: [provider-cost-telemetry, operator-time-log, installation-learning-maintenance-log]
  validatorReferences: [test_prf0071_cost_ledger_contract, test_prf0071_missing_cost_fail_closed, test_prf0071_net_benefit_replay]
  phaseOwner: phase-5-benchmark-execution
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-atm-external-benchmark.ts
  - scripts/validate-external-benchmark-decision.ts
  - schemas/evidence/external-benchmark-v2.schema.json
  - docs/reports/atm-external-benchmark-decision.md
deliverables:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-cost-accounting-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-cost-accounting-contract.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-dispatch-brief.md
planningArtifacts:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-cost-accounting-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-cost-accounting-contract.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-dispatch-brief.md
planningReadOnlyPaths:
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-cost-accounting-review.md
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-cost-accounting-contract.json
  - docs/ai_atomic_framework/atm-product-proof/reviews/TASK-PRF-0071-dispatch-brief.md
validators:
  - node atm.mjs next --prompt "TASK-PRF-0071 incremental ATM cost accounting review" --json
  - node atm.mjs doctor --json
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0071-instrument-complete-incremental-atm-cost-accounting-for-the-external-benchmark.task.md --dry-run --json
  - node --strip-types tests/cli/external-benchmark-protocol.test.ts
  - node --strip-types tests/cli/external-benchmark-decision.test.ts
  - git diff --check -- scripts/run-atm-external-benchmark.ts scripts/validate-external-benchmark-decision.ts schemas/evidence/external-benchmark-v2.schema.json
testContributions:
  - caseId: test_prf0071_cost_ledger_contract
    targetGroupId: null
    semanticKey: incremental_cost_ledger_contract
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [atm-overhead-is-measured]
    expectedRedPredicate: "A benchmark report omits installation, learning, execution-overhead, maintenance, human-minute, token, or billed-currency fields or conflates unknown with zero."
    contributionResourceKey: benchmark-cost-ledger
    responsibility: task-required
    dependencyEdge: TASK-PRF-0019
    contractEdge: benchmark-cost-ledger
    resourceKey: cost-ledger
  - caseId: test_prf0071_missing_cost_fail_closed
    targetGroupId: null
    semanticKey: missing_incremental_cost_fail_closed
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [net-benefit-is-reproducible]
    expectedRedPredicate: "A run with unavailable or modeled incremental cost is counted as a positive ATM net-benefit result."
    contributionResourceKey: cost-telemetry-gate
    responsibility: task-required
    dependencyEdge: TASK-PRF-0034
    contractEdge: product-decision-net-benefit
    resourceKey: missing-cost-negative
  - caseId: test_prf0071_net_benefit_replay
    targetGroupId: null
    semanticKey: net_benefit_replay_and_stop_rule
    coversAcceptance: [ACC-6, ACC-7, ACC-8]
    coversImpactEdges: [net-benefit-is-reproducible, complexity-stop-rule-is-enforced]
    expectedRedPredicate: "The published keep/narrow/stop decision cannot be recomputed from raw arm records, cost ledger, and preregistered thresholds."
    contributionResourceKey: benchmark-decision-report
    responsibility: task-required
    dependencyEdge: TASK-PRF-0007
    contractEdge: product-decision-net-benefit
    resourceKey: decision-replay
requiredTestCaseIds: [test_prf0071_cost_ledger_contract, test_prf0071_missing_cost_fail_closed, test_prf0071_net_benefit_replay]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: reasoned-not-applicable
tddNotApplicableReason: "This is a planning-only contract review; executable instrumentation and benchmark runs require a later Owner-authorized implementation lane."
tddExemptions: [planning-only]
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: incremental-cost-ledger-contract-and-net-benefit-replay-proof
rollback:
  strategy: discard-contract-without-run-mutation
  notes: "Reject or supersede the proposed cost contract without changing raw benchmark runs, oracle labels, provider exports, task ledgers, or target source."
atomizationImpact:
  ownerAtomOrMap: atm.external-benchmark-decision-map
  mapUpdates: [atomic_workbench/maps/atm-external-benchmark-map.json]
  newScriptsAllowed: false
  extractionCandidates:
    - atom: atm.benchmark-cost-ledger
      pattern: Policy Object
      source: scripts/validate-external-benchmark-decision.ts
      disposition: follow-up-card
      inlineReason: null
acceptanceEvidence: '{"incremental-cost-net-benefit-proof":{"id":"incremental-cost-net-benefit-proof","claim":"ATM superiority is assessed only after installation, learning, execution overhead, maintenance, human, token, billed-currency, retry, and repair costs are bound to raw paired runs and recomputed by an independent decision verifier.","authoritativeSources":["sealed-protocol","paired-run-records","provider-cost-telemetry","operator-time-ledger","incremental-cost-ledger","decision-replay-receipt"],"derivationRule":"all closure-critical cost components present and replayable; missing or modeled values force inconclusive","requiredRealness":"production-ledger","verifier":{"mode":"separate-actor"},"negativeControls":[{"id":"missing-install-cost","expectedFailureReason":"unknown setup cost cannot be zero"},{"id":"modeled-maintenance-cost","expectedFailureReason":"unobserved maintenance cannot support superiority"},{"id":"cost-ledger-run-mismatch","expectedFailureReason":"cost rows must bind to paired run ids"}],"missingDataVerdict":"inconclusive","closureCritical":true}}'
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0071 Instrument complete incremental ATM cost accounting for the external benchmark

## Intent

TASK-PRF-0019 and the versioned benchmark contract already require human,
token, billed-currency, wall-clock, retry, and merge/repair measurements. They
do not yet force the benchmark to account for the product-level costs that ATM
adds before, around, and after a task: first-time installation, operator
learning, governance execution overhead, and ongoing maintenance. Without those
fields, a lower per-task cost can be a false net benefit.

This planning-only follow-up defines the cost-ledger and decision-replay
contract. It must bind every cost row to a paired run and fixed version,
separate observed minutes/tokens/currency, preserve unknown as unknown, and
recompute the preregistered net-benefit formula. It may write only the three
planning-repository artifacts listed above; it does not instrument, execute,
adjudicate, publish, or rewrite benchmark evidence.

## Acceptance

- [ ] **ACC-1 — Complete cost taxonomy:** Define machine-readable fields and
      units for installation, learning, execution-overhead, maintenance, human
      minutes, input/output/reasoning tokens, billed currency, retries, repair,
      and elapsed time; every row binds to arm, run, task, provider, version,
      and source digest.
- [ ] **ACC-2 — Observed-only accounting:** Specify raw telemetry sources and
      collection commands for each field. Unknown, unavailable, redacted, or
      modeled values remain explicit and can never become zero by default.
- [ ] **ACC-3 — No double counting:** Define mutually exclusive boundaries for
      normal task execution versus ATM incremental cost, including first-time
      install, onboarding/training, routing/claim/lock/evidence overhead, and
      upgrades/policy/retention maintenance.
- [ ] **ACC-4 — Fail-closed decision gate:** A decision verifier rejects a
      positive ATM result when any required cost component, source digest,
      provider billing record, or run binding is missing or mismatched.
- [ ] **ACC-5 — Negative controls:** Missing install cost, modeled maintenance,
      ledger/run mismatch, duplicated human minutes, and currency/token unit
      mismatch all produce FAIL/BLOCKED or `inconclusive` outcomes.
- [ ] **ACC-6 — Reproducible net benefit:** Specify the exact formula,
      aggregation, confidence/precision method, currency/time views, and
      preregistered threshold; an independent verifier can recompute it from raw
      paired records without reading hidden labels.
- [ ] **ACC-7 — Stop and shrink rule:** If the lower confidence bound is not
      positive, safety is not non-inferior, or two independent rounds fail,
      publish `not proven` and name the smallest optional mechanism to retain or
      retest; do not expand governance.
- [ ] **ACC-8 — Planning-only governance:** Import dry-run and contract tests
      pass; target source, benchmark runs, oracle, provider exports, npm, Git
      history, and `.atm` state remain unchanged.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T09:46:46.029Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0071-instrument-complete-incremental-atm-cost-accounting-for-the-external-benchmark.task.md","contentDigest":"sha256:1476221c54022944bace88886e00c83687f537a42c50d721e408903d58e52fe0"} -->
