---
doc_id: doc_team_0006
task_id: TASK-TEAM-0006
title: "Patrol report template"
status: planned
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-TEAM-0005"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/templates/patrol-report-template.md"
  - "scripts/validate-team-agents-templates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/templates/patrol-report-template.md"
  - "scripts/validate-team-agents-templates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0006"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove patrol report template and related validator coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-template-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Scheduling patrols"
  - "Mutating source during patrol"
  - "Changing task close gates"
nonGoals:
  - "Do not implement police agents in this card"
  - "Do not create a second evidence format"
---
# TASK-TEAM-0006 — Patrol report template

## Goal

Create the standard `patrol-report.md` template for Atomic Police Agents.

## Why

Patrol results must be readable by humans and structured enough for later evidence collection. The format needs to exist before patrol automation.

## Implementation Contract

- Add a Markdown patrol report template.
- Extend template validation for required patrol fields.
- Keep patrol output read-only and advisory.

## Deliverables

- `docs/governance/team-agents/templates/patrol-report-template.md`
- `scripts/validate-team-agents-templates.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0006`
- `git diff --check`

## Acceptance Criteria

- The template includes run id, team, severity, findings, safe-to-proceed, suggested command, and follow-up fields.
- The template clearly says patrols are read-only unless a separate task card grants write permission.
- The validator fails if required patrol sections are missing.
- The template can be used for daily, claim-preflight, close-preflight, and big-script patrol reports.

## Rollback

Revert the template and validator changes.

## Atomization Impact

- Owner atom/map: `atm.team-agents-template-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This is the output contract for later Atomic Police automation.
