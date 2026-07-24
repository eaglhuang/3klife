---
task_id: TASK-SKL-0027
title: Replaceable deep-module refactoring provider route
status: planned
owner: atm-agent-skills
priority: P1
milestone: ATM-SKL-VG-R0.2
depends_on:
  - TASK-SKL-0018
causalGraph:
  causalDependencies:
    - TASK-SKL-0018
  startConditions:
    - provider-neutral skill provenance foundation is done
  softRelations:
    - ATM-GOV-0264
  changedPublicSeams:
    - atm.deepModuleRefactorProvider.v1
  causalImpactEdges:
    - scattered-policy-cluster-to-deep-module-review
    - provider-review-to-governed-refactor-card
  parallelFrontierInputs: []
  validatorReferences:
    - test_task_skl_0027_deep_module_provider_8f47d4a1
  phaseOwner: atm-agent-skills
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-atom-map-refactor.skill.md
  - templates/skills/atm-deep-module-refactor.skill.md
  - templates/skills/atm-deep-module-refactor.files/references/**
  - packages/plugin-review-advisory/src/deep-module-provider.ts
  - packages/plugin-review-advisory/src/index.ts
  - scripts/validate-skill-templates.ts
  - tests/cli/deep-module-refactor-provider.test.ts
deliverables:
  - templates/skills/atm-atom-map-refactor.skill.md
  - templates/skills/atm-deep-module-refactor.skill.md
  - templates/skills/atm-deep-module-refactor.files/references/deepening.md
  - templates/skills/atm-deep-module-refactor.files/references/design-it-twice.md
  - packages/plugin-review-advisory/src/deep-module-provider.ts
  - tests/cli/deep-module-refactor-provider.test.ts
validators:
  - node --strip-types tests/cli/deep-module-refactor-provider.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
evidence:
  required: deep-module-provider-trigger-boundary-and-provenance
rollback:
  strategy: revert-commit-and-use-existing-atom-map-refactor-route
atomizationImpact:
  ownerAtomOrMap: atm.agent-skills
  mapUpdates: []
  extractionCandidates:
    - atom: atm.deep-module-refactor-provider
      pattern: Refactoring Strategy Provider
      source: templates/skills/atm-deep-module-refactor.skill.md
      disposition: extract
createdByCommand: atm plan card create
skl_validator_transition:
  schema_id: atm.validatorSelection.transition.v1
  enforcement: required
  causalImpactEdges:
    - scattered-policy-cluster-to-deep-module-review
    - provider-review-to-governed-refactor-card
  requiredTestCaseIds:
    - test_task_skl_0027_deep_module_provider_8f47d4a1
  phaseTestCaseIds: []
  advisoryTestCaseIds: []
  testContributions:
    - caseId: test_task_skl_0027_deep_module_provider_8f47d4a1
      targetGroupId: test_group_skill_provider_routes
      semanticKey: replaceable-deep-module-provider
      coversImpactEdges:
        - scattered-policy-cluster-to-deep-module-review
        - provider-review-to-governed-refactor-card
---

# TASK-SKL-0027 Replaceable deep-module refactoring provider route

## Intent

Add a replaceable deep-module/refactoring provider that routes through ATM
atom/map refactor semantics and uses observed evidence rather than file length
alone. Matt Pocock's `codebase-design` and
`improve-codebase-architecture` skills are pinned reference inputs, not copied
runtime authority. The ATM-facing provider must remain replaceable through the
provider-neutral contract delivered by TASK-SKL-0018.

## Acceptance

- [ ] Triggers include repeated bugs, shotgun changes, duplicated policy,
      caller complexity, private-internal tests and missing test seams.
- [ ] File length remains advisory and cannot alone mandate refactoring.
- [ ] Urgent fixes default to the smallest generalized repair; broader
      deepening becomes a governed follow-up unless required for a test seam.
- [ ] The provider uses the exact vocabulary `module`, `interface`, `seam`,
      `adapter`, `depth`, `leverage`, and `locality`; it applies the deletion
      test, treats the interface as the test surface, and requires two concrete
      adapters before introducing a replaceable seam.
- [ ] Deepening recommendations classify dependencies as in-process,
      local-substitutable, remote-owned, or true-external and use
      replace-don't-layer tests through the proposed interface.
- [ ] The source skill uses progressive-disclosure references for detailed
      deepening and design-it-twice guidance; the default invocation does not
      load report scaffolding or broad codebase history unless requested.
- [ ] `atm.skillDefinition.vNext` records provider id, version, MIT license,
      upstream URL `https://github.com/mattpocock/skills`, pinned upstream
      commit, source digest, capability, fallback, shadow-run, promotion, and
      rollback. Replacing the provider changes none of the ATM review receipt,
      task-card, test-case, claim, or close contracts.
- [ ] The ATM interface is small and structured: callers submit a bounded
      refactor candidate plus observed friction and receive one
      provider-neutral review report containing seam, hidden complexity,
      dependency class, interface test, rollback, and confidence. Callers do
      not reproduce deep-module rules.
- [ ] Provider recommendations preserve public interface, owner atom/map,
      rollback and causal validators.
- [ ] Provider can be replaced without changing ATM refactor evidence.
- [ ] A contract fixture pins the downloaded 2026-07-24 reference snapshot:
      upstream commit `ed37663cc5fbef691ddfecd080dff42f7e7e350d`;
      `codebase-design` bundle digest
      `sha256:c46b49303a81c7fc8934d0f4fbc44382cdecb73942d85d8d7db3523407fff8fa`;
      `improve-codebase-architecture` bundle digest
      `sha256:d3682058df92c259b47c36503baa02345d5811758621b5dc03081d5ba0f7b69b`.
      A future upstream version is an explicit provider upgrade, not an
      unreviewed text overwrite.
- [ ] After this card closes, ATM-GOV-0264 consumes one sealed deep-module
      review receipt before implementation; TASK-SKL-0027 does not itself edit
      Broker production code.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.357Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0027-replaceable-deep-module-refactoring-provider-route.task.md","contentDigest":"sha256:5be7a8182231b5723745f320ecad79305252c85a5e3c65b431f452ea6c5541a2"} -->
