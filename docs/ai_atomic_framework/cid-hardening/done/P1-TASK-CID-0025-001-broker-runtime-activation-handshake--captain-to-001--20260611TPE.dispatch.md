---
dispatch_id: P1-TASK-CID-0025-001
parent_task_id: TASK-CID-0025
assignee: "001"
status: done
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0025-broker-owned-write-actor-runtime-boundary.task.md"
---

# P1-TASK-CID-0025-001 - Broker runtime activation handshake

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

`TASK-CID-0025` already states the contract: a broker-owned write actor may exist for scoped file-write execution, but it must not become a second lifecycle owner. This packet asks worker `001` to turn that contract into the runtime activation handshake and scoped execution path, without touching close authority.

## Scope

- `packages/core/src/broker/team-lane.ts`
- `packages/core/src/broker/steward.ts`
- `packages/cli/src/commands/broker.ts`

## Deliverables

1. Broker-owned write actor activation handshake from broker/team lane input.
2. Scoped file-write execution path that only accepts broker-approved inputs.
3. Write evidence return path for the scoped write step only.
4. No `git.write`, `task.lifecycle`, or self-close behavior.

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-brokered-write.ts --mode validate`
- `git diff --check`

## Invariants

- Broker may own runtime execution.
- Coordinator / Captain still owns commit, close, release, and handoff.
- The actor result must flow back upward, not sideways into a second scheduler.

## One-line Takeaway

Build the runtime hook, not the close authority.

## Worker Report

- worker: 001
- dispatch: P1-TASK-CID-0025-001
- status: done
- files_changed:
  - `C:/Users/User/AI-Atomic-Framework/packages/core/src/broker/team-lane.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/core/src/broker/steward.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/broker.ts`
  - `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/broker.spec.ts`
  - `C:/Users/User/AI-Atomic-Framework/tests/cli-fixtures/help-snapshots/broker.json`
  - `C:/Users/User/AI-Atomic-Framework/scripts/validate-team-brokered-write.ts`
  - `C:/Users/User/AI-Atomic-Framework/scripts/validate-broker-steward.ts`
- verification:
  - `npm run typecheck`
  - `npm run validate:cli`
  - `node --strip-types scripts/validate-team-brokered-write.ts --mode validate`
  - `node --strip-types scripts/validate-broker-steward.ts --mode validate`
  - `git diff --check`
- boundary:
  - `git.write` retained as false in broker runtime handshake and steward evidence
  - `task.lifecycle` retained as false in broker runtime handshake and steward evidence
  - `self-close` retained as false in broker runtime handshake
- notes:
  - Added broker runtime activation handshake evidence and runtime activate CLI entry.
  - Scoped write execution stays broker-approved and returns evidence upward only.
