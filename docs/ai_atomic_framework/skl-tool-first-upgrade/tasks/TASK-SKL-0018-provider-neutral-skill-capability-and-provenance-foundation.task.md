---
task_id: TASK-SKL-0018
title: Provider-neutral skill capability and provenance foundation
status: done
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.1
depends_on: []
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/skill.schema.json
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/core/src/team-runtime/provider-registry.ts
  - packages/plugin-experience-loop/schemas/skill-candidate.schema.json
  - packages/plugin-experience-loop/schemas/skill-amendment.schema.json
  - scripts/validate-skill-templates.ts
  - tests/cli/skill-provider-capability-contract.test.ts
deliverables:
  - templates/skills/skill.schema.json
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/core/src/team-runtime/provider-registry.ts
  - tests/cli/skill-provider-capability-contract.test.ts
validators:
  - node --strip-types tests/cli/skill-provider-capability-contract.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
evidence:
  required: provider-capability-manifest-conformance
rollback:
  strategy: revert-commit-and-restore-current-skill-schema
atomizationImpact:
  ownerAtomOrMap: atm.agent-skills
  mapUpdates: []
  extractionCandidates:
    - atom: atm.skill-provider-capability-contract
      pattern: Provider Capability Contract
      source: templates/skills/skill.schema.json
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-24T06:22:40.570Z"
completed_by_agent: "codex-matt-skills-initiative-captain-20260724"
closedAt: "2026-07-24T06:22:40.570Z"
closedByActor: "codex-matt-skills-initiative-captain-20260724"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T06-22-40-454Z-close-5f626301b7aa"
lastTransitionAt: "2026-07-24T06:22:40.570Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "bae58bbb390c91ebc6dd31246d3fd770279aa729"
---

# TASK-SKL-0018 Provider-neutral skill capability and provenance foundation

## Intent

Create the provider-neutral capability, provenance, compatibility, fallback,
shadow-run, promotion, and rollback foundation used by every later SKL card.
Matt Pocock skill text is one provider input, never an ATM runtime dependency.

## Acceptance

- [ ] `atm.skillDefinition.vNext` can identify provider, version, provenance,
      capability, compatibility range, fallback and rollback without naming a
      particular vendor in ATM core control flow.
- [ ] Provider replacement is fixture-tested and does not migrate task cards,
      test IDs, receipts, claims or close semantics.
- [ ] Unsupported adapter capabilities emit explicit degradation evidence.
- [ ] Existing skill definitions remain readable during migration.
- [ ] No second skill registry, task lifecycle or approval model is introduced.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:34.450Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0018-provider-neutral-skill-capability-and-provenance-foundation.task.md","contentDigest":"sha256:1df70c97795ad1d6e9fa779433f3824ed2f6c72133a56756254446866e51f166"} -->
