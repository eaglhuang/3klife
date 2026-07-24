---
task_id: TASK-SKL-0027
title: Replaceable deep-module refactoring provider route
status: planned
owner: atm-agent-skills
priority: P1
milestone: ATM-SKL-VG-R0.2
depends_on:
  - TASK-SKL-0018
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-atom-map-refactor.skill.md
  - templates/skills/atm-deep-module-refactor.skill.md
  - packages/plugin-review-advisory/src/index.ts
  - scripts/validate-skill-templates.ts
  - tests/cli/deep-module-refactor-provider.test.ts
deliverables:
  - templates/skills/atm-atom-map-refactor.skill.md
  - templates/skills/atm-deep-module-refactor.skill.md
  - tests/cli/deep-module-refactor-provider.test.ts
validators:
  - node --strip-types tests/cli/deep-module-refactor-provider.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
evidence:
  required: deep-module-provider-trigger-and-boundary
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
---

# TASK-SKL-0027 Replaceable deep-module refactoring provider route

## Intent

Add a replaceable deep-module/refactoring provider that routes through ATM
atom/map refactor semantics and uses observed evidence rather than file length
alone.

## Acceptance

- [ ] Triggers include repeated bugs, shotgun changes, duplicated policy,
      caller complexity, private-internal tests and missing test seams.
- [ ] File length remains advisory and cannot alone mandate refactoring.
- [ ] Urgent fixes default to the smallest generalized repair; broader
      deepening becomes a governed follow-up unless required for a test seam.
- [ ] Provider recommendations preserve public interface, owner atom/map,
      rollback and causal validators.
- [ ] Provider can be replaced without changing ATM refactor evidence.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.357Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0027-replaceable-deep-module-refactoring-provider-route.task.md","contentDigest":"sha256:5be7a8182231b5723745f320ecad79305252c85a5e3c65b431f452ea6c5541a2"} -->
