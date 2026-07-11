---
doc_id: doc_team_0067
task_id: TASK-TEAM-0067
title: "Repair direct-provider execute admission and fail-closed semantics"
status: done
owner: atm-core
priority: P0
milestone: M10X
depends_on:
  - "TASK-TEAM-0053"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/integration.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "packages/core/src/team-runtime/providers/anthropic.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/integration.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "packages/core/src/team-runtime/providers/anthropic.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case direct-provider-execute-admission"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert runtime precedence, built-in readiness derivation, fail-closed execute result, validator, docs, and map changes together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing provider HTTP request formats"
  - "Adding a second provider registry"
  - "Committing local API credentials"
nonGoals:
  - "Do not weaken editor-subagent manifest admission"
  - "Do not treat state-only team start as provider execution"
completed_at: "2026-07-11T11:52:00.422Z"
completed_by_agent: "Codex-GPT5.6 Sol"
closedAt: "2026-07-11T11:52:00.422Z"
closedByActor: "Codex-GPT5.6 Sol"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T11-52-00-422Z-close-e8f58fecae4d"
lastTransitionAt: "2026-07-11T11:52:00.422Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1f7dfc145481046187271d7a05b3ebd4e11e81de"
---
# TASK-TEAM-0067 Repair direct-provider execute admission and fail-closed semantics

## Trigger

The operator-authorized `TASK-TEAM-0066` L5 run requested `real-agent` with
OpenAI and Anthropic, but persisted `broker-only` and returned success with zero
provider executions. Explicit Coordinator role override repaired runtime mode,
then backend admission rejected the built-in direct provider because no editor
integration manifest declares it as a runtime backend.

## Goal

Make the built-in direct provider execution lane reachable and truthful without
weakening integration backend governance.

## Acceptance Criteria

- Explicit global CLI runtime/provider/model options override implicit repo
  defaults; explicit role overrides remain highest priority for that role.
- Runtime readiness derives direct provider capabilities from the canonical
  built-in provider contract set instead of introducing a second registry.
- Editor-subagent and external integration backends still require manifest
  capability declarations.
- `team start --execute` returns a blocking, non-success result when zero roles
  execute for any blocked reason.
- Real-agent execution uses the concrete OpenAI and Anthropic HTTP bridges and
  honors each active role's provider selection; generic provider contracts may
  not report simulated success for direct-provider execution.
- A deterministic validator proves Coordinator precedence, OpenAI and
  Anthropic built-in admission, editor backend strictness, and zero-execution
  fail-closed behavior without making paid API calls.
- Public runtime documentation explains built-in direct versus integration
  manifest capability sources.

## Dogfood Evidence

- `ATM-BUG-2026-07-11-094`
- `ATM-BUG-2026-07-11-095`
- Team run `team-d91af3d358c3`
