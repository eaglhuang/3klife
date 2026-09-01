---
task_id: TASK-SKL-0040
title: Refresh sealed adapter projections to the current skill corpus snapshot
status: planned
owner: atm-framework
priority: P0
depends_on:
  - TASK-SKL-0038
  - TASK-SKL-0039
causalGraph:
  causalDependencies:
    - TASK-SKL-0038 established the sealed source-universe and finite projection-disposition contract.
    - TASK-SKL-0039 proved targeted canonical projection refresh without overwriting unrelated corpus copies.
  startConditions:
    - A read-only adapter inventory names every stale manifest and generated projection before any write.
    - The source skill corpus audit is valid and all source templates selected for projection are tracked.
    - Broker admission grants an exact task scope before source, manifest, or installed projection writes.
  softRelations:
    - ATM-GOV-0341 remains blocked on integration-adapter health; this card repairs that prerequisite but does not alter certificate semantics.
  changedPublicSeams:
    - sealed-skill-corpus-to-adapter-projection parity
    - adapter-manifest freshness disposition
  causalImpactEdges:
    - sealed-source-snapshot -> six-editor-adapter-manifests
    - adapter-refresh -> installed-projection-digest-parity
    - projection-parity -> framework-doctor-integration-adapters-gate
  parallelFrontierInputs:
    - Existing installed-copy dirty files remain foreign until the compiler audit classifies each exact generated output.
  validatorReferences:
    - validate-skill-templates
    - validate-integration-adapter
    - skill-corpus-canary-rewrite
  phaseOwner: TASK-SKL-0040
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/compiler/skill-projection-parity.ts
  - scripts/validate-skill-templates.ts
  - scripts/validate-integration-adapter.ts
  - tests/cli/skill-corpus-canary-rewrite.test.ts
  - .atm/integrations/antigravity.manifest.json
  - .atm/integrations/claude-code.manifest.json
  - .atm/integrations/codex.manifest.json
  - .atm/integrations/copilot.manifest.json
  - .atm/integrations/cursor.manifest.json
  - .atm/integrations/gemini.manifest.json
  - .gemini/commands/atm-error-code-resolver.toml
  - .gemini/commands/atm-task-intent-resolver.toml
  - .gemini/commands/atm-upgrade-scan.toml
  - .gemini/commands/atm-atom-map-refactor.toml
  - .gemini/commands/atm-bug-backlog.toml
  - .gemini/commands/atm-create.toml
  - .gemini/commands/atm-deep-module-refactor.toml
  - .gemini/commands/atm-dispatch.toml
  - .gemini/commands/atm-evidence.toml
  - .gemini/commands/atm-framework-temp-claim.toml
  - .gemini/commands/atm-git-pathspec-emergency-commit.toml
  - .gemini/commands/atm-governance-router.toml
  - .gemini/commands/atm-handoff.toml
  - .gemini/commands/atm-internal-build-sync.toml
  - .gemini/commands/atm-lock.toml
  - .gemini/commands/atm-memory-consolidate.toml
  - .gemini/commands/atm-minimal-patch-rebuilder.toml
  - .gemini/commands/atm-next.toml
  - .gemini/commands/atm-orient.toml
  - .gemini/commands/atm-plan-authoring.toml
  - .gemini/commands/mailbox-worker-execution.toml
  - .github/instructions/atm-error-code-resolver.instructions.md
  - .github/instructions/atm-task-intent-resolver.instructions.md
  - .github/instructions/atm-upgrade-scan.instructions.md
  - .github/prompts/atm-error-code-resolver.prompt.md
  - .github/prompts/atm-task-intent-resolver.prompt.md
  - .github/prompts/atm-upgrade-scan.prompt.md
deliverables:
  - packages/integrations-core/src/compiler/skill-projection-parity.ts
  - scripts/validate-integration-adapter.ts
  - .atm/integrations/antigravity.manifest.json
  - .atm/integrations/claude-code.manifest.json
  - .atm/integrations/codex.manifest.json
  - .atm/integrations/copilot.manifest.json
  - .atm/integrations/cursor.manifest.json
  - .atm/integrations/gemini.manifest.json
  - .gemini/commands/atm-error-code-resolver.toml
  - .gemini/commands/atm-task-intent-resolver.toml
  - .gemini/commands/atm-upgrade-scan.toml
  - .gemini/commands/atm-atom-map-refactor.toml
  - .gemini/commands/atm-bug-backlog.toml
  - .gemini/commands/atm-create.toml
  - .gemini/commands/atm-deep-module-refactor.toml
  - .gemini/commands/atm-dispatch.toml
  - .gemini/commands/atm-evidence.toml
  - .gemini/commands/atm-framework-temp-claim.toml
  - .gemini/commands/atm-git-pathspec-emergency-commit.toml
  - .gemini/commands/atm-governance-router.toml
  - .gemini/commands/atm-handoff.toml
  - .gemini/commands/atm-internal-build-sync.toml
  - .gemini/commands/atm-lock.toml
  - .gemini/commands/atm-memory-consolidate.toml
  - .gemini/commands/atm-minimal-patch-rebuilder.toml
  - .gemini/commands/atm-next.toml
  - .gemini/commands/atm-orient.toml
  - .gemini/commands/atm-plan-authoring.toml
  - .gemini/commands/mailbox-worker-execution.toml
  - .github/instructions/atm-error-code-resolver.instructions.md
  - .github/instructions/atm-task-intent-resolver.instructions.md
  - .github/instructions/atm-upgrade-scan.instructions.md
  - .github/prompts/atm-error-code-resolver.prompt.md
  - .github/prompts/atm-task-intent-resolver.prompt.md
  - .github/prompts/atm-upgrade-scan.prompt.md
