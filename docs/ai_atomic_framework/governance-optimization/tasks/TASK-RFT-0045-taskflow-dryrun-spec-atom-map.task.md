---
id: TASK-RFT-0045
title: Split taskflow dry-run regression suite atom map
status: done
priority: high
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
depends_on:
  - TASK-RFT-0044
created_at: 2026-07-16T00:25:00+08:00
owner: codex-captain
completed_at: "2026-07-15T16:58:30.087Z"
completed_by_agent: "codex-task-rft-0045"
closedAt: "2026-07-15T16:58:30.087Z"
closedByActor: "codex-task-rft-0045"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T16-58-30-087Z-close-a4ee4792607e"
lastTransitionAt: "2026-07-15T16:58:30.087Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "265df48e81ee5476c2688e60169a3b77b114034e"
---

# TASK-RFT-0045 - Split taskflow dry-run regression suite atom map

## Intent

Split `packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
as one large test atom map so no touched physical file exceeds 600 lines, while
preserving the taskflow dry-run and close-readiness regression contracts.

## Scope

- Replace the monolithic `taskflow-dryrun.spec.ts` with focused dry-run specs
  and shared fixtures under the existing taskflow test ownership boundary.
- Extract reusable fixture builders and assertion helpers into small physical
  helper files, each <=600 lines.
- Split scenarios by contract surface:
  - taskflow open dry-run and delegated opener profile behavior.
  - broker conflict close-readiness behavior.
  - dual-repo close bundle and historical delivery behavior.
  - planning-authority and profile fallback behavior.
  - uncommitted deliverable and scope-amendment behavior.
- Preserve existing regression assertions and operator-facing result contracts.
- Avoid touching unrelated release mirror files or foreign dirty work.

## Deliverables

- `packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`
- `packages/cli/src/commands/taskflow/__tests__/dryrun/fixtures.ts`
- `packages/cli/src/commands/taskflow/__tests__/dryrun/open.spec.ts`
- `packages/cli/src/commands/taskflow/__tests__/dryrun/broker-close-readiness.spec.ts`
- `packages/cli/src/commands/taskflow/__tests__/dryrun/dual-repo-close.spec.ts`
- `packages/cli/src/commands/taskflow/__tests__/dryrun/planning-authority.spec.ts`
- `packages/cli/src/commands/taskflow/__tests__/dryrun/profile-fallback.spec.ts`
- `packages/cli/src/commands/taskflow/__tests__/dryrun/uncommitted-deliverables.spec.ts`

## Acceptance

- The original `taskflow-dryrun.spec.ts` is removed or reduced to <=600
  physical lines.
- Every touched physical file in this card is <=600 physical lines.
- No new helper/spec file is used as a dumping ground for the old monolith.
- Existing taskflow dry-run, close-readiness, closeback, and delivery bundle
  assertions remain behaviorally equivalent.
- No out-of-scope release/generated or foreign staged work is committed by this
  card.

## Atomization Impact

- Atom: taskflow dry-run regression suite.
- Pattern: Result Contract Object.
- Owner module: `packages/cli/src/commands/taskflow/__tests__/dryrun/*`.
- Callers: local node strip-types validators for taskflow test specs.
- Public surface: none; test-only refactor.
- Focused test: run every new dry-run spec directly with `node --strip-types`.
- CLI regression: `npm run typecheck`.
- Out of scope: production taskflow behavior changes, release mirror cleanup,
  and broad test-runner redesign.

## Validators

- `node --strip-types packages/cli/src/commands/taskflow/__tests__/dryrun/open.spec.ts`
- `node --strip-types packages/cli/src/commands/taskflow/__tests__/dryrun/broker-close-readiness.spec.ts`
- `node --strip-types packages/cli/src/commands/taskflow/__tests__/dryrun/dual-repo-close.spec.ts`
- `node --strip-types packages/cli/src/commands/taskflow/__tests__/dryrun/planning-authority.spec.ts`
- `node --strip-types packages/cli/src/commands/taskflow/__tests__/dryrun/profile-fallback.spec.ts`
- `node --strip-types packages/cli/src/commands/taskflow/__tests__/dryrun/uncommitted-deliverables.spec.ts`
- `npm run typecheck`

## Evidence Notes

- Record line counts for every touched spec/helper file.
- Record remaining files above 2000 lines after this card.
- If taskflow dry-run exposes reusable fixture friction or line-budget tooling
  gaps, write an ATM backlog item before close.
