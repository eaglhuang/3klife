---
task_id: TASK-MAO-0045
doc_id: doc_mao_0045
title: "Closeback operator runbook and banned-pattern guide"
status: done
owner: cursor-gpt-5.2
started_at: 2026-06-18T01:15:00+08:00
started_by_agent: cursor-gpt-5.2
completed_at: 2026-06-18T01:35:00+08:00
notes: "Closeback operator runbook in ATM_NEW_USER_WORKFLOW + governance cross-refs; taskflow promoted to public help for docs-command-drift; delivery bba1bf74d; governed close with historical-delivery waiver."
priority: P2
milestone: M7
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0038"
  - "TASK-MAO-0039"
  - "TASK-MAO-0040"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/historical-batch-evidence.md"
  - "docs/governance/git-governance-contract.md"
  - "docs/HOST_GOVERNANCE_INTEGRATION.md"
  - "packages/cli/README.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/governance/historical-batch-evidence.md"
  - "docs/governance/git-governance-contract.md"
  - "docs/HOST_GOVERNANCE_INTEGRATION.md"
  - "packages/cli/README.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run validate:neutrality"
  - "npm run validate:docs-command-drift"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert closeback runbook docs and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.closeback-operator-runbook-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Documenting backend protected commands as normal daily-driver routes"
  - "Recommending broad destructive cleanup"
  - "Claiming unimplemented CLI features are available"
nonGoals:
  - "Do not change source behavior in this documentation-only task."
completed_at: "2026-06-17T17:35:35.296Z"
completed_by_agent: "cursor-gpt-5.2"
lastTransitionId: "2026-06-17T17-35-35-014Z-close-32fc82148477"
delivery_commit: "bba1bf74d"
---

# TASK-MAO-0045 - Closeback operator runbook, restore protocol, and banned-pattern guide

## Goal

Write the operator runbook for the closeback path that is already landing:
adoption, pre-close, scoped remediation, claim, close, verification, and the
forbidden patterns that must stay blocked.

## Implementation Contract

- Document the normal closeback sequence from actor adoption through pre-close,
  dry-run, scoped remediation, claim, close, and verification.
- Explain when a single closeback bundle approval is appropriate and when
  separate approvals remain required.
- Include banned patterns:
  - do not use `tasks repair-closure` as close;
  - do not hand-edit ledger files to force done;
  - do not claim then close while leaving governance dirty uncommitted;
  - do not use bare git commit for ATM ledger mutations.
- Explain the restore protocol for foreign staged files and when
  `--defer-foreign-staged` is appropriate.
- Document the close completion checklist so operators can tell when target,
  planning mirror, evidence, and ledger state are aligned.
- Keep docs English-only and repository-neutral.

## Acceptance Criteria

- Operators can run a historical closeback without relying on chat-only memory.
- Docs point to taskflow as the normal lane and label backend commands as
  protected repair surfaces.
- The runbook reflects the implemented behavior from `TASK-MAO-0038` through
-  `TASK-MAO-0044`, including the pre-close blocker summary and the foreign
  staged restore path.
