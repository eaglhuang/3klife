---
doc_id: doc_team_0039
task_id: TASK-TEAM-0039
title: "Governed-repo vendor integration config surface"
status: done
owner: atm-core
priority: P1
milestone: M8I
depends_on:
  - "TASK-TEAM-0037"
  - "TASK-TEAM-0038"
related_plan: "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/team.ts"
  - "release/atm-root-drop/templates/root-drop/agent-integrations/vendors/README.md"
  - "docs/SELF_HOSTING_ALPHA.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/team.ts"
  - "release/atm-root-drop/templates/root-drop/agent-integrations/vendors/README.md"
  - "docs/SELF_HOSTING_ALPHA.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case governed-repo-vendor-config"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert governed-repo config discovery, templates, and validation coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Storing real adopter secrets in the framework repo"
  - "ATM framework becoming the home of vendor-specific deployment values"
nonGoals:
  - "Do not move adopter vendor config into framework runtime state"
  - "Do not require one global provider choice for every role"
completed_at: "2026-06-20T15:55:14.486Z"
completed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-20T15-55-14-405Z-close-e30e9a3da263"
delivery_commit: "86b51db32d9078b3d941d450d617096b2d088961"
---
# TASK-TEAM-0039 Governed-repo vendor integration config surface

## Goal

Define how adopter repositories provide vendor-specific Team runtime settings without putting those values inside the ATM framework repository.

## Why

Vendor config belongs to the governed host repo. ATM should discover and validate it, but should not own each adopter's endpoints, model defaults, or agent references.

## Acceptance Criteria

- Adopter repos can place vendor config under a governed local directory such as `agent-integrations/vendors/**`.
- ATM can discover, validate, and explain missing or malformed config.
- Framework templates and docs show the expected config layout without embedding real secrets.

## Notes

2026-06-19 | planned | governed-repo config lane opened to keep provider settings out of the ATM framework repo.
