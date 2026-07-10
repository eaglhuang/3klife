---
task_id: TASK-SKL-0008
title: Team role skill-pack and capability boundary contract
status: done
milestone: P3
depends_on:
  - TASK-SKL-0005
  - TASK-SKL-0007
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/**"
  - "integrations/**"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/**"
deliverables:
  - "docs/**"
  - "integrations/**"
  - "packages/cli/src/commands/team.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the role/skill-pack contract commit if Team role boundaries become less clear or conflict with Coordinator-only lifecycle."
atomizationImpact:
  ownerAtomOrMap: "atm.team-role-skill-pack-contract"
  mapUpdates: []
out_of_scope:
  - "Do not let Team roles become a second scheduler."
  - "Do not grant lifecycle authority to non-Coordinator roles."
nonGoals:
  - "No provider-specific runtime bridge in this card."
  - "No role-specific bespoke learning taxonomy."
completed_at: "2026-07-10T04:08:13.014Z"
completed_by_agent: "codex-captain-m8e"
closedAt: "2026-07-10T04:08:13.014Z"
closedByActor: "codex-captain-m8e"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T04-08-13-014Z-close-d36335fd5c5a"
lastTransitionAt: "2026-07-10T04:08:13.014Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b1d5362f5f4181bf357676312b5d41e416c8e081"
---

# TASK-SKL-0008

## Goal

把 Team Agents 角色正式映射為 skill packs 與 capability boundary contract，讓每個 Team Agent 都是 `Role + Skill Pack + Permission Lease + Growth Contract` 的治理單元。

## Acceptance

- The contract defines how each Team role maps to one skill pack or a bounded set of specialist skills.
- The contract preserves existing Coordinator-only lifecycle authority.
- Each role documents:
  - allowed permissions,
  - forbidden permissions,
  - expected playbook slice,
  - growth-contract attachment point.
- The role/skill-pack model stays provider-neutral.

## Non-Goals

- No direct multi-vendor provider bridge implementation.
- No replacement of current Team runtime semantics with prompt-only roleplay.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
