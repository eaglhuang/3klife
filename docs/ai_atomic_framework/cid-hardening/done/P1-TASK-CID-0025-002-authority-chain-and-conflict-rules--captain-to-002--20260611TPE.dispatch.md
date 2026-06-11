---
dispatch_id: P1-TASK-CID-0025-002
parent_task_id: TASK-CID-0025
assignee: "002"
status: done
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

## Worker Report

- worker: 002
- dispatch: P1-TASK-CID-0025-002
- status: done
- files_changed:
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/broker.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/team.spec.ts`
  - `C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md`
  - `C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0025-broker-owned-write-actor-runtime-boundary.task.md`
- wording_added:
  - Broker verdicts override Coordinator decisions inside broker-governed conflict domains.
  - Coordinator remains team-local lifecycle owner outside broker-governed conflict domains.
  - Coordinator must yield and escalate when broker verdicts are `needs-steward`, `blocked-cid-conflict`, `blocked-shared-surface`, or `historical-delivery-required`.
  - Broker-surface messages now explicitly say broker verdicts outrank Coordinator decisions inside broker territory.
- cross_team_or_lifecycle_permissions:
  - none; no new cross-team lifecycle permissions were granted or adjusted.
- validation:
  - `npm run typecheck`
  - `npm run validate:cli`
  - `node --strip-types scripts/validate-team-agents.ts --case lieutenant-escalation`
  - `git diff --check`
