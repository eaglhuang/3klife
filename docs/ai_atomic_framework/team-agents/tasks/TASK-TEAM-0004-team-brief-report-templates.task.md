---
doc_id: doc_team_0004
task_id: TASK-TEAM-0004
title: "Team brief/report templates"
status: done
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
dispatch_pattern:
  shape: "dual-agent (Phase 0 planner + Phase 1 builder)"
  fan_in_from:
    - "TASK-TEAM-0002"
    - "TASK-TEAM-0003"
  rationale: "0004 is the synchronization point where the crew contract (0002) and required atomization role (0003) become the canonical brief / report / summary templates."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0004-*.task.md"
    commit_budget: 0
    output: |
      Phase 1 brief listing 3 templates' required sections (must mirror the existing
      3KLife drafts at docs/ai_atomic_framework/team-agents/templates/{team-brief,
      agent-report,team-summary}.md) plus validator dispatch contract.
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: 3 templates + validator script + npm script wire-in"
      - "commit_2: path-to-atom-map.json + close evidence"
  condition_review:
    - "Phase 1 must not touch any 3KLife path"
    - "validator dispatches by --task <id>; subsequent 0005/0006 extend the same script, do not fork"
    - "templates contain all required sections (see acceptance criteria)"
    - "atom map row exists under owner atm.team-agents-template-map"
ninety_minute_promise:
  contributes_to: "first-card-in-90-min (M2)"
  role: "provides the team-brief.md skeleton that the new adopter copies into their first task"
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

Target repo closure:

- Closed in `AI-Atomic-Framework` by `external-004`.
- Implementation commit: `4aef5440afaec260a8dc2d596e00d0735a61dfdb`
- Closure commit: `5fe00bdc3c81a9d9b3637a13504f7f726a46130b`
- Closure packet: `AI-Atomic-Framework/.atm/history/evidence/TASK-TEAM-0004.closure-packet.json`
