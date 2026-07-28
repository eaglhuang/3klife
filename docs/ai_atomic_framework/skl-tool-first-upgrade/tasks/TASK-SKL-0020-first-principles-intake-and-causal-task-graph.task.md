---
task_id: TASK-SKL-0020
title: First-principles intake and causal task graph
status: done
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.2
depends_on:
  - TASK-SKL-0018
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-task-card-authoring.skill.md
  - templates/skills/atm-plan-authoring.skill.md
  - templates/skills/atm-dispatch.skill.md
  - packages/cli/src/commands/plan.ts
  - packages/cli/src/commands/tasks/task-card-writer.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - tests/cli/task-card-causal-graph-authoring.test.ts
deliverables:
  - templates/skills/atm-task-card-authoring.skill.md
  - templates/skills/atm-plan-authoring.skill.md
  - templates/skills/atm-dispatch.skill.md
  - packages/cli/src/commands/tasks/task-card-writer.ts
  - tests/cli/task-card-causal-graph-authoring.test.ts
validators:
  - node --strip-types tests/cli/task-card-causal-graph-authoring.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
evidence:
  required: first-principles-intake-and-dag-contract
rollback:
  strategy: revert-commit-and-retain-current-authoring-template
atomizationImpact:
  ownerAtomOrMap: atm.task-authoring
  mapUpdates: []
  extractionCandidates:
    - atom: atm.causal-task-intake
      pattern: Authoring Policy
      source: packages/cli/src/commands/tasks/task-card-writer.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-24T07:43:16.987Z"
completed_by_agent: "codex-matt-skills-initiative-captain-20260724"
closedAt: "2026-07-24T07:43:16.987Z"
closedByActor: "codex-matt-skills-initiative-captain-20260724"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T07-43-16-904Z-close-4d94222f9434"
lastTransitionAt: "2026-07-24T07:43:16.987Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d3312405e6c31caf11eb0d21f6c56854ed038024"
---

# TASK-SKL-0020 First-principles intake and causal task graph

## Intent

Refactor task intake around identity, authority, outcome, execution contract,
causal impact, and hard dependency edges. Adapt grill-me and to-tickets methods
as replaceable authoring providers.

## Acceptance

- [ ] Intake asks only currently unblocked human decisions and offers defaults.
- [ ] `depends_on` contains only causal blockers; start conditions and soft
      relations are separately typed.
- [ ] Cards declare changed public seams, causal impact edges, parallel frontier
      inputs, validator references and phase ownership without duplicated prose.
- [ ] `deliverables` remain a subset of write scope.
- [ ] Dispatch output stays concise by referencing the sealed card instead of
      repeating its full contents.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:34.614Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0020-first-principles-intake-and-causal-task-graph.task.md","contentDigest":"sha256:b9c2eccf48eb56906b9602de03d6b1ac8451ce66e5a4101f0d5b51e934b1df4a"} -->
