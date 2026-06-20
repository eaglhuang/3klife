---
doc_id: doc_team_0012
task_id: TASK-TEAM-0012
title: "Permission lease validator"
status: planned
owner: atm-core
priority: P0
milestone: M5
depends_on:
  - "TASK-TEAM-0011"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case permission-lease"
  - "node atm.mjs team validate --task TASK-TEAM-0012 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert permission lease validation logic and fixtures."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Pre-tool enforcement"
  - "Pre-commit enforcement"
  - "External database or CI permissions"
nonGoals:
  - "Do not make leases override task allowedFiles"
  - "Do not grant git.write to multiple roles"
---
# TASK-TEAM-0012 — Permission lease validator

## Notes

This card is already closed in the ATM ledger. Keep it as historical evidence for lease validation baseline; do not repurpose it for the new runtime-mode contract.
