---
task_id: TASK-SKL-0032
title: Editor-global skill source federation and overlay manifests
status: planned
owner: atm-integrations
priority: P1
milestone: ATM-SKL-VG-R1.0
depends_on:
  - TASK-SKL-0031
causalGraph:
  causalDependencies:
    - TASK-SKL-0031
  startConditions:
    - TASK-SKL-0031 is done and the skill-distribution public interface is sealed.
  softRelations:
    - Claude global skill sync manifest from the 2026-07-26 migration probe
  changedPublicSeams:
    - External skill source catalog ingestion
    - Editor-global overlay planning and verification
  causalImpactEdges:
    - external source provenance -> overlay catalog
    - overlay catalog plus ATM profile -> collision-aware installation plan
    - installation plan -> editor-global managed manifest
  parallelFrontierInputs: []
  validatorReferences:
    - node --strip-types tests/cli/editor-global-skill-federation.test.ts
    - node --strip-types tests/cli/editor-global-overlay-collision.test.ts
  phaseOwner: atm-integrations
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/integrations-core/src/distribution/external-skill-catalog.ts
  - packages/integrations-core/src/distribution/editor-global-overlay.ts
  - packages/integrations-core/src/distribution/skill-distribution-manager.ts
  - packages/integrations-core/src/manifest/types.ts
  - packages/integrations-core/src/index.ts
  - packages/cli/src/commands/integration/**
  - schemas/integrations/external-skill-catalog.schema.json
  - schemas/integrations/editor-global-skill-manifest.schema.json
  - docs/AGENT_PACK_ONBOARDING.md
  - tests/catalog/groups/test_group_editor_skill_overlay.shard.json
  - tests/cli/editor-global-skill-federation.test.ts
  - tests/cli/editor-global-overlay-collision.test.ts
deliverables:
  - packages/integrations-core/src/distribution/external-skill-catalog.ts
  - packages/integrations-core/src/distribution/editor-global-overlay.ts
  - schemas/integrations/external-skill-catalog.schema.json
  - schemas/integrations/editor-global-skill-manifest.schema.json
  - docs/AGENT_PACK_ONBOARDING.md
  - tests/cli/editor-global-skill-federation.test.ts
  - tests/cli/editor-global-overlay-collision.test.ts
validators:
  - node --strip-types tests/cli/editor-global-skill-federation.test.ts
  - node --strip-types tests/cli/editor-global-overlay-collision.test.ts
  - npm run validate:schemas
  - npm run typecheck
  - npm run validate:cli
requiredTestCaseIds:
  - test_task_skl_0032_global_federation_43bfb7c2
  - test_task_skl_0032_overlay_collision_f9f565a0
phaseTestCaseIds: []
advisoryTestCaseIds: []
outOfScope:
  - Moving personal or third-party skill bodies into templates/skills.
  - Treating an external overlay catalog as ATM product or runtime authority.
  - Reading or mutating real user home directories in automated tests.
errorCodes: []
evidence:
  required: command-backed-external-source-provenance-and-overlay-safety
rollback:
  strategy: revert-commit-and-disable-editor-global-overlay-profile
atomizationImpact:
  ownerAtomOrMap: atm.editor-skill-overlay
  mapUpdates: []
  extractionCandidates:
    - atom: atm.external-skill-catalog-adapter
      pattern: Adapter
      source: packages/integrations-core/src/distribution/external-skill-catalog.ts
      disposition: extract
createdByCommand: atm plan card create
---

# TASK-SKL-0032 Editor-global skill source federation and overlay manifests

## Intent

Add an optional, provenance-aware federation layer for user-global and
third-party skill sources without promoting those sources into the ATM product
corpus. Feed external catalogs into the `TASK-SKL-0031` distribution interface
as overlays, produce collision-aware editor-global plans, and maintain a
separate managed manifest for each editor target.

## Acceptance

- [ ] External source descriptors record source root/provider, skill ID,
      content digest, provenance, license when known, and supported source
      format without embedding machine-specific paths in production policy.
- [ ] ATM-owned IDs and namespaces cannot be silently overridden by an external
      source. Conflicts produce a deterministic preserve, select, or fail-closed
      decision with source attribution.
- [ ] Overlay planning uses the `TASK-SKL-0031` public interface and does not
      create a second ATM skill registry, compiler, or install lifecycle.
- [ ] User-global manifests are separate from repo-local ATM integration
      manifests and record only files managed by the selected overlay profile.
- [ ] Dry-run reports additions, updates, fallbacks, skipped invalid sources,
      collisions, stale managed files, and preserved unmanaged files before
      apply.
- [ ] Apply and verify are hash-bound and idempotent. Modified or unmanaged
      editor files are preserved unless a separately governed explicit action
      authorizes replacement or removal.
- [ ] At least Codex and Claude Code global roots are covered by real adapters;
      other editors either implement the same contract or emit structured
      unsupported-capability evidence.
- [ ] Tests use temporary fixture roots and cover incomplete source directories,
      companion files, duplicate IDs, source priority, stale manifests, and
      rollback without touching a real user profile.
- [ ] The 2026-07-26 Claude sync manifest is retained only as migration evidence,
      not imported as canonical runtime configuration.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-26T14:40:49.304Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0032-editor-global-skill-source-federation-and-overlay-manifests.task.md","contentDigest":"sha256:c9c171f1ef1706c2063295157dc2ba43a9eb4a4dcfa6cd217657d6a2445c60f1"} -->
