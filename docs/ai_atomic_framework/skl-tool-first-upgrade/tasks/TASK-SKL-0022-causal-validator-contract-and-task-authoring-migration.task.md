---
task_id: TASK-SKL-0022
title: Causal validator contract and task authoring migration
status: planned
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.3
depends_on:
  - TASK-SKL-0020
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/validators/validator-execution-contract.schema.json
  - scripts/test-catalog.config.json
  - packages/cli/src/commands/test-catalog.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - templates/skills/atm-task-card-authoring.skill.md
  - tests/cli/causal-validator-contract-import.test.ts
deliverables:
  - schemas/validators/validator-execution-contract.schema.json
  - packages/cli/src/commands/test-catalog.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - templates/skills/atm-task-card-authoring.skill.md
  - tests/cli/causal-validator-contract-import.test.ts
validators:
  - node --strip-types tests/cli/causal-validator-contract-import.test.ts
  - npm run validate:schemas
  - npm run typecheck
errorCodes: []
evidence:
  required: causal-validator-contract-import-fixtures
rollback:
  strategy: revert-commit-and-project-legacy-validator-strings
atomizationImpact:
  ownerAtomOrMap: atm.validator-contract
  mapUpdates: []
  extractionCandidates:
    - atom: atm.causal-validator-contract
      pattern: Versioned Verification Contract
      source: schemas/validators/validator-execution-contract.schema.json
      disposition: extract
createdByCommand: atm plan card create
---

# TASK-SKL-0022 Causal validator contract and task authoring migration

## Intent

Evolve task validators from untyped commands into causal execution contracts
that map acceptance IDs and concrete impact edges to task-local or shared case
IDs while retaining a legacy projection during migration.

## Acceptance

- [ ] Contract distinguishes `task-required`, `phase-suite` and `advisory`.
- [ ] Cards support `testContributions`, `requiredTestCaseIds`,
      `phaseTestCaseIds` and `advisoryTestCaseIds`.
- [ ] Import rejects acceptance criteria or declared impact edges without
      resolvable required cases.
- [ ] Unrelated full suites cannot be declared task-required without a concrete
      dependency/contract/resource edge.
- [ ] Existing command-only cards remain importable through an explicit legacy
      projection and migration diagnostic.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.582Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0022-causal-validator-contract-and-task-authoring-migration.task.md","contentDigest":"sha256:2f93b15317b521c7844cef55b4e8f6d1168bf6ff455d72d381ed28c8b4946954"} -->
