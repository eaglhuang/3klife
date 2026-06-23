---
task_id: TASK-SKL-0010
title: Provider-neutral role skill-pack manifest
status: planned
milestone: P4
depends_on:
  - TASK-SKL-0007
  - TASK-SKL-0008
  - TASK-SKL-0009
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/**"
  - "integrations/**"
  - "packages/**"
deliverables:
  - "docs/**"
  - "integrations/**"
  - "packages/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the provider-neutral manifest commit if role contracts become vendor-coupled or capability discovery becomes inconsistent."
atomizationImpact:
  ownerAtomOrMap: "atm.provider-neutral-role-skill-pack-manifest"
  mapUpdates: []
out_of_scope:
  - "Do not hardcode one AI vendor as the only Team Agent implementation."
  - "Do not weaken permission lease enforcement."
nonGoals:
  - "No full provider bridge rollout in this card."
  - "No role-specific divergent growth formats."
---

# TASK-SKL-0010

## Goal

建立 provider-neutral 的 Team role skill-pack manifest，讓同一個角色契約可對應不同模型商、不同 runtime，但仍維持同一套 ATM 治理語義。

## Acceptance

- Role skill-pack manifests are vendor-neutral and capability-driven.
- Capability discovery can express which provider/runtime can satisfy which Team role pack.
- Permission lease alignment remains role-first, not vendor-first.
- Shared growth contract remains reusable regardless of provider choice.

## Non-Goals

- No direct implementation of all provider bridges.
- No role identity tied permanently to one editor or one model family.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
