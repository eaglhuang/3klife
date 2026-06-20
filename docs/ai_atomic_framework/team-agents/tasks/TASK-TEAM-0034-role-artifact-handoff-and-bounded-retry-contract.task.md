---
doc_id: doc_team_0034
task_id: TASK-TEAM-0034
title: "Role artifact handoff and bounded retry contract"
status: done
owner: atm-core
priority: P0
milestone: M6R
depends_on:
  - "TASK-TEAM-0033"
related_plan: "docs/ai_atomic_framework/team-agents/ATM多語言WorkerAdaptor方案.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "schemas/governance/closure-packet.schema.json"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "schemas/governance/closure-packet.schema.json"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case artifact-handoff-retry"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert artifact contract schema additions, retry budget wiring, and validator coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Unbounded autonomous retry"
  - "Replacing closure packet evidence with summaries"
  - "Cross-repo artifact shipping infrastructure"
nonGoals:
  - "Do not let missing artifacts fail open"
  - "Do not hide retry exhaustion from humans"
completed_at: "2026-06-18T17:45:02.166Z"
completed_by_agent: "codex-gpt-5.4-mini"
closed_by_agent: "codex-gpt-5.4-mini"
delivery_commit: "db287cce8a150c71d3260616c312bd639a1de634"
---
# TASK-TEAM-0034 Role artifact handoff and bounded retry contract

## Goal

Define the runtime artifact contract between Team roles and the bounded retry / escalation policy that governs rework loops.

## Why

Role specialization only becomes enforceable when each role declares what artifacts it consumes and produces, and when retry cannot spin forever without escalation.

## Implementation Contract

- Define role-level artifact contract fields such as `consumesFrom`, `producesTo`, and `requiredArtifacts`.
- Add Team runtime retry budget fields such as `maxReworkCycles`, `maxValidatorReruns`, and `maxReviewerReturns`.
- Missing required artifacts must fail closed.
- Retry exhaustion must trigger escalation rather than silent repetition.

## Acceptance Criteria

- Implementer, reviewer, validator, and evidence collector each declare runtime artifact expectations.
- Missing required artifacts produce blocking findings.
- Retry budget is explicitly recorded and validated.
- Escalation target can be represented in runtime state.

## Notes

This card makes artifact handoff and retry budget part of the runtime contract instead of prompt-only convention.
