---
doc_id: doc_team_0005
task_id: TASK-TEAM-0005
title: "Team memory and captain decision templates"
status: planned
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-TEAM-0004"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/templates/captain-decision-template.md"
  - "docs/governance/team-agents/templates/team-memory-shard-template.md"
  - "scripts/validate-team-agents-templates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/templates/captain-decision-template.md"
  - "docs/governance/team-agents/templates/team-memory-shard-template.md"
  - "scripts/validate-team-agents-templates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0005"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove the decision and memory templates and their validator coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-template-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Persistent knowledge-base search"
  - "Team runtime storage"
  - "Automated subagent orchestration"
nonGoals:
  - "Do not make memory shards a second source of task truth"
  - "Do not replace closure evidence"
---
# TASK-TEAM-0005 — Team memory and captain decision templates

## Goal

Create templates for `captain-decision.md` and `team-memory-shard.md`.

## Why

Team captains need a lightweight way to record decisions, tradeoffs, task lessons, and future reuse guidance. Without this, every captain starts cold.

## Implementation Contract

- Extend the template validator from `TASK-TEAM-0004`.
- Keep the templates Markdown-first and human-readable.
- Treat memory shards as advisory knowledge, not a task ledger.

## Deliverables

- `docs/governance/team-agents/templates/captain-decision-template.md`
- `docs/governance/team-agents/templates/team-memory-shard-template.md`
- `scripts/validate-team-agents-templates.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0005`
- `git diff --check`

## Acceptance Criteria

- `captain-decision` records decision, options considered, chosen option, reason, risk, lieutenant need, and next team shape.
- `team-memory-shard` records task type, symptom, lesson, reuse conditions, avoid conditions, related commands, and related files.
- The validator covers both new templates.
- The templates do not claim authority over ATM gates, evidence, or task status.

## Rollback

Revert the template and validator changes.

## Atomization Impact

- Owner atom/map: `atm.team-agents-template-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card turns Team Agents into a learning system without introducing a separate registry.
