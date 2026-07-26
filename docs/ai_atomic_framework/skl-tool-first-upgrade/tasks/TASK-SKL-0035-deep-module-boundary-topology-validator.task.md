---
task_id: TASK-SKL-0035
title: Deep module boundary topology validator
status: planned
owner: atm-architecture
priority: P1
milestone: ATM-SKL-VG-R1.2
depends_on:
  - TASK-SKL-0027
  - TASK-SKL-0031
causalGraph:
  causalDependencies:
    - TASK-SKL-0027
    - TASK-SKL-0031
  startConditions:
    - TASK-SKL-0031 is done and the deep-module skill projection is current.
  softRelations:
    - Matt Pocock setup-ts-deep-modules is an in-progress reference provider only.
  changedPublicSeams:
    - Module boundary policy
    - Import topology receipt
  causalImpactEdges:
    - declared public entrypoint -> allowed dependency topology
    - observed imports -> deterministic boundary findings
  parallelFrontierInputs: []
  validatorReferences:
    - node --strip-types tests/cli/module-boundary-topology.test.ts
  phaseOwner: atm-architecture
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/validators/module-boundary-policy.schema.json
  - packages/core/src/architecture/module-boundary.ts
  - packages/core/src/architecture/index.ts
  - scripts/validate-module-boundaries/implementation.ts
  - scripts/module-boundaries.config.json
  - templates/skills/atm-deep-module-refactor.skill.md
  - templates/skills/atm-deep-module-refactor.files/references/**
  - tests/catalog/groups/test_group_module_boundaries.shard.json
  - tests/fixtures/module-boundaries/**
  - tests/cli/module-boundary-topology.test.ts
deliverables:
  - schemas/validators/module-boundary-policy.schema.json
  - packages/core/src/architecture/module-boundary.ts
  - scripts/validate-module-boundaries/implementation.ts
  - scripts/module-boundaries.config.json
  - tests/cli/module-boundary-topology.test.ts
validators:
  - node --strip-types tests/cli/module-boundary-topology.test.ts
  - npm run validate:schemas
  - npm run validate:skill-templates
  - npm run typecheck
requiredTestCaseIds:
  - test_task_skl_0035_module_boundary_topology_b6c94fb2
phaseTestCaseIds: []
advisoryTestCaseIds: []
outOfScope:
  - A TypeScript-only hard dependency in provider-neutral ATM core.
  - Automatically rewriting imports or package entrypoints.
  - Treating every internal import as a violation without declared policy.
errorCodes: []
evidence:
  required: command-backed-module-boundary-policy-and-negative-fixture-receipt
rollback:
  strategy: revert-commit-and-disable-module-boundary-validator
atomizationImpact:
  ownerAtomOrMap: atm.architecture-review
  mapUpdates: []
  extractionCandidates:
    - atom: atm.module-boundary-topology
      pattern: Policy Object
      source: packages/core/src/architecture/module-boundary.ts
      disposition: extract
createdByCommand: atm plan card create
---

# TASK-SKL-0035 Deep module boundary topology validator

## Intent

Turn TASK-SKL-0027 deep-module entrypoint and adapter claims into a
deterministic, language-adaptable topology validator. The validator proves that
declared consumers use public module seams and that configured forbidden
cross-boundary imports fail.

## Acceptance

- [ ] A schema declares modules, public entrypoints, allowed consumers,
      exceptions with expiry, and adapter-specific source discovery.
- [ ] The core evaluator consumes a provider-neutral dependency graph; the
      initial TypeScript scanner is an adapter, not embedded core policy.
- [ ] Positive fixtures prove legal root-entry imports and multiple real
      adapters; negative fixtures prove deep imports, cycles, undeclared
      cross-package edges and expired exceptions fail.
- [ ] Validation emits source/config/candidate digests and exact offending
      edges suitable for TASK-SKL-0029 evidence freshness.
- [ ] The deep-module skill uses the validator when available and reports an
      explicit unsupported-language advisory otherwise.
- [ ] The gate is opt-in per declared boundary until shadow evidence supports
      wider promotion; no repository-wide policy is inferred automatically.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-26T15:30:56.590Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0035-deep-module-boundary-topology-validator.task.md","contentDigest":"sha256:63cc0cf36a2aa077e9ca7bc78dc4defdacd5bdbce3c2d9ba1cee71f77bece9e8"} -->
