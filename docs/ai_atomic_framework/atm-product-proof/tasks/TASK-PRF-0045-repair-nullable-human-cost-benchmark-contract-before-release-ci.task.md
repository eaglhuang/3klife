---
task_id: TASK-PRF-0045
title: Repair nullable human-cost benchmark contract before release CI
status: planned
owner: unassigned
priority: P1
depends_on: [TASK-PRF-0035]
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/lib/external-benchmark/metrics.ts
  - tests/cli/external-benchmark-v2-metrics.test.ts
deliverables:
  - scripts/lib/external-benchmark/metrics.ts
  - tests/cli/external-benchmark-v2-metrics.test.ts
validators:
  - npm run typecheck
  - node --strip-types tests/cli/external-benchmark-v2-metrics.test.ts
  - npm run check:encoding:touched -- --files scripts/lib/external-benchmark/metrics.ts tests/cli/external-benchmark-v2-metrics.test.ts
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert only the nullable aggregate contract and focused regression test, then rerun typecheck and benchmark metrics tests.
atomizationImpact:
  ownerAtomOrMap: atm.benchmark-metrics
  mapUpdates: []
  extractionCandidates:
    - atom: atm.benchmark-total-cost-contract
      pattern: Result Contract
      source: scripts/lib/external-benchmark/metrics.ts
      disposition: inline
      inlineReason: The existing aggregate result contract is the sole public seam; extracting it would add a second interface without reducing coupling.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0045 Repair nullable human-cost benchmark contract before release CI

## Intent

The formal benchmark deliberately represents missing human-time evidence as
`null`, not zero. Align the aggregate TypeScript contract with the implemented
fail-closed total-cost calculation so the release workflow can typecheck while
preserving unavailable-cost semantics.

## Acceptance

- [ ] `RawBenchmarkAggregate.humanMinutes` accepts `number | null` and no caller silently converts missing data to zero.
- [ ] Focused metrics tests cover complete human-time data and unavailable human-time data.
- [ ] `npm run typecheck` passes on the clean release commit.
- [ ] No release publish or benchmark result is declared by this card.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T06:47:53.802Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0045-repair-nullable-human-cost-benchmark-contract-before-release-ci.task.md","contentDigest":"sha256:6452e5536ef32aaeb98317a5a928e258c460686773f5989e466d579313e1120b"} -->
