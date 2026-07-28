---
task_id: TASK-SKL-0019
title: Skill definition vNext and progressive disclosure compiler
status: done
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
  - templates/skills/skill.schema.json
  - packages/integrations-core/src/compiler/skill-templates.ts
  - scripts/validate-skill-templates.ts
  - tests/cli/skill-definition-vnext.test.ts
deliverables:
  - templates/skills/skill.schema.json
  - packages/integrations-core/src/compiler/skill-templates.ts
  - tests/cli/skill-definition-vnext.test.ts
validators:
  - node --strip-types tests/cli/skill-definition-vnext.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
evidence:
  required: skill-definition-vnext-adapter-parity
rollback:
  strategy: revert-commit-and-use-v1-skill-projection
atomizationImpact:
  ownerAtomOrMap: atm.agent-skills
  mapUpdates: []
  extractionCandidates:
    - atom: atm.skill-definition-vnext
      pattern: Versioned Skill Definition
      source: templates/skills/skill.schema.json
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-24T07:04:52.813Z"
completed_by_agent: "codex-matt-skills-initiative-captain-20260724"
closedAt: "2026-07-24T07:04:52.813Z"
closedByActor: "codex-matt-skills-initiative-captain-20260724"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T07-04-52-704Z-close-ce66b80583bc"
lastTransitionAt: "2026-07-24T07:04:52.813Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e8d9226a3137fbed702dfab3b1925f55103836ac"
---

# TASK-SKL-0019 Skill definition vNext and progressive disclosure compiler

## Intent

Add invocation modes, typed completion criteria, trigger branches,
progressive-disclosure references, context budgets, and adapter projections to
the versioned skill definition and compiler.

## Acceptance

- [ ] Definition supports `model`, `user`, and `router` invocation modes.
- [ ] Stable core rules remain in the main skill while optional context is
      addressable through progressive-disclosure references.
- [ ] Completion criteria are typed and validator-addressable.
- [ ] Compiler projections preserve semantics across Codex, Claude, Cursor,
      Copilot, Gemini and Antigravity or emit explicit degradation.
- [ ] Context-token and false-invocation measurements are exposed for canaries.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:34.450Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0019-skill-definition-vnext-and-progressive-disclosure-compiler.task.md","contentDigest":"sha256:5f3a570e1d519b1eef349eb62728c5de1760c49ddcc444b7387daa412d5211fa"} -->
