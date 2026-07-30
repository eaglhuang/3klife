---
task_id: TASK-SKL-0031
title: Data-driven skill tiers and full-corpus integration profiles
status: done
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
    - ATM integration manifest reconciliation
  causalImpactEdges:
    - canonical skill catalog -> install profile -> adapter projection
    - adapter projection plus existing manifest -> reconciliation plan
    - reconciliation plan -> complete editor corpus with stale projection control
  parallelFrontierInputs: []
  validatorReferences:
    - node --strip-types tests/cli/skill-distribution-manager.test.ts
    - node --strip-types tests/cli/integration-profile-parity.test.ts
    - node --strip-types tests/cli/integration-reconciliation.test.ts
  phaseOwner: atm-integrations
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/skill.schema.json
  - templates/skills/*.skill.md
  - templates/skills/*.files/**
  - packages/integrations-core/src/distribution/skill-distribution-manager.ts
  - packages/integrations-core/src/distribution/skill-catalog.ts
  - packages/integrations-core/src/distribution/install-profile.ts
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/compiler/compile.ts
  - packages/integrations-core/src/manifest/types.ts
  - packages/integrations-core/src/manifest/construct.ts
  - packages/integrations-core/src/verify/types.ts
  - packages/integrations-core/src/verify/verify-installed.ts
  - packages/integrations-core/src/index.ts
  - packages/integration-claude-code/src/index.ts
  - packages/integration-codex/src/index.ts
  - packages/integration-copilot/src/index.ts
  - packages/integration-cursor/src/index.ts
  - packages/integration-gemini/src/index.ts
  - packages/cli/src/commands/integration/**
  - schemas/integrations/install-manifest.schema.json
  - scripts/audit-skill-corpus.ts
  - scripts/validate-skill-templates.ts
  - artifacts/generated/skill-corpus-audit.json
  - tests/catalog/groups/test_group_skill_integration_profiles.shard.json
  - tests/cli/skill-distribution-manager.test.ts
  - tests/cli/integration-profile-parity.test.ts
  - tests/cli/integration-reconciliation.test.ts
deliverables:
  - packages/integrations-core/src/distribution/skill-distribution-manager.ts
  - packages/integrations-core/src/distribution/skill-catalog.ts
  - packages/integrations-core/src/distribution/install-profile.ts
  - templates/skills/skill.schema.json
  - schemas/integrations/install-manifest.schema.json
  - scripts/validate-skill-templates.ts
  - artifacts/generated/skill-corpus-audit.json
  - tests/cli/skill-distribution-manager.test.ts
  - tests/cli/integration-profile-parity.test.ts
  - tests/cli/integration-reconciliation.test.ts
validators:
  - node --strip-types tests/cli/skill-distribution-manager.test.ts
  - node --strip-types tests/cli/integration-profile-parity.test.ts
  - node --strip-types tests/cli/integration-reconciliation.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
  - npm run validate:cli
requiredTestCaseIds:
  - test_task_skl_0031_distribution_manager_7d3f0f24
  - test_task_skl_0031_profile_parity_8a6c93d1
  - test_task_skl_0031_reconciliation_522feaa8
phaseTestCaseIds: []
advisoryTestCaseIds: []
outOfScope:
  - User-global or third-party skill source federation, which belongs to TASK-SKL-0032.
  - Direct edits or ad hoc copies under installed editor skill roots.
errorCodes: []
evidence:
  required: sealed-deep-module-review-and-command-backed-profile-reconciliation
rollback:
  strategy: revert-commit-and-retain-the-existing-minimum-entry-default
atomizationImpact:
  ownerAtomOrMap: atm.integration-skill-compiler
  mapUpdates:
    - artifacts/generated/skill-corpus-audit.json
  extractionCandidates:
    - atom: atm.skill-distribution-manager
      pattern: Deep Module
      source: packages/integrations-core/src/distribution/skill-distribution-manager.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-30T17:42:33.371Z"
completed_by_agent: "codex-skl-captain"
closedAt: "2026-07-30T17:42:33.371Z"
closedByActor: "codex-skl-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-30T17-42-33-371Z-close-dff3849f88cc"
lastTransitionAt: "2026-07-30T17:42:33.371Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "68374405ee0c7c03b5533094f2fc5c96ef801b99"
---

# TASK-SKL-0031 Data-driven skill tiers and full-corpus integration profiles

## Intent

Create one deep skill-distribution module that owns canonical ATM skill
metadata, install profiles, adapter projection planning, and manifest
reconciliation. Replace duplicated hard-coded minimum-entry metadata with
schema-validated template data, preserve a small adopter bootstrap profile, and
make the complete ATM corpus the framework-repository profile without relying
on operator copies.

## Acceptance

- [ ] A sealed `atm.deepModuleReviewReport.v1` passes for
      `atm-skill-distribution-manager`, records at least two concrete editor
      adapters, and preserves fingerprint, rollback, and causal validators.
- [ ] Every `templates/skills/*.skill.md`, including specialist and emergency
      skills, validates against `skill.schema.json`; malformed legacy
      frontmatter cannot enter the source catalog.
- [ ] Canonical frontmatter declares ownership, tier, install profiles,
      invocation policy, companion files, and adapter capability requirements.
- [ ] The legacy `minimumAtmEntrySkillDefinitions` metadata duplication is
      removed; no adapter owns a second title, summary, command, or membership
      registry for the same templates.
- [ ] Data-driven profiles cover adopter bootstrap, full ATM framework,
      role-oriented, and emergency-explicit installation. Framework repositories
      select full ATM; adopter default behavior remains bootstrap-compatible.
- [ ] Claude Code, Codex, Copilot, Cursor, Gemini, and Antigravity project the
      same ATM skill IDs, source digest, capabilities, and governance semantics.
      Adapter-specific bytes may differ and unsupported capabilities fail closed
      with structured degradation diagnostics.
- [ ] The public interface
      `resolveSkillInstallationPlan({ sourceCatalog, installProfile,
      adapterCapabilities, targetScope, existingManifest })` returns additions,
      updates, preserved user files, stale managed projections, collisions, and
      degradation findings before any write occurs.
- [ ] Install manifests record source-catalog digest, profile ID, managed skill
      IDs, adapter format, and target scope. Verify detects missing canonical
      projections and extra stale managed projections, not only hash mismatches.
- [ ] Reconciliation never deletes modified or unmanaged user files implicitly;
      stale managed removal is explicit, hash-guarded, and visible in dry-run.
- [ ] Full-corpus installs render charter placeholders and never leave raw
      template placeholders in the installed artifacts.
- [ ] Focused tests prove complete schema coverage, profile parity, companion
      preservation, collision handling, stale projection detection, rollback,
      and the previously omitted specialist skills as ordinary data-driven cases.
- [ ] No direct edits or ad hoc copies under an installed editor skill root are
      used as the delivery mechanism.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-26T14:09:11.376Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0031-data-driven-skill-tiers-and-full-corpus-integration-profiles.task.md","contentDigest":"sha256:9a8e871e5d8cede30059ee4643af4312c5c93f7adfd6c4d451e0dc249a7b3b2f"} -->
