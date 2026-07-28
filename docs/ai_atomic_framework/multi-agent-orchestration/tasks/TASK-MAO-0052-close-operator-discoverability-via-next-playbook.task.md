---
task_id: TASK-MAO-0052
doc_id: doc_mao_0052
title: "Close operator discoverability via next playbook"
status: done
started_at: 2026-06-17T12:05:00Z
started_by_agent: cursor-composer-2.5
owner: atm-core
priority: P1
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0039"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/next.ts"
deliverables:
  - "packages/cli/src/commands/next.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert next playbook close-preview routing and command-spec summary."
atomizationImpact:
  ownerAtomOrMap: "atm.next-route-task-selector-map"
  mapUpdates: []
outOfScope:
  - "Rewriting ATM_NEW_USER_WORKFLOW.md in this card"
  - "Changing taskflow close implementation semantics"
nonGoals:
  - "Do not remove tasks close as protected backend surface."
completed_at: "2026-06-17T12:18:03.190Z"
completed_by_agent: "cursor-composer-2.5"
lastTransitionId: "2026-06-17T12-18-02-775Z-close-df3bce6c65a3"
delivery_commit: "ba96fe2ef"
---

# TASK-MAO-0052 - Close operator discoverability via next playbook

## Goal

Make `node atm.mjs next --json` teach agents to preview close through
`taskflow pre-close` and `taskflow close` dry-run before `--write`, instead of
routing them to protected `tasks close`.

## Implementation Contract

- Update the normal-channel `atm.channelPlaybook.v1` close steps to:
  1. `taskflow pre-close`
  2. `taskflow close` (dry-run, no `--write`)
  3. `taskflow close --write` only after `writeReadinessHint` is ready
- Update `atm.taskDeliveryPrinciple.v1.nextStep` to match.
- Keep `tasks close` documented as backend-only in `doNot`.
- Extend `next.spec.ts` summary if needed after `validate:cli`.

## Acceptance Criteria

- `next --json` normal playbook `commandSequence` contains `taskflow pre-close`
  and `taskflow close` without `--write` before any `--write`.
- Playbook `doNot` bans direct `tasks close` for normal operator closeback.
- Validators pass.
