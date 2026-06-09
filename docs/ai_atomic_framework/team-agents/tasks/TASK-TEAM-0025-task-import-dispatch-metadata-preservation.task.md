---
doc_id: doc_team_0025
task_id: TASK-TEAM-0025
title: "Task import dispatch metadata preservation"
status: planned
owner: atm-core
priority: P1
milestone: M4K
depends_on:
  - "TASK-TEAM-0017"
  - "TASK-TEAM-0020"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-markdown-helpers.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-import.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-markdown-helpers.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-import.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:task-import"
  - "npm run validate:task-ledger-governance"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert dispatch metadata projection, validator updates, tasks spec wording, and atom map changes together."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Dispatch metadata projection belongs to the task-ledger governance surface because it changes what tasks import persists into canonical work-item JSON."
outOfScope:
  - "Knowledge query/build/runtime behavior"
  - "Automatic sidecar spawning or lifecycle claim automation"
  - "Generic passthrough of arbitrary frontmatter into ledger JSON"
  - "next / playbook output redesign"
nonGoals:
  - "Do not make dispatch metadata authoritative over lifecycle, scope locks, or evidence"
  - "Do not store long prose briefs, chat transcripts, or corpus bodies inside canonical task JSON"
dispatch_pattern:
  shape: "dual-agent (Phase 0 ledger contract planner + Phase 1 builder)"
  rationale: "The sidecar contract should be normalized first by a read-only planner so Phase 1 only implements compact, bounded ledger fields instead of inventing an unstructured passthrough."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "docs/ai_atomic_framework/team-agents/tasks/README.md"
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0025-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief defining exact dispatchPattern / conditionReview JSON shape, alias normalization, backward compatibility, and payload size guard."
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: tasks import + task ledger projection"
      - "commit_2: validator/spec/map + close evidence"
condition_review:
  - "dry-run manifest preserves structured dispatch metadata with stable camelCase field names"
  - "write mode persists the same compact metadata to canonical task JSON"
  - "cards without dispatch metadata remain backward compatible"
  - "payload stays compact and does not duplicate freeform Markdown body content"
---
# TASK-TEAM-0025 - Task import dispatch metadata preservation

## Goal

Preserve sidecar-relevant dispatch metadata from task-card frontmatter into canonical task JSON so a sidecar can read ledger state without also reopening the Markdown card.

## Why

The current Team Agents knowledge track already records `dispatch_pattern`, `phase_0`, `phase_1`, and `condition_review` in Markdown task cards, but `tasks import` drops those fields when it writes `.atm/history/tasks/*.json`.

That gap forces a sidecar to dual-read:

- Markdown task card for dispatch rules
- canonical task JSON for lifecycle, dependency, and validator state

This card closes that gap while keeping the payload bounded and machine-readable.

## Implementation Contract

- Normalize `dispatch_pattern` / `dispatchPattern` into a structured canonical `dispatchPattern` field.
- Normalize `condition_review` / `conditionReview` into canonical `conditionReview`.
- Preserve only compact machine-readable dispatch metadata that a sidecar needs for kickoff:
  - shape
  - rationale
  - phase lane
  - allowed file fence
  - forbidden file fence
  - commit budget
  - commit layout
  - close review checklist
- Keep backward compatibility for task cards that do not declare any dispatch metadata.
- Do not introduce a generic raw-frontmatter dump into ledger JSON.

## Deliverables

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/tasks/task-markdown-helpers.ts`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`
- `scripts/validate-task-import.ts`
- `scripts/validate-task-ledger-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm run validate:task-import`
- `npm run validate:task-ledger-governance`
- `git diff --check`

## Acceptance Criteria

- `tasks import --dry-run` manifest preserves structured `dispatchPattern` and `conditionReview` for cards that declare those machine fields.
- `tasks import --write` persists the same compact fields into `.atm/history/tasks/<TASK>.json`.
- Cards without dispatch metadata continue to import without regressions.
- The canonical JSON stays compact; freeform body prose is not duplicated into dispatch fields.
- A sidecar can reconstruct Phase 0 / Phase 1 kickoff rules from canonical task JSON alone.

## Rollback

Revert dispatch metadata projection, validator updates, command-spec wording, and atom map updates.

## Atomization Impact

- Owner atom/map: `atm.task-ledger-governance-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is the bridge from "sidecar reads Markdown plus ledger" to "sidecar can trust canonical ledger JSON as its only runtime-facing task surface."
