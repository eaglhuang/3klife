---
id: TASK-AAO-0126
task_id: TASK-AAO-0126
title: allow release runner outputs as task deliverables
owner: codex-gpt-5.4-mini
priority: P1
status: open
type: implementation
phase: M16
created: 2026-06-04
created_by_agent: codex-gpt-5.4-mini
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
related_cards:
  - TASK-AAO-0125
  - TASK-AAO-0124
depends:
  - TASK-AAO-0125
allowed_files:
  - packages/cli/src/commands/tasks.ts
  - scripts/validate-task-ledger-governance.ts
forbidden_files:
  - runner build outputs
  - task runtime state
  - unrelated TEAM mirror/import residue
  - push or remote synchronization
notes: 2026-06-04 | open | follow-up from TASK-AAO-0125; close gate currently excludes runner release outputs from real deliverables
---

# TASK-AAO-0126 allow release runner outputs as task deliverables

## Goal

Fix the ATM deliverable gate so a runner-sync task can close as `done` when its declared scope is the generated onefile runner output and the historical delivery commit contains only that scoped output.

## Background

TASK-AAO-0125 successfully produced a runner delivery commit and command-backed evidence, but `tasks close --status done --historical-delivery <commit>` still reported `no-scoped-deliverable-files`.
Read-only code inspection showed the close gate filters historical commit files through `isRealDeliverablePath()` before matching declared scope.
That helper currently excludes release output directories globally, which is correct for ordinary feature tasks but wrong for explicit runner-sync tasks whose delivery contract is the runner artifact itself.

## Acceptance

- Historical delivery for TASK-AAO-0125-style runner sync recognizes scoped onefile runner outputs as real deliverables.
- Ordinary feature tasks still exclude generic build, runtime, scratch, and generated noise from deliverable credit.
- Regression proves a declared runner-output scope can pass while unrelated release output outside declared scope still fails.
- No runner build outputs, release artifacts, dist artifacts, runtime locks, or TEAM mirror/import residue are generated or committed by this source card.

## Deliverables

- packages/cli/src/commands/tasks.ts
- scripts/validate-task-ledger-governance.ts

## Context Map

### Primary

- `packages/cli/src/commands/tasks.ts` - adjust deliverable-gate classification so declared runner-output scope can count as a real deliverable without globally opening generated-noise credit.
- `scripts/validate-task-ledger-governance.ts` - add regression coverage for the runner-sync historical-delivery gate and preserve existing dirty/noise exclusions.

### Secondary

- TASK-AAO-0125 runner-sync records - read-only repro context only; do not rewrite its evidence or task events in this card.
- Frozen runner artifacts - must remain out of this source card; any build sync after source changes needs a separate runner-sync card.
- TEAM mirror/import residue - unrelated lane; do not stage or commit.

### Test Coverage

- `scripts/validate-task-ledger-governance.ts` - validates the new historical-delivery regression and existing deliverable/noise behavior.

### Patterns to Follow

- Follow TASK-AAO-0124 path-normalization style: small helper-level fix, focused regression, no broad lifecycle rewrite.
- Follow TASK-AAO-0125 separation: source-card fix first, runner build output in a separate card only if source changes require it.

## Validators

- npm run typecheck
- node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
- npm run validate:cli
- git diff --check

## Forbidden

- Do not generate or commit runner build outputs in this card.
- Do not edit TASK-AAO-0125 runtime task, evidence, task-events, or closure records.
- Do not touch TEAM mirror/import residue.
- Do not push, fetch, pull, merge, or rebase.
