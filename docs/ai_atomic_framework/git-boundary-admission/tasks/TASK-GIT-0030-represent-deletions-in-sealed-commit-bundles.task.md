---
task_id: TASK-GIT-0030
title: Represent deletions in sealed commit bundles
status: done
owner: claude-006
priority: P0
depends_on:
  - TASK-GIT-0029
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/commit-attribution/sealed-commit-bundle.ts
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - packages/cli/src/commands/broker/shared-delivery-commit-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/fixtures/governance-incidents/shared-index-commit-attribution/**
  - tests/catalog/groups/**
  - release/atm-onefile/atm.mjs
  - release/atm-root-drop/**
deliverables:
  - packages/core/src/commit-attribution/sealed-commit-bundle.ts
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/fixtures/governance-incidents/shared-index-commit-attribution/**
validators:
  - npm run test:cli -- --run tests/cli/commit-attribution-sealed-transaction.test.ts
  - npm run test:cli -- --run tests/cli/git-commit-task-scoped-staging.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:module-boundaries
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-07-31T06:39:48.102Z"
completed_by_agent: "claude-006"
closedAt: "2026-07-31T06:39:48.102Z"
closedByActor: "claude-006"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T06-39-48-102Z-close-34e1bfd52628"
lastTransitionAt: "2026-07-31T06:39:48.102Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e7ff78e7fbffb6993d24ecf1102a97d8a11c5e2d"
---

# TASK-GIT-0030 Represent deletions in sealed commit bundles

## Intent

TASK-GIT-0029 sealed governed commit attribution for add/modify content, but closeout found a shipped functional regression: staged deletions have no `ls-files -s` entry, so a sealed bundle can silently preserve an in-scope deleted file in the committed tree. Extend the sealed bundle model to represent deletions explicitly and prove delete/add/modify attribution against the committed tree.

## Acceptance

- [ ] Sealed bundle entries can represent deletions as explicit tombstones, not as absent entries.
- [ ] Commit assembly removes tombstoned paths from the candidate index and never re-adds them from the live worktree.
- [ ] Bundle-vs-tree comparison treats deletion as required committed tree state and fails closed on missing, extra, or same-path wrong-blob findings.
- [ ] Regression test proves an in-scope deletion plus an in-scope modification commits both effects.
- [ ] Regression test proves an out-of-scope deletion is rejected or excluded fail-closed and cannot be silently absorbed.
- [ ] Existing sealed add/modify/CAS/admission-before-ref-update coverage remains green.
- [ ] Frozen runner/release mirrors are synced after the source fix; current staged root-drop `.d.ts` deletions are either correctly delivered by this task or explicitly justified as no-op cleanup evidence.
- [ ] No override lease, raw git commit, branch, rebase, or push is used unless the owner gives a separate emergency instruction.

## Notes

- This is a follow-up card, not a reopen of TASK-GIT-0029. The prior task is already closed in the target ledger.
- Current evidence: Claude-006 reported minimal repro `delete src/gone.txt + modify src/stay.txt`; observed canonical index also has staged deletions under `release/atm-root-drop/packages/core/dist/skills/*.d.ts`.
- Keep the rule generic. Do not special-case TASK-GIT-0029, actor names, local dates, or release paths in production control flow.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-31T05:13:55.225Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0030-represent-deletions-in-sealed-commit-bundles.task.md","contentDigest":"sha256:38e1c1d5003a4260013ebba58c47c06b1e0498b4a770218218d90de2602a833c"} -->
