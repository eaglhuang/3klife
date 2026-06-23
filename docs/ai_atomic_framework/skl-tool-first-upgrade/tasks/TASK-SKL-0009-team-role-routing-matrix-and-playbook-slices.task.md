---
task_id: TASK-SKL-0009
title: Team role-routing matrix and playbook slices
status: planned
milestone: P3
depends_on:
  - TASK-SKL-0003
  - TASK-SKL-0005
  - TASK-SKL-0008
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/**"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/**"
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
  notes: "Revert the role-routing commit if Team playbook slices become ambiguous or cause role overlap."
atomizationImpact:
  ownerAtomOrMap: "atm.team-role-routing-matrix"
  mapUpdates: []
out_of_scope:
  - "Do not make playbook optional for Team role routing."
  - "Do not let roles self-assign lifecycle progression."
nonGoals:
  - "No provider bridge implementation."
  - "No broad rewrite of task lifecycle."
---

# TASK-SKL-0009

## Goal

建立 Team roles 的 routing matrix 與 playbook slices，讓 playbook 可以明確決定這次叫哪個角色 skill pack 出場、何時出場、是否 advisory-only。

## Acceptance

- A routing matrix maps work patterns to Team roles and their skill packs.
- Playbook slices can describe role order, parallel-safe roles, and advisory-only roles.
- The matrix keeps Coordinator as lifecycle owner while letting specialist roles focus on one governance purpose.
- The model reduces role confusion and avoids loading irrelevant specialist context.

## Non-Goals

- No hidden role auto-promotion into Coordinator authority.
- No vendor-specific runtime implementation in this card.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
