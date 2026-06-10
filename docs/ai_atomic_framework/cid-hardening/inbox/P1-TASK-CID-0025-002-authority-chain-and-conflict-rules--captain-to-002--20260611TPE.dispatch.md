---
dispatch_id: P1-TASK-CID-0025-002
parent_task_id: TASK-CID-0025
assignee: "002"
status: pending
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0025-broker-owned-write-actor-runtime-boundary.task.md"
---

# P1-TASK-CID-0025-002 - Authority chain and conflict rules

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

The open question is not whether broker and coordinator both exist. They do. The real contract is that broker verdicts override coordinator decisions inside broker-governed conflict domains, while coordinator remains the local lifecycle owner outside those domains. Worker `002` should encode that chain clearly in the planning and command surfaces so the runtime cannot drift back into dual authority.

## Scope

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/broker.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md`
- `docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md`

## Deliverables

1. Authority-chain wording that makes broker the upper authority for broker-governed conflict domains.
2. Conflict-rule wording that blocks unsafe claim / commit / close progression when broker verdict says `needs-steward`, `blocked-cid-conflict`, `blocked-shared-surface`, or `historical-delivery-required`.
3. Command-surface text that keeps coordinator local, but never silently overrides broker.
4. No new scheduler, no second close authority, no lifecycle fork.

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `git diff --check`

## Invariants

- Coordinator is local.
- Broker is cross-team and higher in conflict domains.
- If the two disagree inside broker territory, coordinator must yield and escalate, not race.

## One-line Takeaway

Write the hierarchy plainly enough that nobody can read it backwards later.

