---
task_id: TASK-TMP-0022
title: Retain released governance evidence and verified cleanup artifacts
status: done
owner: codex-cleanup-captain
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .atm/history/tasks/TASK-PRF-0008.json
  - .atm/history/task-events/TASK-PRF-0008/2026-08-31T13-49-25-157Z-repair-claim-e349d482702e.json
  - .atm/history/tasks/ATM-GOV-0397.json
  - .atm/history/task-events/ATM-GOV-0397/2026-08-15T13-43-05-511Z-import-6714943a01b7.json
  - .atm/history/task-events/ATM-GOV-0397/2026-08-20T17-27-36-320Z-import-0c44811d1783.json
  - atomic_workbench/atoms/ATM-GOV-0001/atom.test.report.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-14-005.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-14-006.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-14-008.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-21-009.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-08-21-014.json
  - docs/governance/canonical-authority-snapshot-charter.md
  - docs/governance/model-bound-agent-capability-benchmark.md
  - docs/governance/skills/ATM-SKL-backlog-family-mapping-2026-08-08-claude-007.md
  - docs/governance/skills/ATM-SKL-captain-audit-2026-08-08-claude-007.md
  - docs/governance/skills/ATM-SKL-captain-handoff-2026-08-01-claude-007.md
  - docs/governance/skills/ATM-SKL-captain-handoff-2026-08-08-codex.md
  - docs/reports/wave-exit-observer-receipts/EXIT-07/ca39ef007a6238efb293099a25f6db0bcaceee2e.json
  - docs/reports/wave-exit-observer-receipts/EXIT-11/71aac841a45a19a8d9318ed3371a231bf3bb3c1d.json
  - docs/reports/wave-exit-observer-receipts/EXIT-11/d0fcd88bfb48b91225210ad889ce601767d1bed1.json
  - tests/cli/git-index-override-lease-snapshot-consistency.test.ts
  - tests/cli/six-editor-adapter-parity.test.ts
deliverables:
  - atomic_workbench/atoms/ATM-GOV-0001/atom.test.report.json
  - docs/governance/atm-bug-and-optimization-backlog.items/
  - docs/governance/canonical-authority-snapshot-charter.md
  - docs/governance/model-bound-agent-capability-benchmark.md
  - docs/governance/skills/
  - docs/reports/wave-exit-observer-receipts/
  - tests/cli/git-index-override-lease-snapshot-consistency.test.ts
  - tests/cli/six-editor-adapter-parity.test.ts
validators:
  - git diff --check
  - node --strip-types tests/cli/git-index-override-lease-snapshot-consistency.test.ts
  - node --strip-types tests/cli/six-editor-adapter-parity.test.ts
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-01T20:24:01.585Z"
completed_by_agent: "codex-cleanup-captain"
closedAt: "2026-09-01T20:24:01.585Z"
closedByActor: "codex-cleanup-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-01T20-24-01-585Z-close-4787ac8ac429"
lastTransitionAt: "2026-09-01T20:24:01.585Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ff850b6da1fe2d0d87fcd74d083b17662f073510"
---

# TASK-TMP-0022 Retain released governance evidence and verified cleanup artifacts

## Intent

Retain verified, released, or terminal governance records that are currently
untracked or unstaged, together with their directly related regression and
governance documents. This is an evidence-preservation cleanup only: it must
not alter the blocked PRF-0008 product decision, revive abandoned ATM-GOV-0397,
or touch any active TASK-MBX-0001/mailbox file.

## Acceptance

- [ ] The exact scoped PRF-0008 repair event and ledger update are retained,
      while TASK-PRF-0008 remains blocked and released.
- [ ] The exact abandoned ATM-GOV-0397 import history and ledger are retained
      without reopening that task.
- [ ] The scoped governance artifacts and two focused regression tests are
      committed without staging mailbox/MBX files, source mailbox files, or
      active-owner evidence.
- [ ] `git diff --check` and both focused test commands pass.

## Rollback

Revert the resulting cleanup commit; do not delete the committed governance
history from the worktree.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-01T20:18:36.521Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0022-retain-released-governance-evidence-and-verified-cleanup-artifacts.task.md","contentDigest":"sha256:d42c7754aa4d830a4f7e514ffa1ab66dda05f345cf5e173a89469d40f9736136"} -->
