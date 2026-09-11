---
task_id: TASK-PRF-0023
title: Repair Dogfood clean-fixture evidence isolation
status: done
owner: owner-authorized-release-steward
priority: P2
depends_on: []
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
  - scripts/validate-cli/full-suite.ts
  - scripts/validate-self-hosting-alpha.ts
  - scripts/validate-cli.ts
  - tests/fixtures
deliverables:
  - deterministic clean-fixture setup that copies the required ATM evidence baseline
  - path-safe validator assertions for validate-cli and self-hosting alpha
  - regression evidence from npm test and both focused validators
validators:
  - npm test
  - node --strip-types scripts/validate-cli.ts --mode test
  - node --strip-types scripts/validate-self-hosting-alpha.ts --mode test
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-11T16:21:15.797Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-11T16:21:15.797Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-11T16-21-15-797Z-close-872c0ac6decc"
lastTransitionAt: "2026-09-11T16:21:15.797Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2effeea4fc118c8929f08097977514ea7b11e901"
---

# TASK-PRF-0023 Repair Dogfood clean-fixture evidence isolation

## Intent

Repair the Dogfood test harness so temporary fixture repositories are self-contained
and never resolve evidence paths through a duplicated or stale repository-root prefix.
The fix must preserve the validator contract while making required bootstrap and
task evidence explicit fixture inputs rather than relying on the source checkout.

## Acceptance

- [ ] A clean temporary fixture contains every evidence file required by the validator.
- [ ] `validate-cli` and `validate-self-hosting-alpha` pass from an isolated checkout.
- [ ] The path construction rejects duplicated repository-root segments.
- [ ] `npm test` passes without weakening or skipping the affected suites.
- [ ] Evidence records the failed run `34619400251` and the repaired run SHA.
- [ ] Rollback is limited to reverting the validator/fixture changes and rerunning the same gates.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T16:02:56.026Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0023-repair-dogfood-clean-fixture-evidence-isolation.task.md","contentDigest":"sha256:c863a1ad64e5e3735e29caada437cd08d6008819e2ed891cadcb8184fd7b15fb"} -->