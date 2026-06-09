---
doc_id: doc_team_0023
task_id: TASK-TEAM-0023
title: "Team knowledge retention and disk budget guard"
status: planned
owner: atm-core
priority: P1
milestone: M5K
depends_on:
  - "TASK-TEAM-0021"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-governance-local.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-governance-local.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-local.ts"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "node atm.mjs team knowledge stats --json"
  - "node atm.mjs team knowledge compact --dry-run --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert retention/compact/stats/budget logic and map updates."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-knowledge-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Retention, compact, and budget enforcement remain part of the same knowledge atom/map."
outOfScope:
  - "Deleting canonical lesson shards automatically without human review"
  - "External object storage or remote vector DB"
  - "Changing evidence or closure semantics"
nonGoals:
  - "Do not make vector retrieval mandatory"
  - "Do not store generated caches in committed deliverables"
dispatch_pattern:
  shape: "dual-agent (Phase 0 budget planner + Phase 1 builder)"
  rationale: "Retention rules and disk budgets should be reasoned about first, because once cache growth begins the fix is harder than the prevention."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0023-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief defining shard size caps, runtime cache budget, stale/compact policy, and compact safety rules."
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: stats/compact/budget logic"
      - "commit_2: validator/map + close evidence"
  condition_review:
    - "Compact is safe by default and supports dry-run"
    - "Budget breach produces explicit diagnostics"
    - "Generated cache remains disposable and rebuildable"
---
# TASK-TEAM-0023 — Team knowledge retention and disk budget guard

## Goal

Keep the knowledge layer fast and small enough to stay useful over time.

## Why

An advisory knowledge layer only helps if it does not turn into a slow, bloated cache pile. This card adds the guardrails that keep shard growth, manifest size, and optional embedding cache under control.

## Implementation Contract

- Add stats and compact / prune style command surface for Team Agents knowledge.
- Track shard count, runtime index bytes, cache bytes, stale shard count, and superseded shard count.
- Default to dry-run for compact operations that affect retention decisions.
- Treat runtime cache as disposable; treat canonical shards as reviewable source.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/team-knowledge.ts`
- `packages/plugin-governance-local/src/stores.ts`
- `scripts/validate-governance-local.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-governance-local.ts`
- `node --strip-types scripts/validate-team-agents.ts`
- `node atm.mjs team knowledge stats --json`
- `node atm.mjs team knowledge compact --dry-run --json`
- `git diff --check`

## Acceptance Criteria

- `team knowledge stats` reports shard and runtime cache footprint.
- `team knowledge compact --dry-run` can identify stale / superseded / archive-candidate shards without mutating canonical source by default.
- Runtime budget breaches produce explicit diagnostics.
- Optional embedding cache, if present, is treated as runtime-only and prunable.
- The feature does not delete or rewrite task evidence or task cards.

## Rollback

Revert stats/compact/budget logic and atom map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-knowledge-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is the anti-bloat line. Knowledge that cannot be compacted, measured, and pruned will eventually stop being queried.
