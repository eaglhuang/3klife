---
task_id: TASK-SKL-0030
title: Historical A-B replay verdict and migration guide
status: planned
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.8
depends_on:
  - TASK-SKL-0029
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/validate-validator-governance-verdict.ts
  - tests/fixtures/validator-governance-replay/**
  - artifacts/generated/atm-validator-governance-verdict.json
  - docs/governance/validator-governance.md
  - tests/cli/validator-governance-verdict.test.ts
deliverables:
  - scripts/validate-validator-governance-verdict.ts
  - tests/fixtures/validator-governance-replay/**
  - artifacts/generated/atm-validator-governance-verdict.json
  - docs/governance/validator-governance.md
  - tests/cli/validator-governance-verdict.test.ts
validators:
  - node --strip-types tests/cli/validator-governance-verdict.test.ts
  - node --strip-types scripts/validate-validator-governance-verdict.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: validator-governance-historical-ab-verdict
rollback:
  strategy: revert-commit-and-retain-legacy-all-run-default
atomizationImpact:
  ownerAtomOrMap: atm.validator-runtime
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-governance-verdict
      pattern: Measured Verdict
      source: scripts/validate-validator-governance-verdict.ts
      disposition: extract
createdByCommand: atm plan card create
---

# TASK-SKL-0030 Historical A-B replay verdict and migration guide

## Intent

Replay identical historical sealed candidates under legacy all-run-per-card and
causal task selection plus phase suites, publish a measured verdict, and provide
provider/adapter migration and rollback guidance.

## Acceptance

- [ ] Replay compares the same candidates, test versions and environment seals.
- [ ] Report includes task latency p50/p95, selected ratio, cache reuse, phase
      detection, false blocks, flaky cases and escaped-defect delta.
- [ ] Runtime improvement cannot pass if defect detection regresses.
- [ ] No-op/zero-test false greens and stale receipt reuse are demonstrated as
      rejected counterexamples.
- [ ] Provider swap and all supported adapter projections pass conformance.
- [ ] Migration guide supports shadow mode, canary promotion, full rollback and
      Plan 3.1 final-verdict consumption.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.865Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0030-historical-a-b-replay-verdict-and-migration-guide.task.md","contentDigest":"sha256:7a98bef4edfcb415d8230ca9ac5ad51c740553928bacd5087b3aed601fbd8b98"} -->
