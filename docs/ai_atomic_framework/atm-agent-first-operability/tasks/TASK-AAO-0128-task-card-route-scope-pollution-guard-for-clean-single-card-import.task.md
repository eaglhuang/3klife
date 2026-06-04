---
doc_id: ""
task_id: TASK-AAO-0128
title: "task-card route scope pollution guard for clean single-card import"
milestone: M16
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-task-card-route-scope-pollution-guard-for-clean-single-card-import
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-TEAM-0026
  - TASK-AAO-0120
  - TASK-AAO-0124
depends: []
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-import.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-team-agents.ts
  - TASK-TEAM-0026 implementation/mirror files
non_goals:
  - "Do not mutate AAF source in Phase 0."
  - "Do not repair TASK-TEAM-0026 itself."
  - "Do not fold TEAM implementation or mirror reconciliation into this card."
  - "Do not fold release runner sync into this card."
  - "Do not let nearby plan prose or permission examples become route-visible scope."
notes: "2026-06-04 | status: open | validation: pending | change: Phase 0 open card for clean single-card route scope guard | blocker: none"
---

# TASK-AAO-0128 task-card route scope pollution guard for clean single-card import

## Goal
Open the Phase 0 planning card for the ATM route/import pollution bug.
When the single `TASK-TEAM-0026` card has clean machine fields, route/import must not absorb nearby plan prose or permission sample paths into `targetAllowedFiles`.
This card stays in 3KLife planning only and does not touch AAF source.

## Background
`TASK-TEAM-0026` has a clean single-card dry run, but `atm next --prompt TASK-TEAM-0026` can still absorb paths from the surrounding TEAM plan, including `packages/cli/src/commands/**` and `docs/tasks/*`, into route-visible scope.
That makes the claim look legal while the imported `allowedFiles` are polluted.

This card fixes the route/import pollution rule itself.
It is not a TEAM-0026 implementation card, and it is not a TEAM mirror reconciliation card.

## Phase 0 Scope
- Keep this card in 3KLife planning only.
- Update only the 3KLife planning card, `docs/tasks/tasks-atm.json`, and the resolved shard `docs/tasks/tasks-atm/tasks-atm-part-33.json`.
- The route/import logic must trust the single card's machine fields, not adjacent plan prose or permission examples.
- Do not touch AAF source in this turn.
- Do not repair TASK-TEAM-0026 itself.
- Do not fold TEAM implementation or mirror reconciliation into this card.
- Do not fold release runner sync into this card.

## Phase 1 Scope Amendment
- Frontmatter `allowed_files` is the target-repo Phase 1 import scope, not the historical Phase 0 planning write scope.
- A single `TASK-TEAM-0026` card prompt must resolve to the safe subset only.
- Nearby plan prose and permission examples are advisory context, not route-visible scope.
- Existing planned tasks must still route normally.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-import.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts`
- focused regression fixture/test if needed

## Phase 1 Forbidden Surfaces
- `C:/Users/User/AI-Atomic-Framework/.atm/history/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-team-agents.ts`
- `TASK-TEAM-0026 implementation/mirror files`

## Validators
### Phase 0 Planning Validators
- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`
- `node tools_node/check-doc-shard-health.js`
- Phase 1 validators stay on the card only; do not run AAF validators in Phase 0.

### Phase 1 AAF Validators
- A single `TASK-TEAM-0026` prompt returns only the safe subset.
- `next --prompt TASK-TEAM-0026` targetAllowedFiles must not include `packages/cli/src/commands`.
- `next --prompt TASK-TEAM-0026` targetAllowedFiles must not include `docs/tasks/*`.
- Nearby plan prose and permission examples must not become route-visible scope.
- Existing planned tasks still route normally.
- If the implementation needs a focused regression fixture/test, add one that asserts the clean-card machine fields do not widen scope.

## Rollback Hint
If the card metadata or shard placement is inconsistent, revert only the 0128 planning card and its `docs/tasks/tasks-atm.json` / shard updates.
Do not touch AAF source while rolling back the planning-card layer.

## Plain-language Anchor
This card keeps the route parser from treating nearby plan text as road signage.
Only the card's machine fields should drive the safe subset.
