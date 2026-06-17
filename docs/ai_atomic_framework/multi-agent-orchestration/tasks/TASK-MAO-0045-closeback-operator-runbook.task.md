---
task_id: TASK-MAO-0045
doc_id: doc_mao_0045
title: "Closeback operator runbook and banned-pattern guide"
status: planned
owner: atm-core
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
---

# TASK-MAO-0045 - Closeback operator runbook, restore protocol, and banned-pattern guide

## Goal

Write the operator runbook for historical closeback, waiver use, scoped dirty
remediation, and forbidden closeout patterns after the CLI fixes land.

## Implementation Contract

- Document the normal closeback sequence from actor adoption through pre-close,
  dry-run, scoped remediation, claim, close, verification, and post-close
  attribution review.
- Explain when a single closeback bundle approval is appropriate and when
  separate approvals remain required.
- Include banned patterns:
  - do not use `tasks repair-closure` as close;
  - do not hand-edit ledger files to force done;
  - do not claim then close while leaving governance dirty uncommitted;
  - do not use bare git commit for ATM ledger mutations.
- Explain the restore protocol for foreign staged files, including when
  `--defer-foreign-staged` is appropriate and how to re-home staged work back
  to the correct task.
- Document the expected close completion checklist so operators can tell when
  target, planning mirror, evidence, and ledger state are all aligned.
- Keep docs English-only and repository-neutral.

## Acceptance Criteria

- Operators can run a historical closeback without relying on chat-only memory.
- Docs point to taskflow as the normal lane and label backend commands as
  protected repair surfaces.
- The runbook reflects the implemented behavior from `TASK-MAO-0038` through
-  `TASK-MAO-0044`, including the pre-close blocker summary and the foreign
  staged restore path.
