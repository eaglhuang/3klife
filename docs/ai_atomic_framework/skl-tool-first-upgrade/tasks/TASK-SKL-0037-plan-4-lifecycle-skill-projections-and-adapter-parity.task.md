---
task_id: TASK-SKL-0037
title: Plan 4.0 lifecycle skill projections and adapter parity
status: planned
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-PLAN4-R1
depends_on:
  - TASK-SKL-0036
  - ATM-GOV-0305
causalGraph:
  causalDependencies:
    - TASK-SKL-0036
    - ATM-GOV-0305
  startConditions:
    - TASK-SKL-0036 is done and incident candidates have a canonical template and schema.
    - ATM-GOV-0305 is done and typed family revision and selection outputs are sealed.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - TASK-SKL-0034 engineering change method profiles
    - TASK-SKL-0035 deep-module boundary topology validator
  changedPublicSeams:
    - ATM incident-learning skill lineage
    - Skill-to-CausalRegressionFamily typed projection
    - Six editor/provider skill adapter parity
  causalImpactEdges:
    - typed incident candidate -> task/evidence contract
    - confirmed observation -> family observe route
    - family selection -> focused worker execution and handoff
    - recurrent family trend -> upgrade and deep-module review
  parallelFrontierInputs:
    - TASK-SKL-0036 candidate schema and template
    - ATM-GOV-0305 family revision and selection contracts
  validatorReferences:
    - node --strip-types tests/cli/plan4-skill-learning-lineage.test.ts
    - node --strip-types tests/cli/plan4-skill-adapter-parity.test.ts
    - npm run validate:skill-templates
    - npm run validate:integration-adapter
  phaseOwner: atm-captain-skill-lane
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-governance-router.skill.md
  - templates/skills/atm-next.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-evidence.skill.md
  - templates/skills/atm-handoff.skill.md
  - templates/skills/atm-upgrade-scan.skill.md
  - templates/skills/atm-deep-module-refactor.skill.md
  - templates/skills/mailbox-worker-execution.skill.md
  - packages/integrations-core/src/compiler/**
  - scripts/validate-skill-templates.ts
  - scripts/validate-integration-adapter.ts
  - tests/catalog/groups/test_group_plan4_skill_learning.shard.json
  - tests/cli/plan4-skill-learning-lineage.test.ts
  - tests/cli/plan4-skill-adapter-parity.test.ts
deliverables:
  - templates/skills/atm-governance-router.skill.md
  - templates/skills/atm-next.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-evidence.skill.md
  - templates/skills/atm-handoff.skill.md
  - templates/skills/atm-upgrade-scan.skill.md
  - templates/skills/atm-deep-module-refactor.skill.md
  - templates/skills/mailbox-worker-execution.skill.md
  - tests/catalog/groups/test_group_plan4_skill_learning.shard.json
  - tests/cli/plan4-skill-learning-lineage.test.ts
  - tests/cli/plan4-skill-adapter-parity.test.ts
validators:
  - node --strip-types tests/cli/plan4-skill-learning-lineage.test.ts
  - node --strip-types tests/cli/plan4-skill-adapter-parity.test.ts
  - npm run validate:skill-templates
  - npm run validate:integration-adapter
  - npm run typecheck
testContributions:
  - caseId: test_task_skl_0037_learning_lineage_8c542ad1
    targetGroupId: test_group_plan4_skill_learning
    semanticKey: plan4_skill_learning_lineage
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-3
      - ACC-5
      - ACC-6
    coversImpactEdges:
      - typed incident candidate -> task/evidence contract
      - confirmed observation -> family observe route
      - family selection -> focused worker execution and handoff
    expectedRedPredicate: Entry skills drop or independently reinterpret typed incident-learning fields.
    responsibility: task-required
    contractEdge: plan4-skill-learning-lineage
  - caseId: test_task_skl_0037_six_adapter_parity_3d79f2b6
    targetGroupId: test_group_plan4_skill_learning
    semanticKey: plan4_skill_six_adapter_parity
    coversAcceptance:
      - ACC-4
    coversImpactEdges:
      - recurrent family trend -> upgrade and deep-module review
    expectedRedPredicate: An editor projection loses required fields, provenance, or fail-closed behavior.
    responsibility: task-required
    contractEdge: plan4-skill-adapter-parity
requiredTestCaseIds:
  - test_task_skl_0037_learning_lineage_8c542ad1
  - test_task_skl_0037_six_adapter_parity_3d79f2b6
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
evidence:
  required: command-backed-typed-lineage-and-six-adapter-parity
rollback:
  strategy: revert-commit-and-retain-task-local-plan4-advisory-output
atomizationImpact:
  ownerAtomOrMap: atm.skill-distribution
  mapUpdates: []
  extractionCandidates:
    - atom: atm.plan4-skill-learning-projection
      pattern: Adapter
      source: packages/integrations-core/src/compiler
      disposition: extract
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-SKL-0037 Plan 4.0 lifecycle skill projections and adapter parity

## Intent

Project the typed Plan 4.0 incident-learning lifecycle through all relevant ATM
entry skills and six editor/provider adapters without moving policy authority
into prompts. Preserve one lineage from candidate intake through task/evidence,
family selection, focused execution, handoff and upgrade review.

## Acceptance

- [ ] ACC-1: router/next distinguish record-only, reproduce,
      confirmed incident, recurrence and audit routes while consuming typed
      family selection rather than guessing it.
- [ ] ACC-2: task-card, dispatch and evidence skills preserve
      acceptance IDs, public seams, protected exam surfaces, same-case
      red/green, independent oracle, selected/omitted reasons and zero-test
      failure.
- [ ] ACC-3: handoff, upgrade scan, deep-module review and mailbox
      execution carry family revision, selection digest, new factors,
      unavailable data and replay refs without recomputing authority.
- [ ] ACC-4: Codex, Claude Code, Cursor, Copilot, Gemini and
      Antigravity preserve required machine fields, source digest, compiler
      version, degradation diagnostics and manifest digest after reinstall.
- [ ] ACC-5: Unknown mapping blocks closure with an executable mapping-repair route;
      it does not trigger run-all and cannot produce run-none-and-pass.
- [ ] ACC-6: Source templates remain authoritative and installed-copy-only edits fail
      review.

## Execution ownership

This card is retained by `atm-captain-skill-lane`. Other captains may perform
read-only review but receive no write authority for its canonical skill
templates, compiler projections, installed adapters or parity tests.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T14:04:57.856Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0037-plan-4-lifecycle-skill-projections-and-adapter-parity.task.md","contentDigest":"sha256:fd519b6fd828438d131cf0b094c955bb53480a3990f648a0daf5f28e9bf6bb86"} -->
