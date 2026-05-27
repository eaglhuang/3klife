---
doc_id: doc_team_0004
task_id: TASK-TEAM-0004
title: "Team brief/report templates"
status: planned
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-TEAM-0003"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/templates/team-brief-template.md"
  - "docs/governance/team-agents/templates/agent-report-template.md"
  - "docs/governance/team-agents/templates/team-summary-template.md"
  - "scripts/validate-team-agents-templates.ts"
  - "package.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/templates/team-brief-template.md"
  - "docs/governance/team-agents/templates/agent-report-template.md"
  - "docs/governance/team-agents/templates/team-summary-template.md"
  - "scripts/validate-team-agents-templates.ts"
  - "package.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0004"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove the templates, validation script, npm script wiring, and atom map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-template-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "New validation scripts must be mapped in the same card."
outOfScope:
  - "Team runtime writes"
  - "Subagent spawning"
  - "Task close or checkpoint changes"
nonGoals:
  - "Do not create a second task registry"
  - "Do not make templates authoritative over ATM task cards"
---
# TASK-TEAM-0004 — Team brief/report templates

## Goal

Create human-readable templates for `team-brief.md`, `agent-report.md`, and `team-summary.md`.

## Why

Team Agents need a durable handoff format before they need a full runtime. These files let a captain assign work and collect reports without relying on chat transcript memory.

## Implementation Contract

- Add markdown templates under framework governance docs.
- Add a deterministic validator for required template sections.
- Wire the validator into `package.json` if a new npm script is needed.
- Do not write `.atm/runtime/**`.

## Deliverables

- `docs/governance/team-agents/templates/team-brief-template.md`
- `docs/governance/team-agents/templates/agent-report-template.md`
- `docs/governance/team-agents/templates/team-summary-template.md`
- `scripts/validate-team-agents-templates.ts`
- `package.json`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0004`
- `git diff --check`

## Acceptance Criteria

- `team-brief` includes goal, roles, allowed files, do-not-touch paths, assigned work, expected report, stop conditions, and Atomization Plan.
- `agent-report` includes role, status, files read, files changed, commands run, findings, blockers, and recommendation.
- `team-summary` includes decision, implementation summary, validators, evidence, risk, and close-ready state.
- The validator fails when a required section is missing.
- The templates remain readable as plain Markdown.

## Rollback

Revert the template and validator commit.

## Atomization Impact

- Owner atom/map: `atm.team-agents-template-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is deliberately template-first; later cards can consume these files from CLI output.
