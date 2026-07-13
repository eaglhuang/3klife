---
task_id: TASK-AAO-0191
title: "Prevent defer-foreign-staged from absorbing ordinary-unowned staged files"
started_at: "2026-07-13T09:30:00.000Z"
started_by_agent: "cursor-grok-4.5"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-13-177
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
notes: "Delivery landed via framework temp-claim after ledger abandon/reopen required emergency --force (ATM-BUG-2026-07-13-178). Code fix also present in c9d293eca; backlog+mirror in 987cf7a66."
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "tests/cli/git-commit-task-scoped-staging.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert framework/task scoped commit isolation changes if legitimate multi-file live-index commits regress."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      path: packages/cli/src/commands/git-governance.ts
      inlineReason: "Bounded fix to framework-claim commit isolation and deferral of ordinary-unowned staged files."
outOfScope:
  - "release/**"
  - "Changing Broker conflict resolution semantics"
  - "Editing .atm/history or .atm/runtime by hand"
  - "packages/cli/src/commands/residue.ts"
---

# TASK-AAO-0191 Prevent defer-foreign-staged from absorbing ordinary-unowned staged files

## Problem

`ATM-BUG-2026-07-13-177`:

A framework temp-claim governed commit with `--auto-stage --defer-foreign-staged`
still absorbed a long-lived staged foreign file
(`packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts`,
ownership `ordinary-unowned`) into commit `a6aa957a3`.

Root cause:

1. Framework-claim commits without `--task` use the live Git index when the
   claim files are already staged.
2. `inspectFrameworkScopedUnstagedCommit` returns early when claim dirty files
   are fully staged, and never reports already-staged out-of-claim files.
3. `--defer-foreign-staged` currently only parks task-attributed unexpected
   staged bundles, not ordinary-unowned out-of-scope staged source.

## Goal

- Framework-claim commits must commit only claim-allowed files (plus governed
  git-head evidence), preferably through the isolated task-scoped index path.
- When out-of-claim staged files exist, fail closed unless `--defer-foreign-staged`
  parks/restores them.
- `--defer-foreign-staged` must cover ordinary-unowned / out-of-scope staged
  source, not only foreign task governance artifacts.
- Keep fail-closed behavior for protected foreign-active staged ownership.

## Acceptance Criteria

- Regression: pre-stage an ordinary-unowned file, run framework-claim
  `--auto-stage --defer-foreign-staged` commit, assert the commit tree excludes
  that path and the staged entry is restored afterward (or remains deferred with
  an explicit snapshot contract).
- Without `--defer-foreign-staged`, the same setup fails closed with a copyable
  remediation that names `--defer-foreign-staged`.
- Backlog row `ATM-BUG-2026-07-13-177` is marked fixed.
- Do not mutate foreign staged `residue.ts` / unrelated WIP in this lane.
