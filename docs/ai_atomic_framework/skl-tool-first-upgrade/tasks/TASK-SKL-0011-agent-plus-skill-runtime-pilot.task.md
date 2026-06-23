---
task_id: TASK-SKL-0011
title: Agent plus skill runtime pilot
status: planned
milestone: P4
depends_on:
  - TASK-SKL-0008
  - TASK-SKL-0009
  - TASK-SKL-0010
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/**"
  - "packages/cli/src/commands/team.ts"
  - "packages/**"
  - "integrations/**"
deliverables:
  - "docs/**"
  - "packages/cli/src/commands/team.ts"
  - "integrations/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the pilot commit if Agent+Skill units are not independently governable or confuse Coordinator authority."
atomizationImpact:
  ownerAtomOrMap: "atm.agent-plus-skill-runtime-pilot"
  mapUpdates: []
out_of_scope:
  - "Do not make Team Agents mandatory for all normal work."
  - "Do not ship a fake pilot that is only prompt theater."
nonGoals:
  - "No full multi-role swarm rollout."
  - "No bypass of existing Team runtime guardrails."
---

# TASK-SKL-0011

## Goal

以至少一組 Team roles 做 `Agent + Skill` runtime pilot，驗證角色 skill packs、permission leases、playbook slices 與 shared growth contract 可以組成真正可獨立治理的工作單元。

## Acceptance

- At least one Team role pair or trio can run through a realistic governed workflow using the new role-skill-pack model.
- The pilot shows that role confusion drops because each role loads only its bounded skill pack.
- The pilot preserves Coordinator-only lifecycle authority.
- The pilot produces actionable evidence about where role + skill boundaries still need refinement.

## Non-Goals

- No claim that every Team role is fully productionized.
- No replacement of existing Team runtime with a speculative second runtime.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
