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
dispatch_pattern:
  shape: "dual-agent (Phase 0 planner + Phase 1 builder)"
  parallel_with: "TASK-TEAM-0006"
  rationale: "0005 (decision/memory templates) and 0006 (patrol template) touch disjoint template files but share the same validator script. They can be built in parallel, then merged sequentially so the second card extends the first card's validator additions."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0005-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief listing the 2 templates' required sections + the validator section-key it should add"
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: 2 templates + validator section extension"
      - "commit_2: path-to-atom-map.json + close evidence"
  condition_review:
    - "Phase 1 must not touch any 3KLife path"
    - "validator extends 0004's script; no new script file"
    - "captain-decision contains decision/options/chosen/reason/risk/needLieutenant/nextTeamShape"
    - "team-memory-shard contains taskType/symptom/lesson/reuseWhen/avoidWhen/relatedCommands/relatedFiles"
    - "templates declare advisory-only (no ATM gate authority)"
ninety_minute_promise:
  contributes_to: "first-card-in-90-min (M2)"
  role: "captain-decision.md is the artifact the new adopter writes at minute 80; team-memory-shard.md is the lesson capture after close"
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
