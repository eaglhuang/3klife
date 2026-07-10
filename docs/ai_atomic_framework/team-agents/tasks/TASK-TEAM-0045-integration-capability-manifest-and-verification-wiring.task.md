---
doc_id: doc_team_0045
task_id: TASK-TEAM-0045
title: "Integration capability manifest and verification wiring"
status: done
owner: atm-core
priority: P0
milestone: M9I
depends_on:
  - "TASK-TEAM-0039"
  - "TASK-TEAM-0040"
  - "TASK-TEAM-0041"
  - "TASK-TEAM-0042"
  - "TASK-TEAM-0043"
  - "TASK-TEAM-0044"
related_plan: "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "schemas/integrations/install-manifest.schema.json"
  - "scripts/validate-integration-adapter.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/AGENT_PACK_ONBOARDING.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "schemas/integrations/install-manifest.schema.json"
  - "scripts/validate-integration-adapter.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/AGENT_PACK_ONBOARDING.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-integration-adapter.ts"
  - "node --strip-types scripts/validate-team-agents.ts --case integration-capability-wiring"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert integration manifest capability fields, doctor/verify wiring, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Provider bridge business logic itself"
  - "Adopter secret rotation implementation"
nonGoals:
  - "Do not create a second integration registry outside the existing ATM manifest path"
  - "Do not treat onboarding adapter install as proof of Team runtime readiness by itself"
completed_at: "2026-07-10T08:34:33.299Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-10T08:34:33.299Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T08-34-33-299Z-close-760eed37b735"
lastTransitionAt: "2026-07-10T08:34:33.299Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d45abbfb0b1e94273262a9a40f8a578d36efe46f"
---
# TASK-TEAM-0045 Integration capability manifest and verification wiring

## Goal

Extend ATM integration manifests and verification flows so installed integrations can declare Team runtime capabilities and health.

## Why

The current integration layer installs entry surfaces. The Team runtime needs one more layer: installed integrations must be able to declare whether they can serve as execution backends for Team roles.

## Acceptance Criteria

- Integration manifests can declare Team runtime capability metadata.
- `atm integration verify`, `atm doctor`, and Team runtime startup can surface missing backend capability clearly.
- Installed editor integrations do not automatically become runtime backends unless the manifest says they support it.

## Notes

2026-06-19 | planned | integration-capability wiring lane opened to connect provider bridges back into ATM integration health and runtime discovery.
