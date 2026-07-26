---
task_id: TASK-SKL-0031
title: Data-driven skill tiers and full-corpus integration profiles
status: planned
owner: atm-integrations
priority: P1
milestone: ATM-SKL-VG-R0.9
depends_on:
  - TASK-SKL-0029
causalGraph:
  causalDependencies:
    - TASK-SKL-0029
  startConditions:
    - TASK-SKL-0029 is done and its generated integration surfaces are current.
  softRelations: []
  changedPublicSeams:
    - ATM integration install profile selection
    - ATM skill-template tier metadata
  causalImpactEdges:
    - skill tier metadata -> adapter compile profile -> installed editor corpus
  parallelFrontierInputs: []
  validatorReferences:
    - npm run validate:skill-templates
    - node --strip-types tests/cli/integration-full-corpus-profile.test.ts
  phaseOwner: atm-integrations
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/skill.schema.json
  - templates/skills/*.skill.md
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/compiler/compile.ts
  - packages/integration-claude-code/src/index.ts
  - packages/integration-codex/src/index.ts
  - packages/integration-copilot/src/index.ts
  - packages/integration-cursor/src/index.ts
  - packages/integration-gemini/src/index.ts
  - packages/cli/src/commands/integration.ts
  - scripts/audit-skill-corpus.ts
  - scripts/validate-skill-templates.ts
  - artifacts/generated/skill-corpus-audit.json
  - tests/catalog/groups/test_group_skill_integration_profiles.shard.json
  - tests/cli/integration-full-corpus-profile.test.ts
  - tests/cli/skill-tier-metadata.test.ts
deliverables:
  - One schema-validated frontmatter field that classifies every canonical skill as minimum-entry or specialist.
  - A single compiler policy that derives metadata and adapter profiles from the canonical templates without duplicated title, summary, or command registries.
  - A supported integration install profile that installs the complete canonical corpus for every supported adapter while preserving the minimum-entry default.
  - Corpus audit output and focused tests proving full-profile completeness, companion-file preservation, charter rendering, and default-profile compatibility.
validators:
  - node --strip-types tests/cli/integration-full-corpus-profile.test.ts
  - node --strip-types tests/cli/skill-tier-metadata.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
  - npm run validate:cli
requiredTestCaseIds:
  - test_task_skl_0031_full_corpus_profile_7d3f0f24
  - test_task_skl_0031_skill_tier_metadata_8a6c93d1
phaseTestCaseIds: []
advisoryTestCaseIds: []
errorCodes: []
evidence:
  required: command-backed-full-corpus-profile-and-default-compatibility
rollback:
  strategy: revert-commit-and-retain-the-existing-minimum-entry-default
atomizationImpact:
  ownerAtomOrMap: atm.integration-skill-compiler
  mapUpdates:
    - artifacts/generated/skill-corpus-audit.json
  extractionCandidates:
    - atom: atm.integration-skill-profile-policy
      pattern: Policy Object
      source: packages/integrations-core/src/compiler/skill-templates.ts
      disposition: extract
createdByCommand: atm plan card create
---

# TASK-SKL-0031 Data-driven skill tiers and full-corpus integration profiles

## Intent

Replace the duplicated hard-coded minimum-entry metadata with a canonical,
schema-validated skill tier declared by each source template. Keep the
minimum-entry set as the default adapter install contract, and add a supported
full-corpus install profile so specialist skills are installable through the
same compiler and manifest path rather than copied by an operator.

## Acceptance

- [ ] Every `templates/skills/*.skill.md` declares exactly one valid tier, and
      the compiler, corpus audit, and validators consume that one source.
- [ ] The legacy `minimumAtmEntrySkillDefinitions` metadata duplication is
      removed; no adapter owns a second title, summary, command, or membership
      registry for the same templates.
- [ ] Default `integration add <adapter>` remains minimum-entry compatible and
      preserves existing manifest verification behavior.
- [ ] A documented supported full-corpus profile installs every canonical skill
      and its companion files for Claude Code, Codex, Copilot, Cursor, Gemini,
      and Antigravity through compiler-generated output.
- [ ] Full-corpus installs render charter placeholders and never leave raw
      template placeholders in the installed artifacts.
- [ ] Focused tests prove profile completeness, default compatibility, and the
      three former specialist-skill omissions as ordinary data-driven cases.
- [ ] No direct edits or ad hoc copies under an installed editor skill root are
      used as the delivery mechanism.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-26T14:09:11.376Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0031-data-driven-skill-tiers-and-full-corpus-integration-profiles.task.md","contentDigest":"sha256:9a8e871e5d8cede30059ee4643af4312c5c93f7adfd6c4d451e0dc249a7b3b2f"} -->
