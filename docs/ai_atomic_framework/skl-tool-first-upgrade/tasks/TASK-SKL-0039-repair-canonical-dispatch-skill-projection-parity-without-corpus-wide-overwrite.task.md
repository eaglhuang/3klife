---
task_id: TASK-SKL-0039
title: Repair canonical dispatch skill projection parity without corpus-wide overwrite
status: done
owner: atm-framework
priority: P1
depends_on:
  - TASK-SKL-0038
causalGraph:
  causalDependencies:
    - TASK-SKL-0038 established the sealed source-universe and installed-projection audit seam.
  startConditions:
    - Source template and both current dispatch projections are inventoried without overwriting unrelated dirty corpus files.
    - Broker admission grants an exact task scope before any source or projection write.
  softRelations:
    - ATM-BUG-2026-08-14-013 records source-template tracking risk; this card consumes only the confirmed dispatch parity failure.
  changedPublicSeams:
    - atm-dispatch canonical source-to-projection parity
    - targeted adapter refresh isolation
  causalImpactEdges:
    - dispatch-template-change -> projected-local-and-codex-copies
    - targeted-refresh -> no-unrelated-installed-copy-mutation
  parallelFrontierInputs:
    - Current installed-copy drift is foreign WIP until the task admits exact paths.
  validatorReferences:
    - validate-captain-dispatch-protocol
    - validate-skill-templates
    - skill-corpus-canary-rewrite
  phaseOwner: TASK-SKL-0039
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-dispatch.skill.md
  - .agents/skills/atm-dispatch/SKILL.md
  - integrations/codex-skills/atm-dispatch/SKILL.md
  - .atm/integrations/codex.manifest.json
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/compiler/skill-projection-parity.ts
  - scripts/validate-captain-dispatch-protocol.ts
  - tests/cli/skill-corpus-canary-rewrite.test.ts
deliverables:
  - templates/skills/atm-dispatch.skill.md
  - .agents/skills/atm-dispatch/SKILL.md
  - integrations/codex-skills/atm-dispatch/SKILL.md
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/compiler/skill-projection-parity.ts
  - scripts/validate-captain-dispatch-protocol.ts
  - tests/cli/skill-corpus-canary-rewrite.test.ts
validators:
  - node --strip-types scripts/validate-captain-dispatch-protocol.ts --mode validate
  - npm run validate:skill-templates
  - node --strip-types tests/cli/skill-corpus-canary-rewrite.test.ts
testContributions:
  - caseId: test_skl_0039_dispatch_projection_parity
    targetGroupId: skill-corpus-canary-rewrite
    semanticKey: targeted_dispatch_projection_refresh
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [dispatch-template-change -> projected-local-and-codex-copies, targeted-refresh -> no-unrelated-installed-copy-mutation]
    expectedRedPredicate: a dispatch source/projection mismatch or unrelated-copy mutation is detected
    contributionResourceKey: skill-corpus-dispatch-projection
    responsibility: task-required
    dependencyEdge: TASK-SKL-0038
    contractEdge: sealed-source-to-projection
    resourceKey: skill-corpus-dispatch-projection
  - caseId: test_skl_0039_dispatch_projection_audit_receipt
    targetGroupId: skill-corpus-canary-rewrite
    semanticKey: dispatch_projection_audit_metadata
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [dispatch-template-change -> projected-local-and-codex-copies]
    expectedRedPredicate: missing source, compiler, manifest, or parity metadata is rejected
    contributionResourceKey: skill-corpus-dispatch-projection
    responsibility: task-required
    dependencyEdge: TASK-SKL-0038
    contractEdge: audit-receipt-contract
    resourceKey: skill-corpus-dispatch-projection
requiredTestCaseIds:
  - test_skl_0039_dispatch_projection_parity
  - test_skl_0039_dispatch_projection_audit_receipt
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit-and-regenerate-targeted-projection
atomizationImpact:
  ownerAtomOrMap: atm.skill-template-compiler
  mapUpdates: []
  extractionCandidates:
    - atom: atm.skill-projection-parity
      pattern: Policy Object
      source: packages/integrations-core/src/compiler/skill-projection-parity.ts
      disposition: inline
      inlineReason: The existing parity policy module is the lifecycle authority; this card narrows its targeted refresh boundary rather than creating a second resolver.
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-21T05:24:49.900Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-21T05:24:49.900Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-21T05-24-49-900Z-close-2cd9d117e76b"
lastTransitionAt: "2026-08-21T05:24:49.900Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "fee9daae19ec53e313c53994e8f32ee94917446a"
---

# TASK-SKL-0039 Repair canonical dispatch skill projection parity without corpus-wide overwrite

## Intent

Repair the confirmed `atm-dispatch` source/projection mismatch through the sealed
skill compiler. The source template remains authoritative; local and Codex
installed copies are derived artifacts. A targeted repair must not refresh,
replace, stage, or otherwise alter unrelated installed skill copies.

## Acceptance

- [ ] ACC-1: `atm-dispatch` source policy, local installed copy, and Codex installed copy have one compiler-verifiable canonical relation; `validate-captain-dispatch-protocol` passes without copy-only edits.
- [ ] ACC-2: a focused red/green test proves the targeted dispatch refresh updates only the declared dispatch projection and manifest entries; unrelated installed-copy bytes remain unchanged.
- [ ] ACC-3: source tracking/audit emits the source digest, compiler version, manifest digest, and explicit parity disposition for the repaired projection.
- [ ] ACC-4: `npm run validate:skill-templates` passes with no newly introduced advisory drift for `atm-dispatch`.

## Non-goals

- Do not force-add an ignored or unowned source template.
- Do not perform a full corpus refresh or adapter architecture rewrite.
- Do not modify other adapter copies, `.atm/runtime/**`, task lifecycle, runner-sync, release, or Plan 3.x evidence surfaces.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-21T02:45:17.343Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0039-repair-canonical-dispatch-skill-projection-parity-without-corpus-wide-overwrite.task.md","contentDigest":"sha256:6c80c654d87e891d14288858fb53e5a1f3d60528fe4f4deab2c56f8c0309d3de"} -->
