---
task_id: TASK-PRF-0046
title: Repair duplicate protocol-v2 import blocking ATM Dogfood lint
status: done
owner: unassigned
priority: P1
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
  - tests/cli/external-benchmark-v2-contract.test.ts
deliverables:
  - tests/cli/external-benchmark-v2-contract.test.ts
validators:
  - npm run lint
  - node --strip-types tests/cli/external-benchmark-v2-contract.test.ts
  - npm run check:encoding:touched -- --files tests/cli/external-benchmark-v2-contract.test.ts
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T08:28:52.874Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-13T08:28:52.874Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T08-28-52-874Z-close-ece6aee15e2a"
lastTransitionAt: "2026-09-13T08:28:52.874Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "968f6498008afd8d8cee04de475c4d4fefe71ed7"
---

# TASK-PRF-0046 Repair duplicate protocol-v2 import blocking ATM Dogfood lint

## Intent

The latest ATM Dogfood run `34747569011` reached lint and failed on ESLint
`no-duplicate-imports`: this test imports the same `protocol-v2.ts` module as
both a value and a type import. Merge the imports into one canonical statement.
This is a test-only hygiene fix; it must not change benchmark behavior.

## Acceptance

- [ ] `protocol-v2.ts` has one import declaration in the test file.
- [ ] `npm run lint` passes without suppressing the rule.
- [ ] The focused contract test passes unchanged.
- [ ] No production benchmark semantics or release behavior changes.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T08:25:52.855Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0046-repair-duplicate-protocol-v2-import-blocking-atm-dogfood-lint.task.md","contentDigest":"sha256:4e1fd0e4ff9d32d4b77308cf1ec5e177594b651d4fdc687d8171f2ac65297454"} -->
