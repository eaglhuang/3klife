---
doc_id: doc_team_0018
task_id: TASK-TEAM-0018
title: "Team lease fencing and deadlock contract"
status: done
owner: atm-core
priority: P0
milestone: M5H
depends_on:
  - "TASK-TEAM-0011"
  - "TASK-TEAM-0012"
  - "TASK-TEAM-0013"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/core/src/governance/scope-lock.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-governance-local.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/core/src/governance/scope-lock.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-governance-local.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case fencing-deadlock"
  - "node --strip-types scripts/validate-team-agents.ts --case active-resource-index-readonly"
  - "node --strip-types scripts/validate-governance-local.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert team lease fencing helpers, validator cases, and atom map entries. Do not hand-edit .atm/runtime/** tombstones."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Any new scheduler/fencing helper must be mapped under the Team Agents runtime atom/map."
outOfScope:
  - "Subagent spawning"
  - "Pre-tool or pre-commit enforcement"
  - "Symbol-scope lease enforcement before Atomization Planner provides symbol inventory"
  - "Task dispatch, queue management, claim/reserve/promote/close decisions, or any second scheduler behavior"
  - "Mutating Active Resource Index / Scope Lease Registry outside the owning scope-lock or governance-local store commands"
  - "Manual edits under .atm/runtime/** or .atm/history/**"
nonGoals:
  - "Do not make Team Agents a second task scheduler"
  - "Do not let leases override task allowedFiles"
  - "Do not replace ATM scope locks or taskDirectionLock"
completed_at: "2026-06-18T16:50:16.865Z"
completed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-18T16-50-16-422Z-close-29a4ba95591f"
delivery_commit: "bff419f43e6a8d620a7d0b6e4022d010e1b64257"
---
# TASK-TEAM-0018 Team lease fencing and deadlock contract

## Goal

Bring CID-style concurrency hardening into Team Agents so lease handoff, stale holder detection, and deadlock diagnosis work across real-agent runs, editor-subagent runs, and broker-only runs.

## Why

Once Team Agents can declare runtime mode and eventually spawn worker surfaces, the framework needs stronger protection against stale holders, transfer races, and hidden cross-run contention. This card hardens lease safety without turning Team Agents into a second scheduler.

## Implementation Contract

1. Introduce monotonic fencing metadata such as `leaseEpoch` for Team runtime lease ownership.
2. Make `team lease`, `team release`, and `team status` capable of surfacing stale epoch and stale holder findings.
3. Add wait-for graph diagnostics so lease dependency cycles fail validation.
4. Preserve released tombstone semantics so a stale actor cannot reclaim ownership by replaying an old runtime record.
5. Apply the same fencing rules regardless of whether the run is `real-agent`, `editor-subagent`, or `broker-only`.
6. `file.write` lease authorization must still remain a subset of task `allowedFiles`; fencing metadata must not widen scope.
7. Team Agents may consume `Active Resource Index` / `Scope Lease Registry` as read-only diagnostic input only.

## Acceptance Criteria

- Duplicate exclusive owner findings fail validation.
- Stale epoch release or transfer attempts fail validation with expected and actual epoch details.
- Wait-for graph cycle detection fails validation for cyclic dependency and passes for acyclic dependency.
- Released tombstone coverage proves stale runs cannot reacquire ownership silently.
- No source path outside task `allowedFiles` can be authorized through Team lease fencing.
- The same diagnostics work for `real-agent`, `editor-subagent`, and `broker-only` runs.
- Active Resource Index / Scope Lease Registry consumption stays read-only and does not promote, claim, close, or rewrite ledger state.

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case fencing-deadlock`
- `node --strip-types scripts/validate-team-agents.ts --case active-resource-index-readonly`
- `node --strip-types scripts/validate-governance-local.ts`
- `git diff --check`

## Stop Conditions

- If the implementation starts to require a long-lived scheduler service, pause and split a separate runtime card instead of expanding this one.
- If symbol-scope enforcement needs AST or symbol inventory, stop at advisory findings until Atomization Planner supplies that inventory.
- If the design begins mutating Active Resource Index or Scope Lease Registry outside their owner stores, stop and reroute the work.

## Notes

This card is about concurrency hardening for Team runtime contracts. It does not grant Team Agents authority over task lifecycle.