validators:
  - npm run validate:skill-templates
  - npm run validate:integration-adapter
  - node --strip-types tests/cli/skill-corpus-canary-rewrite.test.ts
  - git diff --check
testContributions:
  - caseId: test_skl_0040_sealed_adapter_projection_refresh
    targetGroupId: skill-corpus-canary-rewrite
    semanticKey: sealed_adapter_projection_refresh
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [sealed-source-snapshot -> six-editor-adapter-manifests, adapter-refresh -> installed-projection-digest-parity]
    expectedRedPredicate: a stale manifest or generated installed projection fails the source-digest parity assertion
    contributionResourceKey: skill-corpus-adapter-projection
    responsibility: task-required
    dependencyEdge: TASK-SKL-0039
    contractEdge: sealed-source-to-projection
    resourceKey: skill-corpus-adapter-projection
  - caseId: test_skl_0040_projection_disposition_fail_closed
    targetGroupId: skill-corpus-canary-rewrite
    semanticKey: projection_disposition_fail_closed
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [projection-parity -> framework-doctor-integration-adapters-gate]
    expectedRedPredicate: a generated path that is missing from the audited source snapshot or an unclassified drift disposition is rejected
    contributionResourceKey: skill-corpus-adapter-projection
    responsibility: task-required
    dependencyEdge: TASK-SKL-0038
    contractEdge: finite-drift-disposition
    resourceKey: skill-corpus-adapter-projection
requiredTestCaseIds:
  - test_skl_0040_sealed_adapter_projection_refresh
  - test_skl_0040_projection_disposition_fail_closed
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit-and-regenerate-adapter-projections-from-prior-sealed-snapshot
atomizationImpact:
  ownerAtomOrMap: atm.skill-template-compiler
  mapUpdates: []
  extractionCandidates:
    - atom: atm.skill-projection-parity
      pattern: Policy Object
      source: packages/integrations-core/src/compiler/skill-projection-parity.ts
      disposition: inline
      inlineReason: The existing parity policy owns projection lifecycle decisions; this card refreshes and proves that policy rather than adding a second resolver.
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-SKL-0040 Refresh sealed adapter projections to the current skill corpus snapshot

## Intent

Close the remaining six-editor projection drift as one cohesive source-to-
installed-copy delivery. The source template corpus remains authoritative.
Each adapter refresh must be generated by the compiler from a tracked sealed
snapshot, update the corresponding manifest, and leave non-audited dirty bytes
untouched.

## Acceptance

- [ ] ACC-1: every installed adapter projection selected by the read-only
      inventory is regenerated from the current sealed source corpus; its
      manifest records matching source, compiler, and projection metadata.
- [ ] ACC-2: `npm run validate:integration-adapter` passes for Antigravity,
      Claude Code, Codex, Copilot, Cursor, and Gemini without copy-only source
      substitutions.
- [ ] ACC-3: an untracked, ignored, or unclassified source/projection entry
      remains a hard actionable finding rather than an advisory-only pass.
- [ ] ACC-4: the refresh does not stage, overwrite, or normalize any installed
      copy that is absent from the pre-write audit; every admitted output is
      reported as an exact generated path.

## Non-goals

- Do not edit a source template merely to make an installed copy look current.
- Do not force-add ignored templates or mutate `.atm/runtime/**`.
- Do not alter task claims, certificate/closeback semantics, runner-sync,
  release artifacts, or Plan 3.x evidence.
- Do not use a corpus-wide wildcard scope; admit additional generated outputs
  only through the compiler's exact audit inventory.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-21T05:59:12.950Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0040-refresh-sealed-adapter-projections-to-the-current-skill-corpus-snapshot.task.md","contentDigest":"sha256:fc9046fc7faaa4a57f9db83289517fca62574088f5cb6acb25b516ad23120960"} -->
