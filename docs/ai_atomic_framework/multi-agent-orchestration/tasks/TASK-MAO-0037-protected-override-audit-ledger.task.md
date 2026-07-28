---
task_id: TASK-MAO-0037
doc_id: doc_mao_0037
title: "Protected override audit ledger"
status: done
started_at: 2026-06-17T12:00:00Z
started_by_agent: cursor-composer-2.5
owner: atm-core
priority: P0
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0036"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/emergency.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/emergency.spec.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli-fixtures/help-snapshots/explain.json"
  - "tests/cli-fixtures/help-snapshots/guide.json"
  - "tests/cli-fixtures/help-snapshots/migrate.json"
  - "tests/cli-fixtures/help-snapshots/next.json"
  - "tests/cli-fixtures/help-snapshots/orient.json"
  - "tests/cli-fixtures/help-snapshots/registry.json"
  - "tests/cli-fixtures/help-snapshots/start.json"
  - "tests/cli-fixtures/help-snapshots/upgrade.json"
  - "docs/HOST_GOVERNANCE_INTEGRATION.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/emergency.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/emergency.spec.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli-fixtures/help-snapshots/explain.json"
  - "tests/cli-fixtures/help-snapshots/guide.json"
  - "tests/cli-fixtures/help-snapshots/migrate.json"
  - "tests/cli-fixtures/help-snapshots/next.json"
  - "tests/cli-fixtures/help-snapshots/orient.json"
  - "tests/cli-fixtures/help-snapshots/registry.json"
  - "tests/cli-fixtures/help-snapshots/start.json"
  - "tests/cli-fixtures/help-snapshots/upgrade.json"
  - "docs/HOST_GOVERNANCE_INTEGRATION.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-git-hooks-enforcement.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert protected-override audit code, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.protected-override-audit-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Removing emergency override capability"
  - "Allowing silent --no-verify or --force bypasses"
  - "Auto-closing follow-up repair tasks without human-visible evidence"
nonGoals:
  - "Do not create a second approval system outside ATM emergency leases."
  - "Do not treat authorization as proof of successful delivery."
completed_at: "2026-06-17T04:48:48.627Z"
completed_by_agent: "cursor-composer-2.5"
lastTransitionId: "2026-06-17T04-48-48-539Z-close-f7c07351abbc"
delivery_commit: "44deeace1"
---

# TASK-MAO-0037 - Protected override audit ledger

## Goal

Make every protected override visible and auditable, including `--no-verify`,
`--force`, historical waivers, emergency approval leases, and hook safe-mode
paths.

## Implementation Contract

- Record protected override attempts with actor, command, flags, task id when
  available, reason, skipped checks, and affected files.
- Distinguish `authorized` from `succeeded` and `failed`; include `failureCode`
  when an authorized operation still fails.
- Emit or update a follow-up repair candidate for each successful bypass that
  leaves deferred governance work.
- Add docs that explain when a human approval authorizes an operation versus
  when ATM records the operation as completed.
- Keep the audit append-only and command-backed.

## Acceptance Criteria

- `--no-verify` and emergency lease flows cannot complete without an audit event.
- Authorized-but-failed paths are visible in JSON output and docs.
- The task consolidates backlog items `ATM-BUG-2026-06-15-004`,
  `ATM-BUG-2026-06-16-011`, and the 0009/0010 closeback dogfood finding about
  ambiguous emergency success.

## Notes

- 2026-06-17 cursor-composer-2.5: implemented protected-override-audit ledger module, wired git --no-verify gate, hook safe-mode audit, emergency audit command, tasks close succeeded/failed outcomes; validators typecheck/validate:cli/validate-git-hooks-enforcement pass on target repo.
- 2026-06-17 cursor-composer-2.5: closed via `taskflow close --historical-delivery 44deeace1 --waiver-out-of-scope-delivery` (mixed with TASK-MAO-0024 delivery in same commit; 0024 already closed by Agent004). Live ledger `done`, claim released; governance bundle in target commit `6c18379f3`.
