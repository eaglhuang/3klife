---
doc_id: doc_team_0051
task_id: TASK-TEAM-0051
title: "Per-role provider selection config surface and sizing-driven roster"
status: done
owner: atm-core
priority: P0
milestone: M10X
depends_on:
  - "TASK-TEAM-0050"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/cli/src/commands/team.ts"
  - "schemas/governance/team-provider-selection-config.schema.json"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/governance/team-provider-selection-config.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case per-role-provider-selection-config"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert config loader, sizing-roster mapping, CLI flags, and schema together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Vendor bridge internals"
nonGoals:
  - "Do not make provider selection vendor-first; role-first stays authoritative"
  - "Do not let sizing remove the four required governance roles"
completed_at: "2026-07-11T02:26:23.947Z"
completed_by_agent: "coordinator"
closedAt: "2026-07-11T02:26:23.947Z"
closedByActor: "coordinator"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T02-26-23-876Z-close-26e3bc62461d"
lastTransitionAt: "2026-07-11T02:26:23.947Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "072cadf4"
---
# TASK-TEAM-0051 Per-role provider selection config surface and sizing-driven roster

## Goal

Close gaps G2/G3/G4 from the 2026-07-10 verification:

- G2: `buildTeamRuntimeContract` is called once per run with `selectionConfig: null` and a single
  default role, so heterogeneous vendor+model bots per role are not reachable from the CLI even though
  `resolveTeamProviderSelection` supports roleOverrides.
- G3: `decideTeamSizing` (small/medium/large from scope count, large-script risk, broker verdict,
  validation errors) is advisory text only; the crew roster is a fixed 4 required + 3 optional roles
  regardless of sizing, and there is no manual sizing override flag.
- G4: the repo default selection is hardcoded (openai / gpt-5-mini / broker-only, empty roleOverrides);
  no config file is loaded, so the TASK-TEAM-0039 config surface has no live consumer.

## Acceptance Criteria

- `.atm/config/team-provider-selection.json` (schema-validated) supplies repoDefault plus per-role
  vendor/sdk/model/runtimeMode overrides; CLI loads it for plan/start/manifest paths.
- CLI supports manual designation: `--role-provider <role>=<provider>:<model>` (repeatable) and
  `--team-size small|medium|large` overriding the auto sizing decision, with the override recorded in
  the captain decision output as source:manual.
- Sizing now maps to the roster: small = 4 required roles; medium promotes evidence-collector and
  reader; large additionally promotes scope-guardian and a lieutenant-style coordination boundary.
  The four governance roles are never removable.
- Per-role runtime contracts are built per roster entry (not once per run) and feed TASK-TEAM-0050's
  execution loop, so one team run can hold e.g. claude-code implementer + gemini reviewer +
  openai validator simultaneously.
- Validator case covers config load, manual flags precedence (flag > config roleOverride > repoDefault),
  and sizing-to-roster mapping for all three sizes.
