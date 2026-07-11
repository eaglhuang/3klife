---
doc_id: doc_team_0050
task_id: TASK-TEAM-0050
title: "Team start provider execution wiring (real multi-bot spawn lane)"
status: done
owner: atm-core
priority: P0
milestone: M10X
depends_on:
  - "TASK-TEAM-0045"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/execution-orchestrator.ts"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/execution-orchestrator.ts"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case team-start-execution-wiring"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert orchestrator execution loop, team start --execute lane, and validator case together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Provider credential storage"
  - "New provider bridges"
nonGoals:
  - "Do not remove the human gate: execution requires explicit --execute plus coordinator authority"
  - "Do not give spawned workers lifecycle or git.write authority"
completed_at: "2026-07-11T02:14:46.549Z"
completed_by_agent: "coordinator"
closedAt: "2026-07-11T02:14:46.549Z"
closedByActor: "coordinator"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T02-14-46-549Z-close-6ea8cf04d192"
lastTransitionAt: "2026-07-11T02:14:46.549Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "072cadf4"
---
# TASK-TEAM-0050 Team start provider execution wiring

## Goal

Close gap G1 from the 2026-07-10 vendor-backend verification: `team start` currently writes team-run
runtime state with the literal message "no agents were spawned"; the real execution functions
(`launchOpenAITeamProviderRun`, `launchClaudeCodeTeamProviderRun`, `launchGeminiTeamProviderRun`,
`launchAzureOpenAITeamProviderRun`, `launchMicrosoftFoundryTeamProviderRun`) are only invoked by
`scripts/validate-team-agents.ts` with injected executors, never by the CLI runtime path, and
`runProviderOrchestration` is a no-op loop that never executes a step.

## Acceptance Criteria

- `team start --execute` (real-agent / editor-subagent modes) iterates the recipe roles and, per role,
  resolves provider selection, instantiates the bridge, and calls the matching `launch*Run` with the
  permission broker policy and observability sink attached.
- Without `--execute`, behavior is unchanged (state-only, agentsSpawned:false) so the deliberate
  no-full-autonomy default is preserved.
- `runProviderOrchestration` performs actual step execution with bounded retry from the retry-budget
  contract instead of the current dead loop.
- Broker-only mode never spawns; broker conflict blocks still hold at start (parity with TASK-TEAM-0047).
- Validator case proves at least two roles execute through two different providers in one run using
  injected fake executors.
