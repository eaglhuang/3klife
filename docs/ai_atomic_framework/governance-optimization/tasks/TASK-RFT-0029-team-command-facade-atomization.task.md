---
task_id: TASK-RFT-0029
title: Atomize team.ts with a Strangler Facade command-handler architecture
status: planned
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0027]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM?????Team-Agents???????.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team.ts
  - packages/cli/src/commands/team/**/*.ts
  - packages/cli/src/commands/team/__tests__/**/*.ts
  - tests/cli/team-*.test.ts
  - scripts/validate-team-agents.ts
  - scripts/validators/team-agents/**/*.ts
deliverables:
  - packages/cli/src/commands/team.ts
  - packages/cli/src/commands/team/command-registry.ts
  - packages/cli/src/commands/team/plan-command.ts
  - packages/cli/src/commands/team/start-command.ts
  - packages/cli/src/commands/team/status-command.ts
  - packages/cli/src/commands/team/execute-command.ts
  - packages/cli/src/commands/team/admission-command.ts
  - packages/cli/src/commands/team/report-command.ts
  - tests/cli/team-command-facade-atomization.test.ts
validators:
  - node --strip-types tests/cli/team-command-facade-atomization.test.ts
  - node --strip-types tests/cli/team-plan-contract.test.ts
  - node --strip-types tests/cli/team-shadow-workspace.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the facade extraction commit and remove the new command modules; no data migration is expected.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-command-facade
      pattern: Strangler Facade
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-command-handler-registry
      pattern: Command Handler Registry
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-plan-command
      pattern: Command Handler
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-start-command
      pattern: Command Handler
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-status-command
      pattern: Query Handler
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-execute-command
      pattern: Adapter Orchestrator
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-admission-policy-module
      pattern: Policy Object
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
    - atom: atm.team-report-receipt-module
      pattern: Receipt Builder
      source: packages/cli/src/commands/team.ts
      disposition: extract
      inlineReason: null
created_at: 2026-07-15T18:25:00+08:00
created_by_agent: Codex-GPT-5.5
last_updated: 2026-07-15T18:25:00+08:00
---

# TASK-RFT-0029 - Atomize team.ts with a Strangler Facade command-handler architecture

## Problem

`packages/cli/src/commands/team.ts` remains an oversized command orchestrator. It currently mixes CLI routing, plan construction, start/status behavior, broker admission, execution wiring, runtime governance fields, report/receipt construction, and test-facing helper exports in one file. This makes parallel Team Agent work collide on the same hot file and keeps future validators broader than necessary.

## Design Decision

Use **Strangler Facade + Command Handler Registry + Policy/Receipt modules**.

- Keep `team.ts` as the compatibility facade and public export surface during migration.
- Move each subcommand into a focused command handler module under `packages/cli/src/commands/team/`.
- Move admission, runtime contract, report, and receipt construction into policy/builder modules that can be tested independently.
- Preserve existing public behavior and exported helper contracts until call sites and tests are migrated.
- Add a line-budget regression so `team.ts` and every extracted support module stay at or below 600 lines.

This pattern is preferred over a one-shot rewrite because the current file is a live CLI surface with many external validators. The strangler facade allows one subcommand at a time to move behind a stable API while reducing shared-file conflict risk.

## Acceptance Criteria

- `packages/cli/src/commands/team.ts` is reduced to 600 lines or fewer.
- Every new or touched `packages/cli/src/commands/team/*.ts` support module is 600 lines or fewer.
- Existing Team commands keep behavior parity for plan/start/status/execute/admission/report paths covered by current tests.
- `team.ts` contains only facade wiring, command registration, and backwards-compatible exports.
- The command registry exposes a deterministic mapping from subcommand name to handler.
- Policy decisions such as admission, runtime tier, roster/skill pack selection, and cost/promotion gating are in separately testable modules.
- Receipt/report builders are separated from command routing.
- `tests/cli/team-command-facade-atomization.test.ts` fails if `team.ts` or extracted modules exceed the configured atomization line bound.
- No `.atm/history/**` files are edited manually; target ledger updates must come only from ATM import/close flows.

## Suggested Migration Slices

1. Add `command-registry.ts` and route existing subcommands through handlers without moving behavior.
2. Extract read-only/query handlers first: status, compact status, roster/readiness projection.
3. Extract planning handlers: plan, shadow plan, admission projection.
4. Extract mutation/execution handlers: start, execute, broker-admitted start.
5. Extract report and receipt builders.
6. Trim `team.ts` to facade-only and add line-budget regression.

## Validation

Run:

```powershell
node --strip-types tests/cli/team-command-facade-atomization.test.ts
node --strip-types tests/cli/team-plan-contract.test.ts
node --strip-types tests/cli/team-shadow-workspace.test.ts
node --strip-types tests/cli/team-agents-dogfood.test.ts
npm run typecheck
```

## Notes

This card does not promote Team Agents to production/default by itself. Team promotion still depends on real paired cost/time/quality evidence and remains promotion-ineligible when measurement is incomplete.
