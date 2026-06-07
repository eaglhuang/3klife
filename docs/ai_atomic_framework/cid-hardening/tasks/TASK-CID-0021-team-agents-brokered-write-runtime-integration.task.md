---
doc_id: doc_cid_0021
task_id: TASK-CID-0021
title: "Team Agents brokered write runtime integration"
status: planned
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0016"
  - "TASK-CID-0017"
  - "TASK-CID-0020"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/team-lane.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-team-brokered-write.ts"
deliverables:
  - "packages/core/src/broker/team-lane.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-team-brokered-write.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-brokered-write.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the Team integration commit if broker lane injection causes lifecycle or permission regression."
atomizationImpact:
  ownerAtomOrMap: "atm.team-brokered-write-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card wires the broker runtime into Team role orchestration without making Team a second scheduler."
outOfScope:
  - "next claim or closeout cleanup"
  - "Direct manual mutation of broker registry files"
  - "Changing Coordinator ownership of task.lifecycle or git.write"
---

# TASK-CID-0021 - Team Agents brokered write runtime integration

## Goal

Integrate broker lanes into `team plan/start` so Team flows can route same-file CID-disjoint work through proposal/composer/steward logic instead of only warning or manually serializing.

## Why This Exists

The planning contracts explicitly say Team Agents should consume broker primitives, not invent a second parallel runtime. This card makes that integration real while preserving Coordinator lifecycle ownership.

## Acceptance Criteria

- `team plan/start` can surface a steward lane for same-file CID-disjoint work.
- Blocked CID conflicts still fail closed before a Team run starts.
- Team evidence includes the broker decision and any steward/composer path that was chosen.
- Coordinator remains the only owner of commit and task lifecycle.
- The Team broker validator is registered through `package.json` and `scripts/validators.config.json`.
- This card does not yet wire broker cleanup into `next`/closeout lifecycle transitions.

## Notes

Preferred dispatch shape is still one `007` main packet plus one `005` / `006` closeout packet. Internal sidecars may help with role-mapping truth tables and validator checklist convergence only.
