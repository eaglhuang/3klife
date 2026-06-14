---
doc_id: doc_team_0006
task_id: TASK-TEAM-0006
title: "Patrol report template"
status: done
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-TEAM-0004"
runs_parallel_with:
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
dispatch_pattern:
  shape: "dual-agent (Phase 0 planner + Phase 1 builder)"
  parallel_with: "TASK-TEAM-0005"
  rationale: "0006 ships only the patrol-report template + validator section. The patrol logic itself already exists upstream as runPoliceFamilyGate + 9 police families (gate-active). This card is the human-readable output format, not new detection logic."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0006-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief listing patrol-report required sections (runId/team/severity/findings/safeToProceed/suggestedCommand/followUp) and the validator extension."
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: patrol-report template + validator section extension"
      - "commit_2: path-to-atom-map.json + close evidence"
  condition_review:
    - "Phase 1 must not touch any 3KLife path"
    - "template usable for daily / claim-preflight / close-preflight / big-script patrol"
    - "validator extends 0004's script (and any 0005 section it landed first)"
    - "template explicitly states patrols are read-only unless a separate card grants write"
ninety_minute_promise:
  contributes_to: "first-card-in-90-min (M2)"
  role: "patrol-report.md is what the new adopter sees at minute 90 as the closure-time artifact"
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

Target repo closure:

- Closed in `AI-Atomic-Framework` by `external-006`.
- Setup commit: `5e66b33dcd6839776e4b69423ef3f030432450fd`
- Implementation commit: `08eca8249b23fae6015a303d57dfa40249af09f4`
- Closure commit: `7ee56378e4fd4d516b72b6dee2b03f50090fc051`
- Runner sync commit: `06bfc7443e7319aaaccf4319f106fbc226a7dad8`
- Closure packet: `AI-Atomic-Framework/.atm/history/evidence/TASK-TEAM-0006.closure-packet.json`
