---
doc_id: doc_atm_gov_0126
task_id: ATM-GOV-0126
title: "Establish paired monetary-cost and time efficiency baselines"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: [ATM-GOV-0143]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/telemetry/index.ts"
  - "scripts/lib/admission-bench/operational-runner.ts"
  - "scripts/lib/governance-cost-bench/paired-runner.ts"
  - "schemas/team-agents/team-efficiency-incident.schema.json"
  - "tests/cli/governance-cost-bench.test.ts"
deliverables:
  - "scripts/lib/governance-cost-bench/paired-runner.ts"
  - "schemas/team-agents/team-efficiency-incident.schema.json"
  - "tests/cli/governance-cost-bench.test.ts"
validators:
  - "node --strip-types tests/cli/governance-cost-bench.test.ts"
  - "npm run typecheck"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Disable shadow measurement; canonical routing remains unchanged."
atomizationImpact:
  ownerAtomOrMap: "atm.governance-cost-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.paired-governance-benchmark"
      pattern: "Harness"
      source: "scripts/lib/admission-bench/operational-runner.ts"
      disposition: extract
outOfScope:
  - "Team admission or automatic promotion decisions."
---

# ATM-GOV-0126 - Establish paired monetary-cost and time efficiency baselines

## Acceptance

- Fixtures pin base, outcome, provider/model/plan, pricing catalog version, cache, validators, allocation policy and output contract.
- Reports preserve incremental, fully-loaded and list-price-equivalent cash cost; provider billable usage is canonical and estimates are promotion-ineligible.
- Reports include original currency, FX snapshot when used, subscription/credit allocation, queue, retries, repairs, discarded work, token diagnostics and cost/time ratios.
- Team paired samples record `TeamRosterFingerprint`: role graph, executor collapse decision, provider/model/plan, pricing catalog version, ContextManifest hash, prompt-cache policy, fan-out cap and quota probe digest.
- Samples with different roster fingerprints are separate cohorts; the benchmark may aggregate them only through an explicit workload-class rollup that keeps each fingerprint visible.
- Single-task latency, Batch makespan and throughput are separate metrics and cannot substitute for one another.
- The harness is shadow-only and cannot mutate task or Git state.
