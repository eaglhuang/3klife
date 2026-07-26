---
task_id: TASK-SKL-0034
title: Engineering change method profiles and fidelity receipts
status: planned
owner: atm-agent-skills
priority: P2
milestone: ATM-SKL-VG-R1.2
depends_on:
  - TASK-SKL-0031
causalGraph:
  causalDependencies:
    - TASK-SKL-0031
  startConditions:
    - TASK-SKL-0031 is done and canonical method-profile metadata can be projected consistently.
  softRelations:
    - TASK-SKL-0020 causal task graph
    - TASK-SKL-0021 Standards and Spec review
    - TASK-SKL-0025 TDD receipt lifecycle
  changedPublicSeams:
    - Engineering change method profile selection
    - Advisory method-fidelity receipt
  causalImpactEdges:
    - change shape -> selected method profile
    - method profile -> required and advisory fidelity checks
  parallelFrontierInputs: []
  validatorReferences:
    - node --strip-types tests/cli/engineering-change-method-profiles.test.ts
  phaseOwner: atm-agent-skills
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/skills/engineering-change-method-profile.schema.json
  - packages/core/src/skills/engineering-change-method.ts
  - packages/core/src/skills/index.ts
  - scripts/engineering-change-method-profiles.json
  - templates/skills/atm-plan-authoring.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - templates/skills/atm-evidence.skill.md
  - templates/skills/atm-deep-module-refactor.skill.md
  - tests/catalog/groups/test_group_engineering_method_profiles.shard.json
  - tests/cli/engineering-change-method-profiles.test.ts
deliverables:
  - schemas/skills/engineering-change-method-profile.schema.json
  - packages/core/src/skills/engineering-change-method.ts
  - scripts/engineering-change-method-profiles.json
  - tests/cli/engineering-change-method-profiles.test.ts
validators:
  - node --strip-types tests/cli/engineering-change-method-profiles.test.ts
  - npm run validate:schemas
  - npm run validate:skill-templates
  - npm run typecheck
requiredTestCaseIds:
  - test_task_skl_0034_method_profile_fidelity_19e253da
phaseTestCaseIds: []
advisoryTestCaseIds: []
outOfScope:
  - A second task graph, review lifecycle, TDD lifecycle, or Git conflict engine.
  - Promoting smell heuristics into universal hard gates.
  - Copying upstream provider prose verbatim into ATM runtime.
errorCodes: []
evidence:
  required: command-backed-method-profile-selection-and-fidelity-receipt
rollback:
  strategy: revert-commit-and-retain-existing-skill-guidance
atomizationImpact:
  ownerAtomOrMap: atm.skill-provider-policy
  mapUpdates: []
  extractionCandidates:
    - atom: atm.engineering-change-method-profile
      pattern: Strategy
      source: packages/core/src/skills/engineering-change-method.ts
      disposition: extract
createdByCommand: atm plan card create
---

# TASK-SKL-0034 Engineering change method profiles and fidelity receipts

## Intent

Represent reusable engineering methods as data-driven provider profiles rather
than new task models or one skill per technique. Initial profiles cover
expand-contract migration, independent TDD oracles, review smell heuristics and
intent-preserving conflict analysis.

## Acceptance

- [ ] Profiles declare trigger evidence, applicability, required observations,
      counterexamples, completion evidence and rollback without embedding task
      IDs, vendors or repository paths in control flow.
- [ ] Expand-contract activates only for broad contract migrations and requires
      an expand step, independently green migration batches, an old-form usage
      query and a zero-caller contract gate.
- [ ] TDD oracle fidelity proves expected values come from an independent
      source and flags private-method, internal-mock and tautological tests.
- [ ] Review smells remain replaceable heuristics beneath repository standards;
      Standards and Spec findings remain separate TASK-SKL-0021 axes.
- [ ] Merge-conflict guidance records both-side intent provenance and may fail
      closed or abort safely when goals conflict; it never mandates ours/theirs.
- [ ] Existing `atm-plan-authoring`, `atm-task-card-authoring`, `atm-evidence`
      and deep-module routes consume profiles without creating a parallel
      lifecycle or registry.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-26T15:30:51.894Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0034-engineering-change-method-profiles-and-fidelity-receipts.task.md","contentDigest":"sha256:cd925ea187ae3345d18183c083688e56e7b5f8fa91538034a65414ec0211ba95"} -->
