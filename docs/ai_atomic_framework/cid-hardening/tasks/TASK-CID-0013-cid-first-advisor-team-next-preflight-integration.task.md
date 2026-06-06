---
doc_id: doc_cid_0013
task_id: TASK-CID-0013
title: "CID-first advisor team/next preflight integration"
status: done
completed_at: 2026-06-06T21:49:10+08:00
completed_by_agent: 007
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0005"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the consumer integration commit and its closure ledger commit. Do not roll back TASK-AAO-0130 advisor-core work."
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map / atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Consumes the existing CID-first parallel advisor from TASK-AAO-0130 through next/team preflight surfaces. Map updates are required only if ownership coverage changes."
outOfScope:
  - "Changing tasks parallel advisor verdict logic in packages/cli/src/commands/tasks.ts"
  - "Editing packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "Creating Write Broker, Neutral Write Steward, break-glass, or lease-epoch primitives"
  - "Pulling TASK-CID-0010 or TASK-CID-0012 implementation concerns into this card"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
  - "Reopening or merging the evidence-only 007/task-cid-0005-team-0026 branch"
nonGoals:
  - "Do not reimplement the CID-first advisor core landed by TASK-AAO-0130"
  - "Do not create a second scheduler or broker registry"
  - "Do not make Team Agents own git.write or task.lifecycle beyond the existing coordinator rules"
---

# TASK-CID-0013 — CID-first advisor team/next preflight integration

## Goal

Integrate the existing CID-first parallel advisor into the consumer-facing `team` and `next` preflight surfaces, so advisor results can block or warn before claim/team execution without changing the advisor core.

This is the target-repo execution card that follows the planning-only `TASK-CID-0005` contract. `TASK-CID-0005` defines the intent; this card grants the bounded AI-Atomic-Framework source-write authority.

## Background

`TASK-AAO-0130` already landed the read-only CID-first parallel advisor MVP on `main`. The remaining gap is consumption-layer wiring: `next.ts` and `team.ts` must surface existing advisor findings in preflight behavior, and the prompt-scoped validator must prove the route stays narrow.

## Implementation Contract

1. In `packages/cli/src/commands/next.ts`, wire the first go/no-go gate around claim preflight so a `blocked-cid-conflict` advisor result fails closed with `ATM_NEXT_CLAIM_BLOCKED` before later widening.
2. In `packages/cli/src/commands/team.ts`, surface the advisor result as consumer-side validation/preflight findings without changing Team permission ownership.
3. In `packages/cli/src/commands/command-specs/team.spec.ts`, document only the team command surface needed for the new warning/blocking behavior.
4. In `scripts/validate-prompt-scoped-next.ts`, add focused regression coverage for the `ATM_NEXT_CLAIM_BLOCKED` behavior and the preserved prompt-scoped route shape.

## Hard Scope Fence

- Do not edit `packages/cli/src/commands/tasks.ts`.
- Do not edit `packages/cli/src/commands/command-specs/tasks.spec.ts`.
- Do not mutate `.atm/**` by hand.
- Do not introduce broker, steward, break-glass, lease-epoch, or Team brokered-write primitives.
- Do not use `TASK-TEAM-0026` branch residue as implementation authority.

## First Go/No-Go Gate

Pause after the `next.ts` claim interception is wired and `node --strip-types scripts/validate-prompt-scoped-next.ts` proves `ATM_NEXT_CLAIM_BLOCKED`. Only then widen to `team.ts` and `team.spec.ts`.

## Acceptance Criteria

- A CID conflict exposed by the existing advisor blocks claim preflight with `ATM_NEXT_CLAIM_BLOCKED`.
- `team` preflight reports the advisor finding as consumer-side validation context.
- The validator proves the prompt-scoped next route still targets the intended task and does not fall back to stale global state.
- `git diff --name-only` is limited to the four allowed source/validator files plus ATM-generated closure evidence when closing in AI-Atomic-Framework.
- No diff touches `tasks.ts`, `.atm/runtime/**`, broker/steward surfaces, or `CID-0010/0012` implementation files.

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`
- `git diff --check`

## Rollback

Revert the delivery commit and the closure ledger commit in AI-Atomic-Framework. `TASK-AAO-0130` remains intact because this card only consumes the advisor.

## Notes

Captain rule: planning cards define intent; target-repo execution cards grant source-write authority.

### 執行日誌

- 2026-06-06 | 狀態: done | 驗證: 透過 node atm.mjs evidence run 通過所有 5 個 requiredGates | 變更: 實作 preflight 整合代碼至 next.ts, team.ts, team.spec.ts, validate-prompt-scoped-next.ts，完成證據收集並以 ATM commit (SHA: ba16c03b7653b3fed94cd8a24e29838a3c5987c1) 關閉任務 | 阻塞: none
