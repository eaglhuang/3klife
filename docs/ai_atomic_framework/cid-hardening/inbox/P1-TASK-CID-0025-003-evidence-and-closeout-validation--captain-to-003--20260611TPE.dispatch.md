---
dispatch_id: P1-TASK-CID-0025-003
parent_task_id: TASK-CID-0025
assignee: "003"
status: pending
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0025-broker-owned-write-actor-runtime-boundary.task.md"
---

# P1-TASK-CID-0025-003 - Evidence and closeout validation

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

This packet is the proof-and-closeout lane. Once runtime activation and authority-chain wording exist, worker `003` should make sure the validators, evidence story, and closeout shape still prove the contract without sneaking in a second lifecycle owner.

## Scope

- `scripts/validate-team-brokered-write.ts`
- `scripts/validate-broker-steward.ts`
- `docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0025-broker-owned-write-actor-runtime-boundary.task.md`

## Deliverables

1. Validations that prove broker-owned write actor can run scoped file writes without acquiring lifecycle authority.
2. Evidence wording that makes the broker/coordinator boundary explicit in closeout materials.
3. Closeout notes that state this work does not wait for `TASK-CID-0024`.
4. No final close authority changes and no commit/self-close shortcut.

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-brokered-write.ts --mode validate`
- `node --strip-types scripts/validate-broker-steward.ts --mode validate`
- `git diff --check`

## Invariants

- Validation proves the boundary; it does not redefine it.
- Evidence should support coordinator acceptance, not replace it.

## One-line Takeaway

Make the proof clean enough that the boundary stays boring in review.

